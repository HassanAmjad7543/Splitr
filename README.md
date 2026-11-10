# Splitr: Who Owes Who What

A Next.js + Supabase expense splitter for friend groups, roommates, and trips.
One organizer logs expenses; everyone else gets a read-only share link. No
account required.

🔗 **Live:** https://your-url.vercel.app
📸 **Screenshot:** _[embed a hero shot here]_

## Why

Splitwise requires every group member to sign up, which kills adoption in
informal friend circles where only the organizer cares enough to install
anything. This app flips the model: one account for the organizer, name-only
"members", and a unique share link per member for read-only balance views.

## Features

- Multi-group dashboard per user
- Add expenses with equal / exact / percentage splits
- Edit and delete expenses; add, rename and remove members
- Net balance per member
- Minimum-transactions settlement plan
- Unique shareable read-only link per member (copy, send on WhatsApp, or reset)
- Dark / light mode
- Fully responsive, mobile-first (the add-expense form is a bottom sheet on phones)

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui
Supabase (Postgres + Auth + RLS) · Vercel · Vitest

## The Settlement Algorithm

Given a list of expenses with payers and beneficiaries, the app computes a
short list of member-to-member transfers that settles everyone up.

**Approach:** compute each member's net balance (what they paid minus what
they owe), split members into creditors and debtors, then greedily match the
largest debtor with the largest creditor until both piles are empty. Every
transfer takes at least one person to zero, so N members with non-zero
balances never need more than N − 1 transfers.

**Example.** Alice pays Rs 1,500 for dinner, Bob Rs 900 for petrol, Charlie
Rs 600 for parking, each split three ways. Paying back each share separately
takes six transfers. Netting gives Alice +500, Bob −100 and Charlie −400, which
settles in two: _Charlie pays Alice 400, Bob pays Alice 100_.

**Caveat:** N − 1 is optimal unless some subgroup's balances cancel out on
their own (say A is +300 and B is −300 inside a bigger group). Finding the
true minimum in general is NP-hard, because it's a subset-sum partitioning
problem. Greedy runs instantly and is optimal, or one transfer off, for
realistic friend groups.

See [`lib/settle.ts`](lib/settle.ts) for the implementation and
[`tests/settle.test.ts`](tests/settle.test.ts) for the tests (the worked
example, a 5-person case, all-zero, N = 2, and 500 random groups checked
against the N − 1 bound).

## Money handling

Every amount is stored and computed as an **integer number of paisa** (1/100
rupee), in `bigint` columns. Rupee strings are parsed digit by digit (never
`parseFloat`), and conversion happens only at input and display.

Splits never lose a paisa: Rs 1.00 split three ways is 33 + 33 + 34. The
leftover paisa go to the payer when they're in the split; otherwise they're
handed out deterministically. The tests check that `sum(shares) === total` for
thousands of random amounts and group sizes, and the database rejects any
expense whose splits don't add up.

## Architecture

```
Browser ──anon key──▶ Supabase (RLS: organizer sees only their own groups)
Server actions ──user session──▶ Supabase (same RLS; atomic writes via RPC)
/share/[token] ──service-role key, server only──▶ hand-shaped, filtered response
```

- **Row Level Security** is on for every table. Policies only grant access to
  the group's owner (`created_by = auth.uid()`). The `anon` role has no table
  privileges at all.
- **Share links** never go through RLS. `lib/share.ts` runs server-side with
  the service-role key, looks the member up by token, and returns only the
  group name, that member's own balance, the expenses they paid for or are part
  of (other people as names only), and the settlement rows involving them.
  It never returns other members' balances, IDs or tokens, or anything about
  the organizer. Share pages are `noindex` and `no-referrer`.
- **Tokens** are 24 random bytes (192 bits) as 32 base64url characters, from
  Node's `crypto`. The organizer can reset any link and the old one stops
  working immediately.
- **Atomic writes:** creating a group with its members, and saving an expense
  with its splits, each happen in a single Postgres function call
  (`create_group`, `save_expense`). Both are `SECURITY INVOKER`, so RLS still
  applies inside them.
- **Integrity triggers** stop an expense from naming a payer or participant
  from a different group, even though the foreign keys alone would allow it.
- **Removing a member** who appears in any expense is blocked. The organizer
  edits or deletes those expenses first, so history is never silently
  rewritten. This is enforced in the app (friendly message) and in the
  database (deferred foreign keys).

The full schema, policies and functions are in
[`supabase/schema.sql`](supabase/schema.sql).

## Run locally

1. **Clone and install**

   ```bash
   git clone https://github.com/HassanAmjad7543/Splitr.git
   cd Splitr
   pnpm install
   ```

2. **Create a Supabase project**, then open the SQL editor and run
   `supabase/schema.sql`.

3. **Configure auth** in the Supabase dashboard:
   - Authentication → URL Configuration: set the Site URL to
     `http://localhost:3000` and add
     `http://localhost:3000/api/auth/callback` to the redirect URLs (add your
     Vercel URL later too).
   - Authentication → Providers → Google: enable it with a Google OAuth client
     ID and secret. The Google client's authorized redirect URI is
     `https://<project-ref>.supabase.co/auth/v1/callback`.

4. **Environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the project URL, the anon key, and the service-role key (Project
   Settings → API).

5. **Run**

   ```bash
   pnpm dev
   ```

### Tests

```bash
pnpm test        # unit tests: settlement, split math, money parsing
pnpm test:db     # schema + RLS tests against a local Postgres (uses PG* env vars)
pnpm lint
pnpm typecheck
```

`pnpm test:db` creates a throwaway database, loads a small stand-in for
Supabase's `auth` schema, applies `schema.sql`, and checks the following as
two different organizers and as `anon`: data isolation, blocked cross-group
writes, split-sum enforcement, member-delete blocking, and cascading group
deletes.

To check RLS by hand in the Supabase SQL editor:

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "your-test-user-uuid"}';
select * from groups;  -- should return only that user's groups
```

## Deploy (Vercel)

Import the repo in Vercel and set the four variables from `.env.example`
(`NEXT_PUBLIC_SITE_URL` = your production URL). Then add
`https://<your-domain>/api/auth/callback` to the Supabase redirect URLs.

## Project layout

```
app/                 routes: landing, login/signup, groups dashboard + detail, public share page, API routes
components/          UI (shadcn/ui primitives in components/ui)
lib/settle.ts        the settlement algorithm
lib/splits.ts        equal / exact / percentage split math
lib/balances.ts      per-member net balances
lib/money.ts         paisa ⇄ rupee parsing and formatting
lib/share.ts         the share-link privacy boundary (server only)
lib/actions/         server actions (all writes)
lib/supabase/        browser, server, middleware and service-role clients
supabase/schema.sql  tables, RLS policies, triggers, RPC functions
tests/               Vitest unit tests
```

## Roadmap (v1.1)

Multiple currencies, receipt photos, recurring expenses, "I paid" settle-up
confirmations, payment links (Easypaisa / JazzCash / Raast), CSV export,
co-organizers, Urdu localization.

## Credits

Icons by lucide-react. Auth and database by Supabase.
