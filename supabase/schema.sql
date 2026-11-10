-- =============================================================================
-- Who Owes Who What — database schema
--
-- Run this once in the Supabase SQL editor (or `psql -f`). It is written to be
-- re-runnable on an empty project.
--
-- Mental model:
--   * groups are owned by exactly one auth user (the organizer).
--   * members, expenses and expense_splits all hang off a group, so deleting a
--     group cleans up everything underneath it.
--   * every amount is an integer number of paisa (1/100 rupee). No floats.
--   * members are just names — they never log in. They read their own balance
--     through a share token, served by a server-only API route.
-- =============================================================================

-- auth.users is managed by Supabase; nothing to create there.

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  share_token  text not null unique check (share_token ~ '^[A-Za-z0-9_-]{32}$'),
  created_at   timestamptz not null default now()
);

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  amount      bigint not null check (amount > 0),                -- paisa
  -- "no action" (not cascade): a member who paid for something can't be
  -- deleted out from under the ledger. The app blocks the delete with a
  -- friendly message; this is the database-level backstop.
  -- DEFERRED so the check runs at commit: deleting a whole group cascades to
  -- members *and* expenses, and an immediate check would fire before the
  -- expense/split cascade had finished.
  paid_by     uuid not null references public.members (id) on delete no action deferrable initially deferred,
  split_type  text not null default 'equal' check (split_type in ('equal', 'exact', 'percentage')),
  note        text check (note is null or char_length(note) <= 200),
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists public.expense_splits (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.expenses (id) on delete cascade,
  member_id    uuid not null references public.members (id) on delete no action deferrable initially deferred, -- see expenses.paid_by
  amount_owed  bigint not null check (amount_owed >= 0),         -- paisa
  percent_bp   integer check (percent_bp is null or percent_bp between 0 and 10000), -- basis points, percentage splits only
  unique (expense_id, member_id)
);

create index if not exists idx_members_group     on public.members (group_id);
create unique index if not exists idx_members_group_name on public.members (group_id, lower(btrim(name)));
create index if not exists idx_expenses_group    on public.expenses (group_id, date desc);
create index if not exists idx_expenses_paid_by  on public.expenses (paid_by);
create index if not exists idx_splits_expense    on public.expense_splits (expense_id);
create index if not exists idx_splits_member     on public.expense_splits (member_id);
-- members.share_token already has a unique index from its UNIQUE constraint.

-- -----------------------------------------------------------------------------
-- Integrity triggers
--
-- Foreign keys don't know about groups: without these, an expense in group A
-- could name a payer from group B. Triggers run with the caller's privileges,
-- so RLS also hides members of groups the caller doesn't own.
-- -----------------------------------------------------------------------------

create or replace function public.enforce_expense_payer_in_group()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.group_id <> old.group_id then
    raise exception 'An expense cannot be moved to another group';
  end if;
  if not exists (
    select 1 from public.members m where m.id = new.paid_by and m.group_id = new.group_id
  ) then
    raise exception 'The payer must be a member of this group';
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_payer_in_group on public.expenses;
create trigger expenses_payer_in_group
  before insert or update on public.expenses
  for each row execute function public.enforce_expense_payer_in_group();

create or replace function public.enforce_split_member_in_group()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.expenses e
    join public.members m on m.group_id = e.group_id
    where e.id = new.expense_id and m.id = new.member_id
  ) then
    raise exception 'Everyone in a split must be a member of the expense''s group';
  end if;
  return new;
end;
$$;

drop trigger if exists splits_member_in_group on public.expense_splits;
create trigger splits_member_in_group
  before insert or update on public.expense_splits
  for each row execute function public.enforce_split_member_in_group();

create or replace function public.prevent_member_group_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.group_id <> old.group_id then
    raise exception 'A member cannot be moved to another group';
  end if;
  return new;
end;
$$;

drop trigger if exists members_group_immutable on public.members;
create trigger members_group_immutable
  before update on public.members
  for each row execute function public.prevent_member_group_change();

-- -----------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is on for every table. Only the organizer (groups.created_by) can see or
-- touch a group and anything inside it. There is deliberately NO policy for
-- anonymous share-link access: the /api/share/[token] route reads with the
-- service-role key on the server and returns a hand-shaped response instead.
--
-- `(select auth.uid())` instead of bare `auth.uid()` lets Postgres evaluate it
-- once per query rather than once per row.
-- -----------------------------------------------------------------------------

alter table public.groups         enable row level security;
alter table public.members        enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;

drop policy if exists groups_owner_all on public.groups;
create policy groups_owner_all on public.groups
  for all to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists members_owner_all on public.members;
