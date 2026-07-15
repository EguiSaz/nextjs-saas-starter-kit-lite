/*
 * -------------------------------------------------------
 * GestorPro — Módulo 0: Fundación multi-tenant
 * Añade la capa de organización (tenant) sobre el kit lite,
 * que solo trae cuentas personales (public.accounts).
 *
 *   organizations   -> el tenant del negocio
 *   roles           -> catálogo de roles (referencia)
 *   role_permissions-> matriz rol -> permiso (referencia)
 *   memberships     -> usuario <-> organización (+ rol)
 *   invitations     -> invitaciones a la organización
 *
 * Helpers RLS (schema public, security definer):
 *   auth_org_ids(), is_org_member(), is_org_owner(), has_permission()
 *
 * Nota: public.accounts se conserva intacto como perfil personal.
 * Ninguna tabla de dominio referencia accounts; todo cuelga de organizations.
 * -------------------------------------------------------
 */

/* =========================================================
 * Section: Enum de permisos de la aplicación
 * ======================================================= */
create type public.app_permission as enum (
    'organization.manage',
    'billing.manage',
    'members.manage',
    'roles.manage',
    'arrendadores.manage',
    'propiedades.manage',
    'inquilinos.manage',
    'contratos.manage',
    'contratos.close',
    'transacciones.manage',
    'incidencias.manage',
    'plantillas.manage',
    'reportes.view'
);

/* =========================================================
 * Section: Organizations (tenant)
 * ======================================================= */
