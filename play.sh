#!/usr/bin/env bash
# Launch Cold Ledger on this machine.
# Usage:
#   ./play.sh           # browser (default)
#   ./play.sh browser
#   ./play.sh desktop   # Electron window
#   ./play.sh portable  # build a Windows portable .exe under release/

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="${1:-browser}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    echo "Install Node.js 20+ from https://nodejs.org/ then run this script again." >&2
    exit 1
  fi
}

need_cmd node
need_cmd npm

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "Node.js 20+ is required (found $(node -v))." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies (npm ci)..."
  npm ci
fi

case "$MODE" in
  browser|dev|"")
    echo "Starting Cold Ledger in the browser..."
    echo "The title screen should say Cold Ledger. Press Ctrl+C to stop."
    exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
    ;;
  desktop)
    echo "Building and launching the desktop window..."
    exec npm run desktop
    ;;
  portable|dist|exe)
    echo "Building a portable Windows executable under release/..."
    npm run dist:win
    echo "Done. Look in: $ROOT/release/"
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Usage: ./play.sh [browser|desktop|portable]" >&2
    exit 1
    ;;
esac
