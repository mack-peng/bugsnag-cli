# bugsnag-cli

A CLI for the BugSnag Data Access API — fetch errors, events, project health, releases, comments, and performance data. Read-only by default; error triage writes require an explicit `--write`.

Built for AI agents doing root-cause analysis and shell automation.

## Installation

### For Humans

```bash
npm install -g bugsnag-cli
```

Or run without installing:

```bash
npx bugsnag-cli org-list
```

### For LLM Agents

```bash
bugsnag-cli skill-install
```

This installs a `SKILL.md` + `references/pitfalls.md` into your agent's skill directory.

---

## Quick Start

### 1. Configure Authentication

```bash
bugsnag-cli config-set auth-token <personal-auth-token>   # app.bugsnag.com/settings/my-account
bugsnag-cli config-set organization <org-id-or-name>      # optional default organization
bugsnag-cli config-set project <project-id-or-name>       # optional default project
```

Config is stored in `~/.bugsnagrc`. Verify with `bugsnag-cli config-show`.

### 2. Try It

```bash
bugsnag-cli org-list
bugsnag-cli error-list --project my-project
bugsnag-cli --json project-trend --project my-project --buckets-count 30
```

---

## Output Modes

| Flag | Output | Use Case |
|------|--------|----------|
| (default) | Human-readable tables / formatted JSON | Terminal viewing |
| `--json` | Machine-readable JSON | Scripts, `jq` pipes, AI agent consumption |
| `--raw` | Raw data without formatting | Direct consumption by other tools |

In `--json` mode, errors are `{ "isError": true, "error": "..." }` and the process exits 1.

---

## Configuration

```bash
bugsnag-cli config-set auth-token abc123
bugsnag-cli config-set base-url https://api.bugsnag.com
bugsnag-cli config-set organization my-org
bugsnag-cli config-set project my-project

bugsnag-cli config-show
bugsnag-cli config-path

# Profiles
bugsnag-cli config-new staging
bugsnag-cli -p staging config-set auth-token xyz789
bugsnag-cli config-use staging
bugsnag-cli config-list
```

Priority: CLI flags > Environment variables > Config file.

```
--auth-token     BUGSNAG_AUTH_TOKEN
--base-url       BUGSNAG_BASE_URL
--organization   BUGSNAG_ORGANIZATION
--project        BUGSNAG_PROJECT
-p, --profile    BUGSNAG_PROFILE
```

---

## Commands

`--project` / `--organization` accept 24-hex API ids directly or names/slugs.

### Organizations & Projects

```bash
bugsnag-cli org-list
bugsnag-cli project-list --organization <org>
bugsnag-cli project-show --project my-project
```

### Errors & Events

```bash
bugsnag-cli error-list --project my-project --filter error.status=open
bugsnag-cli error-show <errorId> --project my-project
bugsnag-cli error-latest-event <errorId>                # no --project needed
bugsnag-cli error-events <errorId> --project my-project --limit 5
bugsnag-cli event-list --project my-project --limit 10  # project-wide event stream
bugsnag-cli event-show <eventId> --project my-project
bugsnag-cli event-fields --project my-project
```

### Pivots, Trends & Project Health

```bash
bugsnag-cli error-pivots <errorId> --summary-size 5 --project my-project
bugsnag-cli error-pivot-values <errorId> app.release_stage --project my-project
bugsnag-cli error-trend <errorId> --buckets-count 24 --project my-project
bugsnag-cli project-pivots --project my-project --summary-size 10
bugsnag-cli project-pivot-values app.release_stage --project my-project
bugsnag-cli project-trend --project my-project --buckets-count 30
bugsnag-cli project-stability --project my-project
bugsnag-cli saved-search-list --project my-project
bugsnag-cli saved-search-show <savedSearchId>
```

### Releases

```bash
bugsnag-cli release-list --project my-project --limit 10
bugsnag-cli release-show <releaseId> --project my-project
bugsnag-cli release-group-list --project my-project --release-stage-name production
bugsnag-cli release-group-show <releaseGroupId>
```

