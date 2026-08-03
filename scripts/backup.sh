#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"

command -v pg_dump >/dev/null
command -v age >/dev/null

output_dir="${BACKUP_OUTPUT_DIR:-./backups}"
mkdir -p -- "$output_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_file="$output_dir/marketing-timeline-$timestamp.dump.age"
partial_file="$output_file.partial"
trap 'rm -f -- "$partial_file"' EXIT

pg_dump "$BACKUP_DATABASE_URL" --format=custom \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" >"$partial_file"
mv -- "$partial_file" "$output_file"
trap - EXIT

if [[ -n "${BACKUP_S3_URI:-}" || -n "${BACKUP_S3_ENDPOINT:-}" ]]; then
  : "${BACKUP_S3_URI:?BACKUP_S3_URI is required when S3 upload is configured}"
  : "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required when S3 upload is configured}"
  command -v aws >/dev/null
  aws s3 cp "$output_file" "$BACKUP_S3_URI/" \
    --endpoint-url "$BACKUP_S3_ENDPOINT"
fi

printf '%s\n' "$output_file"
