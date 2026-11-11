#!/usr/bin/env bash
#
# Hand the browser an admin session, without anyone typing a password.
#
# Claude Code needs to sign in to the admin to test a change, and needing a
# human there to do it defeats the point. So a dedicated account exists, its
# details live in .env.local, which git ignores, and this swaps them for a
# session the browser can carry.
#
# The session is written into public/ because that is the one place the dev
# server will hand a file to a page on the same origin. It is meant to last
# about two seconds: fetch it, set the cookies, then run --cleanup. It is
# gitignored as well, in case something goes wrong in between.
#
#   ./scripts/dev-login.sh              stage the session
#   ./scripts/dev-login.sh --cleanup    remove the staged file
#
# Then, in the browser on http://localhost:3002:
#
#   const parts = await fetch('/claude-session-tmp.json').then(r => r.json());
#   for (const [name, value] of parts) {
#     document.cookie = `${name}=${value}; path=/; SameSite=Lax; max-age=3600`;
#   }
#
set -euo pipefail
cd "$(dirname "$0")/.."

STAGED="public/claude-session-tmp.json"

if [ "${1:-}" = "--cleanup" ]; then
  rm -f "$STAGED"
  echo "removed $STAGED"
  exit 0
fi

set -a; . ./.env.local; set +a

if [ -z "${ADMIN_TEST_EMAIL:-}" ] || [ -z "${ADMIN_TEST_PASSWORD:-}" ]; then
  echo "ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD are not in .env.local." >&2
  exit 1
fi

export REF STAGED
REF="$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')"

curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$(printf '{"email":"%s","password":"%s"}' "$ADMIN_TEST_EMAIL" "$ADMIN_TEST_PASSWORD")" \
| python3 -c "
import sys, json, base64, os
s = json.load(sys.stdin)
if 'access_token' not in s:
    print('login failed:', json.dumps(s)[:200]); raise SystemExit(1)
raw = 'base64-' + base64.b64encode(json.dumps(s, separators=(',',':')).encode()).decode()
parts = [raw[i:i+3180] for i in range(0, len(raw), 3180)]
name = 'sb-%s-auth-token' % os.environ['REF']
out = [(name if len(parts) == 1 else '%s.%d' % (name, i), p) for i, p in enumerate(parts)]
open(os.environ['STAGED'], 'w').write(json.dumps(out))
print('staged %s, %d part(s), good for %s seconds' % (os.environ['STAGED'], len(parts), s.get('expires_in')))
"
