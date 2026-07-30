// Thin wrapper around the `gh` CLI. We only need a few operations.

import { execa } from "execa";

async function gh(args, opts = {}) {
  return execa("gh", args, { stdio: "pipe", ...opts });
}

/** Is the gh CLI installed? */
export async function ghInstalled() {
  try {
    await gh(["--version"]);
    return true;
  } catch {
    return false;
  }
}

/** Is the user authenticated with gh? */
export async function ghAuthed() {
  try {
    await gh(["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}

/** The authenticated GitHub login (username). */
export async function ghUser() {
  const { stdout } = await gh(["api", "user", "--jq", ".login"]);
  return stdout.trim();
}

/**
 * Create a repo from the template and clone it. Returns the absolute clone path.
 * Skips creation if the repo already exists for the user (idempotent re-run).
 */
export async function createRepoFromTemplate({ name, template, privateRepo, parentDir }) {
  const user = await ghUser();
  const slug = `${user}/${name}`;

  let exists = false;
  try {
    await gh(["repo", "view", slug]);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
    await gh([
      "repo",
      "create",
      name,
      "--template",
      template,
      privateRepo ? "--private" : "--public",
    ]);
  }

  // Clone into parentDir/name if not already present.
  const { existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dest = join(parentDir, name);
  if (!existsSync(dest)) {
    await gh(["repo", "clone", slug, dest], { cwd: parentDir });
  }
  return { dest, slug, htmlUrl: `https://github.com/${slug}` };
}

/** Commit and push everything in `cwd`. No-op if there's nothing to commit. */
export async function commitAndPush(cwd, message) {
  await execa("git", ["add", "-A"], { cwd });
  const { stdout } = await execa("git", ["status", "--porcelain"], { cwd });
  if (!stdout.trim()) return false; // nothing changed
  await execa("git", ["commit", "-m", message], { cwd });
  await execa("git", ["push"], { cwd });
  return true;
}

/** Delete a repo (rollback). Requires the delete_repo scope on the token. */
export async function deleteRepo(slug) {
  await gh(["repo", "delete", slug, "--yes"]);
}
