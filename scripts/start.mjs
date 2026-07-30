#!/usr/bin/env node
// Dispatcher for `npm start`:
//   npm start app   → run the bootstrap CLI (provision GitHub + Supabase + Vercel)
//   npm start       → next start (serve the production build)
// Any extra args are forwarded (e.g. `npm start app --admin-email me@x.com`).

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const [sub, ...rest] = process.argv.slice(2);

let cmd, args;
if (sub === "app") {
    cmd = process.execPath; // node
    args = [join(SCRIPTS_DIR, "bootstrap.mjs"), ...rest];
} else {
    // default: production Next server. `next` resolves via node_modules/.bin
    // because npm puts it on PATH when running a package script.
    cmd = "next";
    args = ["start", ...process.argv.slice(2)];
}

const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