### Comments

```bash
bugsnag-cli comment-list <errorId> --project my-project --limit 20
```

### Performance

```bash
bugsnag-cli span-group-list --project my-project --sort duration_p95 --filter span.since=7d
bugsnag-cli span-group-summaries --project my-project
bugsnag-cli span-group-show <spanGroupId> --project my-project
bugsnag-cli span-group-timeline <spanGroupId> --project my-project
bugsnag-cli span-group-distribution <spanGroupId> --project my-project
bugsnag-cli span-group-performance-targets <spanGroupId> --project my-project
bugsnag-cli span-group-spans <spanGroupId> --project my-project
bugsnag-cli span-group-spans-by-name <category> <name> --project my-project
bugsnag-cli starred-span-group-list --project my-project
bugsnag-cli page-load-span-group-list --project my-project
bugsnag-cli page-load-span-group-show <pageLoadSpanGroupId> --project my-project
bugsnag-cli trace-fields --project my-project
bugsnag-cli trace-spans <traceId> --project my-project --from <ISO> --to <ISO>
bugsnag-cli org-trace-spans <traceId> --organization <org> --from <ISO> --to <ISO>
bugsnag-cli performance-overview --project my-project
bugsnag-cli network-grouping-show --project my-project
```

### Error Triage (requires `--write`)

```bash
bugsnag-cli error-update <errorId> --project my-project --write --operation fix
bugsnag-cli error-update <errorId> --project my-project --write --operation assign --assigned-collaborator-id <id>
bugsnag-cli error-update <errorId> --project my-project --write --operation snooze --reopen-if occurs_after --seconds 3600
bugsnag-cli error-bulk-update --project my-project --write --error-ids id1,id2 --operation ignore
```

`--operation` supports `open`, `fix`, `ignore`, `snooze`, `discard`, `undiscard`, `assign`, `override_severity`.
Delete, issue linking, and comment writes are not supported — use the BugSnag dashboard.

### Filters

`--filter` is repeatable:

| Input | Meaning |
|-------|---------|
| `k=v` | field equals value |
| `k=v1,v2` | field equals any of the values |
| `k!=v` | field does not equal value |
| `k:empty=true\|false` | field has / has no value |

Performance endpoints use the same event-style filters. Discover fields with `event-fields` and `trace-fields`.

### Pagination

- **Link pagination**: errors, events, error pivots, pivot values, releases, release groups.
- **Offset pagination**: span groups, page loads, starred span groups, comments.

Every list command supports `--limit` (default 100); offset commands also support `--offset`. There is no `--all` and no unbounded traversal. `release-list` caps `--per-page` at 10.

---

## Global Options

```
--json              Output as JSON
--raw               Output raw result without formatting
--write             Allow mutating commands
--help [command]    Show help
--version           Show version
-p, --profile       Use named config profile
--auth-token        BugSnag Personal Auth Token
--base-url          BugSnag API base URL (default https://api.bugsnag.com)
```

---

## API Baseline

- OpenAPI: `docs/api/bugsnag-data-access-openapi.json`
- Coverage matrix: `docs/api-coverage.md`

Live drift recorded there: trends use singular `/trend`; performance endpoints accept event-style filters; `performance_overview` requires the `performance-scores` plan feature.

---

## Agent Skill

```bash
bugsnag-cli skill-install
bugsnag-cli skill-install --target opencode
bugsnag-cli skill-install --target all
bugsnag-cli skill-install --local
bugsnag-cli skill-uninstall
```

The skill installs `SKILL.md` + `references/pitfalls.md` into each agent's skill directory.

---

## Explicitly Not Supported

- Delete, create/link/unlink issue, comment writes
- Project / organization / team / integration management
- Build API / Upload API (build reporting, symbol upload)
- On-premise Basic Auth
- Unbounded `--all` pagination

## Development

```bash
npm install
npm run build       # tsc + generate help.json → dist/
npm test            # Run unit tests
npx tsc --noEmit    # Type check only
```

## License

MIT
