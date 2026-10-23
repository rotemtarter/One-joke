-- Daily joke quota: 10 per device and 300 per site, per Israel calendar day (ARCHITECTURE 5).
-- Clients never write these tables; all changes go through the functions below.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count between 0 and 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create table public.site_daily_usage (
  usage_date date primary key,
  count integer not null default 0 check (count between 0 and 300),
  updated_at timestamptz not null default now()
);

create table public.generation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'released')),
  created_at timestamptz not null default now()
);

create index generation_reservations_user_id_idx on public.generation_reservations (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: a device may only read its own daily_usage rows
-- ---------------------------------------------------------------------------

alter table public.daily_usage enable row level security;
alter table public.site_daily_usage enable row level security;
alter table public.generation_reservations enable row level security;

revoke all on public.daily_usage, public.site_daily_usage, public.generation_reservations
  from anon, authenticated;
grant select on public.daily_usage to authenticated;

create policy "Devices read their own usage"
  on public.daily_usage for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Private schema: core logic that takes a user and a date (ADR-12).
-- Not exposed through the API and not executable by clients.
-- ---------------------------------------------------------------------------

create schema private;
revoke all on schema private from public, anon, authenticated;

-- The Israel calendar date of a moment; the quota day changes at local midnight.
create function private.israel_date(ts timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (ts at time zone 'Asia/Jerusalem')::date;
$$;

-- Atomically takes one slot from the device quota and the site cap for p_date.
-- UPDATE ... WHERE count < N locks the row, so concurrent calls re-check the updated value.
create function private.reserve_for(p_user uuid, p_date date)
returns table (status text, reservation_id uuid, remaining_today integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  device_count integer;
  new_id uuid;
begin
  insert into public.daily_usage (user_id, usage_date) values (p_user, p_date)
    on conflict do nothing;
  insert into public.site_daily_usage (usage_date) values (p_date)
    on conflict do nothing;

  update public.daily_usage d
    set count = d.count + 1, updated_at = now()
    where d.user_id = p_user and d.usage_date = p_date and d.count < 10
    returning d.count into device_count;
  if not found then
    return query select 'DEVICE_LIMIT'::text, null::uuid, 0;
    return;
  end if;

  update public.site_daily_usage s
    set count = s.count + 1, updated_at = now()
    where s.usage_date = p_date and s.count < 300;
  if not found then
    -- Undo the device increment; the row is still locked by this transaction.
    update public.daily_usage d
      set count = d.count - 1, updated_at = now()
      where d.user_id = p_user and d.usage_date = p_date;
    return query select 'SITE_LIMIT'::text, null::uuid, 10 - (device_count - 1);
    return;
  end if;

  insert into public.generation_reservations (user_id, usage_date)
    values (p_user, p_date)
    returning id into new_id;

  return query select 'OK'::text, new_id, 10 - device_count;
end;
$$;

revoke all on function private.israel_date(timestamptz) from public, anon, authenticated;
revoke all on function private.reserve_for(uuid, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public functions: no user or date parameters (ARCHITECTURE 5.2, ADR-4).
-- The device comes from auth.uid(); the day is computed here, in Israel time.
-- ---------------------------------------------------------------------------

create function public.reserve_joke_generation()
returns table (status text, reservation_id uuid, remaining_today integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No session' using errcode = '28000';
  end if;
  return query
    select * from private.reserve_for(auth.uid(), private.israel_date(now()));
end;
$$;

create function public.complete_joke_generation(reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No session' using errcode = '28000';
  end if;
  update public.generation_reservations r
    set status = 'succeeded'
    where r.id = complete_joke_generation.reservation_id
      and r.user_id = auth.uid()
      and r.status = 'pending';
  return found;
end;
$$;

-- Returns the slot of a pending reservation, once, to the day it was taken from.
create function public.release_joke_generation(reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_date date;
begin
  if auth.uid() is null then
    raise exception 'No session' using errcode = '28000';
  end if;

  update public.generation_reservations r
    set status = 'released'
    where r.id = release_joke_generation.reservation_id
      and r.user_id = auth.uid()
      and r.status = 'pending'
    returning r.usage_date into reserved_date;
  if not found then
    return false;
  end if;

  update public.daily_usage d
    set count = d.count - 1, updated_at = now()
    where d.user_id = auth.uid() and d.usage_date = reserved_date;
  update public.site_daily_usage s
    set count = s.count - 1, updated_at = now()
    where s.usage_date = reserved_date;
  return true;
end;
$$;

create function public.get_quota_status()
returns table (remaining_today integer, site_limit_reached boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := private.israel_date(now());
begin
  if auth.uid() is null then
    raise exception 'No session' using errcode = '28000';
  end if;
  return query
    select
      10 - coalesce(
        (select d.count from public.daily_usage d
          where d.user_id = auth.uid() and d.usage_date = today), 0),
      coalesce(
        (select s.count from public.site_daily_usage s where s.usage_date = today), 0) >= 300;
end;
$$;

revoke all on function public.reserve_joke_generation() from public, anon;
revoke all on function public.complete_joke_generation(uuid) from public, anon;
revoke all on function public.release_joke_generation(uuid) from public, anon;
revoke all on function public.get_quota_status() from public, anon;

grant execute on function public.reserve_joke_generation() to authenticated;
grant execute on function public.complete_joke_generation(uuid) to authenticated;
grant execute on function public.release_joke_generation(uuid) to authenticated;
grant execute on function public.get_quota_status() to authenticated;
