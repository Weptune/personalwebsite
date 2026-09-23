-- =========================================================
-- Supabase Schema for Post Likes & Post Comments
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =========================================================

-- 1. Create post_likes table
create table if not exists public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast lookup by post_id
create index if not exists idx_post_likes_post_id on public.post_likes(post_id);

-- Enable Row Level Security (RLS)
alter table public.post_likes enable row level security;

-- Policies for post_likes
create policy "Allow public read post_likes"
  on public.post_likes for select
  using (true);

create policy "Allow public insert post_likes"
  on public.post_likes for insert
  with check (true);

create policy "Allow public delete post_likes"
  on public.post_likes for delete
  using (true);


-- 2. Create post_comments table (with nested replies support)
create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id text not null,
  parent_id uuid references public.post_comments(id) on delete cascade,
  username text not null default 'anonymous',
  comment text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast lookup by post_id
create index if not exists idx_post_comments_post_id on public.post_comments(post_id);

-- Enable Row Level Security (RLS)
alter table public.post_comments enable row level security;

-- Policies for post_comments
create policy "Allow public read post_comments"
  on public.post_comments for select
  using (true);

create policy "Allow public insert post_comments"
  on public.post_comments for insert
  with check (true);


-- 3. Create post_comment_likes table (for synchronizing comment likes across devices)
create table if not exists public.post_comment_likes (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  post_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast lookup by comment_id and post_id
create index if not exists idx_post_comment_likes_comment_id on public.post_comment_likes(comment_id);
create index if not exists idx_post_comment_likes_post_id on public.post_comment_likes(post_id);

-- Enable Row Level Security (RLS)
alter table public.post_comment_likes enable row level security;

-- Policies for post_comment_likes
create policy "Allow public read post_comment_likes"
  on public.post_comment_likes for select
  using (true);

create policy "Allow public insert post_comment_likes"
  on public.post_comment_likes for insert
  with check (true);

create policy "Allow public delete post_comment_likes"
  on public.post_comment_likes for delete
  using (true);

