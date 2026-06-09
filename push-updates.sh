#!/usr/bin/env bash
# push-updates.sh
# Refreshes SW precache hashes, commits all staged+unstaged changes, then pushes.
# Run from ~/workspace after making content edits:  bash push-updates.sh

set -euo pipefail

REPO="https://${GITHUB_TOKEN}@github.com/USD21Developers/first-principles-2025.git"
SW="artifacts/first-principles/public/fp/en/sw.js"

echo "==> Refreshing service worker precache hashes..."

python3 - <<'PY'
import re, hashlib, os, sys

base = "artifacts/first-principles/public/fp/en/"
sw_path = base + "sw.js"

with open(sw_path, "r") as f:
    content = f.read()

entries = re.findall(r'\{url:"([^"]+)",revision:"([^"]+)"\}', content)
if not entries:
    print("ERROR: no precache entries found in sw.js", file=sys.stderr)
    sys.exit(1)

# Add new shared-asset files here if they are not yet in the precache.
extra_files = [
    "_assets/css/journal.css",
    "_assets/css/comments.css",
    "_assets/js/journal.js",
    "_assets/js/comments.js",
]

existing_urls = {url for url, _ in entries}
updated = added = missing = 0
new_entries = []

for url, old_rev in entries:
    path = base + url
    if os.path.exists(path):
        new_rev = hashlib.md5(open(path, "rb").read()).hexdigest()
        new_entries.append((url, new_rev))
        if new_rev != old_rev:
            updated += 1
    else:
        new_entries.append((url, old_rev))
        missing += 1
        print(f"  WARNING: precached file not found on disk: {url}")

for url in extra_files:
    if url not in existing_urls:
        path = base + url
        if os.path.exists(path):
            rev = hashlib.md5(open(path, "rb").read()).hexdigest()
            new_entries.append((url, rev))
            added += 1
            print(f"  Added to precache: {url}")
        else:
            print(f"  Skipped (not found): {url}")

print(f"  Hashes refreshed: {updated}  |  New entries: {added}  |  Missing: {missing}")

new_precache = "[" + ",".join(
    f'{{url:"{u}",revision:"{r}"}}' for u, r in new_entries
) + "]"

match = re.search(r'\[(\{url:"[^"]+",revision:"[^"]+"\},?)+\]', content)
if not match:
    print("ERROR: could not locate precache array in sw.js", file=sys.stderr)
    sys.exit(1)

new_content = content[:match.start()] + new_precache + content[match.end():]
with open(sw_path, "w") as f:
    f.write(new_content)

print("  sw.js written.")
PY

echo "==> Staging all changes..."
git add -A

echo "==> Committing..."
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "Update content + refresh precache hashes" || echo "  Nothing new to commit."

echo "==> Pushing to GitHub..."
git push "$REPO" HEAD:main

echo ""
echo "Done. GitHub Actions deploys in ~1 minute."
echo "  https://usd21developers.github.io/first-principles-2025/fp/"
