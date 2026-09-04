# Cloud accounts (Supabase)

CRITTDOKU runs fine with no backend. Add Supabase and players get real
email/password accounts, and their profile (name, avatar, rank, RP, match
history) follows them to any device.

## 1. Create the project

1. Sign up at <https://supabase.com> and create a new project (free tier is
   plenty). Pick a region near your players.
2. Project Settings -> API. Copy:
   - **Project URL** -> `VITE_SUPABASE_URL`
   - **anon / public** key -> `VITE_SUPABASE_ANON_KEY`
3. Put both in `.env.local` at the repo root, then restart `npm run dev`.

The anon key is meant to be public; it only works together with the row
security policy below.

## 2. Create the profiles table

Supabase dashboard -> SQL Editor -> paste and run:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

## 3. Auth settings

Dashboard -> Authentication -> Providers -> Email is on by default.

- For the smoothest first run, turn **"Confirm email" off** (Authentication ->
  Providers -> Email). Players can then sign up and play immediately.
- Leave it on and Supabase emails a confirmation link before the first
  sign-in. The sign-up screen tells the player to check their inbox.

## 4. Done

Run the app, open the profile page (tap your name on the home screen), and
the account box now has email/password fields. Sign up on one device, sign
in on another, and the profile is the same.

If `.env.local` is missing or blank the account box just says cloud accounts
are not set up, and everything else works as before.
