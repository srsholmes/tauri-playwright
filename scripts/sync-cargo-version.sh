#!/usr/bin/env bash
# Sync the npm package version to the Cargo crate version.
# Called after `changeset version` bumps packages/test/package.json.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."

# Read the version from the npm package
VERSION=$(node -p "require('$ROOT/packages/test/package.json').version")

echo "Syncing Cargo crate version to $VERSION"

# Update Cargo.toml
sed -i "s/^version = \".*\"/version = \"$VERSION\"/" "$ROOT/packages/plugin/Cargo.toml"

# Update Cargo.lock if it exists
if [ -f "$ROOT/packages/plugin/Cargo.lock" ]; then
  cd "$ROOT/packages/plugin"
  cargo update -p tauri-plugin-playwright 2>/dev/null || true
fi

echo "Done — Cargo crate version is now $VERSION"
