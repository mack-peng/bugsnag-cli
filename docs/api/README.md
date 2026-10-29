# API Baseline

- Source: https://api.swaggerhub.com/apis/smartbear-public/bugsnag-data-access-api/2/swagger.json
- Captured: 2026-10-29
- OpenAPI: 3.0.3
- Operations: 141
- Local file: `bugsnag-data-access-openapi.json`

This OpenAPI document is the implementation baseline for bugsnag-cli. The older `bugsnag-api-v2.apib` Blueprint is kept only as readable reference; when they disagree, use this document plus the live API checks below.

## Live API drift

Verified against `https://api.bugsnag.com` on 2026-10-29:

- Error and project trends use the singular path `/trend`. The plural `/trends` path listed in the OpenAPI document returns HTTP 404.
- Performance endpoints accept event-style filters (`filters[field][][type]` + `filters[field][][value]`). The `PerformanceFilter[]` shape (`filters[0][key]` + `filter_values`) returns HTTP 400.
- `starred_span_groups` uses `page_token` pagination; sending `offset=0` returns HTTP 400 `the supplied page token is invalid`. The CLI uses Link pagination for this command.
- Array query params for pivots and categories require bracketed keys (`pivots[]`, `categories[]`); bare `pivots=` returns HTTP 400.
- `GET /projects/{project_id}/performance_overview` returns HTTP 403 when the organization's plan lacks the `performance-scores` feature.
- `span_groups` may return an empty array even when the endpoint is healthy; verification depends on project data and plan features.

`docs/api-coverage.md` tracks which operations are implemented, planned, or intentionally out of scope.
