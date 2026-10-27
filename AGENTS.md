# AGENTS.md

## Project

`bugsnag-cli` — Read-only CLI for the BugSnag API. Fetches errors, events, pivots and trends so AI agents can analyze failures. Entrypoint: `bin/bugsnag-cli.js` → `require('../dist/index')`.
Build: `npm run build` (= `tsc` + `tsx scripts/generate-help.ts` → `dist/help.json`).
Test: `npm test` (= `tsx --test tests/*.test.ts` — Node.js built-in test runner, 60 tests).
Dependencies: `zod`. Dev: `typescript`, `@types/node`, `tsx`.
Requirements truth: `docs/spec.md`; executor plan (v0.1): `docs/code-design.md`; API truth: BugSnag API v2 Blueprint (docs at https://bugsnagapiv2.docs.apiary.io).

## Architecture

```
src/
├── index.ts               # export { program } from './cli/program'
├── cli/
│   ├── program.ts          # Entry: minimist parse → loadConfig → parseCommand → injectContext → dispatch
│   ├── commands.ts         # 20 command definitions — all Zod schemas
│   ├── command.ts          # declareCommand(), parseCommand() (Zod validation)
│   ├── output.ts           # TextOutput / JsonOutput strategy pattern
│   └── minimist.ts         # Arguments parser (forked from playwright-cli via glitchtip-cli)
├── api/
│   ├── client.ts           # BugsnagClient — token auth, Link-header pagination with --limit cap,
│   │                       #   429 Retry-After retry, 60000 → sort=unsorted downgrade retry, 30s timeout
│   ├── auth.ts             # TokenAuth: Authorization: token <auth-token>
│   ├── resolve.ts          # slug/name → id resolver (24-hex passthrough, in-process cache)
│   └── filters.ts          # serializeFilters(): k=v → filters[k][][type]=eq + value pairs
├── config/
│   ├── config.ts           # Config loader (CLI → env vars → ~/.bugsnagrc profiles; -p switch)
│   └── helpGenerator.ts    # Build-time: Zod schemas → dist/help.json
└── installer/
    └── ...                 # skill-install/uninstall → SKILL.md + pitfalls.md into agent skill dirs
```

## Key Patterns

- **Read-only CLI**: no discard/delete/update commands exist by design. Mutating Bugsnag state happens in the Dashboard.
- **Command definition**: `declareCommand({ name, category, description, args?, options?, api: { method, path }, transformRequest?, transformResponse?, list? })` — purely declarative, no execution logic.
- **Command → API pipeline**: `minimist` parse → `loadConfig()` → `parseCommand()` Zod validate → `injectContext()` (org/project resolution + config defaults) → `dispatchRequest()` → `BugsnagClient.request/list()` → transformResponse → Output.format().
- **CLI-only flag renames**: a static `queryExcludedFlags` list in program.ts strips non-API flags (`filter`, `per-page`, `limit`, `project`, `organization`, `full-reports`, `summary-size`, `buckets-count`, `pivots`) and snake_cases the rest (`full-reports` → `full_reports`). `--buckets-count` → `buckets_count`; `--pivots`/`--summary-size` → `pivots`/`summary_size`.
- **Pagination**: list APIs page via `Link: rel="next"` headers + `X-Total-Count`. Every list command takes `--per-page <n>` (default 30) and `--limit <n>` (default 100). `client.list()` follows next links and STOPS at the limit (final page truncated). There is NO `--all` — unbounded traversal is intentionally impossible.
- **60000 downgrade**: a response body `{errors, code: 60000}` means the sorted-results cap was hit → client retries once with `sort=unsorted` (any sort value ≠ unsorted; request must carry a sort).
- **Filters**: repeatable `--filter <expr>`; `k=v`→eq, `k=v1,v2`→multi eq, `k!=v`→ne, `k:empty=true|false`→empty. Serialized as `filters[FIELD][][type]=...` / `filters[FIELD][][value]=...` pairs, in key-ordered interleave. `serializeFilters()` is pure + unit-tested.
- **ID resolution**: `--organization` / `--project` accept 24-hex ids (regex `^[0-9a-f]{24}$`, passed through) or names/slugs via `resolveOrg()` (GET /user/organizations) and `resolveProject()` (org projects list); results cached in-process for the command lifetime. Config `project`/`organization` defaults inject automatically.
- **Output strategy**: TextOutput (scalar-column tables for arrays; JSON dump for objects; `--raw` skips formatting; event-show renders a stacktrace listing) / JsonOutput (`--json` full objects). Errors: text `Error: <message>`; JSON `{ isError: true, error: "<message>" }`; exit 1.
- **Config**: priority CLI → env (`BUGSNAG_AUTH_TOKEN`, `BUGSNAG_BASE_URL`, `BUGSNAG_ORGANIZATION`, `BUGSNAG_PROJECT`, `BUGSNAG_PROFILE`) → `~/.bugsnagrc`. Profile keys: `auth-token`, `base-url` (default `https://api.bugsnag.com`), `organization`, `project`. Legacy spellings (`authToken`, `auth_token`) accepted on read.
- **error-latest-event**: `GET /errors/{error_id}/latest_event` — the only error endpoint without `project_id` in the path.
- **event-fields**: fixed `per_page=100`, single request (endpoint has no Link pagination).
- **Timeout**: all HTTP requests 30s AbortController.

## Commands

| Category | Commands |
|---|---|
| Organizations | `org-list` |
| Projects | `project-list` (`--q`, `--sort`, `--direction`), `project-show` (`--project` id\|slug\|name) |
| Errors | `error-list` (`--sort` last_seen/first_seen/users/events, `--direction`, `--base`, `--filter`), `error-show <errorId>` |
| Events | `error-events <errorId>` (`--full-reports` default true, `--sort`, `--direction`, `--base`, `--filter`), `error-latest-event <errorId>`, `event-show <eventId>`, `event-fields` |
| Pivots & Trends | `error-pivots <errorId>`, `error-pivot-values <errorId> <fieldId>`, `error-trend <errorId>` (`--buckets-count` default 30, or mutually exclusive `--resolution`) |
| Config | `config-show/set/list/use/new/path` (set accepts: auth-token, base-url, organization, project) |
| Skills | `skill-install`, `skill-uninstall` |

All list commands: `--per-page` + `--limit` (see Pagination). Global: `--json`, `--raw`, `-p/--profile`, `--auth-token`, `--base-url`.

## Adding a Command

1. Add `declareCommand({...})` in `src/cli/commands.ts` (write Zod `.describe()` for every flag) and append to `commandsArray`.
2. If the flag must not reach the API as a query param or needs renaming, update `queryExcludedFlags` in `src/cli/program.ts`.
3. Verify the endpoint path/params against the API Blueprint. Run `npm run build` to regenerate help.json, then `npm test`.
4. No code comments.

## Verification

```
npm run typecheck   # tsc --noEmit
npm test            # 60 tests (minimist/command/output/client/filter)
npm run build       # tsc + help.json (20 commands)
```
