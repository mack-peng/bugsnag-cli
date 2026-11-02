# bugsnag-cli

A CLI for the BugSnag Data Access API — fetch errors, events, project health, releases, comments, and performance data. Read-only by default; error triage writes require an explicit `--write`.

Built for AI agents doing root-cause analysis and shell automation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg)](https://nodejs.org/) [![npm version](https://img.shields.io/npm/v/bugsnag-cli.svg)](https://www.npmjs.com/package/bugsnag-cli) [![npm downloads](https://img.shields.io/npm/dm/bugsnag-cli.svg)](https://www.npmjs.com/package/bugsnag-cli) [![GitHub stars](https://img.shields.io/github/stars/mack-peng/bugsnag-cli?style=social)](https://github.com/mack-peng/bugsnag-cli/stargazers)

> Agent-first BugSnag access: one binary that handles auth, pagination, filter encoding, and ID resolution, so an agent can go from "what broke?" to a stack trace without writing API glue.

---

## Table of Contents

- [Why bugsnag-cli?](#why-bugsnag-cli)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [Output Modes](#output-modes)
- [Commands](#commands)
- [Configuration](#configuration)
- [Global Options](#global-options)
- [Agent Skill](#agent-skill)
- [Troubleshooting](#troubleshooting)
- [API Baseline](#api-baseline)
- [Explicitly Not Supported](#explicitly-not-supported)
- [Requirements & Platforms](#requirements--platforms)
- [Development](#development)
- [Documentation](#documentation)
- [If bugsnag-cli is useful](#if-bugsnag-cli-is-useful)
- [License](#license)

---

## Why bugsnag-cli?

Calling the BugSnag Data Access API directly means handling a lot of plumbing before you can ask a single question:

- **Auth** — `Authorization: token <personal-auth-token>`, plus organization and project resolution from names or slugs.
- **Pagination** — Link-header pagination for errors, events, and releases; offset pagination for spans and comments; page tokens for starred span groups.
- **Filters** — repeatable `k=v` / `k!=v` / `k:empty=` expressions serialized into BugSnag's bracketed filter format.
- **Live API quirks** — 429 `Retry-After` retries, the `60000` sorted-results downgrade, singular `/trend` paths, URL-encoded span group IDs.
- **Output** — human-readable tables by default, `--json` for scripts and agents, `--raw` for downstream tools.

`bugsnag-cli` handles all of it, keeps every command read-only unless you pass `--write`, and exposes 42 API commands behind one flat `<resource>-<action>` surface.

---

## Installation

### For Humans

Copy and paste this prompt to your LLM agent (Claude Code, Cursor, Codex, etc.):

```
Install and configure bugsnag-cli by following the instructions here:
https://raw.githubusercontent.com/mack-peng/bugsnag-cli/main/docs/guide/installation.md
```

Or read the [Installation Guide](docs/guide/installation.md), but seriously, let an agent do it. Humans fat-finger configs.

### For LLM Agents

Fetch the installation guide and follow it:

```bash
curl -s https://raw.githubusercontent.com/mack-peng/bugsnag-cli/main/docs/guide/installation.md
```

Or install directly:

```bash
npm install -g bugsnag-cli
bugsnag-cli skill-install
```

---

## How It Works

```
bugsnag-cli error-list --project my-app --filter error.status=open --json
        │
        ▼
minimist parse
        │
        ▼
loadConfig          CLI flags → env vars → ~/.bugsnagrc profiles
        │
        ▼
Zod validate        command schema + flag types
        │
        ▼
assertWriteAllowed  mutating commands require --write
        │
        ▼
resolve org/project 24-hex id or name/slug (cached in-process)
        │
        ▼
BugsnagClient       Link/offset pagination · 429 Retry-After
                    · 60000 downgrade · 30s timeout
        │
        ▼
TextOutput / JsonOutput
```

Every command follows the same pipeline. Command definitions are declarative (`declareCommand`), so flags, validation, pagination, and output stay consistent across the 42 API commands.

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
Full filter notes: [Installation Guide → Filters](docs/guide/installation.md#filters).

### Pagination

- **Link pagination**: errors, events, error pivots, pivot values, releases, release groups.
- **Offset pagination**: span groups, page loads, comments.
- **Page-token / Link**: starred span groups.

Paginated commands take `--limit` (default 100); offset commands also support `--offset`. Commands backed by a single unpaginated response (`saved-search-list`, `project-pivots`) return the full result set and do not take `--limit`. There is no `--all` and no unbounded traversal. `release-list` caps `--per-page` at 10.
Full pagination notes: [Installation Guide → Pagination](docs/guide/installation.md#pagination-never-unbounded).

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

## Global Options

```
--json              Output as JSON
--raw               Output raw result without formatting
--write             Allow mutating commands
-h, --help [command] Show help (global or per-command)
--version           Show version
-p, --profile       Use named config profile
--auth-token        BugSnag Personal Auth Token
--base-url          BugSnag API base URL (default https://api.bugsnag.com)
```

---

## Agent Skill

`skill-install` writes a `SKILL.md` + `references/pitfalls.md` into each detected agent's skill directory, so the agent knows the command surface, auth flow, and common failure modes without re-reading this README.

```bash
bugsnag-cli skill-install
bugsnag-cli skill-install --target opencode
bugsnag-cli skill-install --target all
bugsnag-cli skill-install --local
bugsnag-cli skill-uninstall
```

| Target | Skill directory |
|--------|-----------------|
| `claude` | `~/.claude/skills/bugsnag-cli/` |
| `opencode` | `~/.agents/skills/bugsnag-cli/` |
| `cursor` | `~/.agents/skills/bugsnag-cli/` |
| `codex` | `~/.codex/skills/bugsnag-cli/` |
| `hermes` | `~/.hermes/skills/bugsnag-cli/` |
| `gemini` | `~/.gemini/skills/bugsnag-cli/` |

`--target auto` (default) installs to detected agents and falls back to `claude` when none are detected; `--target none` selects no targets and writes nothing; `--local` installs into the current project instead of home.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing required config` | Set `auth-token` with `config-set` or `BUGSNAG_AUTH_TOKEN`. |
| `Error: Bad Credentials` | Token is invalid or revoked — regenerate it at app.bugsnag.com/settings/my-account. |
| `Error not found` | The error id belongs to another project; pass `--project` explicitly or check `config-show`. |
| `Organization is required to resolve project` | Project was given by name without an org — set `config-set organization` or pass `--organization`. |
| `HTTP 429` | Rate limited; the CLI retries with `Retry-After`. Wait before retrying if it persists. |
| `--resolution rejected` | Allowed values: `1m`, `5m`, `30m`, `2h`, `12h`. |

More failure modes and fixes: [Installation Guide → Common Failures Agents Face](docs/guide/installation.md#common-failures-agents-face).

---

## API Baseline

- OpenAPI: [docs/api/bugsnag-data-access-openapi.json](https://github.com/mack-peng/bugsnag-cli/blob/main/docs/api/bugsnag-data-access-openapi.json)
- Baseline notes: [docs/api/README.md](https://github.com/mack-peng/bugsnag-cli/blob/main/docs/api/README.md)
- Coverage matrix: [docs/api-coverage.md](https://github.com/mack-peng/bugsnag-cli/blob/main/docs/api-coverage.md)

Live drift recorded there: trends use singular `/trend`; performance endpoints accept event-style filters; `performance_overview` requires the `performance-scores` plan feature.

---

## Explicitly Not Supported

- Delete, create/link/unlink issue, comment writes
- Project / organization / team / integration management
- Build API / Upload API (build reporting, symbol upload)
- On-premise Basic Auth
- Unbounded `--all` pagination

---

## Requirements & Platforms

| Requirement | Value |
|-------------|-------|
| Node.js | >= 18 |
| npm | any version bundled with Node.js >= 18 |
| Platforms | macOS, Linux, Windows (x64 / arm64); pure JavaScript, no native dependencies |

`npx bugsnag-cli` works without a global install. The test suite runs on Linux CI; macOS and Windows are supported by Node.js but are not covered by CI.

---

## Development

```bash
npm install
npm run build       # tsc + generate help.json → dist/
npm test            # Run unit tests
npm run typecheck   # Type check only
```

---

## Documentation

| Document | Audience |
|----------|----------|
| `README.md` | Everyone — overview and command surface |
| [docs/guide/installation.md](docs/guide/installation.md) | Agents — install, auth, troubleshooting |
| [docs/spec.md](https://github.com/mack-peng/bugsnag-cli/blob/main/docs/spec.md) | Maintainers — requirements |
| [docs/code-design.md](https://github.com/mack-peng/bugsnag-cli/blob/main/docs/code-design.md) | Maintainers — implementation design |
| [docs/api-coverage.md](https://github.com/mack-peng/bugsnag-cli/blob/main/docs/api-coverage.md) | Maintainers — API coverage matrix |
| [docs/api/README.md](https://github.com/mack-peng/bugsnag-cli/blob/main/docs/api/README.md) | Maintainers — API baseline and live drift |
| [AGENTS.md](https://github.com/mack-peng/bugsnag-cli/blob/main/AGENTS.md) | Coding agents — repository conventions |

---

## If bugsnag-cli is useful

A ⭐ star helps other developers and agents discover it — and tells us to keep shipping.

---

## License

MIT
