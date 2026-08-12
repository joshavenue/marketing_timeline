# Marketing Timeline — Continuation Guide

This document is the handoff point for the next owner of the project. It
contains no credentials, API tokens, encrypted secrets, or production data.

## Current state

- Repository: `joshavenue/marketing_timeline`
- Production URL: `https://marketing.solidmetrics.co`
- Deployment: rootless Podman Compose on the VPS, with PostgreSQL, web, worker,
  and host-level Caddy.
- Existing SolidMetrics traffic is separate and must remain untouched.
- Google sign-in and the timeline dashboard are deployed.
- The production Notion connection is stored encrypted in PostgreSQL and is
  deliberately not reproduced here.

## Important fix in this handoff

Notion page URLs provide database IDs, while the current Notion API requires a
data-source ID for querying. The sync client now resolves each configured
database ID through `databases.retrieve` before calling `dataSources.query`.
This keeps the environment variable names and the documented Notion URLs
compatible with the API.

## Safe deployment workflow

From `/home/josh/marketing_timeline`:

```bash
git pull --ff-only origin main
docker compose --env-file .env.production build web
docker compose --env-file .env.production up -d web worker
docker compose --env-file .env.production exec -T web pnpm db:migrate
curl -fsS https://marketing.solidmetrics.co/api/health
```

Never print `.env.production`, the Notion token, Google credentials, or
`CREDENTIAL_ENCRYPTION_KEY`. Do not commit `.env.production` or any backup
archives.

## Notion first-sync workflow

1. Confirm the five original Notion source databases are shared with the
   current production internal connection.
2. Open `/settings/notion` while signed in as an admin.
3. Click **Preview manual read**.
4. Review eligible, frozen, invalid, and cost values.
5. Click **Confirm and queue read**.
6. Inspect the validation report and timeline.
7. If the worker fails, inspect only safe status/error fields:

```bash
docker compose --env-file .env.production logs --tail=100 worker
docker compose --env-file .env.production ps
```

## Verification commands

Use a temporary directory in `/dev/shm` for Vitest on this VPS:

```bash
test_tmp=$(mktemp -d /dev/shm/marketing-timeline-tests.XXXXXX)
TMPDIR="$test_tmp" corepack pnpm test
corepack pnpm exec eslint src tests scripts
corepack pnpm typecheck
corepack pnpm build
git diff --check
```

The test database is defined in `docker-compose.test.yml` and can be started
with `docker compose -f docker-compose.test.yml up -d postgres-test`.

## Security handoff

- Rotate the Notion secret again if there is any doubt about who has seen it.
- Keep the replacement secret only in the VPS environment or a secret manager.
- Review GitHub Actions secrets, VPS shell history, editor swap files, and
  backup locations before handing over access.
- Run Gitleaks against the repository and inspect every finding before release.
- The live encrypted connection should only be deleted after the new owner
  confirms the replacement integration and accepts the resulting data-source
  outage risk.

## Next product steps

1. Merge the handoff PR after checks pass.
2. Run the first real Notion sync and correct any invalid Published records in
   Notion itself.
3. Complete the backup/restore drill and Playwright acceptance run.
4. Treat X analytics as a separate follow-up slice unless the product owner
   explicitly includes it in MVP.
