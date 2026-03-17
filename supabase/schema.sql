create table if not exists public.bossfit_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  storage_version integer not null default 1,
  app_state jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.bossfit_user_state
  add column if not exists habits_count integer not null default 0,
  add column if not exists completions_count integer not null default 0,
  add column if not exists current_streak integer not null default 0,
  add column if not exists best_streak integer not null default 0,
  add column if not exists total_points integer not null default 0,
  add column if not exists level integer not null default 1;

create or replace function public.bossfit_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists bossfit_user_state_set_updated_at on public.bossfit_user_state;
create trigger bossfit_user_state_set_updated_at
before update on public.bossfit_user_state
for each row
execute function public.bossfit_set_updated_at();

alter table public.bossfit_user_state enable row level security;

drop policy if exists "Users can read their BossFit state" on public.bossfit_user_state;
create policy "Users can read their BossFit state"
on public.bossfit_user_state
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their BossFit state" on public.bossfit_user_state;
create policy "Users can insert their BossFit state"
on public.bossfit_user_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their BossFit state" on public.bossfit_user_state;
create policy "Users can update their BossFit state"
on public.bossfit_user_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their BossFit state" on public.bossfit_user_state;
create policy "Users can delete their BossFit state"
on public.bossfit_user_state
for delete
using (auth.uid() = user_id);