create policy members_owner_all on public.members
  for all to authenticated
  using (group_id in (select g.id from public.groups g where g.created_by = (select auth.uid())))
  with check (group_id in (select g.id from public.groups g where g.created_by = (select auth.uid())));

drop policy if exists expenses_owner_all on public.expenses;
create policy expenses_owner_all on public.expenses
  for all to authenticated
  using (group_id in (select g.id from public.groups g where g.created_by = (select auth.uid())))
  with check (group_id in (select g.id from public.groups g where g.created_by = (select auth.uid())));

drop policy if exists splits_owner_all on public.expense_splits;
create policy splits_owner_all on public.expense_splits
  for all to authenticated
  using (
    expense_id in (
      select e.id from public.expenses e
      join public.groups g on g.id = e.group_id
      where g.created_by = (select auth.uid())
    )
  )
  with check (
    expense_id in (
      select e.id from public.expenses e
      join public.groups g on g.id = e.group_id
      where g.created_by = (select auth.uid())
    )
  );

-- Belt and braces: the anon role has no business touching these tables at all.
revoke all on public.groups, public.members, public.expenses, public.expense_splits from anon;

-- -----------------------------------------------------------------------------
-- RPC functions
--
-- Writes that touch several tables go through these so they are atomic: an
-- expense never exists without its splits, and a group never exists without
-- its members. They are SECURITY INVOKER, so every statement inside is still
-- subject to the caller's RLS policies.
-- -----------------------------------------------------------------------------

-- Create a group and its members in one transaction.
-- p_members: [{"name": "Ali", "share_token": "<32 chars>"}, ...]
-- Share tokens are generated in the app (lib/tokens.ts) with Node's crypto.
create or replace function public.create_group(p_name text, p_members jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if jsonb_typeof(p_members) <> 'array' or jsonb_array_length(p_members) = 0 then
    raise exception 'A group needs at least one member';
  end if;

  insert into public.groups (name)
  values (btrim(p_name))
  returning id into v_group_id;

  insert into public.members (group_id, name, share_token)
  select v_group_id, btrim(m ->> 'name'), m ->> 'share_token'
  from jsonb_array_elements(p_members) as m;

  return v_group_id;
end;
$$;

-- Create (p_expense_id null) or replace (p_expense_id set) an expense together
-- with its splits. The splits must add up to the amount exactly — the same
-- invariant lib/splits.ts guarantees, enforced again here.
-- p_splits: [{"member_id": "<uuid>", "amount_owed": 3334, "percent_bp": null}, ...]
create or replace function public.save_expense(
  p_expense_id uuid,
  p_group_id   uuid,
  p_amount     bigint,
  p_paid_by    uuid,
  p_split_type text,
  p_note       text,
  p_date       date,
  p_splits     jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_total      bigint;
begin
  if jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'An expense needs at least one person in the split';
  end if;

  select coalesce(sum((s ->> 'amount_owed')::bigint), 0)
  into v_total
  from jsonb_array_elements(p_splits) as s;

  if v_total <> p_amount then
    raise exception 'Splits add up to % paisa but the expense is % paisa', v_total, p_amount;
  end if;

  if p_expense_id is null then
    insert into public.expenses (group_id, amount, paid_by, split_type, note, date)
    values (p_group_id, p_amount, p_paid_by, p_split_type, nullif(btrim(p_note), ''), p_date)
    returning id into v_expense_id;
  else
    update public.expenses
    set amount = p_amount,
        paid_by = p_paid_by,
        split_type = p_split_type,
        note = nullif(btrim(p_note), ''),
        date = p_date
    where id = p_expense_id and group_id = p_group_id
    returning id into v_expense_id;

    if v_expense_id is null then
      raise exception 'Expense not found';
    end if;

    delete from public.expense_splits where expense_id = v_expense_id;
  end if;

  insert into public.expense_splits (expense_id, member_id, amount_owed, percent_bp)
  select v_expense_id,
         (s ->> 'member_id')::uuid,
         (s ->> 'amount_owed')::bigint,
         (s ->> 'percent_bp')::integer
  from jsonb_array_elements(p_splits) as s;

  return v_expense_id;
end;
$$;

revoke execute on function public.create_group(text, jsonb) from public, anon;
revoke execute on function public.save_expense(uuid, uuid, bigint, uuid, text, text, date, jsonb) from public, anon;
grant execute on function public.create_group(text, jsonb) to authenticated;
grant execute on function public.save_expense(uuid, uuid, bigint, uuid, text, text, date, jsonb) to authenticated;
