#!/usr/bin/env bash
# Usage: npm run release [-- patch|minor|major|<version>]
# Bumps the version, pushes the tag, waits for CI to stage it on npm, then approves it (asks for your 2FA code).
set -euo pipefail

bump="${1:-patch}"
pkg="$(node -p 'require("./package.json").name')"

# Preconditions: clean main, in sync with origin
[ "$(git branch --show-current)" = main ] || { echo "Not on main" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Working tree not clean" >&2; exit 1; }
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "main is not in sync with origin/main" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run 'gh auth login' first" >&2; exit 1; }

echo "Checking..."
npm run -s check

tag="$(npm version "$bump" -m "release: %s")"
echo "Pushing $tag..."
git push -q --follow-tags

echo "Waiting for the release workflow to start..."
run=""
for _ in $(seq 30); do
  run="$(gh run list --workflow release.yml --branch "$tag" --limit 1 --json databaseId --jq '.[0].databaseId')"
  [ -n "$run" ] && break
  sleep 2
done
[ -n "$run" ] || { echo "No workflow run found for $tag" >&2; exit 1; }

if ! gh run watch "$run" --exit-status --interval 10; then
  echo "Release workflow failed: gh run view $run --log-failed" >&2
  exit 1
fi

id="$(gh run view "$run" --log | grep -oE 'staged with id [0-9a-f-]+' | tail -1 | awk '{print $4}')"
[ -n "$id" ] || { echo "Could not find the stage id. Approve manually: npm stage list $pkg" >&2; exit 1; }

echo "Approving staged $pkg@${tag#v} ($id)..."
npm stage approve "$id"
echo "Released $pkg@${tag#v}: https://www.npmjs.com/package/$pkg"
