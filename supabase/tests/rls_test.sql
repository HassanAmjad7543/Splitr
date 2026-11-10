-- =============================================================================
-- RLS + integrity checks for supabase/schema.sql.
--
-- Runs against a plain local Postgres (not a Supabase project): load
-- auth_stub.sql, then schema.sql, then this file. See scripts/test-db.sh.
-- Any failed assertion aborts with an error; success prints "ALL DB TESTS PASSED".
-- =============================================================================
\set ON_ERROR_STOP 1
\o /dev/null
\set alice '11111111-1111-1111-1111-111111111111'
\set bob   '22222222-2222-2222-2222-222222222222'

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, false);
  execute 'set role authenticated';
end $$;

create or replace function pg_temp.assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'ASSERTION FAILED: %', p_msg; end if;
end $$;

create or replace function pg_temp.expect_error(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;
  end;
  raise exception 'EXPECTED AN ERROR: %', p_msg;
end $$;

-- Alice creates a group with three members -----------------------------------
select pg_temp.as_user(:'alice');
select public.create_group('Hunza trip', jsonb_build_array(
  jsonb_build_object('name', 'Alice',   'share_token', repeat('a', 32)),
  jsonb_build_object('name', 'Bob',     'share_token', repeat('b', 32)),
  jsonb_build_object('name', 'Charlie', 'share_token', repeat('c', 32))
)) as group_id \gset

select pg_temp.assert((select count(*) from public.members where group_id = :'group_id') = 3, 'alice sees her 3 members');
select id as m_alice   from public.members where name = 'Alice'   \gset
select id as m_bob     from public.members where name = 'Bob'     \gset
select id as m_charlie from public.members where name = 'Charlie' \gset

-- Duplicate member names (case-insensitive) are rejected
select pg_temp.expect_error(format(
  $q$insert into public.members (group_id, name, share_token) values (%L, ' alice ', %L)$q$,
  :'group_id', repeat('d', 32)), 'duplicate member name');

-- Equal split that adds up is accepted
select public.save_expense(null, :'group_id', 150000, :'m_alice', 'equal', 'Dinner', '2026-11-01',
  jsonb_build_array(
    jsonb_build_object('member_id', :'m_alice',   'amount_owed', 50000),
    jsonb_build_object('member_id', :'m_bob',     'amount_owed', 50000),
    jsonb_build_object('member_id', :'m_charlie', 'amount_owed', 50000))) as expense_id \gset

-- Splits that don't add up are rejected
select pg_temp.expect_error(format(
  $q$select public.save_expense(null, %L, 1000, %L, 'exact', null, current_date,
     jsonb_build_array(jsonb_build_object('member_id', %L, 'amount_owed', 999)))$q$,
  :'group_id', :'m_alice', :'m_bob'), 'splits must sum to amount');

-- Editing replaces the splits atomically
select public.save_expense(:'expense_id', :'group_id', 90000, :'m_bob', 'exact', 'Petrol', '2026-11-02',
  jsonb_build_array(
    jsonb_build_object('member_id', :'m_alice', 'amount_owed', 45000),
    jsonb_build_object('member_id', :'m_bob',   'amount_owed', 45000)));
select pg_temp.assert((select count(*) from public.expense_splits where expense_id = :'expense_id') = 2, 'edit replaced splits');
select pg_temp.assert((select amount from public.expenses where id = :'expense_id') = 90000, 'edit updated amount');

-- Charlie isn't in any expense now -> can be deleted. Bob paid -> blocked.
-- (the FK is deferred to commit, so force the check inside this test's transaction)
select pg_temp.expect_error(format($q$set constraints all immediate; delete from public.members where id = %L$q$, :'m_bob'), 'cannot delete a member who paid');
select pg_temp.assert((select count(*) from public.members where id = :'m_bob') = 1, 'bob still exists');
delete from public.members where id = :'m_charlie';
select pg_temp.assert((select count(*) from public.members where group_id = :'group_id') = 2, 'unused member deleted');

-- Bob (a different organizer) sees nothing of Alice's ------------------------
reset role;
select pg_temp.as_user(:'bob');
select pg_temp.assert((select count(*) from public.groups) = 0,         'bob cannot see alice''s groups');
select pg_temp.assert((select count(*) from public.members) = 0,        'bob cannot see alice''s members');
select pg_temp.assert((select count(*) from public.expenses) = 0,       'bob cannot see alice''s expenses');
select pg_temp.assert((select count(*) from public.expense_splits) = 0, 'bob cannot see alice''s splits');

-- ...and cannot write into it
select pg_temp.expect_error(format(
  $q$insert into public.members (group_id, name, share_token) values (%L, 'Mallory', %L)$q$,
  :'group_id', repeat('m', 32)), 'bob cannot add members to alice''s group');
select pg_temp.expect_error(format(
  $q$select public.save_expense(null, %L, 100, %L, 'equal', null, current_date,
     jsonb_build_array(jsonb_build_object('member_id', %L, 'amount_owed', 100)))$q$,
  :'group_id', :'m_alice', :'m_alice'), 'bob cannot add expenses to alice''s group');
select pg_temp.expect_error(format($q$insert into public.groups (name, created_by) values ('Sneaky', %L)$q$, :'alice'),
  'bob cannot create a group owned by alice');
update public.groups set name = 'Hacked' where id = :'group_id';
delete from public.groups where id = :'group_id';

-- Bob's own group can't reference Alice's members
select public.create_group('Bob''s flat', jsonb_build_array(
  jsonb_build_object('name', 'Bob', 'share_token', repeat('e', 32)))) as bob_group \gset
select pg_temp.expect_error(format(
  $q$select public.save_expense(null, %L, 100, %L, 'equal', null, current_date,
     jsonb_build_array(jsonb_build_object('member_id', %L, 'amount_owed', 100)))$q$,
  :'bob_group', :'m_alice', :'m_alice'), 'payer from another group is rejected');

-- Anonymous users get nothing at all -----------------------------------------
reset role;
set role anon;
select pg_temp.expect_error('select * from public.groups', 'anon cannot read groups');
select pg_temp.expect_error('select * from public.members', 'anon cannot read members');
select pg_temp.expect_error($q$select public.create_group('x', '[]'::jsonb)$q$, 'anon cannot call create_group');

-- Alice's data survived Bob's attempts; deleting the group cascades ----------
reset role;
select pg_temp.as_user(:'alice');
select pg_temp.assert((select name from public.groups where id = :'group_id') = 'Hunza trip', 'bob''s update did nothing');
delete from public.groups where id = :'group_id';
reset role;
select pg_temp.assert((select count(*) from public.members  where group_id = :'group_id') = 0, 'members cascaded');
select pg_temp.assert((select count(*) from public.expenses where group_id = :'group_id') = 0, 'expenses cascaded');
select pg_temp.assert((select count(*) from public.expense_splits where expense_id = :'expense_id') = 0, 'splits cascaded');

\echo ALL DB TESTS PASSED
