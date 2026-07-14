/*
 * -------------------------------------------------------
 * GestorPro — Módulo 5: Incidencias
 *
 *   incidencias -> problemas/gastos de mantenimiento de una propiedad.
 *   Se pueden "facturar" al inquilino (cargo 'gasto' en el contrato) de forma
 *   atómica e idempotente vía public.facturar_incidencia().
 *
 * Depende de Módulos 0-3.
 * -------------------------------------------------------
 */

create type public.prioridad_incidencia as enum ('baja', 'media', 'alta');
create type public.estado_incidencia as enum ('abierta', 'en_progreso', 'resuelta');
create type public.responsable_pago as enum ('arrendador', 'inquilino');

create table if not exists public.incidencias (
    id               uuid primary key default extensions.uuid_generate_v4(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    propiedad_id     uuid not null,
    contrato_id      uuid,
    titulo           varchar(255) not null,
    descripcion      text,
    costo            numeric(12,2) not null default 0 check (costo >= 0),
    prioridad        public.prioridad_incidencia not null default 'media',
    estado           public.estado_incidencia not null default 'abierta',
    responsable      public.responsable_pago not null default 'arrendador',
    transaccion_id   uuid unique references public.transacciones(id) on delete set null,
    fecha_resolucion date,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    created_by       uuid references auth.users,
    -- integridad same-org (contratos nunca se borran; RESTRICT evita el conflicto
    -- de SET NULL con organization_id NOT NULL en la FK compuesta)
    foreign key (organization_id, propiedad_id)
        references public.propiedades (organization_id, id) on delete restrict,
    foreign key (organization_id, contrato_id)
        references public.contratos (organization_id, id) on delete restrict
);

comment on table public.incidencias is 'Incidencias/gastos de mantenimiento. transaccion_id != null => ya facturada al inquilino.';

create index incidencias_org_propiedad_idx on public.incidencias (organization_id, propiedad_id);
create index incidencias_org_contrato_idx on public.incidencias (organization_id, contrato_id);

alter table public.incidencias enable row level security;

create policy incidencias_select on public.incidencias
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy incidencias_manage on public.incidencias
    for all to authenticated
    using (public.has_permission(organization_id, 'incidencias.manage'))
    with check (public.has_permission(organization_id, 'incidencias.manage'));

revoke all on public.incidencias from authenticated, service_role;
grant select, insert, update, delete on table public.incidencias to authenticated, service_role;

create trigger incidencias_set_updated_at
    before update on public.incidencias
    for each row execute function kit.set_updated_at();

/* =========================================================
 * Section: facturar_incidencia
 * Convierte una incidencia en un cargo 'gasto' del contrato,
 * de forma atómica e idempotente. Reglas del MVP:
 *  - responsable = inquilino, costo > 0, contrato activo, no facturada.
 * security definer + chequeo explícito de permiso e organización.
 * ======================================================= */
create or replace function public.facturar_incidencia(p_incidencia_id uuid)
    returns uuid
    language plpgsql
    security definer
    set search_path = ''
as $$
declare
    inc    public.incidencias;
    con    public.contratos;
    v_tx   uuid;
begin
    select * into inc from public.incidencias where id = p_incidencia_id;

    if not found then
        raise exception 'Incidencia no encontrada';
    end if;

    if not public.has_permission(inc.organization_id, 'incidencias.manage') then
        raise exception 'No autorizado';
    end if;

    if inc.transaccion_id is not null then
        raise exception 'La incidencia ya fue facturada';
    end if;

    if inc.responsable <> 'inquilino' then
        raise exception 'Solo se puede facturar al inquilino';
    end if;

    if inc.costo <= 0 then
        raise exception 'El costo debe ser mayor a 0';
    end if;

    if inc.contrato_id is null then
        raise exception 'La incidencia no está ligada a un contrato';
    end if;

    select * into con from public.contratos where id = inc.contrato_id;

    if con.estado <> 'activo' then
        raise exception 'El contrato no está activo';
    end if;

    insert into public.transacciones
        (organization_id, contrato_id, tipo, categoria, concepto, monto, fecha, created_by)
    values
        (inc.organization_id, inc.contrato_id, 'cargo', 'gasto',
         'Incidencia: ' || inc.titulo, inc.costo, current_date, (select auth.uid()))
    returning id into v_tx;

    update public.incidencias set transaccion_id = v_tx where id = p_incidencia_id;

    return v_tx;
end;
$$;

grant execute on function public.facturar_incidencia(uuid) to authenticated, service_role;
