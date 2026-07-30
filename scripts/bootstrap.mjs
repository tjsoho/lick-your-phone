#!/usr/bin/env node
// =============================================================================
// create-summer-site — one-command bootstrap for the summer-website-template.
//
// Provisions GitHub + Supabase + Vercel for a fresh clone of this template:
//   repo  ·  Supabase project (schema + buckets + admin user)  ·  Vercel deploy
//   ·  .env.local wired  ·  browser opened at the live URL.
//
// Implements "Option B" from BOOTSTRAP_SCRIPT_BRIEF.md: it runs *inside* an
// already-cloned repo (created by bootstrap.sh) and configures everything else.
//
// Run: `npm run bootstrap`  (or `node scripts/bootstrap.mjs`)
// =============================================================================

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(SCRIPTS_DIR);
const TEMPLATE = "tjsoho/summer-website-template";

// -----------------------------------------------------------------------------
// 0a. Ensure this CLI's own dependencies are installed before importing them.
//     (Kept dependency-free so it can run on a clean machine.)
// -----------------------------------------------------------------------------
function ensureCliDeps() {
  if (existsSync(join(SCRIPTS_DIR, "node_modules", "@inquirer", "prompts"))) return;
  console.log("Installing bootstrap CLI dependencies (one-time)…");
  execSync("npm install --no-audit --no-fund", { cwd: SCRIPTS_DIR, stdio: "inherit" });
}

ensureCliDeps();

// Dynamic imports — only safe after ensureCliDeps().
const log = await import("./lib/log.mjs");
const { collectInputs, ensureTokens, confirmSummary, recover, SUPABASE_REGIONS, select, confirm } =
  await import("./lib/prompts.mjs");
const gh = await import("./lib/github.mjs");
const { SupabaseMgmt, serviceClient } = await import("./lib/supabase-mgmt.mjs");
const vercel = await import("./lib/vercel.mjs");
const { buildEnv, writeEnvLocal, envForVercel } = await import("./lib/env.mjs");
const open = (await import("open")).default;

log.initLog(REPO_ROOT);

// -----------------------------------------------------------------------------
// CLI flags
// -----------------------------------------------------------------------------
function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") flags.dryRun = true;
    else if (a === "--admin-email") flags.adminEmail = argv[++i];
    else if (a === "--repo-name") flags.repoName = argv[++i];
    else if (a === "--region") flags.region = argv[++i];
    else if (a === "--no-open") flags.noOpen = true;
  }
  return flags;
}
const flags = parseFlags(process.argv.slice(2));

// Rollback registry — each entry { label, fn, destructive }.
const rollbacks = [];
function onRollback(label, fn, destructive = true) {
  rollbacks.push({ label, fn, destructive });
}

/**
 * Run a named step with retry/skip/abort recovery. Returns the step's result,
 * or undefined if skipped.
 */
async function runStep(n, title, fn, { retryable = true } = {}) {
  log.step(n, title);
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      log.error(`${title}: ${err.message}`);
      const choice = await recover(title, { retryable });
      if (choice === "retry") continue;
      if (choice === "skip") {
        log.warn(`Skipped: ${title}`);
        return undefined;
      }
      await maybeRollback();
      process.exit(1);
    }
  }
}

async function maybeRollback() {
  if (rollbacks.length === 0) return;
  const doIt = await confirm({
    message: `Roll back ${rollbacks.length} created resource(s)?`,
    default: false,
  });
  if (!doIt) return;
  for (const { label, fn, destructive } of rollbacks.reverse()) {
    if (destructive) {
      const sure = await confirm({ message: `Delete ${label}? This cannot be undone.`, default: false });
      if (!sure) continue;
    }
    try {
      await fn();
      log.success(`Rolled back: ${label}`);
    } catch (err) {
      log.error(`Rollback failed for ${label}: ${err.message}`);
    }
  }
}

