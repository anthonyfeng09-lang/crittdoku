# Putting CRITTDOKU online

The game is a static site (a Vite build in `dist/`). Accounts are the only
moving part and they live in Supabase, not on the web host, so any static
host works. Pick one.

## Fastest: Netlify Drop (about 60 seconds, no CLI)

1. `npm run build`
2. Go to <https://app.netlify.com/drop>
3. Drag the `dist` folder onto the page. You get a live URL immediately.
4. Make a free Netlify account when it asks, to keep the URL and rename it.

Downside: you re-drag `dist` every time you change something. For anything
ongoing, use the git option below.

## Recommended: Vercel from GitHub (auto-deploys on every push)

1. Put the repo on GitHub:
   ```bash
   git remote add origin https://github.com/<you>/crittdoku.git
   git push -u origin master
   ```
2. Go to <https://vercel.com/new>, sign in with GitHub, import the repo.
   Vercel detects Vite - leave the build settings as they are.
3. Before the first deploy, open **Environment Variables** and add the two
   Supabase values (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (Get them from your Supabase project: Settings -> API. See `SUPABASE.md`.
   The anon key is public - it is safe in a frontend build.)
4. Deploy. Every `git push` after this redeploys automatically.

Netlify from GitHub works the same way (<https://app.netlify.com> -> Add new
site -> Import) with the same two environment variables.

## Custom domain

Both hosts: project settings -> Domains -> add your domain, then set the DNS
record they show you at your registrar. HTTPS is automatic.

## Supabase for production

In your Supabase project, add the deployed URL to
**Authentication -> URL Configuration -> Site URL** and Redirect URLs, so
confirmation emails and password resets point back to the live site.

## Checklist before launch

- [ ] `npm run build` succeeds and `npx vitest run` is green
- [ ] Supabase table + row-security SQL has been run (`SUPABASE.md`)
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set on the host
- [ ] Supabase Site URL points at the live domain
- [ ] Open the deployed site, create an account, sign in on a second
      device, confirm the profile matches
