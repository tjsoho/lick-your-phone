#!/usr/bin/env bash
# =============================================================================
# bootstrap.sh — one-line entry point (Option B) for create-summer-site.
#
# Creates a new private repo from the template, clones it, installs deps, and
# hands off to scripts/bootstrap.mjs which provisions Supabase + Vercel.
#
# Usage (from anywhere):
#   curl -fsSL https://raw.githubusercontent.com/tjsoho/summer-website-template/main/bootstrap.sh | bash -s my-site
#
# Or, if you already cloned the template, just run:  npm start app
# =============================================================================
set -euo pipefail

TEMPLATE="tjsoho/summer-website-template"
NAME="${1:-}"

err() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }
info() { printf '\033[36m▸ %s\033[0m\n' "$1"; }

[ -n "$NAME" ] || err "Usage: bootstrap.sh <new-site-name>"
command -v gh >/dev/null 2>&1 || err "GitHub CLI (gh) not found. Install: https://cli.github.com"
command -v node >/dev/null 2>&1 || err "Node.js not found (need >= 20)."
gh auth status >/dev/null 2>&1 || err "gh not authenticated. Run: gh auth login"

# Validate kebab-case name.
echo "$NAME" | grep -Eq '^[a-z0-9][a-z0-9-]*[a-z0-9]$' || err "Name must be kebab-case (e.g. acme-corporate-site)."

if [ -d "$NAME" ]; then
  info "Directory '$NAME' already exists — reusing it."
else
  info "Creating repo '$NAME' from ${TEMPLATE}…"
  gh repo create "$NAME" --template "$TEMPLATE" --private --clone
fi

cd "$NAME"

info "Installing app dependencies…"
npm install --no-audit --no-fund

info "Running bootstrap…"
npm start app
