#!/usr/bin/env bash
# deploy.sh — run from the usd21.app document root
# Pulls the latest built content from the dist branch without touching
# .htaccess, _assets/, .well-known/, or any other server-specific files.

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Fetching dist branch..."
git fetch origin dist

echo "==> Updating fp/, index.html, and the legacy root worker from dist..."
git checkout origin/dist -- fp/ index.html sw.js

echo ""
echo "Done. Site is up to date."
