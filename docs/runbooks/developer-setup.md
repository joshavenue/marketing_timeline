# Developer setup

## Prerequisites

- Node.js 24
- pnpm 11
- Docker Engine with Docker Compose

## Test database

Start the isolated PostgreSQL 18 database:

```bash
docker compose -f docker-compose.test.yml up -d
```

Check readiness:

```bash
docker compose -f docker-compose.test.yml exec postgres-test \
  pg_isready -U marketing_test -d marketing_test
```

Connect from the host:

```bash
psql postgresql://marketing_test:marketing_test@127.0.0.1:55432/marketing_test
```

Stop and remove the disposable database:

```bash
docker compose -f docker-compose.test.yml down
```

The database data uses a PostgreSQL 18-compatible container `tmpfs` mounted at
`/var/lib/postgresql`; it is intentionally discarded when the container is
removed.
