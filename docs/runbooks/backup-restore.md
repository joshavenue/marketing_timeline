# Encrypted backup and restore

Generate an age identity once on a trusted administrative machine:

```bash
age-keygen -o /secure/marketing-timeline.agekey
chmod 0600 /secure/marketing-timeline.agekey
age-keygen -y /secure/marketing-timeline.agekey
```

Store the displayed recipient as `BACKUP_AGE_RECIPIENT`. Keep the identity
outside the repository and outside backup archives.

## Backup

```bash
BACKUP_DATABASE_URL='postgresql://…' \
BACKUP_AGE_RECIPIENT='age1…' \
BACKUP_OUTPUT_DIR='/var/backups/marketing-timeline' \
BACKUP_S3_URI='s3://bucket/prefix' \
BACKUP_S3_ENDPOINT='https://object.example' \
scripts/backup.sh
```

The output is a PostgreSQL custom dump encrypted as `*.dump.age`. If S3 values
are omitted, the verified local file is retained without upload.

## Restore drill

Create an empty, non-production database. The script refuses a target whose
actual name equals `PRODUCTION_DATABASE_NAME`.

```bash
RESTORE_DATABASE_URL='postgresql://…/restore_drill' \
PRODUCTION_DATABASE_NAME='marketing_timeline' \
BACKUP_AGE_IDENTITY_FILE='/secure/marketing-timeline.agekey' \
scripts/restore.sh /var/backups/marketing-timeline/example.dump.age
```

Run `bash tests/ops/backup-restore.sh` after infrastructure changes. The drill
also proves that a missing recipient and an incorrect identity fail closed.
