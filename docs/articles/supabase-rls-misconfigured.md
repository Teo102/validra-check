# RLS is on. Your Supabase data is still public.

*Téo Brondel · October 2026 · ~8 min read*

> **Defensive use only.** Every example below was run on a local test database I created for this article. Do not test an application you don't own or don't have written permission to test: unauthorized access can be illegal (for example under article 323-1 of the French Penal Code, or the Computer Fraud and Abuse Act in the US).

## The problem

In a Supabase app, the browser talks to the database directly. The key it uses, the "anon" or "publishable" key, is meant to be public: it ships in every visitor's JavaScript. What protects the data is not that key, it is **Row-Level Security (RLS)**: Postgres policies that decide, row by row, who can read or change what.

When I review apps, the problem I run into most is not RLS being switched off. It is RLS being **on, with policies that don't say what the developer thinks they say**. I have seen this about ten times in client reviews. I can't name those clients (the reviews are under NDA), and I can't tell you how common it is in general: ten cases is what I saw, not a measurement.

The code behind those policies was written by AI coding tools (Lovable, Codex, Claude Code) as often as by people. My hypothesis, which I haven't tested rigorously, is that the failure mode is the same either way:

- **The goal is a working screen.** A policy that blocks a query produces a visible error; a policy that is too permissive produces nothing visible. The shortest path to "it works" is often the most permissive policy.
- **The UI hides the problem.** The frontend filters data by the current user, so testing by clicking around looks correct. The leak only shows when you call the API directly, as a different user.
- **"Secure" is a property of the whole system, not of a line of code.** A policy can look reasonable in isolation and still be wrong for the product.

This is not hypothetical at scale. In 2025, Matt Palmer scanned 1,645 projects built with Lovable and found 303 endpoints across 170 of them (about 10.3%) with inadequate RLS, exposing data that, in his words, "includes subscriptions, names, phone numbers, API keys, payment details" ([his statement](https://mattpalmer.io/posts/2025/05/statement-on-CVE-2025-48757/)). It became [CVE-2025-48757](https://www.cve.org/CVERecord?id=CVE-2025-48757), rated 9.3 by its CNA. The record is marked **disputed**: Lovable's position is that each customer is responsible for protecting their application's data.

That dispute is the interesting part. The tool generated the policy, the customer shipped it, and each side can reasonably say the other was responsible. The data was exposed either way.

## A reproducible example

To show the pattern without touching anyone's app, I reproduced it on a local Postgres 16 database with a minimal imitation of Supabase's `auth.uid()` and `auth.role()` helpers and its `anon` / `authenticated` roles. (It is an imitation, not a real Supabase project; the policy behavior is plain Postgres.)

One table, two users, A and B, each with one private note:

```sql
create table notes (id serial primary key, owner_id uuid not null, body text);
alter table notes enable row level security;

-- The policy I see most: RLS is on, and it "requires login".
create policy "logged in can read" on notes
for select using (auth.role() = 'authenticated');
```

Logged in as B, selecting from `notes` returns **both** notes. The policy checks that the caller is logged in, not that they own the row. Any free account can read every user's data. Nothing in the UI shows it, because the UI only asks for B's notes.

## How to detect it (read-only)

In order, from the outside in:

1. **Without an account.** Check which tables answer an anonymous request. I wrote an open-source tool for this, [validra-check](https://github.com/Teo102/validra-check): `npx validra-check https://your-app.com`. It only sends `GET` requests and never prints row values. It would not catch the example above, because that leak needs an account.
2. **Read the policies.** In the SQL editor, list tables where RLS is off (`select tablename from pg_tables where schemaname = 'public' and not rowsecurity;`) and read every policy in `pg_policies`. Look for `true`, for policies that only test `auth.role()`, and for `INSERT` policies without an ownership check. Supabase's Security Advisor flags some of these.
3. **Two test accounts.** Create A and B, log in as B *through the client SDK or the REST API*, and try to read and write A's rows. This is the only step that finds the example above. Don't run this test in the SQL editor: it runs as the `postgres` role, which bypasses RLS, so everything will look accessible.

In the client reviews, step 3 is where the real issues showed up: testing directly against the project's API, with the owner's authorization, then recommending safer policies like the ones below.

## The fix

These policies follow the [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security). I ran each one against the test database above.

```sql
-- Read: only your own rows.
-- "to authenticated" stops anonymous requests before the check runs.
-- "(select auth.uid())" is evaluated once per query, not once per row.
create policy "owners read their notes" on notes
for select to authenticated
using ((select auth.uid()) = owner_id);

-- Insert: the new row must belong to you.
create policy "owners create their notes" on notes
for insert to authenticated
with check ((select auth.uid()) = owner_id);

-- Update: USING picks which rows you may change, WITH CHECK validates the result.
create policy "owners update their notes" on notes
for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create index on notes (owner_id);  -- policies filter on it
```

With these, B sees only B's note, cannot create a note owned by A, cannot hand its note over to A, and an anonymous request gets nothing.

### Pitfalls I checked

- **`INSERT ... with check (true)`.** Tested: B can create rows owned by A. Always check ownership on insert.
- **`UPDATE` without `WITH CHECK`.** I expected this to let B reassign its rows to A. It doesn't: when `WITH CHECK` is omitted, Postgres reuses the `USING` expression as the check. Write it explicitly anyway, so the intent is obvious to the next person, human or model, who edits the policy.
- **RLS on, no policy.** Tested: nothing is visible to anyone. The tempting "fix" for that error is `using (true)`, which opens everything.
- **Views.** Tested: a plain view created by `postgres` returns all rows, ignoring the table's RLS. `alter view ... set (security_invoker = true)` (Postgres 15+) makes it respect RLS.
- **Authorization from `user_metadata`.** Supabase warns against it: users can edit their own metadata.
- **`SECURITY DEFINER` functions and the `service_role` key** bypass RLS by design. Keep them server-side and review every one.
- **Storage** has its own policies, separate from tables.

## Checklist

- [ ] RLS enabled on every table in an exposed schema
- [ ] No `using (true)` or `with check (true)` on tables with user data
- [ ] Every policy names its role (`to authenticated`)
- [ ] Policies compare the row's owner to `(select auth.uid())`, not just "is logged in"
- [ ] `INSERT` and `UPDATE` policies have an explicit `WITH CHECK`
- [ ] No authorization based on `user_metadata`
- [ ] Views use `security_invoker = true`
- [ ] Every `SECURITY DEFINER` function reviewed
- [ ] `service_role` / secret keys never in client code
- [ ] A two-account isolation test runs in CI
- [ ] Storage policies reviewed

## What a scanner can't see

An outside-in scanner, including mine, only sees what an anonymous visitor sees. It cannot tell whether user A can read user B's data, whether a member of one team can read another team's invoices, or whether a policy that is technically correct is too broad for your product. Those questions need someone, or something, that knows how the product is supposed to work.

## What I don't know yet

- **How common this is.** I have about ten cases from my own reviews and one large public scan. That is not a rate.
- **How much is caused by AI tools.** The cases I saw came from AI-generated and human-written code alike. I can't separate the two from what I observed.
- **Whether current coding agents still do it.** The obvious next experiment is to ask several coding agents to build the same multi-user app and measure how often their default policies leak across accounts. I haven't run it yet.
- **How to automate the two-account test safely.** My tool deliberately stops at anonymous access. Testing authenticated isolation automatically, without the tool becoming an attack tool, is an open design question for me.

---

*Téo Brondel runs [Validra](https://validra.dev), security reviews for SaaS and web apps. Questions or corrections: teobrondel6@gmail.com.*
