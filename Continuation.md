# Marketing Timeline — Continuation Guide

This is the handoff point for the next owner. The repository contains no
credentials, API tokens, encrypted secrets, production URLs, or private source
data.

## Handoff status

- No deployment is active from this checkout.
- The previous host containers have been stopped; persistent data was left
  intact until the new owner confirms whether it should be retained or removed.
- The previous public domain is intentionally absent from the repository.
- The next owner supplies a new host, domain, credentials, and environment
  file.

## Start from a fresh checkout

```bash
git clone <repository-url>
cd <repository-directory>
cp .env.example .env.production
chmod 600 .env.production
```

Edit `.env.production` with newly generated values. Never copy the previous
environment file, tokens, OAuth secrets, encryption keys, database dumps, or
editor swap files into this checkout.

## Configure a new domain

The application reads `APP_DOMAIN`. For a host-level Caddy proxy:

```bash
cp Caddyfile.vps.example Caddyfile.vps
export APP_DOMAIN=timeline.example.com
caddy validate --config Caddyfile.vps
```

Replace `timeline.example.com` with the new owner’s domain. The example file
contains no old domain or host IP.

## Container deployment

From the repository root:

```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d postgres
docker compose --env-file .env.production run --rm web pnpm db:migrate
docker compose --env-file .env.production up -d web worker
docker compose --env-file .env.production exec -T web pnpm db:bootstrap-notion
curl -fsS "https://${APP_DOMAIN}/api/health"
```

Keep `.env.production` outside Git. Do not print it in logs or paste any value
from it into chat.

## Notion first-sync workflow

1. Share the five original Notion source databases with the new internal
   connection.
2. Sign in as an admin and open `/settings/notion` on the new domain.
3. Click **Preview manual read**.
4. Review eligible, frozen, invalid, and cost values.
5. Click **Confirm and queue read**.
6. Inspect the validation report and timeline.

The Notion client resolves database IDs to data-source IDs before querying, so
database IDs copied from full-page URLs are supported.

## Verification

```bash
test_tmp=$(mktemp -d)
TMPDIR="$test_tmp" corepack pnpm test
corepack pnpm exec eslint src tests scripts
corepack pnpm typecheck
corepack pnpm build
git diff --check
```

Run Gitleaks against the repository before release and inspect every finding.

## Next product work

1. Complete a real Notion sync and correct invalid Published records in Notion.
2. Complete the encrypted backup/restore drill.
3. Run the full Playwright acceptance suite on the new domain.
4. Treat X analytics as a separate follow-up unless the product owner includes
   it in MVP.
