# Supabase Setup (Poll + Guestbook)

## 1. Create tables in SQL Editor

Run this in [Supabase](https://supabase.com) Dashboard > SQL Editor:

```sql
-- Poll votes
create table if not exists poll_votes (
  id uuid default gen_random_uuid() primary key,
  choice text not null,
  created_at timestamptz default now()
);

alter table poll_votes enable row level security;
drop policy if exists "Allow anonymous insert" on poll_votes;
drop policy if exists "Allow anonymous select" on poll_votes;
create policy "Allow anonymous insert" on poll_votes for insert with check (true);
create policy "Allow anonymous select" on poll_votes for select using (true);

-- Guestbook
create table if not exists guestbook (
  id uuid default gen_random_uuid() primary key,
  username text not null,
  comment text not null,
  created_at timestamptz default now()
);

alter table guestbook enable row level security;
drop policy if exists "Allow anonymous insert guestbook" on guestbook;
drop policy if exists "Allow anonymous select guestbook" on guestbook;
create policy "Allow anonymous insert guestbook" on guestbook for insert with check (true);
create policy "Allow anonymous select guestbook" on guestbook for select using (true);
```

## 2. Add your API key to .env

Copy your **publishable (anon) key** from Dashboard > Project Settings > API Keys, and add it to `.env`:

```
PUBLIC_SUPABASE_ANON_KEY=your-publishable-key-here
```

The project URL is already set. Rebuild the site.
