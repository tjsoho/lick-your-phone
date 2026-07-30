// Long-lived credential cache at ~/.summer-website-template/config.json.
// Holds the Supabase Personal Access Token and Vercel API Token so the user
// only pastes them once. Stored with 0600 perms.

import { homedir } from "node:os";
import { join } from "node:path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";

const CONFIG_DIR = join(homedir(), ".summer-website-template");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function loadConfig() {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  try {
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    /* best effort on platforms without chmod */
  }
}

export function setConfigValue(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

export const CONFIG_PATH = CONFIG_FILE;
