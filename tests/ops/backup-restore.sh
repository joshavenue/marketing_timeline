#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_admin_url="${OPS_TEST_ADMIN_URL:-postgresql://marketing_test:marketing_test@127.0.0.1:55432/postgres}"
source_name="marketing_backup_source"
restore_name="marketing_backup_restore"
production_name="marketing_production"
tmp_dir="$(mktemp -d)"

cleanup() {
  psql "$test_admin_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$source_name\" WITH (FORCE)" >/dev/null
  psql "$test_admin_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$restore_name\" WITH (FORCE)" >/dev/null
  rm -rf -- "$tmp_dir"
}
trap cleanup EXIT

psql "$test_admin_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$source_name\" WITH (FORCE)" >/dev/null
psql "$test_admin_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$restore_name\" WITH (FORCE)" >/dev/null
psql "$test_admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$source_name\"" >/dev/null
source_url="postgresql://marketing_test:marketing_test@127.0.0.1:55432/$source_name"
restore_url="postgresql://marketing_test:marketing_test@127.0.0.1:55432/$restore_name"
DATABASE_URL="$source_url" pnpm --dir "$root_dir" db:migrate >/dev/null
psql "$source_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO workspaces (id, name, base_currency)
VALUES ('00000000-0000-4000-8000-000000000001', 'Recovery Test', 'USD');
INSERT INTO campaigns (
  workspace_id, external_id, name, lifecycle_status, publication_status,
  start_date, display_level
) VALUES (
  '00000000-0000-4000-8000-000000000001', 'recovery-campaign',
  'Recovered campaign', 'Complete', 'published', '2026-07-01', 'primary'
);
SQL

age-keygen -o "$tmp_dir/identity.txt" >/dev/null 2>&1
chmod 0600 "$tmp_dir/identity.txt"
recipient="$(age-keygen -y "$tmp_dir/identity.txt")"

if BACKUP_DATABASE_URL="$source_url" BACKUP_OUTPUT_DIR="$tmp_dir/backups" \
  "$root_dir/scripts/backup.sh" >/dev/null 2>&1; then
  echo "backup unexpectedly succeeded without BACKUP_AGE_RECIPIENT" >&2
  exit 1
fi

BACKUP_DATABASE_URL="$source_url" \
BACKUP_OUTPUT_DIR="$tmp_dir/backups" \
BACKUP_AGE_RECIPIENT="$recipient" \
  "$root_dir/scripts/backup.sh" >/dev/null
backup_file="$(find "$tmp_dir/backups" -name '*.dump.age' -type f | head -n 1)"
test -n "$backup_file"

age-keygen -o "$tmp_dir/wrong-identity.txt" >/dev/null 2>&1
chmod 0600 "$tmp_dir/wrong-identity.txt"
if RESTORE_DATABASE_URL="$restore_url" \
  PRODUCTION_DATABASE_NAME="$production_name" \
  BACKUP_AGE_IDENTITY_FILE="$tmp_dir/wrong-identity.txt" \
  "$root_dir/scripts/restore.sh" "$backup_file" >/dev/null 2>&1; then
  echo "restore unexpectedly succeeded with the wrong age identity" >&2
  exit 1
fi

psql "$test_admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$restore_name\"" >/dev/null
RESTORE_DATABASE_URL="$restore_url" \
PRODUCTION_DATABASE_NAME="$production_name" \
BACKUP_AGE_IDENTITY_FILE="$tmp_dir/identity.txt" \
  "$root_dir/scripts/restore.sh" "$backup_file" >/dev/null

restored="$(
  psql "$restore_url" -At -v ON_ERROR_STOP=1 \
    -c "SELECT name FROM campaigns WHERE external_id = 'recovery-campaign'"
)"
test "$restored" = "Recovered campaign"
