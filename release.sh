#!/bin/bash

set -euo pipefail

TEMP_BRANCH="premerge-temp"

if git rev-parse --verify "$TEMP_BRANCH" >/dev/null 2>&1; then
  echo "Temporary branch '$TEMP_BRANCH' already exists. Deleting it..."
  git branch -D "$TEMP_BRANCH"
fi

if ! git diff-index --quiet HEAD --; then
  echo "Uncommitted changes detected. Please commit or stash them first."
  exit 1
fi

CURRENT_BRANCH=$(git symbolic-ref --short HEAD)

git fetch origin

git checkout main
git pull origin main

git checkout -b "$TEMP_BRANCH"
git merge "$CURRENT_BRANCH"

BACKEND_CHANGED=0
FRONTEND_CHANGED=0

if ! git diff --quiet main..HEAD -- backend; then
  BACKEND_CHANGED=1
fi

if ! git diff --quiet main..HEAD -- frontend; then
  FRONTEND_CHANGED=1
fi

echo "Running backend release pipeline"
cd backend && chmod +x release.sh && ./release.sh || { 
  echo "Backend release failed. Aborting."; 
  git checkout "$CURRENT_BRANCH"; 
  git branch -D "$TEMP_BRANCH"; 
  exit 1; 
}

git checkout main
git merge --no-ff "$TEMP_BRANCH"

if git diff --cached --quiet; then
  echo "Nothing to commit after merge."
else
  git commit -m "Merge branch '$CURRENT_BRANCH' into main"
  git push origin main
fi

git branch -D "$TEMP_BRANCH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ "$BACKEND_CHANGED" == "1" ]]; then
  BACK_VERSION=$(node update-version.js backend/package.json)
  echo "Backend version updated to ${BACK_VERSION}"
else
  BACK_VERSION=$(node -p "require('./backend/package.json').version")
  echo "Backend version unchanged (${BACK_VERSION})"
fi

if [[ "$FRONTEND_CHANGED" == "1" ]]; then
  FRONT_VERSION=$(node update-version.js frontend/package.json)
  echo "Frontend version updated to ${FRONT_VERSION}"
else
  FRONT_VERSION=$(node -p "require('./frontend/package.json').version")
  echo "Frontend version unchanged (${FRONT_VERSION})"
fi

ROOT_VERSION=$(node update-version.js)
echo "Root version updated to ${ROOT_VERSION}"

git add .
git commit -m "release: v${ROOT_VERSION} (frontend v${FRONT_VERSION}, backend v${BACK_VERSION})"
git push origin main

git tag -a "v${ROOT_VERSION}" -m "Frontend v${FRONT_VERSION}, Backend v${BACK_VERSION}"
git push origin "v${ROOT_VERSION}"

git checkout "$CURRENT_BRANCH"

echo "Done. Release v${ROOT_VERSION} (frontend v${FRONT_VERSION}, backend v${BACK_VERSION})"