#!/usr/bin/env bash
# Run this in YOUR terminal (not via agent) to fix port 3001
set -e

echo "=== Killing stuck next-server on port 3001 ==="
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

if ss -tlnp 2>/dev/null | grep -q ':3001 '; then
  echo ""
  echo "ERROR: Port 3001 is STILL in use."
  echo "Open System Monitor (htop), find 'next-server', and End Process."
  echo "Then run this script again."
  ss -tlnp | grep 3001
  exit 1
fi

cd "$(dirname "$0")/.."
rm -f .next/dev/lock

echo "=== Starting InvenTrack (network accessible) ==="
echo "  Local:   http://localhost:3001"
echo "  Network: http://$(hostname -I | awk '{print $1}'):3001"
exec ./node_modules/.bin/next dev -p 3001 -H 0.0.0.0
