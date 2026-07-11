/*
 * -------------------------------------------------------
 * GestorPro — Módulo 2: Inquilinos
 *
 *   inquilinos -> catálogo de arrendatarios de la organización.
 *
 * Depende del Módulo 0 (organizations, has_permission, auth_org_ids,
 * kit.set_updated_at).
 * -------------------------------------------------------
 */

create table if not exists public.inquilinos (
    id                  uuid primary key default extensions.uuid_generate_v4(),
    organization_id     uuid not null references public.organizations(id) on delete cascade,
    nombre              varchar(255) not null,
    email               varchar(320),
    telefono            varchar(50),
    identificacion      varchar(50),
    contacto_emergencia varchar(255),
    notas               text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    created_by          uuid references auth.users,
    -- objetivo de la FK compuesta de contratos (garantiza integridad same-org)
    unique (organization_id, id)
);

comment on table public.inquilinos is 'Arrendatarios (personas que rentan) dentro de una organización.';

alter table public.inquilinos enable row level security;

create policy inquilinos_select on public.inquilinos
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy inquilinos_manage on public.inquilinos
    for all to authenticated
    using (public.has_permission(organization_id, 'inquilinos.manage'))
    with check (public.has_permission(organization_id, 'inquilinos.manage'));

revoke all on public.inquilinos from authenticated, service_role;
grant select, insert, update, delete on table public.inquilinos to authenticated, service_role;

create trigger inquilinos_set_updated_at
    before update on public.inquilinos
    for each row execute function kit.set_updated_at();
