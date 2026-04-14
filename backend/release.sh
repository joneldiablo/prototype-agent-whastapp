#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if git -C "$REPO_ROOT" diff --quiet master..HEAD -- backend; then
  echo "No backend changes detected. Skipping release tasks."
  exit 0
fi

echo "Running backend tests"
cd "$REPO_ROOT/backend"
yarn test

echo "Building backend"
yarn build

echo "Backend ready. Version bump deferred until after merging to master"