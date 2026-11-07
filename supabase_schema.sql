
create table if not exists public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    full_name   text,
    role        text not null default 'consulta'
                check (role in ('administrador', 'editor', 'consulta')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.profiles is
    'Perfil de cada usuario de Supabase Auth. El rol controla los permisos del panel.';


create table if not exists public.categories (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    slug        text not null unique,
    description text,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on column public.categories.slug is
    'Clave pública estable, igual a la key de window.CATEGORIES (ej. vela-personalizada).';


create table if not exists public.products (
    id                uuid primary key default gen_random_uuid(),
    name              text not null,
    slug              text not null unique,          -- ID público actual (ej. 'vela-personalizada')
    short_description text,                          -- texto corto de la tarjeta
    description       text,                          -- descripción larga del modal
    category_id       uuid not null references public.categories (id) on delete restrict,
    price             numeric(12,2) check (price is null or price >= 0),
    old_price         numeric(12,2) check (old_price is null or old_price >= 0),
    is_published      boolean not null default false, -- publicado / oculto
    is_featured       boolean not null default false, -- "destacado" del catálogo
    display_order     integer not null default 0,     -- orden manual
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

comment on column public.products.price is
    'NULL = "Consultar precio" (no inventar precios).';
comment on column public.products.is_featured is
    'true = visible en la portada del catálogo ("destacado").';
comment on column public.products.slug is
    'ID público usado en ?producto=slug. No debe cambiarse una vez publicado.';


create table if not exists public.product_media (
    id           uuid primary key default gen_random_uuid(),
    product_id   uuid not null references public.products (id) on delete cascade,
    media_type   text not null check (media_type in ('image', 'video')),
    storage_path text not null,
    alt_text     text,
    display_order integer not null default 0,
    is_primary   boolean not null default false,
    created_at   timestamptz not null default now(),
    -- Solo las imágenes pueden ser la principal
    constraint media_primary_only_images check (not (is_primary and media_type <> 'image')),
    -- Evita duplicar el mismo archivo en el mismo producto
    constraint media_unique_path unique (product_id, storage_path)
);


alter table public.product_media drop column if exists public_url;

comment on column public.product_media.is_primary is
    'true = imagen principal del producto (una sola por producto, solo imágenes).';
comment on column public.product_media.product_id is
    'ON DELETE CASCADE: al borrar el producto se borran las filas.
     Los ARCHIVOS de Storage los borra el backend (sección 8).';


-- ============================================================
-- 2. FUNCIONES AUXILIARES
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 set_updated_at — mantiene updated_at en cada UPDATE
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- ------------------------------------------------------------
-- 2.2 current_user_role — rol del usuario autenticado
--     SECURITY DEFINER: evita recursión con RLS sobre profiles.
--     Devuelve NULL en SQL Editor y con la service_role key.
-- ------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select public.current_user_role() = 'administrador';
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select public.current_user_role() in ('administrador', 'editor');
$$;


revoke execute on function public.current_user_role() from public;
revoke execute on function public.is_admin()         from public;
revoke execute on function public.is_editor()        from public;
grant  execute on function public.current_user_role() to anon, authenticated, service_role;
grant  execute on function public.is_admin()          to anon, authenticated, service_role;
grant  execute on function public.is_editor()         to anon, authenticated, service_role;


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.profiles (id, full_name)
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            split_part(coalesce(new.email, ''), '@', 1)
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if new.id is distinct from old.id then
        raise exception 'No se permite cambiar el identificador del perfil';
    end if;

    if new.role is distinct from old.role then
        if auth.uid() is not null then
            if new.id = auth.uid() then
                raise exception 'No puedes modificar tu propio rol';
            end if;
            if not coalesce(public.is_admin(), false) then
                raise exception 'Solo un administrador puede cambiar roles de otros usuarios';
            end if;
            if new.role not in ('editor', 'consulta') then
                raise exception 'Para otorgar el rol administrador use public.assign_administrator()';
            end if;
        end if;
    end if;

    return new;
end;
$$;

create or replace function public.assign_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if new_role is distinct from 'editor'
       and new_role is distinct from 'consulta' then
        raise exception 'Rol no permitido por esta vía: %. Use ''editor'' o ''consulta''', new_role;
    end if;

    if auth.uid() is not null then
        if target_user_id = auth.uid() then
            raise exception 'No puedes modificar tu propio rol';
        end if;
        if not coalesce(public.is_admin(), false) then
            raise exception 'Solo un administrador puede asignar roles';
        end if;
    end if;

    if not exists (select 1 from auth.users u where u.id = target_user_id) then
        raise exception 'No existe ningún usuario con id %', target_user_id;
    end if;

    update public.profiles
       set role = new_role
     where id = target_user_id;

    if not found then
        insert into public.profiles (id, role)
        values (target_user_id, new_role)
        on conflict (id) do update set role = excluded.role;
    end if;
end;
$$;

revoke execute on function public.assign_role(uuid, text) from public;
grant  execute on function public.assign_role(uuid, text) to authenticated, service_role;

create or replace function public.assign_administrator(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not exists (select 1 from auth.users u where u.id = target_user_id) then
        raise exception 'No existe ningún usuario con id %', target_user_id;
    end if;

    update public.profiles
       set role = 'administrador',
           updated_at = now()
     where id = target_user_id;

    if not found then
        insert into public.profiles (id, role)
        values (target_user_id, 'administrador')
        on conflict (id) do update
            set role = 'administrador',
                updated_at = now();
    end if;
end;
$$;

revoke execute on function public.assign_administrator(uuid) from public;
revoke execute on function public.assign_administrator(uuid) from anon;
revoke execute on function public.assign_administrator(uuid) from authenticated;
grant  execute on function public.assign_administrator(uuid) to service_role;


-- ============================================================
-- 3. TRIGGERS
-- ============================================================
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
    before update on public.profiles
    for each row execute function public.protect_profile_role();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at
    before update on public.categories
    for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();


-- ============================================================
-- 4. ÍNDICES
-- ============================================================
create index if not exists products_category_idx
    on public.products (category_id);
create index if not exists products_public_listing_idx
    on public.products (is_published, is_featured, display_order);
create index if not exists product_media_gallery_idx
    on public.product_media (product_id, display_order);

-- Una sola imagen principal por producto
create unique index if not exists product_media_one_primary_idx
    on public.product_media (product_id)
    where is_primary;


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.products     enable row level security;
alter table public.product_media enable row level security;

-- ------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
    on public.profiles for select
    using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
    on public.profiles for update
    using (id = auth.uid() or public.is_admin())
    with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete
    on public.profiles for delete
    using (public.is_admin());

drop policy if exists categories_select on public.categories;
create policy categories_select
    on public.categories for select
    using (
        is_active = true
        or public.current_user_role() in ('administrador', 'editor', 'consulta')
    );

drop policy if exists categories_insert on public.categories;
create policy categories_insert
    on public.categories for insert
    with check (public.is_editor());

drop policy if exists categories_update on public.categories;
create policy categories_update
    on public.categories for update
    using (public.is_editor())
    with check (public.is_editor());

drop policy if exists categories_delete on public.categories;
create policy categories_delete
    on public.categories for delete
    using (public.is_admin());

-- ------------------------------------------------------------
-- 5.3 products
--     · Lectura pública: solo publicados.
--       Editores/administradores también ven los borradores.
--     · Alta y edición: editor o administrador.
--     · Baja: solo administrador (los editores ocultan con
--       is_published = false).
-- ------------------------------------------------------------
drop policy if exists products_select on public.products;
create policy products_select
    on public.products for select
    using (is_published = true or public.is_editor());

drop policy if exists products_insert on public.products;
create policy products_insert
    on public.products for insert
    with check (public.is_editor());

drop policy if exists products_update on public.products;
create policy products_update
    on public.products for update
    using (public.is_editor())
    with check (public.is_editor());

drop policy if exists products_delete on public.products;
create policy products_delete
    on public.products for delete
    using (public.is_admin());

-- ------------------------------------------------------------
-- 5.4 product_media
--     · Lectura: editores (para el panel) o medios de productos
--       publicados. La fila da solo la RUTA: como el bucket es
--       privado, la ruta por sí sola no permite ver el archivo.
--     · Alta, edición y borrado: editor o administrador.
-- ------------------------------------------------------------
drop policy if exists product_media_select on public.product_media;
create policy product_media_select
    on public.product_media for select
    using (
        public.is_editor()
        or exists (
            select 1 from public.products p
            where p.id = product_media.product_id
              and p.is_published = true
        )
    );

drop policy if exists product_media_insert on public.product_media;
create policy product_media_insert
    on public.product_media for insert
    with check (public.is_editor());

drop policy if exists product_media_update on public.product_media;
create policy product_media_update
    on public.product_media for update
    using (public.is_editor())
    with check (public.is_editor());

drop policy if exists product_media_delete on public.product_media;
create policy product_media_delete
    on public.product_media for delete
    using (public.is_editor());


-- ============================================================
-- 6. DATOS INICIALES — categorías actuales del catálogo
--     Origen: window.CATEGORIES (js/products.js)
--     on conflict: no se duplican si se vuelve a ejecutar
-- ============================================================
insert into public.categories (name, slug, is_active)
values
    ('Agendas',      'agendas',      true),
    ('Cuadros',      'cuadros',      true),
    ('Fotografía',   'fotografia',   true),
    ('Impresiones',  'impresiones',  true),
    ('Velas',        'velas',        true),
    ('Carteles',     'carteles',     true),
    ('Álbumes',      'albumes',      true),
    ('Invitaciones', 'invitaciones', true),
    ('Regalos',      'regalos',      true),
    ('Papelería',    'papeleria',    true),
    ('Otros',        'otros',        true)
on conflict (slug) do nothing;


insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    (
        'product-images',
        'product-images',
        false,                -- PRIVADO
        10485760,             -- 10 MB
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    ),
    (
        'product-videos',
        'product-videos',
        false,                -- PRIVADO
        104857600,            -- 100 MB
        array['video/mp4', 'video/webm', 'video/quicktime']
    )
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;



-- Limpieza de la política pública de una versión anterior:
drop policy if exists "product_media_public_read" on storage.objects;

drop policy if exists "product_media_staff_read" on storage.objects;
create policy "product_media_staff_read"
    on storage.objects for select
    to authenticated
    using (
        bucket_id in ('product-images', 'product-videos')
        and public.is_editor()
    );

drop policy if exists "product_media_staff_insert" on storage.objects;
create policy "product_media_staff_insert"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id in ('product-images', 'product-videos')
        and public.is_editor()
    );

drop policy if exists "product_media_staff_update" on storage.objects;
create policy "product_media_staff_update"
    on storage.objects for update
    to authenticated
    using (
        bucket_id in ('product-images', 'product-videos')
        and public.is_editor()
    )
    with check (
        bucket_id in ('product-images', 'product-videos')
        and public.is_editor()
    );

drop policy if exists "product_media_staff_delete" on storage.objects;
create policy "product_media_staff_delete"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id in ('product-images', 'product-videos')
        and public.is_editor()
    );

