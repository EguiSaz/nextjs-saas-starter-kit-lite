/*
 * -------------------------------------------------------
 * GestorPro — Módulo 6: Plantillas
 *
 *   plantillas -> documentos/mensajes reutilizables (contratos, recordatorios,
 *   recibos). Almacenamiento + CRUD. La interpolación de variables queda para
 *   un módulo futuro.
 *
 * Depende del Módulo 0.
 * -------------------------------------------------------
 */

create type public.tipo_plantilla as enum
    ('contrato', 'recordatorio', 'recibo', 'otro');

create table if not exists public.plantillas (
    id              uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    nombre          varchar(255) not null,
    tipo            public.tipo_plantilla not null default 'contrato',
    contenido       text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    created_by      uuid references auth.users
);

comment on table public.plantillas is 'Plantillas reutilizables (contratos, recordatorios, recibos).';

alter table public.plantillas enable row level security;

create policy plantillas_select on public.plantillas
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy plantillas_manage on public.plantillas
    for all to authenticated
    using (public.has_permission(organization_id, 'plantillas.manage'))
    with check (public.has_permission(organization_id, 'plantillas.manage'));

revoke all on public.plantillas from authenticated, service_role;
grant select, insert, update, delete on table public.plantillas to authenticated, service_role;

create trigger plantillas_set_updated_at
    before update on public.plantillas
    for each row execute function kit.set_updated_at();
