#!/usr/bin/env bash
set -euo pipefail

in_file="${1:-}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "$in_file" ]]; then
  echo "Usage: ./pg_restore.sh <backup.dump>" >&2
  exit 1
fi

if [[ ! -f "$in_file" ]]; then
  echo "File not found: $in_file" >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$in_file"

echo "Restore completed from: $in_file"
