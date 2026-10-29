# AGENTS.md

## Project

`bugsnag-cli` — CLI for the BugSnag Data Access API. Default read-only; error triage writes require `--write`. Fetches errors, events, project health, releases, comments, and performance data for AI agents and shell automation. Entrypoint: `bin/bugsnag-cli.js` → `require('../dist/index')`.

Build: `npm run build` (= `tsc` + `tsx scripts/generate-help.ts` → `dist/help.json`).
Test: `npm test` (= `tsx --test tests/*.test.ts` — Node.js built-in test runner, 77 tests).
Dependencies: `zod`. Dev: `typescript`, `@types/node`, `tsx`.
Requirements truth: `docs/spec.md`; API truth: `docs/api/bugsnag-data-access-openapi.json` (SwaggerHub v2, 141 operations); coverage: `docs/api-coverage.md`.

## Architecture

```
src/
├── index.ts               # export { program } from './cli/program'
├── cli/
│   ├── program.ts          # Entry: minimist parse → loadConfig → parseCommand → assertWriteAllowed → injectContext → dispatch
│   ├── commands.ts         # 42 API command definitions + config/skill commands — all Zod schemas
│   ├── command.ts          # declareCommand(), parseCommand(), assertWriteAllowed()
│   ├── output.ts           # TextOutput / JsonOutput strategy pattern
│   └── minimist.ts         # Arguments parser (forked from playwright-cli via glitchtip-cli)
├── api/
│   ├── client.ts           # BugsnagClient — token auth, Link/offset pagination with --limit cap,
│   │                       #   429 Retry-After retry, 60000 → sort=unsorted downgrade, 204 → null, 30s timeout
│   ├── auth.ts             # TokenAuth: Authorization: token <auth-token>
│   ├── resolve.ts          # slug/name → id resolver (24-hex passthrough, in-process cache)
│   ├── filters.ts          # serializeFilters(): k=v → filters[k][][type]=eq + value pairs
│   └── path.ts             # encodePathSegment(): encode raw IDs once, preserve existing %XX
├── config/
│   ├── config.ts           # Config loader (CLI → env vars → ~/.bugsnagrc profiles; -p switch)
│   └── helpGenerator.ts    # Build-time: Zod schemas → dist/help.json
└── installer/
    └── ...                 # skill-install/uninstall → SKILL.md + pitfalls.md into agent skill dirs
```

## Key Patterns

