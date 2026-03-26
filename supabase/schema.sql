create table if not exists public.bossfit_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  storage_version integer not null default 1,
  app_state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
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
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists revision bigint not null default 1;

create table if not exists public.bossfit_user_state_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_version integer not null default 1,
  state_revision bigint not null default 0,
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

alter table public.bossfit_user_state_history
  add column if not exists state_revision bigint not null default 0;

create index if not exists bossfit_user_state_last_synced_idx
  on public.bossfit_user_state (last_synced_at desc);

create index if not exists bossfit_user_state_history_user_saved_idx
  on public.bossfit_user_state_history (user_id, saved_at desc);

create index if not exists bossfit_user_state_revision_idx
  on public.bossfit_user_state (user_id, revision desc);

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bossfit_user_state_revision_nonnegative_check'
      and conrelid = 'public.bossfit_user_state'::regclass
  ) then
    alter table public.bossfit_user_state
      add constraint bossfit_user_state_revision_nonnegative_check
      check (revision >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bossfit_user_state_history_state_revision_nonnegative_check'
      and conrelid = 'public.bossfit_user_state_history'::regclass
  ) then
    alter table public.bossfit_user_state_history
      add constraint bossfit_user_state_history_state_revision_nonnegative_check
      check (state_revision >= 0);
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
    state_revision,
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
    new.revision,
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
  state_revision,
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
  s.revision,
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

create table if not exists public.bossfit_user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'light',
  locale text not null default 'es',
  reminder_enabled boolean not null default false,
  reminder_time text not null default '19:00',
  reminder_permission text not null default 'default',
  reminder_last_sent_date date null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.bossfit_user_settings
  add column if not exists theme text not null default 'light',
  add column if not exists locale text not null default 'es',
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_time text not null default '19:00',
  add column if not exists reminder_permission text not null default 'default',
  add column if not exists reminder_last_sent_date date null,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.bossfit_habits (
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id text not null,
  name text not null,
  category text null,
  tracking_mode text not null default 'reps',
  target_sets integer not null default 1,
  reps_per_set integer not null default 1,
  seconds_per_set integer null,
  rest_enabled boolean not null default false,
  rest_seconds integer null,
  selected_days text[] not null default array[]::text[],
  is_active boolean not null default true,
  color text not null default 'ember',
  icon text not null default 'flame',
  level text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz null,
  primary key (user_id, habit_id)
);

alter table public.bossfit_habits
  add column if not exists name text,
  add column if not exists category text null,
  add column if not exists tracking_mode text not null default 'reps',
  add column if not exists target_sets integer not null default 1,
  add column if not exists reps_per_set integer not null default 1,
  add column if not exists seconds_per_set integer null,
  add column if not exists rest_enabled boolean not null default false,
  add column if not exists rest_seconds integer null,
  add column if not exists selected_days text[] not null default array[]::text[],
  add column if not exists is_active boolean not null default true,
  add column if not exists color text not null default 'ember',
  add column if not exists icon text not null default 'flame',
  add column if not exists level text null,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists archived_at timestamptz null;

update public.bossfit_habits
set name = coalesce(name, 'Habit')
where name is null;

alter table public.bossfit_habits
  alter column name set not null;

create table if not exists public.bossfit_habit_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id text not null,
  date_key date not null,
  completed_sets integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz null,
  deleted_at timestamptz null,
  primary key (user_id, habit_id, date_key)
);

alter table public.bossfit_habit_completions
  add column if not exists completed_sets integer not null default 0,
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists completed_at timestamptz null,
  add column if not exists deleted_at timestamptz null;

create index if not exists bossfit_habits_user_archived_idx
  on public.bossfit_habits (user_id, archived_at, updated_at desc);

create index if not exists bossfit_habit_completions_user_deleted_idx
  on public.bossfit_habit_completions (user_id, deleted_at, date_key desc);