function genPassword() {
  // URL/shell-safe strong password for the Supabase DB.
  return randomBytes(24).toString("base64url");
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  log.heading("🌞  create-summer-site");
  if (flags.dryRun) log.warn("DRY RUN — no external resources will be created.");

  // --- Step 0: preflight -----------------------------------------------------
  await runStep(0, "Preflight checks", async () => {
    const [major] = process.versions.node.split(".").map(Number);
    if (major < 20) throw new Error(`Node ${process.versions.node} found; need >= 20`);

    if (!(await gh.ghInstalled())) throw new Error("`gh` CLI not found. Install: https://cli.github.com");
    if (!(await gh.ghAuthed())) throw new Error("`gh` not authenticated. Run: gh auth login");

    if (!(await vercel.vercelInstalled())) {
      log.warn("vercel CLI not found — installing globally…");
      execSync("npm i -g vercel", { stdio: "inherit" });
    }

    // Internet reachability.
    try {
      await fetch("https://api.github.com", { method: "HEAD" });
    } catch {
      throw new Error("No internet connection detected.");
    }
    log.success("Preflight passed");
  }, { retryable: true });

  // --- Step 1: collect inputs ------------------------------------------------
  const defaults = { repoName: flags.repoName ?? basename(REPO_ROOT), adminEmail: flags.adminEmail, region: flags.region };
  const inputs = await collectInputs(defaults);
  const { supabaseToken, vercelToken } = await ensureTokens();

  const regionLabel = SUPABASE_REGIONS.find((r) => r.value === inputs.region)?.name ?? inputs.region;
  const proceed = await confirmSummary({
    "Project name": inputs.repoName,
    "Admin email": inputs.adminEmail,
    "Supabase region": regionLabel,
    "Repo root": REPO_ROOT,
  });
  if (!proceed) {
    log.warn("Aborted by user.");
    process.exit(0);
  }

  if (flags.dryRun) {
    log.success("Dry run complete — inputs validated, tokens present. Nothing was created.");
    process.exit(0);
  }

  const mgmt = new SupabaseMgmt(supabaseToken);

  // --- Step 3: provision Supabase project ------------------------------------
  const project = await runStep(3, "Provision Supabase project", async () => {
    const orgs = await mgmt.listOrganizations();
    if (!orgs?.length) throw new Error("No Supabase organizations on this account.");
    const orgId =
      orgs.length === 1
        ? orgs[0].id
        : await select({
            message: "Supabase organization:",
            choices: orgs.map((o) => ({ name: o.name, value: o.id })),
          });

    let proj = await mgmt.findProjectByName(inputs.repoName);
    let dbPass = genPassword();
    if (proj) {
      log.warn(`Reusing existing Supabase project "${inputs.repoName}" (${proj.id}).`);
    } else {
      log.redactSecret(dbPass);
      proj = await mgmt.createProject({
        name: inputs.repoName,
        organizationId: orgId,
        region: inputs.region,
        dbPass,
      });
      const ref = proj.id || proj.ref;
      onRollback(`Supabase project ${ref}`, () => mgmt.deleteProject(ref));
    }
    const ref = proj.id || proj.ref;

    await log.withSpinner("Waiting for Supabase project to become healthy…", async (setText) => {
      await mgmt.waitUntilHealthy(ref, {
        onTick: (s, status) => setText(`Supabase provisioning… ${s}s (${status})`),
      });
      return "Supabase project ACTIVE_HEALTHY";
    });

    const keys = await mgmt.getApiKeys(ref);
    log.redactSecret(keys.serviceRoleKey);
    log.success(`Supabase project ready: https://${ref}.supabase.co`);
    return { ref, dbPass, ...keys };
  });

  const supabaseUrl = `https://${project.ref}.supabase.co`;
  const sb = serviceClient(project.ref, project.serviceRoleKey);

  // --- Step 4: create storage buckets ----------------------------------------
  // Done BEFORE the schema so the storage service is initialised — the schema's
  // storage policies reference storage.objects, which a brand-new project only
  // creates once storage has been hit. We poll until storage is ready first so
  // bucket creation itself can't race the provisioning.
  await runStep(4, "Create storage buckets", async () => {
    await log.withSpinner("Waiting for storage service…", async (setText) => {
      for (let i = 0; i < 30; i++) {
        const { error } = await sb.storage.listBuckets();
        if (!error) return "Storage service ready";
        setText(`Waiting for storage service… ${i * 3}s`);
        await new Promise((r) => setTimeout(r, 3000));
      }
      const { error } = await sb.storage.listBuckets();
      if (error) throw new Error(`storage not ready: ${error.message}`);
      return "Storage service ready";
    });

    for (const [name, opts] of [
      ["site-images", { public: true, fileSizeLimit: "50MB", allowedMimeTypes: ["image/*"] }],
      ["site-files", { public: true, fileSizeLimit: "50MB", allowedMimeTypes: ["application/pdf"] }],
    ]) {
      const { error } = await sb.storage.createBucket(name, opts);
      if (error && !/already exists/i.test(error.message)) throw new Error(`bucket ${name}: ${error.message}`);
      log.success(`Bucket "${name}" ready.`);
    }
  });

  // --- Step 5: apply database schema -----------------------------------------
  await runStep(5, "Apply database schema", async () => {
    const sql = (await import("node:fs")).readFileSync(join(REPO_ROOT, "setup-database.sql"), "utf8");
    // The storage schema can still be settling right after the buckets are
    // created, so retry briefly on the transient "storage.objects missing" error.
    for (let attempt = 1; ; attempt++) {
      try {
        await mgmt.runSql(project.ref, sql);
        break;
      } catch (err) {
        if (/already exists/i.test(err.message)) {
          log.warn("Schema objects already exist — continuing.");
          break;
        }
        const transient = /storage\.objects|42P01|does not exist/i.test(err.message);
        if (transient && attempt < 8) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw err;
      }
    }
    log.success("Schema applied (tables, policies, triggers).");
  });

  // --- Step 6: storage RLS for site-files + verify ---------------------------
  await runStep(6, "Storage policies + verification", async () => {
    // setup-database.sql ships site-images policies; add site-files to match.
    const filePolicies = ["SELECT", "INSERT", "UPDATE", "DELETE"]
      .map((op) => {
        const using = op === "INSERT" ? "WITH CHECK" : "USING";
        return `DO $$ BEGIN
  CREATE POLICY "Public ${op.toLowerCase()} for site-files" ON storage.objects
  FOR ${op} ${using} (bucket_id = 'site-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;
      })
      .join("\n");
    await mgmt.runSql(project.ref, filePolicies);

    // Verify by round-tripping a tiny REAL image — the site-images bucket only
    // allows image/* mime types, so a typeless blob would be rejected.
    const onePxPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const probe = `bootstrap-probe-${Date.now()}.png`;
    const up = await sb.storage
      .from("site-images")
      .upload(probe, Buffer.from(onePxPng, "base64"), {
        upsert: true,
        contentType: "image/png",
      });
    if (up.error) throw new Error(`upload probe failed: ${up.error.message}`);
    await sb.storage.from("site-images").remove([probe]);
    log.success("Storage upload/delete verified.");
  });

  // --- Step 7: create admin user ---------------------------------------------
  // On a fresh project the auth service can lag behind ACTIVE_HEALTHY and
  // return transient "Database error ..." failures, so retry those for ~1 min.
  await runStep(7, "Create admin user", async () => {
    for (let attempt = 1; ; attempt++) {
      const { error } = await sb.auth.admin.createUser({
        email: inputs.adminEmail,
        password: inputs.adminPassword,
        email_confirm: true,
      });
      if (!error) {
        log.success(`Admin user created: ${inputs.adminEmail}`);
        return;
      }
      if (/already.*regist|exists/i.test(error.message)) {
        log.warn(`Admin user ${inputs.adminEmail} already exists — continuing.`);
        return;
      }
      if (attempt < 6 && /database error/i.test(error.message)) {
        log.warn(`Auth service not ready (${error.message}) — retrying in 10s (${attempt}/5)…`);
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }
      throw error;
    }
  });

  // Step 8 (seed default pages) intentionally skipped — the app renders fallback
  // content from src/app/**/_config.ts until the admin first hits Save. See README.

  // --- Step 9: write .env.local ----------------------------------------------
  // baseUrl is finalised after the Vercel deploy; write a first pass now so
  // `npm run dev` works immediately, then refresh after deploy.
  let env = buildEnv({
    supabaseUrl,
    anonKey: project.anonKey,
    serviceRoleKey: project.serviceRoleKey,
    dbPassword: project.dbPass,
    baseUrl: `https://${inputs.repoName}.vercel.app`,
  });
  await runStep(9, "Write .env.local", async () => {
    writeEnvLocal(REPO_ROOT, env);
    log.success(".env.local written (gitignored).");
  });

  // --- Step 10 + 11: Vercel link, env push, deploy ---------------------------
  const deploy = await runStep(10, "Vercel project + env + deploy", async () => {
    const scopes = await vercel.listScopes(vercelToken);
    let scope = scopes[0];
    if (scopes.length > 1) {
      const value = await select({
        message: "Vercel scope:",
        choices: scopes.map((s) => ({ name: s.name, value: s.slug })),
      });
      scope = scopes.find((s) => s.slug === value);
    }

    const { projectId } = await vercel.linkProject({
      cwd: REPO_ROOT,
      name: inputs.repoName,
      token: vercelToken,
      teamSlug: scope.value ? scope.slug : null,
    });
    onRollback(`Vercel project ${inputs.repoName}`, () =>
      vercel.deleteProject({ projectId, teamId: scope.value, token: vercelToken })
    );

    await vercel.setEnvVars({
      projectId,
      teamId: scope.value,
      token: vercelToken,
      vars: envForVercel(env),
    });
    log.success("Env vars pushed to Vercel (production/preview/development).");

    let url;
    await log.withSpinner("Deploying to Vercel (this is the slow step)…", async (setText) => {
      setText("Building & deploying to Vercel…");
      url = await vercel.deployProd({
        cwd: REPO_ROOT,
        token: vercelToken,
        teamSlug: scope.value ? scope.slug : null,
      });
      return `Deployed: ${url}`;
    });
    return { url, projectId, teamId: scope.value };
  });

  // Refresh NEXT_PUBLIC_BASE_URL with the real deployment URL.
  const liveUrl = deploy?.url || `https://${inputs.repoName}.vercel.app`;
  env = { ...env, NEXT_PUBLIC_BASE_URL: liveUrl };
  writeEnvLocal(REPO_ROOT, env);

  // --- Step 12: push bootstrap result ----------------------------------------
  await runStep(12, "Commit & push", async () => {
    const pushed = await gh.commitAndPush(REPO_ROOT, "chore: bootstrap configuration");
    log.success(pushed ? "Pushed bootstrap state to GitHub." : "Nothing new to commit.");
  }, { retryable: false });

  // --- Step 13: summary + open ------------------------------------------------
  let repoUrl = `https://github.com/<you>/${inputs.repoName}`;
  try {
    repoUrl = `https://github.com/${await gh.ghUser()}/${inputs.repoName}`;
  } catch {
    /* non-fatal */
  }

  log.heading("Done 🎉");
  log.info(`✓ Repo:       ${repoUrl}`);
  log.info(`✓ Supabase:   ${supabaseUrl}`);
  log.info(`✓ Vercel:     ${liveUrl}`);
  log.info(`✓ Admin URL:  ${liveUrl}/admin/login`);
  log.info(`✓ Local:      cd ${basename(REPO_ROOT)} && npm run dev`);

  if (!flags.noOpen) {
    try {
      await open(liveUrl);
    } catch {
      /* headless / no browser — fine */
    }
  }
}

main().catch(async (err) => {
  log.error(`Fatal: ${err.message}`);
  await maybeRollback();
  process.exit(1);
});
