// Colored output + spinner helpers + a persistent .bootstrap.log writer.
// Everything human-facing funnels through here so we can redact secrets in one place.

import chalk from "chalk";
import ora from "ora";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

let LOG_FILE = null; // set by initLog()
const SECRETS = new Set(); // values that must never reach stdout or the log file

/** Register a secret string so it is redacted everywhere. */
export function redactSecret(value) {
  if (typeof value === "string" && value.length >= 6) SECRETS.add(value);
}

function redact(text) {
  let out = String(text);
  for (const secret of SECRETS) {
    if (secret) out = out.split(secret).join("«redacted»");
  }
  return out;
}

/** Point the file logger at <repoRoot>/.bootstrap.log. Call once at startup. */
export function initLog(repoRoot) {
  LOG_FILE = join(repoRoot, ".bootstrap.log");
  fileLog(`\n===== bootstrap run @ ${new Date().toISOString()} =====`);
}

function fileLog(line) {
  if (!LOG_FILE) return;
  try {
    appendFileSync(LOG_FILE, redact(line) + "\n");
  } catch {
    /* logging must never throw */
  }
}

export function info(msg) {
  const line = redact(msg);
  console.log(line);
  fileLog(`INFO  ${line}`);
}

export function success(msg) {
  const line = redact(msg);
  console.log(chalk.green("✓ ") + line);
  fileLog(`OK    ${line}`);
}

export function warn(msg) {
  const line = redact(msg);
  console.log(chalk.yellow("! ") + line);
  fileLog(`WARN  ${line}`);
}

export function error(msg) {
  const line = redact(msg);
  console.error(chalk.red("✗ ") + line);
  fileLog(`ERROR ${line}`);
}

export function step(n, title) {
  const line = `Step ${n}: ${title}`;
  console.log("\n" + chalk.bold.cyan(line));
  fileLog(`\n--- ${line} ---`);
}

export function heading(title) {
  console.log("\n" + chalk.bold.magenta(title));
  fileLog(`\n### ${title}`);
}

/** Run an async fn under a spinner. Returns the fn's result. */
export async function withSpinner(text, fn) {
  const spinner = ora({ text: redact(text), color: "cyan" }).start();
  fileLog(`SPIN  ${redact(text)}`);
  try {
    const result = await fn((newText) => {
      spinner.text = redact(newText);
    });
    spinner.succeed(redact(typeof result === "string" && result ? result : text));
    return result;
  } catch (err) {
    spinner.fail(redact(text));
    throw err;
  }
}

export const c = chalk;
