create table if not exists public.bossfit_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  storage_version integer not null default 1,
  app_state jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.bossfit_user_state
  add column if not exists habits_count integer not null default 0,
  add column if not exists completions_count integer not null default 0,
  add column if not exists current_streak integer not null default 0,
  add column if not exists best_streak integer not null default 0,
  add column if not exists total_points integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists last_save_reason text not null default 'sync',
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create table if not exists public.bossfit_user_state_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_version integer not null default 1,
  app_state jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default timezone('utc', now()),
  saved_reason text not null default 'sync',
  habits_count integer not null default 0,
  completions_count integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  total_points integer not null default 0,
  level integer not null default 1
);

create index if not exists bossfit_user_state_last_synced_idx
  on public.bossfit_user_state (last_synced_at desc);

create index if not exists bossfit_user_state_history_user_saved_idx
  on public.bossfit_user_state_history (user_id, saved_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bossfit_user_state_app_state_object_check'
      and conrelid = 'public.bossfit_user_state'::regclass
  ) then
    alter table public.bossfit_user_state
      add constraint bossfit_user_state_app_state_object_check
      check (jsonb_typeof(app_state) = 'object');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bossfit_user_state_history_app_state_object_check'
      and conrelid = 'public.bossfit_user_state_history'::regclass
  ) then
    alter table public.bossfit_user_state_history
      add constraint bossfit_user_state_history_app_state_object_check
      check (jsonb_typeof(app_state) = 'object');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bossfit_user_state_last_save_reason_check'
      and conrelid = 'public.bossfit_user_state'::regclass
  ) then
    alter table public.bossfit_user_state
      add constraint bossfit_user_state_last_save_reason_check
      check (last_save_reason in ('sync', 'reset', 'signout', 'pagehide', 'bootstrap', 'recovery'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bossfit_user_state_history_saved_reason_check'
      and conrelid = 'public.bossfit_user_state_history'::regclass
  ) then
    alter table public.bossfit_user_state_history
      add constraint bossfit_user_state_history_saved_reason_check
      check (saved_reason in ('sync', 'reset', 'signout', 'pagehide', 'bootstrap', 'recovery'));
  end if;
end $$;

create or replace function public.bossfit_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.bossfit_archive_user_state()
returns trigger
language plpgsql
as $$
begin
  insert into public.bossfit_user_state_history (
    user_id,
    storage_version,
    app_state,
    saved_at,
    saved_reason,
    habits_count,
    completions_count,
    current_streak,
    best_streak,
    total_points,
    level
  )
  values (
    new.user_id,
    new.storage_version,
    new.app_state,
    coalesce(new.last_synced_at, timezone('utc', now())),
    coalesce(new.last_save_reason, 'sync'),
    new.habits_count,
    new.completions_count,
    new.current_streak,
    new.best_streak,
    new.total_points,
    new.level
  );

  return new;
end;
$$;

drop trigger if exists bossfit_user_state_set_updated_at on public.bossfit_user_state;
create trigger bossfit_user_state_set_updated_at
before update on public.bossfit_user_state
for each row
execute function public.bossfit_set_updated_at();

drop trigger if exists bossfit_user_state_archive_after_write on public.bossfit_user_state;
create trigger bossfit_user_state_archive_after_write
after insert or update on public.bossfit_user_state
for each row
execute function public.bossfit_archive_user_state();

insert into public.bossfit_user_state_history (
  user_id,
  storage_version,
  app_state,
  saved_at,
  saved_reason,
  habits_count,
  completions_count,
  current_streak,
  best_streak,
  total_points,
  level
)
select
  s.user_id,
  s.storage_version,
  s.app_state,
  coalesce(s.last_synced_at, s.updated_at, timezone('utc', now())),
  coalesce(s.last_save_reason, 'sync'),
  s.habits_count,
  s.completions_count,
  s.current_streak,
  s.best_streak,
  s.total_points,
  s.level
from public.bossfit_user_state s
where not exists (
  select 1
  from public.bossfit_user_state_history h
  where h.user_id = s.user_id
);

alter table public.bossfit_user_state enable row level security;
alter table public.bossfit_user_state_history enable row level security;

alter table public.bossfit_user_state force row level security;
alter table public.bossfit_user_state_history force row level security;

grant select, insert, update on public.bossfit_user_state to authenticated;
grant select, insert on public.bossfit_user_state_history to authenticated;
revoke delete on public.bossfit_user_state from authenticated;
revoke update, delete on public.bossfit_user_state_history from authenticated;

drop policy if exists "Users can read their BossFit state" on public.bossfit_user_state;
create policy "Users can read their BossFit state"
on public.bossfit_user_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their BossFit state" on public.bossfit_user_state;
create policy "Users can insert their BossFit state"
on public.bossfit_user_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their BossFit state" on public.bossfit_user_state;
create policy "Users can update their BossFit state"
on public.bossfit_user_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their BossFit state" on public.bossfit_user_state;

drop policy if exists "Users can read their BossFit state history" on public.bossfit_user_state_history;
create policy "Users can read their BossFit state history"
on public.bossfit_user_state_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their BossFit state history" on public.bossfit_user_state_history;
create policy "Users can insert their BossFit state history"
on public.bossfit_user_state_history
for insert
to authenticated
with check (auth.uid() = user_id);
