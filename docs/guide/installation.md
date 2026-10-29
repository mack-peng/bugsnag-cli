# Installation Guide for LLM Agents

You are an AI agent (opencode, Claude Code, Codex, Cursor, etc.). This guide is written for you. Do not make the human read it.

## Quick Prompt (for humans to copy-paste)

If a human pasted this to you, follow the instructions below:

> Install and configure `bugsnag-cli` using the guide at `docs/guide/installation.md`. First check `~/.bugsnagrc` if it exists, then ask me for my BugSnag Personal Auth Token. Verify with `bugsnag-cli org-list`.

---

## What You're Installing

`bugsnag-cli` is a read-only-by-default CLI that lets you (the agent) fetch errors, events with full stack traces, project health, releases, comments, and performance data from the BugSnag API — the data you need for root-cause analysis, straight from the command line.

Humans should not type these commands. You should.

The CLI cannot delete, resolve, or discard anything unless you explicitly pass `--write`. Only `error-update` and `error-bulk-update` mutate BugSnag state; all other commands are read-only. Delete, issue linking, and comment writes stay in the Dashboard.

---

## Step 1: Install the Package

```bash
npm install -g bugsnag-cli
```

Or run without installing (slower but zero setup):

```bash
npx bugsnag-cli org-list
```

Verify:

```bash
which bugsnag-cli && bugsnag-cli --version
```

If `command not found`, your Node.js global bin isn't on `PATH`:

```bash
export PATH="$(npm root -g)/../bin:$PATH"
```

---

## Step 2: Check Existing Config

Before asking for credentials, check what's already configured:

```bash
bugsnag-cli config-show
```

- If `auth-token` is set, jump to Step 4 to verify.
- If missing, proceed to Step 3.

---

## Step 3: Get Credentials

One credential is required; the rest are defaults:

| Required | Description | Example |
|----------|-------------|---------|
| Personal Auth Token | Created in BugSnag UI | `a1b2c3...` |
| base-url | API base URL | default `https://api.bugsnag.com` — only override for special instances |
| organization | Default org slug (optional) | `my-org` |
| project | Default project slug (optional) | `my-app` |

The human generates their token at: https://app.bugsnag.com/settings/my-account → Personal Auth Tokens (reading access is enough for this CLI).

**Have the human run the token command themselves** — the token is a secret and should not pass through chat:

```bash
bugsnag-cli config-set auth-token <token>
```

Then you can set the non-sensitive defaults:

```bash
bugsnag-cli config-set organization my-org
bugsnag-cli config-set project my-app
```

Config is stored at `~/.bugsnagrc`. Multi-account? Use profiles:

```bash
bugsnag-cli config-new staging
bugsnag-cli -p staging config-set auth-token <token>
bugsnag-cli -p staging config-set organization staging-org
bugsnag-cli config-list          # See all profiles
bugsnag-cli config-use staging   # Switch active
```

---

## Step 4: Verify

```bash
# Check configuration (secrets masked)
bugsnag-cli config-show

# Verify connection
bugsnag-cli org-list

# Pull open errors from the last day, sorted by volume
bugsnag-cli error-list --project my-app --sort events --filter "error.status=open" --filter "event.since=1d" --limit 10
```

JSON output = it works. `Error: Bad Credentials` = bad token. `Missing required config` = auth-token not set.

---

## What You Can Do Now

### Explore the Account

```bash
bugsnag-cli org-list
bugsnag-cli project-list --organization my-org
bugsnag-cli project-show --project my-app
```

### Errors

```bash
bugsnag-cli error-list --project my-app
bugsnag-cli error-list --project my-app --sort last_seen --direction desc
bugsnag-cli error-list --project my-app --filter "error.status=open" --filter "app.version=2.1.0"
bugsnag-cli error-show <errorId> --project my-app
```

### Events (AI Analysis)

```bash
bugsnag-cli error-latest-event <errorId>        # fastest full stack trace, no --project needed
bugsnag-cli error-events <errorId> --limit 5
bugsnag-cli event-show <eventId> --project my-app   # text mode renders the stack trace
bugsnag-cli event-fields --project my-app           # discover filter/pivot field ids
```

### Pivots & Trends (dimension analysis)

