#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_CONFIG="$ROOT_DIR/src-tauri/tauri.conf.json"
TARGET_DIR="${CARGO_TARGET_DIR:-/tmp/pdf-toc-studio-tauri-build}"
DIST_DIR="$ROOT_DIR/dist/macos"

APP_META="$(
python3 - <<'PY' "$TAURI_CONFIG"
import json
import pathlib
import platform
import sys

config = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
product = config["productName"]
version = config["version"]
arch = platform.machine()
if arch == "arm64":
    arch = "aarch64"
print(product)
print(version)
print(arch)
PY
)"

PRODUCT_NAME="$(printf '%s\n' "$APP_META" | sed -n '1p')"
VERSION="$(printf '%s\n' "$APP_META" | sed -n '2p')"
ARCH="$(printf '%s\n' "$APP_META" | sed -n '3p')"

APP_NAME="${PRODUCT_NAME}.app"
DMG_NAME="${PRODUCT_NAME}_${VERSION}_${ARCH}.dmg"
APP_PATH="$TARGET_DIR/release/bundle/macos/$APP_NAME"
DMG_PATH="$TARGET_DIR/release/bundle/dmg/$DMG_NAME"
HYBRID_BASE="$TARGET_DIR/release/bundle/dmg/manual-hybrid"
HYBRID_DMG="${HYBRID_BASE}.dmg"

mkdir -p "$DIST_DIR"

echo "Building macOS bundle into $TARGET_DIR"
BUILD_STATUS=0
if CARGO_TARGET_DIR="$TARGET_DIR" npm run tauri:build -- --bundles app,dmg; then
  true
else
  BUILD_STATUS=$?
  echo "tauri build exited with $BUILD_STATUS, checking whether the .app bundle was still produced..."
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "Missing app bundle: $APP_PATH"
  exit "${BUILD_STATUS:-1}"
fi

if [[ ! -f "$DMG_PATH" ]]; then
  echo "Default DMG bundling did not produce $DMG_NAME, using fallback packaging..."
  rm -f "$HYBRID_DMG" "$DMG_PATH"
  hdiutil makehybrid -default-volume-name "$PRODUCT_NAME" -hfs -o "$HYBRID_BASE" "$TARGET_DIR/release/bundle/macos"
  hdiutil convert "$HYBRID_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_PATH"
  hdiutil verify "$DMG_PATH"
fi

rm -rf "$DIST_DIR/$APP_NAME"
cp -R "$APP_PATH" "$DIST_DIR/$APP_NAME"
cp -f "$DMG_PATH" "$DIST_DIR/$DMG_NAME"

echo
echo "Packaging complete."
echo "App: $DIST_DIR/$APP_NAME"
echo "DMG: $DIST_DIR/$DMG_NAME"
