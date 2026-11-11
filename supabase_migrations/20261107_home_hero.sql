begin;

create table if not exists public.home_hero (
    id           smallint primary key default 1 check (id = 1),
    title        text not null default '',
    description  text not null default '',
    button_label text not null default '',
    button_href  text not null default '',
    media_type   text not null default 'image' check (media_type in ('image', 'video')),
    image_path   text,
    video_path   text,
    is_published boolean not null default false,
    starts_at    timestamptz,
    ends_at      timestamptz,
    updated_at   timestamptz not null default now(),
    constraint home_hero_dates_order check (starts_at is null or ends_at is null or ends_at > starts_at)
);

comment on table public.home_hero is
    'Única portada principal del sitio: una sola fila (id = 1) y un solo estado publicado.';

alter table public.home_hero enable row level security;

drop policy if exists home_hero_live_select on public.home_hero;
create policy home_hero_live_select
    on public.home_hero for select
    to anon, authenticated
    using (
        is_published
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at > now())
    );

drop trigger if exists home_hero_updated_at on public.home_hero;
create trigger home_hero_updated_at
    before update on public.home_hero
    for each row execute function public.set_updated_at();

insert into public.home_hero (id)
values (1)
on conflict (id) do nothing;

commit;
