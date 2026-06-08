-- ============================================================
-- Shakou — Feed social v1 (follow unidirezionale, post, commenti)
-- Esegui questo script nel SQL Editor di Supabase.
--
-- ASSUNZIONI:
--   * profiles.id e posts.id sono di tipo UUID.
--   * profiles.id corrisponde all'id dell'utente di auth.users.
--   Se posts.id e' di tipo bigint, cambia post_comments.post_id in bigint.
-- ============================================================

-- 1) Follow unidirezionale (chi segue chi)
create table if not exists public.user_follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);
create index if not exists idx_user_follows_following on public.user_follows(following_id);
create index if not exists idx_user_follows_follower  on public.user_follows(follower_id);

-- 2) Visibilita' dei post: 'public' (tutti) | 'followers' (solo chi mi segue)
alter table public.posts
  add column if not exists visibility text not null default 'public';

-- 3) Commenti ai post (distinti dai commenti ai capitoli)
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_post_comments_post on public.post_comments(post_id);

-- 4) Indice per ordinare il feed
create index if not exists idx_posts_created_at on public.posts(created_at desc);

-- 5) FK posts.user_id -> profiles.id (serve a PostgREST per "embeddare" l'autore).
--    Aggiunta solo se manca; se fallisce per dati incoerenti viene saltata.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_user_id_fkey') then
    alter table public.posts
      add constraint posts_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
exception when others then
  raise notice 'Skip posts_user_id_fkey: %', sqlerrm;
end $$;

-- NOTA SICUREZZA: tutte le letture/scritture passano dalle API serverless con
-- il service role, quindi le RLS non sono indispensabili per il funzionamento.
-- Se hai RLS attive su queste tabelle, il service role le bypassa comunque.
