#!/usr/bin/env bash
set -euo pipefail
# Optional manual publishing helper; this repository is already hosted at ycrbt/ycrbt-software-factory.
REPO="${1:-ycrbt/ycrbt-software-factory}"
VISIBILITY="${2:---private}"
if [[ "$VISIBILITY" != "--private" && "$VISIBILITY" != "--public" ]]; then
  echo "Usage: bash scripts/publish-to-github.sh OWNER/REPO [--private|--public]" >&2
  exit 2
fi
command -v gh >/dev/null || { echo 'Install gh and authenticate with gh auth login' >&2; exit 1; }
gh auth status >/dev/null || { echo 'Run: gh auth login' >&2; exit 1; }
if git remote get-url origin >/dev/null 2>&1; then
  echo 'Already inside a repository with an origin; do not create a duplicate.' >&2
  exit 1
fi
echo 'Use gh repo create only for new repositories, not an existing repo.' >&2
exit 1
