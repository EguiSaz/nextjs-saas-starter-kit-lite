/*
 * -------------------------------------------------------
 * GestorPro — Módulo 3: Contratos + base del Ledger
 *
 *   contratos    -> ciclo de vida del arrendamiento (activo/finalizado)
 *   transacciones-> ledger (cargos/abonos) por contrato
 *
 * Reglas:
 *  #5 saldo recalculado por trigger (recalc_balance), EXCLUYENDO el depósito
 *     (el depósito vive fuera del saldo corriente; solo se refleja al cerrar).
 *  #6 un solo contrato activo por propiedad -> índice único parcial.
 *  #7 idempotencia de cargos por (contrato, categoria, periodo).
 *
 * Depende de Módulos 0-2.
 * -------------------------------------------------------
 */

-- Requisito para la FK compuesta same-org desde contratos
alter table public.propiedades
    add constraint propiedades_org_id_unique unique (organization_id, id);

/* =========================================================
 * Section: Contratos
 * ======================================================= */
create type public.estado_contrato as enum ('activo', 'finalizado');

create table if not exists public.contratos (
    id                uuid primary key default extensions.uuid_generate_v4(),
    organization_id   uuid not null references public.organizations(id) on delete cascade,
    propiedad_id      uuid not null,
    inquilino_id      uuid not null,
    fecha_inicio      date not null,
    fecha_fin         date not null,
    renta_mensual     numeric(12,2) not null check (renta_mensual > 0),
    deposito          numeric(12,2) not null default 0 check (deposito >= 0),
    dia_pago          int not null check (dia_pago between 1 and 31),
    estado            public.estado_contrato not null default 'activo',
    contrato_html     text,
    saldo             numeric(12,2) not null default 0,
    fecha_cierre      date,
    deposito_retenido numeric(12,2),
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    created_by        uuid references auth.users,
    unique (organization_id, id),
    check (fecha_fin >= fecha_inicio),
    foreign key (organization_id, propiedad_id)
        references public.propiedades (organization_id, id) on delete restrict,
    foreign key (organization_id, inquilino_id)
        references public.inquilinos (organization_id, id) on delete restrict
);

comment on table public.contratos is 'Contratos de arrendamiento. El saldo excluye el depósito (regla acordada).';

-- REGLA #6: un solo contrato activo por propiedad
create unique index contratos_un_activo_por_propiedad
    on public.contratos (propiedad_id) where estado = 'activo';

create index contratos_org_inquilino_idx on public.contratos (organization_id, inquilino_id);

alter table public.contratos enable row level security;

create policy contratos_select on public.contratos
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy contratos_manage on public.contratos
    for all to authenticated
    using (public.has_permission(organization_id, 'contratos.manage'))
    with check (public.has_permission(organization_id, 'contratos.manage'));

revoke all on public.contratos from authenticated, service_role;
grant select, insert, update, delete on table public.contratos to authenticated, service_role;

create trigger contratos_set_updated_at
    before update on public.contratos
    for each row execute function kit.set_updated_at();

/* =========================================================
 * Section: Transacciones (ledger)
 * ======================================================= */
create type public.tipo_transaccion as enum ('cargo', 'abono');
create type public.categoria_transaccion as enum
    ('deposito', 'renta', 'mora', 'gasto', 'ajuste', 'pago');

create table if not exists public.transacciones (
    id              uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    contrato_id     uuid not null,
    tipo            public.tipo_transaccion not null,
    categoria       public.categoria_transaccion not null,
    concepto        text not null,
    monto           numeric(12,2) not null check (monto > 0),
    fecha           date not null default current_date,
    metodo_pago     text,
    periodo         text,
    created_at      timestamptz not null default now(),
    created_by      uuid references auth.users,
    foreign key (organization_id, contrato_id)
        references public.contratos (organization_id, id) on delete cascade
);

comment on table public.transacciones is 'Ledger por contrato. saldo = Σ cargos − Σ abonos, excluyendo categoria=deposito.';

-- REGLA #7: idempotencia de cargos automáticos por periodo
create unique index transacciones_idempotencia
    on public.transacciones (contrato_id, categoria, periodo) where periodo is not null;

create index transacciones_contrato_idx on public.transacciones (contrato_id);

alter table public.transacciones enable row level security;

create policy transacciones_select on public.transacciones
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy transacciones_manage on public.transacciones
    for all to authenticated
    using (public.has_permission(organization_id, 'transacciones.manage'))
    with check (public.has_permission(organization_id, 'transacciones.manage'));

revoke all on public.transacciones from authenticated, service_role;
grant select, insert, update, delete on table public.transacciones to authenticated, service_role;

/* =========================================================
 * Section: recalc_balance (REGLA #5)
 * saldo = Σ cargos − Σ abonos, EXCLUYENDO el depósito.
 * ======================================================= */
create or replace function public.recalc_balance(p_contrato_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path = ''
as $$
begin
    update public.contratos c
    set saldo = coalesce((
        select sum(case when t.tipo = 'cargo' then t.monto else -t.monto end)
        from public.transacciones t
        where t.contrato_id = p_contrato_id
          and t.categoria <> 'deposito'
    ), 0)
    where c.id = p_contrato_id;
end;
$$;

grant execute on function public.recalc_balance(uuid) to authenticated, service_role;

create or replace function kit.transacciones_recalc()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
as $$
begin
    perform public.recalc_balance(coalesce(new.contrato_id, old.contrato_id));
    return coalesce(new, old);
end;
$$;

create trigger transacciones_recalc_balance
    after insert or update or delete on public.transacciones
    for each row execute function kit.transacciones_recalc();

/* =========================================================
 * Section: Al crear contrato
 * Propiedad -> ocupada; se carga la renta del primer periodo.
 * El depósito NO entra al ledger (queda fuera del saldo corriente).
 * ======================================================= */
create or replace function kit.contrato_creado()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
as $$
begin
    if new.estado = 'activo' then
        update public.propiedades
        set estado = 'ocupada'
        where id = new.propiedad_id;

        insert into public.transacciones
            (organization_id, contrato_id, tipo, categoria, concepto, monto, fecha, periodo, created_by)
        values
            (new.organization_id, new.id, 'cargo', 'renta',
             'Renta ' || to_char(new.fecha_inicio, 'YYYY-MM'),
             new.renta_mensual, new.fecha_inicio,
             to_char(new.fecha_inicio, 'YYYY-MM'), new.created_by);
    end if;

    return new;
end;
$$;

create trigger contrato_creado
    after insert on public.contratos
    for each row execute function kit.contrato_creado();

/* =========================================================
 * Section: Al cambiar estado
 * activo -> finalizado: la propiedad vuelve a disponible.
 * (La contabilidad del depósito la maneja la Server Action de cierre.)
 * ======================================================= */
create or replace function kit.contrato_estado_cambio()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
as $$
begin
    if new.estado = 'finalizado' and old.estado = 'activo' then
        update public.propiedades
        set estado = 'disponible'
        where id = new.propiedad_id;
    end if;

    return new;
end;
$$;

create trigger contrato_estado_cambio
    after update on public.contratos
    for each row execute function kit.contrato_estado_cambio();
