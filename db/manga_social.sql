-- ============================================================
-- Shakou — Voti, recensioni e commenti su manga e capitoli
-- Esegui nel SQL Editor di Supabase.
--
-- Le righe sono ancorate a (source, external_id) del manga (es. 'anilist','30002')
-- e a uno "scope": 'manga' (tutto il manga) oppure 'chapter' (un capitolo),
-- con scope_number = numero capitolo (null per lo scope 'manga').
-- ============================================================

-- Voto (1-5) + recensione opzionale. Uno per utente / manga (o capitolo).
create table if not exists public.manga_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  source      text not null,
  external_id text not null,
  scope       text not null default 'manga',   -- 'manga' | 'chapter'
  scope_number int,                              -- numero capitolo (null per 'manga')
  rating      int not null check (rating between 1 and 5),
  body        text,                              -- testo recensione (opzionale)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- unicità per utente/scope (coalesce gestisce scope_number null)
create unique index if not exists uq_manga_ratings_user
  on public.manga_ratings(user_id, source, external_id, scope, coalesce(scope_number, -1));
create index if not exists idx_manga_ratings_lookup
  on public.manga_ratings(source, external_id, scope, scope_number);

-- Commenti liberi su manga/capitolo.
create table if not exists public.manga_thread_comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  source      text not null,
  external_id text not null,
  scope       text not null default 'manga',
  scope_number int,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mtc_lookup
  on public.manga_thread_comments(source, external_id, scope, scope_number);

-- NOTA: tutte le letture/scritture passano dalle API serverless col service role,
-- quindi le RLS non sono indispensabili (vengono comunque bypassate dal service role).