```bash
bugsnag-cli error-pivots <errorId> --summary-size 5 --project my-app
bugsnag-cli error-pivot-values <errorId> user.email --project my-app
bugsnag-cli error-trend <errorId> --resolution 2h --project my-app
```

### Project Health & Releases

```bash
bugsnag-cli project-pivots --project my-app --summary-size 10
bugsnag-cli project-pivot-values app.release_stage --project my-app
bugsnag-cli project-trend --project my-app --buckets-count 30
bugsnag-cli project-stability --project my-app
bugsnag-cli saved-search-list --project my-app
bugsnag-cli release-list --project my-app --limit 10
bugsnag-cli release-group-list --project my-app --release-stage-name production
```

### Performance

```bash
bugsnag-cli span-group-list --project my-app --sort duration_p95 --filter span.since=7d
bugsnag-cli span-group-show <spanGroupId> --project my-app
bugsnag-cli span-group-spans <spanGroupId> --project my-app
bugsnag-cli trace-fields --project my-app
bugsnag-cli trace-spans <traceId> --project my-app --from <ISO> --to <ISO>
bugsnag-cli performance-overview --project my-app
```

### Comments & Triage

```bash
bugsnag-cli comment-list <errorId> --project my-app
bugsnag-cli error-update <errorId> --project my-app --write --operation fix
```

The CLI is read-only by default. Only `error-update` / `error-bulk-update` mutate state and require `--write`.

For the full command surface, run `bugsnag-cli --help` (42 API commands).

### The Standard Root-Cause Pull Chain

1. `error-list` — volume overview (sort by events)
2. `error-latest-event` — full stack trace of the newest event
3. `error-events --limit 5` — compare recent occurrences
4. `error-pivots --summary-size 5` — browser / user / release breakdown
5. `error-trend --resolution 2h` — spike vs chronic
6. `comment-list` — existing investigation context
7. `project-trend` / `project-stability` — zoom out to project health

### Filters

`--filter` is repeatable: `k=v` (equals), `k=v1,v2` (any of), `k!=v` (not equals), `k:empty=true|false`. Field ids come from `event-fields`; performance filters use `trace-fields`.

---

## Pagination (never unbounded)

Every list command takes `--limit <n>` (default 100). Link-paginated commands also take `--per-page <n>` (default 30); offset-paginated commands take `--offset <n>` (default 0). Traversal stops at the limit; there is no `--all` — do not wait for "all pages"; raise `--limit` explicitly if you need more.

---

## JSON & Raw Mode (for scripts/pipes)

```bash
bugsnag-cli --json error-list --project my-app | jq '.[] | {id, error_class, message, events, users, status}'
bugsnag-cli --json error-latest-event <errorId> | jq '.exceptions[0].stacktrace'
bugsnag-cli --raw error-show <errorId>
```

---

## Environment Variables (Skip Config Entirely)

```bash
export BUGSNAG_AUTH_TOKEN=abc123xyz
export BUGSNAG_BASE_URL=https://api.bugsnag.com
export BUGSNAG_ORGANIZATION=my-org
export BUGSNAG_PROJECT=my-app
```

**Priority** (highest to lowest):
1. CLI flags: `--auth-token`, `--base-url`
2. Environment variables: `BUGSNAG_*`
3. Config file: `~/.bugsnagrc`

---

## Common Failures Agents Face

**"Missing required config"**
→ auth-token not set. Run `config-set auth-token` or set `BUGSNAG_AUTH_TOKEN`.

**"Error: Bad Credentials"**
→ Bad token. The human must recheck https://app.bugsnag.com/settings/my-account.

**"Error not found"**
→ The error id belongs to a different project than the one used. Pass `--project` explicitly, or check the config default with `config-show`.

**"Organization is required to resolve project"**
→ Project given by name but no org. `config-set organization` or pass `--organization`.

**"HTTP 429"**
→ Rate limited; the CLI retries automatically with `Retry-After`. If it still fails, wait before retrying.

**`--resolution` rejected**
→ Allowed values: `1m`, `5m`, `30m`, `2h`, `12h`.

**"Unknown option"**
→ Typo. Run `bugsnag-cli <command> --help`.

---

## Done

You now have access to one or more BugSnag accounts from any terminal. The CLI is read-only by default; only run `error-update` / `error-bulk-update` with `--write` when a human explicitly asks for triage. Delete, issue linking, and comment writes stay in the Dashboard.
