-- ============================================================
-- Japan 2027 Trip Tracker — Supabase one-time setup
-- Run this once in: Supabase dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) The single table that holds the (encrypted) shared trip state.
create table if not exists public.trip_state (
  room        text primary key,            -- shared room name you pick
  salt        text not null,               -- KDF salt (not secret)
  payload     text not null,               -- AES-GCM ciphertext (your whole trip)
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- 2) Enable Row Level Security (best practice — never leave it off).
alter table public.trip_state enable row level security;

-- 3) Policy: allow the anon (public) key to read & write THIS table.
--    This is safe here ONLY because the payload is encrypted in the
--    browser with your shared passphrase before it is ever stored —
--    the database only sees ciphertext. The passphrase is the real wall.
drop policy if exists "anon can use trip_state" on public.trip_state;
create policy "anon can use trip_state"
  on public.trip_state
  for all
  to anon
  using (true)
  with check (true);

-- 4) (Optional) Realtime for instant updates instead of ~25s polling:
--    Database → Replication → enable for `trip_state`, OR run:
-- alter publication supabase_realtime add table public.trip_state;
