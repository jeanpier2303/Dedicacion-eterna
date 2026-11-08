begin;

do $$
begin
    if not exists (
        select 1
        from public.profiles p
        join auth.users u on u.id = p.id
        where p.role = 'administrador'
          and (u.banned_until is null or u.banned_until <= now())
    ) then
        raise exception 'Migración cancelada: no existe un administrador activo que pueda conservar el acceso';
    end if;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

update public.profiles
set role = 'administrador', updated_at = now()
where role in ('editor', 'consulta');

alter table public.profiles alter column role drop default;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role = 'administrador');

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if new.id is distinct from old.id then
        raise exception 'No se permite cambiar el identificador del perfil';
    end if;
    if new.role <> 'administrador' then
        raise exception 'El único rol permitido es administrador';
    end if;
    if new.role is distinct from old.role and auth.uid() is not null then
        if new.id = auth.uid() then
            raise exception 'No puedes modificar tu propio rol';
        end if;
        if not coalesce(public.is_admin(), false) then
            raise exception 'Solo un administrador puede cambiar roles';
        end if;
    end if;
    return new;
end;
$$;

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select
using (is_active = true or public.is_admin());
drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories for insert with check (public.is_admin());
drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (is_published = true or public.is_admin());
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert with check (public.is_admin());
drop policy if exists products_update on public.products;
create policy products_update on public.products for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_media_select on public.product_media;
create policy product_media_select on public.product_media for select
using (public.is_admin() or exists (
    select 1 from public.products p
    where p.id = product_media.product_id and p.is_published = true
));
drop policy if exists product_media_insert on public.product_media;
create policy product_media_insert on public.product_media for insert with check (public.is_admin());
drop policy if exists product_media_update on public.product_media;
create policy product_media_update on public.product_media for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists product_media_delete on public.product_media;
create policy product_media_delete on public.product_media for delete using (public.is_admin());

drop policy if exists "product_media_staff_read" on storage.objects;
create policy "product_media_staff_read" on storage.objects for select to authenticated
using (bucket_id in ('product-images', 'product-videos') and public.is_admin());
drop policy if exists "product_media_staff_insert" on storage.objects;
create policy "product_media_staff_insert" on storage.objects for insert to authenticated
with check (bucket_id in ('product-images', 'product-videos') and public.is_admin());
drop policy if exists "product_media_staff_update" on storage.objects;
create policy "product_media_staff_update" on storage.objects for update to authenticated
using (bucket_id in ('product-images', 'product-videos') and public.is_admin())
with check (bucket_id in ('product-images', 'product-videos') and public.is_admin());
drop policy if exists "product_media_staff_delete" on storage.objects;
create policy "product_media_staff_delete" on storage.objects for delete to authenticated
using (bucket_id in ('product-images', 'product-videos') and public.is_admin());

drop function if exists public.assign_role(uuid, text);
drop function if exists public.is_editor();

create or replace function public.prevent_last_active_admin_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    target_is_admin boolean;
    active_admins bigint;
begin
    if new.banned_until is not null and new.banned_until > now() then
        perform pg_advisory_xact_lock(hashtext('dedicacion_eterna_last_admin'));
        select exists(select 1 from public.profiles p where p.id = old.id and p.role = 'administrador')
          into target_is_admin;
        if target_is_admin then
            select count(*) into active_admins
            from auth.users u
            join public.profiles p on p.id = u.id
            where p.role = 'administrador'
              and (u.banned_until is null or u.banned_until <= now());
            if active_admins <= 1 then
                raise exception 'No se puede desactivar al último administrador activo';
            end if;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists prevent_last_active_admin_deactivation on auth.users;
create trigger prevent_last_active_admin_deactivation
before update of banned_until on auth.users
for each row execute function public.prevent_last_active_admin_deactivation();

do $$
begin
    if not exists (
        select 1
        from public.profiles p
        join auth.users u on u.id = p.id
        where p.role = 'administrador'
          and (u.banned_until is null or u.banned_until <= now())
    ) then
        raise exception 'Migración cancelada: no queda un administrador activo';
    end if;
end;
$$;

commit;