create index if not exists bossfit_habit_completions_user_habit_idx
  on public.bossfit_habit_completions (user_id, habit_id, date_key desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_user_settings_theme_check'
      and conrelid = 'public.bossfit_user_settings'::regclass
  ) then
    alter table public.bossfit_user_settings
      add constraint bossfit_user_settings_theme_check
      check (theme in ('light', 'dark'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_user_settings_locale_check'
      and conrelid = 'public.bossfit_user_settings'::regclass
  ) then
    alter table public.bossfit_user_settings
      add constraint bossfit_user_settings_locale_check
      check (locale in ('es', 'en'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_user_settings_reminder_permission_check'
      and conrelid = 'public.bossfit_user_settings'::regclass
  ) then
    alter table public.bossfit_user_settings
      add constraint bossfit_user_settings_reminder_permission_check
      check (reminder_permission in ('default', 'granted', 'denied', 'unsupported'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_user_settings_reminder_time_check'
      and conrelid = 'public.bossfit_user_settings'::regclass
  ) then
    alter table public.bossfit_user_settings
      add constraint bossfit_user_settings_reminder_time_check
      check (reminder_time ~ '^([01][0-9]|2[0-3]):([0-5][0-9])$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_tracking_mode_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_tracking_mode_check
      check (tracking_mode in ('reps', 'timer'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_category_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_category_check
      check (category is null or category in ('fuerza', 'cardio', 'movilidad', 'abdomen', 'piernas', 'recuperacion'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_color_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_color_check
      check (color in ('ember', 'emerald', 'ocean', 'sun', 'rose', 'graphite'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_icon_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_icon_check
      check (icon in ('flame', 'dumbbell', 'heart', 'mountain', 'bolt', 'timer'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_level_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_level_check
      check (level is null or level in ('principiante', 'intermedio', 'avanzado'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_target_sets_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_target_sets_check
      check (target_sets >= 1 and target_sets <= 999);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_reps_per_set_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_reps_per_set_check
      check (reps_per_set >= 1 and reps_per_set <= 2500);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_seconds_per_set_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_seconds_per_set_check
      check (seconds_per_set is null or (seconds_per_set >= 5 and seconds_per_set <= 7200));
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_rest_seconds_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_rest_seconds_check
      check (rest_seconds is null or (rest_seconds >= 5 and rest_seconds <= 7200));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habits_rest_consistency_check'
      and conrelid = 'public.bossfit_habits'::regclass
  ) then
    alter table public.bossfit_habits
      add constraint bossfit_habits_rest_consistency_check
      check ((not rest_enabled and rest_seconds is null) or (rest_enabled and rest_seconds is not null));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_habit_completions_completed_sets_check'
      and conrelid = 'public.bossfit_habit_completions'::regclass
  ) then
    alter table public.bossfit_habit_completions
      add constraint bossfit_habit_completions_completed_sets_check
      check (completed_sets >= 0);
  end if;
end $$;

drop trigger if exists bossfit_user_settings_set_updated_at on public.bossfit_user_settings;
create trigger bossfit_user_settings_set_updated_at
before update on public.bossfit_user_settings
for each row execute function public.bossfit_set_updated_at();

drop trigger if exists bossfit_habits_set_updated_at on public.bossfit_habits;
create trigger bossfit_habits_set_updated_at
before update on public.bossfit_habits
for each row execute function public.bossfit_set_updated_at();

drop trigger if exists bossfit_habit_completions_set_updated_at on public.bossfit_habit_completions;
create trigger bossfit_habit_completions_set_updated_at
before update on public.bossfit_habit_completions
for each row execute function public.bossfit_set_updated_at();

insert into public.bossfit_user_settings (
  user_id,
  theme,
  locale,
  reminder_enabled,
  reminder_time,
  reminder_permission,
  reminder_last_sent_date,
  created_at,
  updated_at
)
select
  s.user_id,
  coalesce(nullif(s.app_state ->> 'theme', ''), 'light'),
  case
    when coalesce(nullif(s.app_state ->> 'locale', ''), 'es') in ('es', 'en')
      then coalesce(nullif(s.app_state ->> 'locale', ''), 'es')
    else 'es'
  end,
  coalesce((s.app_state #>> '{reminderSettings,enabled}')::boolean, false),
  coalesce(nullif(s.app_state #>> '{reminderSettings,time}', ''), '19:00'),
  case
    when coalesce(s.app_state #>> '{reminderSettings,permission}', 'default') in ('default', 'granted', 'denied', 'unsupported')
      then coalesce(s.app_state #>> '{reminderSettings,permission}', 'default')
    else 'default'
  end,
  case
    when coalesce(s.app_state #>> '{reminderSettings,lastSentDate}', '') ~ '^\d{4}-\d{2}-\d{2}$'
      then (s.app_state #>> '{reminderSettings,lastSentDate}')::date
    else null
  end,
  timezone('utc', now()),
  timezone('utc', now())
from public.bossfit_user_state s
on conflict (user_id) do nothing;

insert into public.bossfit_habits (
  user_id,
  habit_id,
  name,
  category,
  tracking_mode,
  target_sets,
  reps_per_set,
  seconds_per_set,
  rest_enabled,
  rest_seconds,
  selected_days,
  is_active,
  color,
  icon,
  level,
  created_at,
  updated_at,
  archived_at
)
select
  s.user_id,
  habit ->> 'id',
  coalesce(nullif(habit ->> 'name', ''), 'Habit'),
  nullif(habit ->> 'category', ''),
  case
    when coalesce(habit ->> 'trackingMode', 'reps') in ('reps', 'timer')
      then coalesce(habit ->> 'trackingMode', 'reps')
    else 'reps'
  end,
  greatest(coalesce((habit ->> 'targetSets')::integer, 1), 1),
  greatest(coalesce((habit ->> 'repsPerSet')::integer, 1), 1),
  case
    when habit ? 'secondsPerSet' then greatest(coalesce((habit ->> 'secondsPerSet')::integer, 5), 5)
    else null
  end,
  case
    when lower(coalesce(habit ->> 'restEnabled', '')) in ('true', 'false')
      then (habit ->> 'restEnabled')::boolean
    when habit ? 'restSeconds'
      then true
    else false
  end,
  case
    when habit ? 'restSeconds' then greatest(coalesce((habit ->> 'restSeconds')::integer, 5), 5)
    else null
  end,
  coalesce(array(
    select jsonb_array_elements_text(coalesce(habit -> 'selectedDays', '[]'::jsonb))
  ), array[]::text[]),
  coalesce((habit ->> 'active')::boolean, true),
  case
    when coalesce(habit ->> 'color', 'ember') in ('ember', 'emerald', 'ocean', 'sun', 'rose', 'graphite')
      then coalesce(habit ->> 'color', 'ember')
    else 'ember'
  end,
  case
    when coalesce(habit ->> 'icon', 'flame') in ('flame', 'dumbbell', 'heart', 'mountain', 'bolt', 'timer')
      then coalesce(habit ->> 'icon', 'flame')
    else 'flame'
  end,
  case
    when nullif(habit ->> 'level', '') in ('principiante', 'intermedio', 'avanzado')
      then nullif(habit ->> 'level', '')
    else null
  end,
  coalesce(nullif(habit ->> 'createdAt', ''), timezone('utc', now())::text)::timestamptz,
  coalesce(nullif(habit ->> 'updatedAt', ''), timezone('utc', now())::text)::timestamptz,
  null
from public.bossfit_user_state s
cross join lateral jsonb_array_elements(coalesce(s.app_state -> 'habits', '[]'::jsonb)) as habit
where coalesce(habit ->> 'id', '') <> ''
on conflict (user_id, habit_id) do nothing;

insert into public.bossfit_habit_completions (
  user_id,
  habit_id,
  date_key,
  completed_sets,
  updated_at,
  completed_at,
  deleted_at
)
select
  s.user_id,
  completion ->> 'habitId',
  (completion ->> 'date')::date,
  greatest(coalesce((completion ->> 'completedSets')::integer, 0), 0),
  coalesce(nullif(completion ->> 'updatedAt', ''), timezone('utc', now())::text)::timestamptz,
  nullif(completion ->> 'completedAt', '')::timestamptz,
  null
from public.bossfit_user_state s
cross join lateral jsonb_array_elements(coalesce(s.app_state -> 'completions', '[]'::jsonb)) as completion
where coalesce(completion ->> 'habitId', '') <> ''
  and coalesce(completion ->> 'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (user_id, habit_id, date_key) do nothing;

create or replace function public.bossfit_increment_habit_completion(
  p_user_id uuid,
  p_habit_id text,
  p_date date
)
returns table(completed_sets integer, just_completed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_sets integer;
  v_completed_sets integer;
begin
  select h.target_sets
  into v_target_sets
  from public.bossfit_habits h
  where h.user_id = p_user_id
    and h.habit_id = p_habit_id
    and h.archived_at is null;

  if v_target_sets is null then
    return;
  end if;

  insert into public.bossfit_habit_completions (
    user_id,
    habit_id,
    date_key,
    completed_sets,
    updated_at,
    completed_at,
    deleted_at
  )
  values (
    p_user_id,
    p_habit_id,
    p_date,
    least(v_target_sets, 1),
    timezone('utc', now()),
    case when v_target_sets <= 1 then timezone('utc', now()) else null end,
    null
  )
  on conflict (user_id, habit_id, date_key) do update
  set completed_sets = least(v_target_sets, public.bossfit_habit_completions.completed_sets + 1),
      updated_at = timezone('utc', now()),
      completed_at = case
        when least(v_target_sets, public.bossfit_habit_completions.completed_sets + 1) >= v_target_sets
          then timezone('utc', now())
        else null
      end,
      deleted_at = null
  returning public.bossfit_habit_completions.completed_sets
  into v_completed_sets;

  completed_sets := coalesce(v_completed_sets, 0);
  just_completed := completed_sets >= v_target_sets;
  return next;
end;
$$;

create or replace function public.bossfit_decrement_habit_completion(
  p_user_id uuid,
  p_habit_id text,
  p_date date
)
returns table(completed_sets integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_sets integer;
  v_next_sets integer;
begin
  perform 1
  from public.bossfit_habits h
  where h.user_id = p_user_id
    and h.habit_id = p_habit_id
    and h.archived_at is null;

  if not found then
    return;
  end if;

  select c.completed_sets
  into v_current_sets
  from public.bossfit_habit_completions c
  where c.user_id = p_user_id
    and c.habit_id = p_habit_id
    and c.date_key = p_date
    and c.deleted_at is null;

  if v_current_sets is null then
    completed_sets := 0;
    return next;
  end if;

  v_next_sets := greatest(v_current_sets - 1, 0);

  update public.bossfit_habit_completions
  set completed_sets = v_next_sets,
      updated_at = timezone('utc', now()),
      completed_at = null,
      deleted_at = case when v_next_sets <= 0 then timezone('utc', now()) else null end
  where user_id = p_user_id
    and habit_id = p_habit_id
    and date_key = p_date;

  completed_sets := v_next_sets;
  return next;
end;
$$;

create or replace function public.bossfit_reset_habit_completion(
  p_user_id uuid,
  p_habit_id text,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bossfit_habit_completions
  set completed_sets = 0,
      updated_at = timezone('utc', now()),
      completed_at = null,
      deleted_at = timezone('utc', now())
  where user_id = p_user_id
    and habit_id = p_habit_id
    and date_key = p_date
    and deleted_at is null;
end;
$$;

alter table public.bossfit_user_settings enable row level security;
alter table public.bossfit_habits enable row level security;
alter table public.bossfit_habit_completions enable row level security;

alter table public.bossfit_user_settings force row level security;
alter table public.bossfit_habits force row level security;
alter table public.bossfit_habit_completions force row level security;

grant select, insert, update on public.bossfit_user_settings to authenticated;
grant select, insert, update on public.bossfit_habits to authenticated;
grant select, insert, update on public.bossfit_habit_completions to authenticated;
revoke delete on public.bossfit_user_settings from authenticated;
revoke delete on public.bossfit_habits from authenticated;
revoke delete on public.bossfit_habit_completions from authenticated;

drop policy if exists "Users can read their BossFit settings" on public.bossfit_user_settings;
create policy "Users can read their BossFit settings"
on public.bossfit_user_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their BossFit settings" on public.bossfit_user_settings;
create policy "Users can insert their BossFit settings"
on public.bossfit_user_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their BossFit settings" on public.bossfit_user_settings;
create policy "Users can update their BossFit settings"
on public.bossfit_user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read their BossFit habits" on public.bossfit_habits;
create policy "Users can read their BossFit habits"
on public.bossfit_habits
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their BossFit habits" on public.bossfit_habits;
create policy "Users can insert their BossFit habits"
on public.bossfit_habits
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their BossFit habits" on public.bossfit_habits;
create policy "Users can update their BossFit habits"
on public.bossfit_habits
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read their BossFit completions" on public.bossfit_habit_completions;
create policy "Users can read their BossFit completions"
on public.bossfit_habit_completions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their BossFit completions" on public.bossfit_habit_completions;
create policy "Users can insert their BossFit completions"
on public.bossfit_habit_completions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their BossFit completions" on public.bossfit_habit_completions;
create policy "Users can update their BossFit completions"
on public.bossfit_habit_completions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);




create extension if not exists pgcrypto;

create table if not exists public.bossfit_coach_notes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_user_id uuid not null references auth.users (id) on delete cascade,
  coach_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  note_type text not null default 'general',
  pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz null
);

create table if not exists public.bossfit_member_alerts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_user_id uuid not null references auth.users (id) on delete cascade,
  coach_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  severity text not null default 'info',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz null,
  dismissed_at timestamptz null,
  expires_at timestamptz null,
  archived_at timestamptz null
);

create table if not exists public.bossfit_member_messages (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_user_id uuid not null references auth.users (id) on delete cascade,
  coach_user_id uuid not null references auth.users (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz null,
  deleted_at timestamptz null
);

create index if not exists bossfit_coach_notes_member_idx
  on public.bossfit_coach_notes (member_user_id, archived_at, updated_at desc);

create index if not exists bossfit_member_alerts_member_idx
  on public.bossfit_member_alerts (member_user_id, archived_at, dismissed_at, created_at desc);

create index if not exists bossfit_member_messages_thread_idx
  on public.bossfit_member_messages (member_user_id, coach_user_id, deleted_at, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_coach_notes_note_type_check'
      and conrelid = 'public.bossfit_coach_notes'::regclass
  ) then
    alter table public.bossfit_coach_notes
      add constraint bossfit_coach_notes_note_type_check
      check (note_type in ('general', 'performance', 'injury', 'nutrition', 'mindset', 'followup'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_member_alerts_severity_check'
      and conrelid = 'public.bossfit_member_alerts'::regclass
  ) then
    alter table public.bossfit_member_alerts
      add constraint bossfit_member_alerts_severity_check
      check (severity in ('info', 'warning', 'success', 'urgent'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bossfit_member_messages_sender_role_check'
      and conrelid = 'public.bossfit_member_messages'::regclass
  ) then
    alter table public.bossfit_member_messages
      add constraint bossfit_member_messages_sender_role_check
      check (sender_role in ('coach', 'member'));
  end if;
end $$;

drop trigger if exists bossfit_coach_notes_set_updated_at on public.bossfit_coach_notes;
create trigger bossfit_coach_notes_set_updated_at
before update on public.bossfit_coach_notes
for each row execute function public.bossfit_set_updated_at();

drop trigger if exists bossfit_member_alerts_set_updated_at on public.bossfit_member_alerts;
create trigger bossfit_member_alerts_set_updated_at
before update on public.bossfit_member_alerts
for each row execute function public.bossfit_set_updated_at();

drop trigger if exists bossfit_member_messages_set_updated_at on public.bossfit_member_messages;
create trigger bossfit_member_messages_set_updated_at
before update on public.bossfit_member_messages
for each row execute function public.bossfit_set_updated_at();

alter table public.bossfit_coach_notes enable row level security;
alter table public.bossfit_member_alerts enable row level security;
alter table public.bossfit_member_messages enable row level security;

alter table public.bossfit_coach_notes force row level security;
alter table public.bossfit_member_alerts force row level security;
alter table public.bossfit_member_messages force row level security;

grant select, insert, update on public.bossfit_coach_notes to authenticated;
grant select, insert, update on public.bossfit_member_alerts to authenticated;
grant select, insert, update on public.bossfit_member_messages to authenticated;
revoke delete on public.bossfit_coach_notes from authenticated;
revoke delete on public.bossfit_member_alerts from authenticated;
revoke delete on public.bossfit_member_messages from authenticated;

drop policy if exists "Coaches can manage their notes" on public.bossfit_coach_notes;
create policy "Coaches can manage their notes"
on public.bossfit_coach_notes
for all
to authenticated
using (
  coach_user_id = auth.uid()
  and exists (
    select 1
    from public.member_assignments ma
    join public.gym_memberships gm
      on gm.gym_id = ma.gym_id
     and gm.user_id = auth.uid()
     and gm.role = 'trainer'
     and gm.status = 'active'
    where ma.gym_id = bossfit_coach_notes.gym_id
      and ma.member_user_id = bossfit_coach_notes.member_user_id
      and ma.trainer_user_id = auth.uid()
      and ma.status = 'active'
  )
)
with check (
  coach_user_id = auth.uid()
  and exists (
    select 1
    from public.member_assignments ma
    join public.gym_memberships gm
      on gm.gym_id = ma.gym_id
     and gm.user_id = auth.uid()
     and gm.role = 'trainer'
     and gm.status = 'active'
    where ma.gym_id = bossfit_coach_notes.gym_id
      and ma.member_user_id = bossfit_coach_notes.member_user_id
      and ma.trainer_user_id = auth.uid()
      and ma.status = 'active'
  )
);

drop policy if exists "Coaches and members can read alerts" on public.bossfit_member_alerts;
create policy "Coaches and members can read alerts"
on public.bossfit_member_alerts
for select
to authenticated
using (
  member_user_id = auth.uid()
  or coach_user_id = auth.uid()
);

drop policy if exists "Coaches can create alerts" on public.bossfit_member_alerts;
create policy "Coaches can create alerts"
on public.bossfit_member_alerts
for insert
to authenticated
with check (
  coach_user_id = auth.uid()
  and exists (
    select 1
    from public.member_assignments ma
    join public.gym_memberships gm
      on gm.gym_id = ma.gym_id
     and gm.user_id = auth.uid()
     and gm.role = 'trainer'
     and gm.status = 'active'
    where ma.gym_id = bossfit_member_alerts.gym_id
      and ma.member_user_id = bossfit_member_alerts.member_user_id
      and ma.trainer_user_id = auth.uid()
      and ma.status = 'active'
  )
);

drop policy if exists "Coaches and members can update alerts" on public.bossfit_member_alerts;
create policy "Coaches and members can update alerts"
on public.bossfit_member_alerts
for update
to authenticated
using (
  member_user_id = auth.uid()
  or coach_user_id = auth.uid()
)
with check (
  member_user_id = auth.uid()
  or coach_user_id = auth.uid()
);

drop policy if exists "Participants can read messages" on public.bossfit_member_messages;
create policy "Participants can read messages"
on public.bossfit_member_messages
for select
to authenticated
using (
  member_user_id = auth.uid()
  or coach_user_id = auth.uid()
);

drop policy if exists "Participants can create messages" on public.bossfit_member_messages;
create policy "Participants can create messages"
on public.bossfit_member_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and (
    (sender_role = 'coach' and coach_user_id = auth.uid())
    or (sender_role = 'member' and member_user_id = auth.uid())
  )
);

drop policy if exists "Participants can update messages" on public.bossfit_member_messages;
create policy "Participants can update messages"
on public.bossfit_member_messages
for update
to authenticated
using (
  member_user_id = auth.uid()
  or coach_user_id = auth.uid()
)
with check (
  member_user_id = auth.uid()
  or coach_user_id = auth.uid()
);

create table if not exists public.bossfit_platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  label text,
  active boolean not null default true,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists bossfit_platform_admins_active_idx
  on public.bossfit_platform_admins (active, created_at desc);

alter table public.bossfit_platform_admins enable row level security;
alter table public.bossfit_platform_admins force row level security;

grant select on public.bossfit_platform_admins to authenticated;
revoke insert, update, delete on public.bossfit_platform_admins from authenticated;

drop trigger if exists bossfit_platform_admins_set_updated_at on public.bossfit_platform_admins;
create trigger bossfit_platform_admins_set_updated_at
before update on public.bossfit_platform_admins
for each row execute function public.bossfit_set_updated_at();

drop policy if exists "Platform admins can read their own row" on public.bossfit_platform_admins;
create policy "Platform admins can read their own row"
on public.bossfit_platform_admins
for select
to authenticated
using (user_id = auth.uid());

create table if not exists public.gym_membership_roles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.gym_memberships (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (membership_id, role)
);

create index if not exists gym_membership_roles_membership_idx
  on public.gym_membership_roles (membership_id);

create index if not exists gym_membership_roles_gym_user_idx
  on public.gym_membership_roles (gym_id, user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gym_membership_roles_role_check'
      and conrelid = 'public.gym_membership_roles'::regclass
  ) then
    alter table public.gym_membership_roles
      add constraint gym_membership_roles_role_check
      check (role in ('owner', 'admin', 'trainer', 'member'));
  end if;
end $$;

alter table public.gym_membership_roles enable row level security;
alter table public.gym_membership_roles force row level security;

grant select, insert, update, delete on public.gym_membership_roles to authenticated;

drop trigger if exists gym_membership_roles_set_updated_at on public.gym_membership_roles;
create trigger gym_membership_roles_set_updated_at
before update on public.gym_membership_roles
for each row execute function public.bossfit_set_updated_at();

drop policy if exists "Gym membership roles visible to active members" on public.gym_membership_roles;
create policy "Gym membership roles visible to active members"
on public.gym_membership_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.gym_memberships gm
    where gm.gym_id = gym_membership_roles.gym_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
  )
);

drop policy if exists "Gym membership roles manageable by owner admin" on public.gym_membership_roles;
create policy "Gym membership roles manageable by owner admin"
on public.gym_membership_roles
for all
to authenticated
using (
  exists (
    select 1
    from public.gym_memberships gm
    where gm.gym_id = gym_membership_roles.gym_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
      and gm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.gym_memberships gm
    where gm.gym_id = gym_membership_roles.gym_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
      and gm.role in ('owner', 'admin')
  )
);
