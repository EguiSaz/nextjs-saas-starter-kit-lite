/*
 * -------------------------------------------------------
 * GestorPro — Módulo 1: Arrendadores + Propiedades
 *
 *   arrendadores -> dueños de inmuebles (uno "propio" a 0% + terceros con comisión)
 *   propiedades  -> inmuebles, siempre ligados a un arrendador de la MISMA organización
 *
 * Depende del Módulo 0 (organizations, memberships, has_permission, auth_org_ids,
 * kit.set_updated_at).
 * -------------------------------------------------------
 */

/* =========================================================
 * Section: Enums
 * ======================================================= */
create type public.tipo_propiedad as enum (
    'departamento', 'casa', 'local', 'oficina', 'bodega', 'terreno', 'otro'
);

create type public.estado_propiedad as enum (
    'disponible', 'ocupada', 'inactiva'
);

/* =========================================================
 * Section: Arrendadores
 * ======================================================= */
create table if not exists public.arrendadores (
    id              uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    nombre          varchar(255) not null,
    email           varchar(320),
    telefono        varchar(50),
    identificacion  varchar(50),
    cuenta_bancaria varchar(50),
    comision_pct    numeric(5,2) not null default 0 check (comision_pct >= 0 and comision_pct <= 100),
    es_propio       boolean not null default false,
    notas           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    created_by      uuid references auth.users,
    -- objetivo de la FK compuesta de propiedades (garantiza integridad same-org)
    unique (organization_id, id)
);

comment on table public.arrendadores is 'Dueños de inmuebles dentro de una organización. es_propio=true => la organización se autoadministra (comisión 0%).';

-- Solo puede existir un arrendador "propio" por organización
create unique index if not exists arrendadores_uno_propio_idx
    on public.arrendadores (organization_id) where es_propio;

alter table public.arrendadores enable row level security;

create policy arrendadores_select on public.arrendadores
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy arrendadores_manage on public.arrendadores
    for all to authenticated
    using (public.has_permission(organization_id, 'arrendadores.manage'))
    with check (public.has_permission(organization_id, 'arrendadores.manage'));

revoke all on public.arrendadores from authenticated, service_role;
grant select, insert, update, delete on table public.arrendadores to authenticated, service_role;

create trigger arrendadores_set_updated_at
    before update on public.arrendadores
    for each row execute function kit.set_updated_at();

/* =========================================================
 * Section: Propiedades
 * ======================================================= */
create table if not exists public.propiedades (
    id               uuid primary key default extensions.uuid_generate_v4(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    arrendador_id    uuid not null,
    alias            varchar(255) not null,
    direccion        text not null,
    tipo             public.tipo_propiedad not null default 'departamento',
    habitaciones     int,
    banos            int,
    metros_cuadrados numeric(10,2),
    estado           public.estado_propiedad not null default 'disponible',
    notas            text,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    created_by       uuid references auth.users,
    -- El arrendador debe pertenecer a la MISMA organización (integridad cross-tenant).
    -- ON DELETE RESTRICT: no se borra un arrendador con propiedades.
    foreign key (organization_id, arrendador_id)
        references public.arrendadores (organization_id, id) on delete restrict
);

comment on table public.propiedades is 'Inmuebles administrados. Ligados a un arrendador de la misma organización.';

-- Índice para la FK compuesta / joins por arrendador
create index if not exists propiedades_org_arrendador_idx
    on public.propiedades (organization_id, arrendador_id);

alter table public.propiedades enable row level security;

create policy propiedades_select on public.propiedades
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy propiedades_manage on public.propiedades
    for all to authenticated
    using (public.has_permission(organization_id, 'propiedades.manage'))
    with check (public.has_permission(organization_id, 'propiedades.manage'));

revoke all on public.propiedades from authenticated, service_role;
grant select, insert, update, delete on table public.propiedades to authenticated, service_role;

create trigger propiedades_set_updated_at
    before update on public.propiedades
    for each row execute function kit.set_updated_at();

/* =========================================================
 * Section: Semilla del arrendador propio
 * Al crear una organización, se siembra su arrendador "propio"
 * (comisión 0%). security definer -> ignora RLS.
 * ======================================================= */
create or replace function kit.seed_self_arrendador()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
as $$
begin
    insert into public.arrendadores (organization_id, nombre, comision_pct, es_propio, created_by)
    values (new.id, new.name, 0, true, new.created_by);
    return new;
end;
$$;

create trigger organization_seed_self_arrendador
    after insert on public.organizations
    for each row
execute function kit.seed_self_arrendador();
