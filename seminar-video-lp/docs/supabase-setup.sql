create table if not exists public.seminar_viewers (
  viewer_id text primary key,
  first_accessed_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.seminar_viewers enable row level security;

drop policy if exists "seminar_viewers_no_public_access"
on public.seminar_viewers;

create policy "seminar_viewers_no_public_access"
on public.seminar_viewers
for all
using (false)
with check (false);

create table if not exists public.seminar_video_progress (
  viewer_id text not null,
  video_id text not null,
  current_position_seconds integer not null default 0,
  max_watched_seconds integer not null default 0,
  sales_unlocked boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (viewer_id, video_id)
);

alter table public.seminar_video_progress enable row level security;

drop policy if exists "seminar_video_progress_no_public_access"
on public.seminar_video_progress;

create policy "seminar_video_progress_no_public_access"
on public.seminar_video_progress
for all
using (false)
with check (false);