- **Default read-only, explicit writes**: `error-update` and `error-bulk-update` set `mutating: true`; `assertWriteAllowed()` rejects them unless the global `--write` flag is present. No delete, issue linking, or comment writes.
- **Command definition**: `declareCommand({ name, category, description, args?, options?, mutating?, list?, pagination?, perPage?, project?, organization?, api, transformRequest?, transformResponse? })` — declarative, no execution logic.
- **Command → API pipeline**: `minimist` parse → `loadConfig()` → `parseCommand()` Zod validate → `assertWriteAllowed()` → `injectContext()` (org/project resolution + config defaults) → `dispatchRequest()` → `BugsnagClient.request/list()` → transformResponse → Output.format().
- **CLI-only flag renames**: `queryExcludedFlags` in program.ts strips non-API flags (`filter`, `per-page`, `limit`, `project`, `organization`, `full-reports`, `summary-size`, `buckets-count`, `pivots`, `offset`, `error-ids`, `starred-only`, `release-stage`, `release-stage-name`, `top-only`, `visible-only`, `target-span-id`, `categories`). Renamed fields are added by `transformRequest` (`full_reports`, `summary_size`, `starred_only`, `release_stage`, `release_stage_name`, `target_span_id`, etc.).
- **Body methods**: PATCH/POST commands do not send CLI flags as query params (`queryParams = {}`); the body comes from `transformRequest`. `error-bulk-update` puts repeated `error_ids` in the path.
- **Link pagination**: list APIs page via `Link: rel="next"` headers + `X-Total-Count`. Used by errors, events, error pivots, pivot values, releases, release groups. `--limit` caps traversal.
- **Offset pagination**: span groups, span group summaries, page load span groups, and comments use `offset` + `per_page`. `starred-span-group-list` uses `page_token`/Link pagination in the live API. `client.list({ pagination: 'offset' })` increments offset and stops on a short page or at `--limit`.
- **60000 downgrade**: `{ errors, code: 60000 }` → retry once with `sort=unsorted`.
- **Filters**: repeatable `--filter <expr>`; `k=v`→eq, `k=v1,v2`→multi eq, `k!=v`→ne, `k:empty=true|false`→empty. Serialized as `filters[FIELD][][type]=...` / `filters[FIELD][][value]=...`. Performance endpoints use the same event-style encoding (verified live; `PerformanceFilter[]` returns 400).
- **ID resolution**: `--organization` / `--project` accept 24-hex ids or names/slugs via `resolveOrg()` / `resolveProject()`; cached in-process. `error-latest-event`, `saved-search-show`, `release-group-show` need no project; `org-trace-spans` needs only organization.
- **Path encoding**: `encodePathSegment()` encodes raw IDs once and preserves existing `%XX` (span group IDs are often pre-encoded).
- **Trend paths**: live API accepts singular `/trend`; OpenAPI plural `/trends` returns 404. `error-trend` and `project-trend` use singular.
- **Output strategy**: TextOutput (scalar-column tables for arrays; JSON dump for objects; `--raw` skips formatting; event-show renders a stacktrace) / JsonOutput (`--json`). Errors: text `Error: <message>`; JSON `{ isError: true, error: "<message>" }`; exit 1.
- **Config**: priority CLI → env (`BUGSNAG_AUTH_TOKEN`, `BUGSNAG_BASE_URL`, `BUGSNAG_ORGANIZATION`, `BUGSNAG_PROJECT`, `BUGSNAG_PROFILE`) → `~/.bugsnagrc`. Profile keys: `auth-token`, `base-url`, `organization`, `project`.
- **204 / empty**: `client.request()` returns `null` for 204 (e.g. stability_trend with no sessions); list commands may return `[]`.
- **Timeout**: all HTTP requests 30s AbortController.

## Commands (42 API)

| Category | Commands |
|---|---|
| Organizations | `org-list` |
| Projects | `project-list`, `project-show` |
| Errors | `error-list`, `error-show` |
| Events | `error-events`, `error-latest-event`, `event-show`, `event-list`, `event-fields` |
| Analysis | `error-pivots`, `error-pivot-values`, `error-trend`, `project-pivots`, `project-pivot-values`, `project-trend`, `project-stability`, `saved-search-list`, `saved-search-show` |
| Releases | `release-list`, `release-show`, `release-group-list`, `release-group-show` |
| Comments | `comment-list` |
| Performance | `span-group-list`, `span-group-summaries`, `span-group-show`, `span-group-timeline`, `span-group-distribution`, `span-group-performance-targets`, `span-group-spans`, `span-group-spans-by-name`, `starred-span-group-list`, `page-load-span-group-list`, `page-load-span-group-show`, `trace-fields`, `trace-spans`, `org-trace-spans`, `performance-overview`, `network-grouping-show` |
| Triage writes | `error-update`, `error-bulk-update` (require `--write`) |
| Config | `config-show/set/list/use/new/path` |
| Skills | `skill-install`, `skill-uninstall` |

## Adding a Command

1. Add `declareCommand({...})` in `src/cli/commands.ts` (write Zod `.describe()` for every flag) and append to `commandsArray`.
2. Set `mutating: true` if it changes BugSnag state; it will require `--write`.
3. Set `pagination: 'offset'` for endpoints using `offset`/`per_page`; set `perPage: { default, max }` when the API has a non-30 default or a cap.
4. If a flag must not reach the API as a query param or needs renaming, update `queryExcludedFlags` in `src/cli/program.ts` and map it in `transformRequest`.
5. Use `encodePathSegment()` for path IDs.
6. Verify the endpoint path/params against the OpenAPI file and live API. Run `npm run build` to regenerate help.json, then `npm test`.
7. No code comments.

## Verification

```
npm run typecheck   # tsc --noEmit
npm test            # 77 tests (minimist/command/output/client/filter/path)
npm run build       # tsc + help.json (42 API commands)
```
