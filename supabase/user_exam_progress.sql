create table if not exists public.user_exam_progress (
  user_id uuid not null,
  exam_id text not null,
  answers jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);

create table if not exists public.allowed_users (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  email text primary key,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.user_exam_progress enable row level security;
alter table public.allowed_users enable row level security;
alter table public.access_requests enable row level security;

create policy "Users can read their own exam progress"
on public.user_exam_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own exam progress"
on public.user_exam_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own exam progress"
on public.user_exam_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their own allowlist row"
on public.allowed_users
for select
to authenticated
using (lower(email) = lower(auth.email()) and is_active = true);
