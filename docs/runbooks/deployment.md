# VPS deployment

## Prerequisites

Install Docker Engine and Compose, then install recovery tools from Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y age awscli
```

Create `.env.production` with application secrets and export `APP_DOMAIN`,
`POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in the deployment
shell. Keep both files mode `0600`.

## Deploy

Build one immutable image for both application processes:

```bash
docker compose build
docker compose up -d postgres
docker compose run --rm web pnpm db:migrate
docker compose up -d web worker caddy
docker compose ps
```

Database migration is an explicit release step. Neither the web process nor
worker runs migrations during startup. Only Caddy publishes host ports; the
database and application network remain internal.

## Update

Set `APP_IMAGE_TAG` to the merged commit SHA, build that tag, run migrations,
and recreate `web`, `worker`, and `caddy`. Confirm `/api/health` before removing
the previous image.