create table if not exists public.organizations (
    id          uuid primary key default extensions.uuid_generate_v4(),
    name        varchar(255) not null,
    slug        varchar(63) unique,
    created_by  uuid references auth.users,
    updated_by  uuid references auth.users,
    public_data jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.organizations is 'Organización (tenant) de GestorPro. Puede ser un arrendador autoadministrado o una inmobiliaria.';

alter table public.organizations enable row level security;

revoke all on public.organizations from authenticated, service_role;
grant select, insert, update, delete on table public.organizations to authenticated, service_role;

/* =========================================================
 * Section: Roles (referencia)
 * ======================================================= */
create table if not exists public.roles (
    name            varchar(50) primary key,
    hierarchy_level int not null unique
);

comment on table public.roles is 'Catálogo de roles. hierarchy_level: 1 = mayor autoridad.';

insert into public.roles (name, hierarchy_level) values
    ('owner', 1),
    ('admin', 2),
    ('member', 3)
on conflict (name) do nothing;

alter table public.roles enable row level security;

revoke all on public.roles from authenticated, service_role;
grant select on table public.roles to authenticated;
grant select, insert, update, delete on table public.roles to service_role;

/* =========================================================
 * Section: Role permissions (referencia)
 * ======================================================= */
create table if not exists public.role_permissions (
    id         bigint generated always as identity primary key,
    role       varchar(50) not null references public.roles(name) on delete cascade,
    permission public.app_permission not null,
    unique (role, permission)
);

comment on table public.role_permissions is 'Matriz rol -> permiso.';

-- owner: todos los permisos
insert into public.role_permissions (role, permission)
select 'owner', p
from unnest(enum_range(null::public.app_permission)) as p
on conflict (role, permission) do nothing;

-- admin: todo excepto billing.manage y organization.manage
insert into public.role_permissions (role, permission)
select 'admin', p
from unnest(enum_range(null::public.app_permission)) as p
where p not in ('billing.manage', 'organization.manage')
on conflict (role, permission) do nothing;

-- member (agente): operación de dominio + ver reportes
insert into public.role_permissions (role, permission) values
    ('member', 'arrendadores.manage'),
    ('member', 'propiedades.manage'),
    ('member', 'inquilinos.manage'),
    ('member', 'contratos.manage'),
    ('member', 'contratos.close'),
    ('member', 'transacciones.manage'),
    ('member', 'incidencias.manage'),
    ('member', 'plantillas.manage'),
    ('member', 'reportes.view')
on conflict (role, permission) do nothing;

alter table public.role_permissions enable row level security;

revoke all on public.role_permissions from authenticated, service_role;
grant select on table public.role_permissions to authenticated;
grant select, insert, update, delete on table public.role_permissions to service_role;

/* =========================================================
 * Section: Memberships (usuario <-> organización)
 * ======================================================= */
create table if not exists public.memberships (
    id              uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id         uuid not null references auth.users(id) on delete cascade,
    role            varchar(50) not null references public.roles(name),
    created_at      timestamptz not null default now(),
    created_by      uuid references auth.users,
    unique (organization_id, user_id)
);

comment on table public.memberships is 'Membresía de un usuario en una organización, con su rol.';

-- auth_org_ids() filtra por user_id en cada request
create index if not exists memberships_user_id_idx on public.memberships (user_id);

alter table public.memberships enable row level security;

revoke all on public.memberships from authenticated, service_role;
grant select, insert, update, delete on table public.memberships to authenticated, service_role;

/* =========================================================
 * Section: Invitations
 * ======================================================= */
create table if not exists public.invitations (
    id              uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    email           varchar(320) not null,
    role            varchar(50) not null references public.roles(name),
    invite_token    uuid not null default extensions.uuid_generate_v4() unique,
    invited_by      uuid references auth.users,
    expires_at      timestamptz not null default (now() + interval '7 days'),
    created_at      timestamptz not null default now(),
    unique (organization_id, email)
);

comment on table public.invitations is 'Invitaciones para unirse a una organización.';

alter table public.invitations enable row level security;

revoke all on public.invitations from authenticated, service_role;
grant select, insert, update, delete on table public.invitations to authenticated, service_role;

/* =========================================================
 * Section: Helpers RLS
 * Todos security definer + search_path = '' para poder
 * consultar memberships sin disparar su propia RLS (evita
 * recursión) y con identificadores totalmente calificados.
 * ======================================================= */

-- Organizaciones del usuario autenticado
create or replace function public.auth_org_ids()
    returns setof uuid
    language sql
    stable
    security definer
    set search_path = ''
as $$
    select m.organization_id
    from public.memberships m
    where m.user_id = (select auth.uid());
$$;

grant execute on function public.auth_org_ids() to authenticated, service_role;

-- ¿El usuario es miembro de la organización?
create or replace function public.is_org_member(org_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
as $$
    select exists (
        select 1
        from public.memberships m
        where m.user_id = (select auth.uid())
          and m.organization_id = org_id
    );
$$;

grant execute on function public.is_org_member(uuid) to authenticated, service_role;

-- ¿El usuario es owner de la organización?
create or replace function public.is_org_owner(org_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
as $$
    select exists (
        select 1
        from public.memberships m
        where m.user_id = (select auth.uid())
          and m.organization_id = org_id
          and m.role = 'owner'
    );
$$;

grant execute on function public.is_org_owner(uuid) to authenticated, service_role;

-- ¿El usuario tiene un permiso concreto en la organización?
create or replace function public.has_permission(org_id uuid, perm public.app_permission)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
as $$
    select exists (
        select 1
        from public.memberships m
        join public.role_permissions rp on rp.role = m.role
        where m.user_id = (select auth.uid())
          and m.organization_id = org_id
          and rp.permission = perm
    );
$$;

grant execute on function public.has_permission(uuid, public.app_permission) to authenticated, service_role;

/* =========================================================
 * Section: Políticas RLS
 * ======================================================= */

-- organizations
create policy organizations_select on public.organizations
    for select to authenticated
    using (id in (select public.auth_org_ids()));

create policy organizations_insert on public.organizations
    for insert to authenticated
    with check ((select auth.uid()) = created_by);

create policy organizations_update on public.organizations
    for update to authenticated
    using (public.has_permission(id, 'organization.manage'))
    with check (public.has_permission(id, 'organization.manage'));

create policy organizations_delete on public.organizations
    for delete to authenticated
    using (public.is_org_owner(id));

-- roles / role_permissions: referencia de solo lectura para autenticados
create policy roles_read on public.roles
    for select to authenticated
    using (true);

create policy role_permissions_read on public.role_permissions
    for select to authenticated
    using (true);

-- memberships
create policy memberships_select on public.memberships
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy memberships_manage on public.memberships
    for all to authenticated
    using (public.has_permission(organization_id, 'members.manage'))
    with check (public.has_permission(organization_id, 'members.manage'));

-- invitations
create policy invitations_select on public.invitations
    for select to authenticated
    using (organization_id in (select public.auth_org_ids()));

create policy invitations_manage on public.invitations
    for all to authenticated
    using (public.has_permission(organization_id, 'members.manage'))
    with check (public.has_permission(organization_id, 'members.manage'));

/* =========================================================
 * Section: updated_at
 * ======================================================= */
create or replace function kit.set_updated_at()
    returns trigger
    language plpgsql
    set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger organizations_set_updated_at
    before update on public.organizations
    for each row
execute function kit.set_updated_at();

/* =========================================================
 * Section: Semilla del owner al crear una organización
 * Al insertar una organización, el creador queda como owner.
 * security definer -> puede insertar en memberships sin RLS.
 * ======================================================= */
create or replace function kit.organization_owner_setup()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
as $$
begin
    if new.created_by is not null then
        insert into public.memberships (organization_id, user_id, role, created_by)
        values (new.id, new.created_by, 'owner', new.created_by)
        on conflict (organization_id, user_id) do nothing;
    end if;
    return new;
end;
$$;

create trigger organization_owner_setup
    after insert on public.organizations
    for each row
execute function kit.organization_owner_setup();

/* =========================================================
 * Section: Onboarding
 * Al registrarse un usuario, además de su cuenta personal
 * (public.accounts, que ya crea el kit) se crea su
 * organización por defecto. El trigger de arriba lo hace owner.
 * Se REEMPLAZA kit.new_user_created_setup conservando su
 * lógica original y añadiendo la creación de la organización.
 * ======================================================= */
create or replace function kit.new_user_created_setup()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
as $$
declare
    user_name   text;
    picture_url text;
begin
    if new.raw_user_meta_data ->> 'name' is not null then
        user_name := new.raw_user_meta_data ->> 'name';
    end if;

    if user_name is null and new.email is not null then
        user_name := split_part(new.email, '@', 1);
    end if;

    if user_name is null then
        user_name := '';
    end if;

    if new.raw_user_meta_data ->> 'avatar_url' is not null then
        picture_url := new.raw_user_meta_data ->> 'avatar_url';
    else
        picture_url := null;
    end if;

    -- Cuenta personal (comportamiento original del kit)
    insert into public.accounts (id, name, picture_url, email)
    values (new.id, user_name, picture_url, new.email);

    -- Organización por defecto de GestorPro (trigger la hace owner)
    insert into public.organizations (name, created_by)
    values (coalesce(nullif(user_name, ''), 'Mi organización'), new.id);

    return new;
end;
$$;
