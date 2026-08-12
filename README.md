# Marketing Timeline

> Handoff first: read [Continuation.md](Continuation.md) before changing or deploying anything.

Marketing Timeline is a workspace-scoped, read-only marketing history dashboard
with a Notion canonical source, versioned snapshots, timeline views, initiative
evidence, comments, notifications, and admin-approved refresh jobs.

## Current repository state

- No production domain or host is coupled to the codebase.
- No deployment credentials are included.
- `APP_DOMAIN` and the environment file are supplied by the next owner.
- Use [Caddyfile.vps.example](Caddyfile.vps.example) as the portable host proxy template.

Start with [Continuation.md](Continuation.md). It contains the clean-checkout,
new-domain, deployment, Notion sync, and verification workflow.
