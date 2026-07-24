# X API connector skill example

This document teaches the integrated LLM how to select read-only X operations.
The application validates and enforces the manifest independently; this
Markdown never executes as code.

```connector-manifest
{
  "apiFamily": "x",
  "version": 1,
  "operations": [
    {
      "key": "x.post.metrics",
      "method": "GET",
      "host": "api.x.com",
      "path": "/2/tweets",
      "allowedQueryParameters": ["ids", "tweet.fields", "expansions", "media.fields"],
      "allowedResponseFields": [
        "data.id",
        "data.public_metrics",
        "data.non_public_metrics",
        "data.organic_metrics",
        "data.promoted_metrics"
      ]
    }
  ]
}
```

Use `x.post.metrics` only for configured post IDs. Request the smallest field
set required by the metric definitions. Never infer unavailable fields, never
select a write operation, and return `CAPABILITY_UNAVAILABLE` when the active
authentication context does not expose a requested metric.
