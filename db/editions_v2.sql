-- ============================================================
-- Shakou — Edizioni v2: supporto edizioni multiple per manga
-- Esegui nel SQL Editor di Supabase DOPO editions.sql
-- ============================================================

-- 1) Aggiungi edition_name a manga_editions
alter table public.manga_editions
  add column if not exists edition_name text not null default 'Standard';

-- 2) Aggiorna il vincolo unique per includere edition_name
alter table public.manga_editions
  drop constraint if exists manga_editions_source_external_id_volume_number_key;
alter table public.manga_editions
  add constraint manga_editions_unique
  unique (source, external_id, edition_name, volume_number);

-- 3) Aggiungi edition_name a user_manga per tracciare quale edizione possiede l'utente
alter table public.user_manga
  add column if not exists edition_name text default 'Standard';

-- 4) Aggiorna la vista per includere edition_name e calcolare owned_value sull'edizione corretta
drop view if exists public.user_library_stats_view;
create view public.user_library_stats_view as
select
  um.user_id,
  um.source,
  um.external_id,
  um.status,
  um.volumes_owned,
  um.volumes_read,
  coalesce(um.edition_name, 'Standard') as edition_name,
  (
    select me.publisher
    from public.manga_editions me
    where me.source = um.source
      and me.external_id = um.external_id
      and me.edition_name = coalesce(um.edition_name, 'Standard')
    group by me.publisher
    order by count(*) desc
    limit 1
  ) as publisher,
  (
    select coalesce(sum(me.price), 0)
    from public.manga_editions me
    where me.source = um.source
      and me.external_id = um.external_id
      and me.edition_name = coalesce(um.edition_name, 'Standard')
      and me.volume_number <= um.volumes_owned
      and me.price is not null
  ) as owned_value
from public.user_manga um;
