begin;

alter table public.home_hero
    add column if not exists product_slug text;

comment on column public.home_hero.product_slug is
    'Slug del producto del catálogo que se muestra en el hero superior. NULL = campaña sin producto.';

commit;
