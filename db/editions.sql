-- ============================================================
-- Shakou — Repo Centrale: edizioni italiane dei manga
-- Esegui nel SQL Editor di Supabase.
-- ============================================================

-- Tabella principale delle edizioni italiane
create table if not exists public.manga_editions (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,            -- 'anilist' | 'mangadex'
  external_id   text not null,            -- id del manga nella fonte
  volume_number int  not null,            -- numero volume (1-based)
  publisher     text,                     -- editore italiano (Panini, Star Comics, J-Pop, …)
  title         text,                     -- titolo italiano del volume (se diverso dalla serie)
  price         numeric(6,2),             -- prezzo di copertina in EUR
  release_date  date,                     -- data uscita italiana
  isbn          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (source, external_id, volume_number)
);

create index if not exists manga_editions_manga_idx on public.manga_editions (source, external_id);

-- RLS: chiunque può leggere, solo service-role può scrivere (l'API usa la service key)
alter table public.manga_editions enable row level security;

create policy "editions_select" on public.manga_editions
  for select using (true);

-- Vista aggregata per le statistiche di libreria dell'utente:
-- unisce user_manga (volumi posseduti) con manga_editions (prezzo + editore)
-- per calcolare valore collezione e breakdown per editore.
create or replace view public.user_library_stats_view as
select
  um.user_id,
  um.source,
  um.external_id,
  um.status,
  um.volumes_owned,
  um.volumes_read,
  -- editore più comune per questo manga (può essere null se non ci sono edizioni)
  (
    select me.publisher
    from public.manga_editions me
    where me.source = um.source and me.external_id = um.external_id
    group by me.publisher
    order by count(*) desc
    limit 1
  ) as publisher,
  -- valore stimato: somma prezzi dei volumi posseduti (i primi volumes_owned)
  (
    select coalesce(sum(me.price), 0)
    from public.manga_editions me
    where me.source = um.source
      and me.external_id = um.external_id
      and me.volume_number <= um.volumes_owned
      and me.price is not null
  ) as owned_value
from public.user_manga um;
