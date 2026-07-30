# `scripts/` — the bootstrap CLI

`bootstrap.mjs` turns a fresh clone of this template into a fully running site:
GitHub repo → Supabase project (schema + buckets + admin user) → Vercel deploy,
with `.env.local` and Vercel env vars wired up, and the browser opened at the
live URL.

This implements **Option B** from `../BOOTSTRAP_SCRIPT_BRIEF.md`: the script runs
*inside* an already-cloned repo (created by `../bootstrap.sh`).

## Run it

```bash
# from anywhere — creates repo, clones, installs, bootstraps:
curl -fsSL https://raw.githubusercontent.com/tjsoho/summer-website-template/main/bootstrap.sh | bash -s my-site

# or, if you've already got a clone:
npm start app
```

`bootstrap.mjs` self-installs its own dependencies (declared in
`scripts/package.json`, separate from the app) on first run, so a clean machine
just works.

## Flags

| Flag | Effect |
|---|---|
| `--admin-email <email>` | Override the default `toby@ai-guy.co`. |
| `--repo-name <name>` | Override the project name (defaults to the repo folder name). |
| `--region <slug>` | Skip the region prompt (e.g. `ap-southeast-2`). |
| `--dry-run` | Validate inputs + tokens, then stop. Creates nothing. |
| `--no-open` | Don't open the browser at the end. |

## Files

| File | Role |
|---|---|
| `bootstrap.mjs` | Orchestrator: preflight → inputs → steps → summary. |
| `lib/log.mjs` | Colored output, spinners, `.bootstrap.log`, secret redaction. |
| `lib/config.mjs` | Credential cache at `~/.summer-website-template/config.json` (0600). |
| `lib/prompts.mjs` | Interactive input (`@inquirer/prompts`), region list, recovery prompt. |
| `lib/github.mjs` | `gh` CLI wrapper (create/clone/commit/delete). |
| `lib/supabase-mgmt.mjs` | Supabase Management API client + service-role `supabase-js`. |
| `lib/vercel.mjs` | Vercel CLI (link/deploy) + API (bulk env vars). |
| `lib/env.mjs` | `.env.local` writer + Vercel env mapping. |

## Steps (and idempotency)

0. **Preflight** — Node ≥ 20, `gh` installed+authed, `vercel` installed, internet.
1. **Inputs** — repo name, admin email/password, region. Confirm summary.
3. **Supabase project** — `POST /v1/projects`, poll to `ACTIVE_HEALTHY`, capture
   anon + service-role keys. Reuses an existing project of the same name.
4. **Storage buckets** — waits for the storage service to come up, then creates
   `site-images` + `site-files`. Done **before** the schema so `storage.objects`
   exists (the schema's storage policies reference it).
5. **Schema** — runs `setup-database.sql` via the Management API query endpoint.
   "already exists" errors are non-fatal; retries briefly on the transient
   "storage.objects missing" error that a freshly-provisioned project can throw.
6. **Storage policies + verify** — adds the `site-files` RLS policies (the
   `site-images` ones ship in the SQL), then round-trips a tiny PNG upload (the
   image bucket only accepts `image/*`) to confirm uploads work.
7. **Admin user** — `auth.admin.createUser({ email_confirm: true })`. Existing
   user → logged and skipped.
9. **`.env.local`** — written immediately so `npm run dev` works; refreshed with
   the real deploy URL after step 10.
10/11. **Vercel** — `vercel link` (creates the project), bulk env push via API,
   `vercel deploy --prod`.
12. **Commit & push** — pushes any bootstrap-generated changes.
13. **Summary + open browser.**

> **Step 8 (seed default pages) is intentionally skipped.** The app renders
> fallback content from `src/app/**/_config.ts` until the admin first hits Save,
> so an empty `pages` table still shows the demo content. Importing the TS
> `_config` files from a plain `.mjs` script is fragile; see the brief, which
> marks this optional. Re-add here if you want pre-seeded DB rows.

## Tokens

Prompted once, cached in `~/.summer-website-template/config.json`:

- **Supabase** Personal Access Token — https://supabase.com/dashboard/account/tokens
  (full account access — prefer a single-org token).
- **Vercel** API Token — https://vercel.com/account/tokens

GitHub uses your existing `gh` auth.

## Safety

- Secrets (tokens, DB password, service-role key, admin password) are registered
  with the logger and redacted from stdout and `.bootstrap.log`. The admin
  password is never persisted anywhere — it goes straight to Supabase.
- Each step has retry / skip / abort recovery. On abort/fatal error the script
  offers to roll back created resources (Supabase project, Vercel project);
  destructive deletes are double-confirmed.
- `.bootstrap.log` (gitignored) captures full step state for debugging.

## Notes / divergences from the brief

- **Schema applied via the Management API query endpoint** rather than `pg`/`psql`.
  It avoids connection-string/IPv6 issues on brand-new projects and needs no extra
  network path. `pg` is still listed as a dep for future direct-DB use.
- **Step 8 seeding skipped** (see above).
- **v2** will publish this package to npm so `npx create-summer-site` works without
  the `bootstrap.sh` curl step.
