// Vercel integration. CLI for link + deploy (most reliable), API for bulk env-var add.

import { execa } from "execa";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.vercel.com";

async function vercelApi(path, token, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const detail = typeof json === "object" ? JSON.stringify(json) : json;
    throw new Error(`Vercel API ${method} ${path} → ${res.status}: ${detail}`);
  }
  return json;
}

/** Is the vercel CLI available? */
export async function vercelInstalled() {
  try {
    await execa("vercel", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

/** List scopes (teams + personal). Returns [{ name, value(slug or undefined for personal) }]. */
export async function listScopes(token) {
  const me = await vercelApi("/v2/user", token);
  const personalSlug = me.user?.username || me.user?.email;
  const choices = [{ name: `${personalSlug} (personal)`, value: null, slug: personalSlug }];
  try {
    const { teams } = await vercelApi("/v2/teams", token);
    for (const t of teams || []) choices.push({ name: t.name || t.slug, value: t.id, slug: t.slug });
  } catch {
    /* personal-only token */
  }
  return choices;
}

/**
 * Link the local repo dir to a Vercel project, creating it if needed.
 * Writes .vercel/project.json. Returns { projectId, orgId }.
 */
export async function linkProject({ cwd, name, token, teamSlug }) {
  const args = ["link", "--yes", "--project", name, "--token", token];
  if (teamSlug) args.push("--scope", teamSlug);
  await execa("vercel", args, { cwd });

  const projectJson = join(cwd, ".vercel", "project.json");
  if (!existsSync(projectJson)) throw new Error("vercel link did not produce .vercel/project.json");
  const { projectId, orgId } = JSON.parse(readFileSync(projectJson, "utf8"));
  return { projectId, orgId };
}

/**
 * Bulk-add env vars to all targets. Each entry: { key, value }.
 * Upserts: removes any existing var with the same key first to stay idempotent.
 */
export async function setEnvVars({ projectId, teamId, token, vars }) {
  const q = teamId ? `?teamId=${teamId}&upsert=true` : `?upsert=true`;
  for (const { key, value } of vars) {
    await vercelApi(`/v10/projects/${projectId}/env${q}`, token, {
      method: "POST",
      body: {
        key,
        value,
        type: "encrypted",
        target: ["production", "preview", "development"],
      },
    });
  }
}

/** Production deploy via CLI. Returns the deployment URL (https://…). */
export async function deployProd({ cwd, token, teamSlug }) {
  const args = ["deploy", "--prod", "--yes", "--token", token];
  if (teamSlug) args.push("--scope", teamSlug);
  const { stdout } = await execa("vercel", args, { cwd });
  // CLI prints the deployment URL as the last line of stdout.
  const url = stdout.trim().split("\n").filter(Boolean).pop();
  return url.startsWith("http") ? url : `https://${url}`;
}

export async function deleteProject({ projectId, teamId, token }) {
  const q = teamId ? `?teamId=${teamId}` : "";
  await vercelApi(`/v9/projects/${projectId}${q}`, token, { method: "DELETE" });
}
