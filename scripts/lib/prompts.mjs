// Interactive input collection. Wraps @inquirer/prompts so bootstrap.mjs stays readable.

import { input, password, select, confirm } from "@inquirer/prompts";
import { loadConfig, setConfigValue } from "./config.mjs";
import { redactSecret, c } from "./log.mjs";

// A curated subset of Supabase regions. Sydney first (the template's default audience).
export const SUPABASE_REGIONS = [
  { name: "ap-southeast-2  Sydney", value: "ap-southeast-2" },
  { name: "ap-southeast-1  Singapore", value: "ap-southeast-1" },
  { name: "ap-northeast-1  Tokyo", value: "ap-northeast-1" },
  { name: "ap-south-1      Mumbai", value: "ap-south-1" },
  { name: "us-east-1       N. Virginia", value: "us-east-1" },
  { name: "us-west-1       N. California", value: "us-west-1" },
  { name: "eu-west-1       Ireland", value: "eu-west-1" },
  { name: "eu-west-2       London", value: "eu-west-2" },
  { name: "eu-central-1    Frankfurt", value: "eu-central-1" },
  { name: "sa-east-1       São Paulo", value: "sa-east-1" },
];

function validateRepoName(value) {
  const v = value.trim();
  if (!v) return "Repo name is required";
  if (v.length > 50) return "Keep it to 50 characters or fewer";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v))
    return "Use kebab-case: lowercase letters, numbers and hyphens (e.g. acme-corporate-site)";
  return true;
}

/**
 * Collect everything the run needs. `cli` carries flag overrides
 * (adminEmail, repoName, region, scope) so prompts can be skipped.
 */
export async function collectInputs(cli = {}) {
  const repoName =
    cli.repoName ??
    (await input({
      message: "New repo / project name (kebab-case):",
      validate: validateRepoName,
    }));

  const adminEmail =
    cli.adminEmail ??
    (await input({
      message: "Admin email:",
      default: "toby@ai-guy.co",
      validate: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? true : "Enter a valid email"),
    }));

  const adminPassword = await password({
    message: `Admin password for ${c.cyan(adminEmail)} (min 12 chars, hidden):`,
    mask: "*",
    validate: (v) => (v.length >= 12 ? true : "Password must be at least 12 characters"),
  });
  redactSecret(adminPassword);

  const region =
    cli.region ??
    (await select({
      message: "Supabase region:",
      choices: SUPABASE_REGIONS,
      default: "ap-southeast-2",
    }));

  return { repoName: repoName.trim(), adminEmail: adminEmail.trim(), adminPassword, region };
}

/**
 * Ensure the Supabase + Vercel tokens exist in the credential cache.
 * Prompts (with a link) on first run, then reuses. Returns { supabaseToken, vercelToken }.
 */
export async function ensureTokens() {
  const config = loadConfig();

  let supabaseToken = config.supabaseAccessToken;
  if (!supabaseToken) {
    console.log(
      c.dim(
        "\nSupabase Personal Access Token needed (full account access — consider a single-org token).\n" +
          "Generate one at: https://supabase.com/dashboard/account/tokens"
      )
    );
    supabaseToken = await password({
      message: "Paste Supabase Personal Access Token:",
      mask: "*",
      validate: (v) => (v.trim().length > 10 ? true : "That doesn't look like a token"),
    });
    supabaseToken = supabaseToken.trim();
    setConfigValue("supabaseAccessToken", supabaseToken);
  }
  redactSecret(supabaseToken);

  let vercelToken = config.vercelToken;
  if (!vercelToken) {
    console.log(c.dim("\nVercel API Token needed.\nGenerate one at: https://vercel.com/account/tokens"));
    vercelToken = await password({
      message: "Paste Vercel API Token:",
      mask: "*",
      validate: (v) => (v.trim().length > 10 ? true : "That doesn't look like a token"),
    });
    vercelToken = vercelToken.trim();
    setConfigValue("vercelToken", vercelToken);
  }
  redactSecret(vercelToken);

  return { supabaseToken, vercelToken };
}

export async function confirmSummary(summary) {
  console.log("\n" + c.bold("About to bootstrap:"));
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${c.dim(k.padEnd(16))} ${v}`);
  }
  return confirm({ message: "Proceed?", default: true });
}

/** "Retry / Skip / Abort?" prompt used by the step runner on failure. */
export async function recover(stepName, { retryable = true } = {}) {
  return select({
    message: `Step "${stepName}" failed. What now?`,
    choices: [
      ...(retryable ? [{ name: "Retry", value: "retry" }] : []),
      { name: "Skip (continue anyway)", value: "skip" },
      { name: "Abort", value: "abort" },
    ],
    default: retryable ? "retry" : "abort",
  });
}

export { confirm, select };
