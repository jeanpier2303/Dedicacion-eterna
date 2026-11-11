-- ============================================================
-- Galería propia de la portada principal (home_hero_media)
-- ------------------------------------------------------------
-- Múltiples imágenes y videos para #tendencia, independientes
-- de product_media (galería de productos). La tabla home_hero
-- y sus columnas image_path / video_path NO se tocan: siguen
-- como respaldo para la portada actual.
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================

begin;

create table if not exists public.home_hero_media (
    id            uuid primary key default gen_random_uuid(),
    hero_id       smallint not null default 1 references public.home_hero (id) on delete cascade,
    media_type    text not null check (media_type in ('image', 'video')),
    storage_path  text not null,
    alt_text      text,
    display_order integer not null default 0,
    created_at    timestamptz not null default now(),
    -- Evita registrar el mismo archivo dos veces en la portada
    constraint home_hero_media_unique_path unique (hero_id, storage_path)
);

comment on table public.home_hero_media is
    'Galería propia de la portada principal: múltiples fotos y videos con orden de visualización. El primero de la lista es el medio principal inicial.';
comment on column public.home_hero_media.hero_id is
    'ON DELETE CASCADE: la portada solo tiene la fila id = 1, por lo que todas las filas pertenecen a ella.';
comment on column public.home_hero_media.storage_path is
    'Ruta en el bucket product-images (fotos) o product-videos (videos), carpeta hero/.';
comment on column public.home_hero_media.display_order is
    'Orden en la galería pública: menor valor = primero.';

create index if not exists home_hero_media_hero_idx
    on public.home_hero_media (hero_id, display_order, created_at);

alter table public.home_hero_media enable row level security;

-- Lectura: administrador, o visitantes cuando la portada está
-- publicada y vigente (la fila da solo la RUTA: el bucket es
-- privado, las URL firmadas las genera el backend).
drop policy if exists home_hero_media_select on public.home_hero_media;
create policy home_hero_media_select
    on public.home_hero_media for select
    using (
        public.is_admin()
        or exists (
            select 1 from public.home_hero h
            where h.id = home_hero_media.hero_id
              and h.is_published = true
              and (h.starts_at is null or h.starts_at <= now())
              and (h.ends_at is null or h.ends_at > now())
        )
    );

-- Escritura: solo administrador (el panel usa service_role).
drop policy if exists home_hero_media_insert on public.home_hero_media;
create policy home_hero_media_insert
    on public.home_hero_media for insert
    with check (public.is_admin());

drop policy if exists home_hero_media_update on public.home_hero_media;
create policy home_hero_media_update
    on public.home_hero_media for update
    using (public.is_admin())
    with check (public.is_admin());

drop policy if exists home_hero_media_delete on public.home_hero_media;
create policy home_hero_media_delete
    on public.home_hero_media for delete
    using (public.is_admin());

commit;
