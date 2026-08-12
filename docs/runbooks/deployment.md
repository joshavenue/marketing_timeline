# Container deployment

## Prerequisites

Install Docker Engine and Compose. On Ubuntu, recovery tools can be installed with:

```bash
sudo apt-get update
sudo apt-get install -y age awscli
```

Create `.env.production` with application secrets and export the new owner’s
domain as `APP_DOMAIN`,
`POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in the deployment
shell. Keep both files mode `0600`.

## Deploy

Build one immutable image for both application processes:

```bash
docker compose build
docker compose up -d postgres
docker compose run --rm web pnpm db:migrate
docker compose run --rm \
  -e BOOTSTRAP_ADMIN_EMAIL \
  -e BOOTSTRAP_GOOGLE_EMAIL \
  -e BOOTSTRAP_WORKSPACE_NAME \
  web pnpm tsx scripts/seed-acceptance.ts
docker compose run --rm web pnpm db:bootstrap-notion
docker compose up -d web worker caddy
docker compose ps
```

The bootstrap command creates the first admin only when
`BOOTSTRAP_ADMIN_EMAIL` exactly equals `BOOTSTRAP_GOOGLE_EMAIL`; it becomes a
no-op after an active admin exists.

Database migration is an explicit release step. Neither the web process nor
worker runs migrations during startup. Only Caddy publishes host ports; the
database and application network remain internal.

## Real-source acceptance

After the application is healthy:

1. Sign in with the bootstrapped Google account.
2. Configure the five curated Notion database IDs with
   `pnpm db:bootstrap-notion`, then run one confirmed manual
   synchronization containing a campaign, initiative, event, metric definition,
   and manual observation.
3. Confirm the validation report, timeline marker, evidence drawer, metric
   citation, and source version are visible.
4. Configure separate X post, account, and Ads connections, activate the
   validated `X_API.md`, and set a nonzero hard cap for each.
5. Preview and confirm exactly one recent owned-post read, one account read, and
   one one-day Ads read. Confirm three separate snapshots and no non-GET request
   in logs.
6. Run an encrypted backup and isolated restore drill.
7. Record the UTC deployment time and merged commit SHA in the audit history.

## Update

Set `APP_IMAGE_TAG` to the merged commit SHA, build that tag, run migrations,
and recreate `web`, `worker`, and `caddy`. Confirm `/api/health` before removing
the previous image.
