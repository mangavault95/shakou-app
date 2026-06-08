-- ============================================================
-- Shakou — Pulizia database (tabelle/colonne legacy e di backup)
-- Esegui nel SQL Editor di Supabase DOPO aver controllato.
--
-- Tutte le tabelle qui sotto sono VUOTE (tranne manga_backup = 1 riga di
-- backup) e NON sono referenziate dal codice attuale. Riguardano un vecchio
-- modello dati (series/items/comments, follows) gia' sostituito da:
--   follows         -> user_follows
--   manga_comments  -> manga_thread_comments
--   comments/items/series -> manga_thread_comments / post_comments
--
-- Consiglio: se vuoi massima prudenza, esegui prima un backup/snapshot.
-- Lo script usa IF EXISTS, quindi e' ripetibile senza errori.
-- ============================================================

-- 1) Rimuovi la colonna inutilizzata likes.comment_id (e la sua FK verso comments)
alter table public.likes drop column if exists comment_id;

-- 2) (opzionale) colonna mai usata sui post
alter table public.posts drop column if exists media;

-- 3) Vecchio modello "series / items / comments"
--    Ordine: comments -> items -> series (per le foreign key).
drop table if exists public.comments;
drop table if exists public.items;
drop table if exists public.series;

-- 4) Tabelle social legacy sostituite
drop table if exists public.follows;          -- -> user_follows
drop table if exists public.manga_comments;   -- -> manga_thread_comments

-- 5) Log attivita' mai usato
drop table if exists public.activity;

-- 6) Tabelle di backup
drop table if exists public.chapters_backup;
drop table if exists public.manga_backup;

-- ============================================================
-- NON eliminate (le tengo): chapters, volumes, notifications.
-- Sono vuote ma fanno parte di feature pianificate (repo centrale capitoli,
-- notifiche). Se decidi che non ti servono, puoi rimuoverle cosi':
--   drop table if exists public.notifications;
--   drop table if exists public.chapters;   -- attenzione: scritta da api/sync.js
--   drop table if exists public.volumes;    -- attenzione: scritta da api/sync.js
-- ============================================================
