#!/usr/bin/env bash
# Run this once from the Shell tab to connect Replit to your GitHub repo.
# Usage: bash scripts/setup-github-remote.sh

set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN secret is not set. Add it in the Secrets panel first."
  exit 1
fi

# Identity for commits
git config user.name "Jeremy Ciaramella"
git config user.email "merlynx@users.noreply.github.com"

# Store credentials so git push doesn't prompt for a password
git config credential.helper store
echo "https://merlynx:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

# Add the upstream remote (skip if it already exists)
if git remote get-url upstream >/dev/null 2>&1; then
  git remote set-url upstream "https://github.com/USD21Developers/first-principles-2025.git"
  echo "Updated existing 'upstream' remote."
else
  git remote add upstream "https://github.com/USD21Developers/first-principles-2025.git"
  echo "Added 'upstream' remote."
fi

# Fetch all branches from GitHub so we can see them
git fetch upstream

echo ""
echo "Done! GitHub remote is ready."
echo ""
echo "Remote branches available:"
git branch -r | grep upstream
echo ""
echo "Suggested workflow:"
echo "  git checkout -b my-feature          # create a local branch"
echo "  git add <files> && git commit -m '...'  # commit your changes"
echo "  git push upstream my-feature         # push branch to GitHub"
echo "  Then open a Pull Request on GitHub to merge into main."
