#!/usr/bin/env bash
set -euo pipefail

out_file="${1:-}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "$out_file" ]]; then
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  out_file="backup_${ts}.dump"
fi

pg_dump "$DATABASE_URL" --format=c --no-owner --no-privileges --file "$out_file"

echo "Backup created: $out_file"
