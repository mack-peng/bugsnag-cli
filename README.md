# bugsnag-cli

A read-only command-line interface for the BugSnag API — fetch errors, events with full stack traces, pivots and trends. Built for AI agents doing root-cause analysis and shell automation.

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

This installs a `SKILL.md` + `references/pitfalls.md` into your agent's skill directory. Agents use it to discover commands, configure auth, and run the standard error-analysis pull chain.

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
bugsnag-cli --json error-list | jq '.[] | {id, status, events}'
```

---

## Output Modes

| Flag | Output | Use Case |
|------|--------|----------|
| (default) | Human-readable tables / formatted JSON (long strings truncated) | Terminal viewing |
| `--json` | Machine-readable JSON | Scripts, `jq` pipes, AI agent consumption |
| `--raw` | Raw data without formatting | Direct consumption by other tools |

```bash
bugsnag-cli error-list                          # Table output
bugsnag-cli --json error-list                   # JSON output
bugsnag-cli --json error-list | jq '.[].id'     # Pipe to jq
bugsnag-cli --raw error-show <errorId>          # Raw data
```

---

## Configuration

```bash
# Set values
bugsnag-cli config-set auth-token abc123
bugsnag-cli config-set base-url https://api.bugsnag.com
bugsnag-cli config-set organization my-org
bugsnag-cli config-set project my-project

# Show current config (secrets masked)
bugsnag-cli config-show

# Show config file location
bugsnag-cli config-path

# Profile management (multiple BugSnag accounts)
bugsnag-cli config-new staging
bugsnag-cli -p staging config-set auth-token xyz789
bugsnag-cli config-use staging
bugsnag-cli config-list
```

Priority: CLI flags > Environment variables > Config file

```
--auth-token     BUGSNAG_AUTH_TOKEN
--base-url       BUGSNAG_BASE_URL
--organization   BUGSNAG_ORGANIZATION
--project        BUGSNAG_PROJECT
-p, --profile    BUGSNAG_PROFILE
```

---

## Commands

Read-only. `--project` / `--organization` accept 24-hex API ids directly or names/slugs (resolved automatically).

### Organizations & Projects

```bash
bugsnag-cli org-list
bugsnag-cli project-list --organization <org>
bugsnag-cli project-list --organization <org> --q frontend --sort name --direction asc
bugsnag-cli project-show --project my-project
```

### Errors

```bash
bugsnag-cli error-list --project my-project
bugsnag-cli error-list --project my-project --sort last_seen --direction desc
bugsnag-cli error-list --project my-project --filter error.status=open --filter app.version=2.1.0
bugsnag-cli error-show <errorId> --project my-project
```

### Events (AI Analysis)

```bash
bugsnag-cli error-latest-event <errorId>                # fastest full stack trace, no --project needed
bugsnag-cli error-events <errorId> --project my-project --limit 5
bugsnag-cli event-show <eventId> --project my-project   # text mode renders the stack trace
bugsnag-cli event-fields --project my-project           # discover filter/pivot field ids
```

### Pivots & Trends

```bash
bugsnag-cli error-pivots <errorId> --project my-project --summary-size 5
bugsnag-cli error-pivot-values <errorId> app.release_stage --project my-project
bugsnag-cli error-trend <errorId> --project my-project --buckets-count 24
bugsnag-cli error-trend <errorId> --project my-project --resolution 5m   # alternative mode
```

### Filters

`--filter` is repeatable. Supported expressions:

| Input | Meaning |
|-------|---------|
| `k=v` | field equals value |
| `k=v1,v2` | field equals any of the values |
| `k!=v` | field does not equal value |
| `k:empty=true\|false` | field has / has no value |

```bash
bugsnag-cli error-list --project my-project --filter error.status=regression --filter user.email=dev@example.com
bugsnag-cli error-events <errorId> --project my-project --filter "event.since=1d" --no-full-reports
```

See `bugsnag-cli event-fields --project my-project` for the valid field ids.

### Pagination

Every list command supports `--per-page <n>` (page size, default 30) and `--limit <n>` (cumulative cap, default 100). Traversal follows `Link: rel="next"` headers and stops at the limit — there is no `--all` and no unbounded traversal.

---

## Global Options

```
--json              Output as JSON (default: human-readable)
--raw               Output raw result without formatting
--help [command]    Show help for a command or global
--version           Show version
-p, --profile       Use named config profile
--auth-token        BugSnag Personal Auth Token
--base-url          BugSnag API base URL (default https://api.bugsnag.com)
```

---

## Agent Skill

```bash
# Install skill for all detected agents
bugsnag-cli skill-install

# Install for a specific agent
bugsnag-cli skill-install --target opencode
bugsnag-cli skill-install --target claude
bugsnag-cli skill-install --target all

# Install to current directory instead of home
bugsnag-cli skill-install --local

# Remove installed skills
bugsnag-cli skill-uninstall
```

The skill installs a `SKILL.md` + `references/pitfalls.md` into each agent's skill directory (`~/.agents/skills/`, `~/.claude/skills/`, etc.).

---

## Explicitly Not Supported

- Write operations: error discard/delete/update, status changes, project/organization management (BugSnag stays the source of truth for mutations — use the dashboard)
- On-premise Basic Auth (cloud Personal Auth Tokens only)
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
