#!/usr/bin/env bash
# deploy.sh — run from /home/usd21/www/app.usd21.org
# Pulls the latest built content from the dist branch without touching
# .htaccess, _assets/, .well-known/, or any other server-specific files.

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Fetching dist branch..."
git fetch origin dist

echo "==> Updating fp/ and index.html from dist..."
git checkout origin/dist -- fp/ index.html

echo ""
echo "Done. Site is up to date."
