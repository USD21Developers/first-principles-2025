#!/usr/bin/env bash
# push-updates.sh
# Refreshes SW precache hashes, commits all staged+unstaged changes, then pushes.
# Run from ~/workspace after making content edits:  bash push-updates.sh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Refreshing service worker precache hashes..."
pnpm --filter @workspace/first-principles run generate:sw

echo "==> Staging all changes..."
git add -A

echo "==> Committing..."
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "Update content + refresh precache hashes" || echo "  Nothing new to commit."

echo "==> Pushing to GitHub..."
if git remote get-url upstream >/dev/null 2>&1; then
  REMOTE="upstream"
else
  REMOTE="origin"
fi

if [[ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
  TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
elif [[ -n "${GITHUB_TOKEN:-}" ]]; then
  TOKEN="$GITHUB_TOKEN"
else
  TOKEN=""
fi

if [[ -n "$TOKEN" ]]; then
  AUTH_HEADER="$(printf 'x-access-token:%s' "$TOKEN" | base64 -w0)"
  git -c "http.extraheader=AUTHORIZATION: basic $AUTH_HEADER" \
    push "$REMOTE" HEAD:main
else
  git push "$REMOTE" HEAD:main
fi

echo ""
echo "Done. GitHub Actions runs in ~1 minute:"
echo "  GitHub Pages → https://usd21developers.github.io/first-principles-2025/fp/"
echo "  dist branch  → git pull on your server to pick up the changes"
