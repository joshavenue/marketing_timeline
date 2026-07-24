#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${PRODUCTION_DATABASE_NAME:?PRODUCTION_DATABASE_NAME is required}"
: "${BACKUP_AGE_IDENTITY_FILE:?BACKUP_AGE_IDENTITY_FILE is required}"

backup_file="${1:-}"
if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "Usage: restore.sh /path/to/backup.dump.age" >&2
  exit 1
fi
if [[ ! -f "$BACKUP_AGE_IDENTITY_FILE" ]]; then
  echo "Age identity file does not exist" >&2
  exit 1
fi
identity_mode="$(stat -c '%a' "$BACKUP_AGE_IDENTITY_FILE")"
if [[ "$identity_mode" != "600" ]]; then
  echo "Age identity file must have mode 0600" >&2
  exit 1
fi

target_database="$(
  psql "$RESTORE_DATABASE_URL" -At -v ON_ERROR_STOP=1 \
    -c "SELECT current_database()"
)"
if [[ "$target_database" == "$PRODUCTION_DATABASE_NAME" ]]; then
  echo "Refusing to restore into configured production database: $target_database" >&2
  exit 1
fi

age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$backup_file" \
  | pg_restore \
      --dbname="$RESTORE_DATABASE_URL" \
      --exit-on-error \
      --no-owner \
      --no-privileges
