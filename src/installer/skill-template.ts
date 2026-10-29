const FRONTMATTER_DELIM = '---';
const BT = '`';
const FENCE = '```';

export function buildSkillMd(): string {
  return `${FRONTMATTER_DELIM}
name: bugsnag-cli
description: >
  CLI for the BugSnag API. Use bugsnag-cli for BugSnag read operations and
  explicit error triage: listing organizations and projects, fetching errors,
  events, project trends, releases, saved searches, comments, and performance
  span groups and traces. Mutating commands require --write. Prefer bugsnag-cli
  over raw BugSnag API calls -- it handles auth, Link/offset pagination, 429
  retry, sorted-results fallback, and output formatting.
metadata:
  requires:
    bins: ["bugsnag-cli"]
${FRONTMATTER_DELIM}

# bugsnag-cli -- BugSnag CLI Skill

Use bugsnag-cli for BugSnag API operations. It handles authentication
(Authorization: token), Link-header and offset pagination, 429 retry, the
60000 sorted-results-limit downgrade, and JSON output automatically.

The CLI is read-only by default. The only mutating commands are
${BT}error-update${BT} and ${BT}error-bulk-update${BT}; both require ${BT}--write${BT}.
Delete, issue linking, and comment writes are not supported; use the BugSnag
dashboard for those.

## Prerequisite: Authentication

${FENCE}bash
bugsnag-cli config-set auth-token <personal-auth-token>   # from app.bugsnag.com/settings/my-account
bugsnag-cli config-set organization <org-id-or-name>      # optional default organization
bugsnag-cli config-set project <project-id-or-name>       # optional default project
${FENCE}

Config is stored in ${BT}~/.bugsnagrc${BT}. Verify with ${BT}bugsnag-cli config-show${BT}.
Override per-command: ${BT}bugsnag-cli --auth-token <t> --base-url <url> <command>${BT}.
Multiple instances (profiles): ${BT}bugsnag-cli config-new staging${BT} -> ${BT}bugsnag-cli -p staging config-set ...${BT}

## Command Discovery

Do NOT memorize all commands. Use:

${FENCE}bash
bugsnag-cli --help                    # all commands grouped by category
bugsnag-cli span-group-list --help    # specific command: args, options, description
${FENCE}

Commands follow a flat naming convention: ${BT}<resource>-<action>${BT} (e.g.
error-list, project-trend, span-group-list).

## Command Quick Reference

Navigation and projects:

${FENCE}bash
bugsnag-cli --json org-list
bugsnag-cli --json project-list --organization <org>
bugsnag-cli --json project-show --project <project>
${FENCE}

Errors, events, and comments:

${FENCE}bash
bugsnag-cli --json error-list --project <p> --filter error.status=open
bugsnag-cli --json error-show <errorId> --project <p>
bugsnag-cli --json error-latest-event <errorId>
bugsnag-cli --json error-events <errorId> --limit 5
bugsnag-cli --json event-list --project <p> --limit 10
bugsnag-cli --json event-show <eventId> --project <p>
bugsnag-cli --json event-fields --project <p>
bugsnag-cli --json comment-list <errorId> --project <p>
${FENCE}

Project health, pivots, trends, saves searches:

${FENCE}bash
bugsnag-cli --json project-pivots --project <p> --summary-size 10
bugsnag-cli --json project-pivot-values app.release_stage --project <p>
bugsnag-cli --json project-trend --project <p> --buckets-count 30
bugsnag-cli --json project-stability --project <p>
bugsnag-cli --json saved-search-list --project <p>
bugsnag-cli --json saved-search-show <savedSearchId>
${FENCE}

Releases:

${FENCE}bash
bugsnag-cli --json release-list --project <p>
bugsnag-cli --json release-show <releaseId> --project <p>
bugsnag-cli --json release-group-list --project <p> --release-stage-name production
bugsnag-cli --json release-group-show <releaseGroupId>
${FENCE}

Performance:

${FENCE}bash
bugsnag-cli --json span-group-list --project <p> --sort duration_p95 --filter span.since=7d
bugsnag-cli --json span-group-summaries --project <p>
bugsnag-cli --json span-group-show <spanGroupId> --project <p>
bugsnag-cli --json span-group-timeline <spanGroupId> --project <p>
bugsnag-cli --json span-group-distribution <spanGroupId> --project <p>
bugsnag-cli --json span-group-performance-targets <spanGroupId> --project <p>
bugsnag-cli --json span-group-spans <spanGroupId> --project <p>
bugsnag-cli --json span-group-spans-by-name <category> <name> --project <p>
bugsnag-cli --json starred-span-group-list --project <p>
bugsnag-cli --json page-load-span-group-list --project <p>
bugsnag-cli --json page-load-span-group-show <pageLoadSpanGroupId> --project <p>
bugsnag-cli --json trace-fields --project <p>
bugsnag-cli --json trace-spans <traceId> --project <p> --from <ISO> --to <ISO>
bugsnag-cli --json org-trace-spans <traceId> --organization <org> --from <ISO> --to <ISO>
bugsnag-cli --json performance-overview --project <p>
bugsnag-cli --json network-grouping-show --project <p>
${FENCE}

Triage writes (require ${BT}--write${BT}):

${FENCE}bash
bugsnag-cli error-update <errorId> --project <p> --write --operation fix
bugsnag-cli error-update <errorId> --project <p> --write --operation assign --assigned-collaborator-id <id>
bugsnag-cli error-update <errorId> --project <p> --write --operation snooze --reopen-if occurs_after --seconds 3600
bugsnag-cli error-bulk-update --project <p> --write --error-ids id1,id2 --operation ignore
${FENCE}

## Standard Workflows

1. Project error overview: ${BT}error-list --project <p> --sort events --filter error.status=open --filter event.since=1d${BT}.
2. Single error deep dive: ${BT}error-latest-event <errorId>${BT} -> ${BT}error-events <errorId> --limit 5${BT} -> ${BT}error-pivots <errorId> --summary-size 5${BT} -> ${BT}error-trend <errorId>${BT}.
3. Project health: ${BT}project-trend${BT} + ${BT}project-stability${BT} + ${BT}project-pivots${BT}.
4. Release regression: ${BT}release-list --project <p>${BT} -> ${BT}release-group-list --project <p> --release-stage-name production${BT} -> compare error trends around the release.
5. Performance triage: ${BT}trace-fields${BT} -> ${BT}span-group-list --sort duration_p95 --filter span.since=7d${BT} -> ${BT}span-group-show${BT} -> ${BT}span-group-spans${BT} or ${BT}trace-spans${BT}.
6. Triage: ${BT}error-show${BT} to confirm the error, then ${BT}error-update --write${BT} and verify the returned status.

## Output Modes

Always pass ${BT}--json${BT} when consuming output programmatically:

${FENCE}bash
bugsnag-cli --json error-list --project <p> | jq '.[] | {id, status, events}'
${FENCE}

Without ${BT}--json${BT}, output is human-readable tables (arrays) or formatted JSON
(objects), with long strings truncated for readability. ${BT}--raw${BT} skips all
formatting. In ${BT}--json${BT} mode, errors are ${BT}{ "isError": true, "error": "..." }${BT}.

## Pagination: Link and Offset

- Event, error, pivot-value, release, and release-group lists use ${BT}Link: rel="next"${BT}.
- Span groups, page loads, and comments use ${BT}offset${BT} + ${BT}per_page${BT}.
- Starred span groups use ${BT}page_token${BT}/Link pagination in the live API.
- Both modes respect ${BT}--limit${BT} (default 100). There is no ${BT}--all${BT}; traversal is bounded by design.
- ${BT}release-list${BT} caps ${BT}--per-page${BT} at 10.
- Offset traversal assumes a short page means the end; an endpoint that silently truncates ${BT}per_page${BT} can stop early.

## Filters

${BT}--filter${BT} is repeatable and supports:

- ${BT}k=v${BT} (eq), ${BT}k=v1,v2${BT} (one eq per value)
- ${BT}k!=v${BT} (ne)
- ${BT}k:empty=true|false${BT} (emptiness)

They serialize to ${BT}filters[FIELD][][type]=...${BT} and ${BT}filters[FIELD][][value]=...${BT}.
Performance endpoints use the same event-style filters; do not send a
PerformanceFilter[] object.

Discover event fields with ${BT}event-fields --project <p>${BT} and trace fields with
${BT}trace-fields --project <p>${BT}.

## Anti-patterns

- Always use ${BT}--json${BT} when consuming output programmatically.
- Do not attempt delete, issue linking, or comment writes; they are not exposed.
- Mutating commands require ${BT}--write${BT}; without it they fail by design.
- ${BT}error-latest-event${BT} needs no ${BT}--project${BT}; every other project-scoped command does.
- List commands stop at ${BT}--limit${BT} (default 100); there is no unbounded ${BT}--all${BT}.
- 429 rate limits and the 60000 sorted-limit downgrade are handled automatically.
- The live API uses singular ${BT}/trend${BT}; the plural ${BT}/trends${BT} path returns 404.
`;
}

export function buildPitfallsMd(): string {
  return `# bugsnag-cli Pitfalls & Boundaries

## Default Read-Only + Explicit Writes

- The CLI is read-only by default. Only ${BT}error-update${BT} and ${BT}error-bulk-update${BT}
  mutate BugSnag state, and both require ${BT}--write${BT}.
- Without ${BT}--write${BT} the CLI exits 1 with a clear error.
- Delete, create/link/unlink issue, and comment writes are not supported; use
  the BugSnag dashboard.
- ${BT}discard${BT} is not delete: it stops future events and can be reversed with
  ${BT}undiscard${BT}.

## Auth & Config

- Config file: ${BT}~/.bugsnagrc${BT} (JSON). Use ${BT}config-path${BT} to confirm.
- Auth is a Personal Auth Token sent as ${BT}Authorization: token <token>${BT}.
- Priority: CLI flags > env vars (${BT}BUGSNAG_AUTH_TOKEN${BT}, ${BT}BUGSNAG_BASE_URL${BT},
  ${BT}BUGSNAG_ORGANIZATION${BT}, ${BT}BUGSNAG_PROJECT${BT}, ${BT}BUGSNAG_PROFILE${BT}) > config file.
- ${BT}config-show${BT} masks secrets (first 4 + last 2 chars).

## Pagination: Link and Offset

- Link-paginated: errors, events, error pivots, pivot values, releases, release groups.
- Offset-paginated: span groups, span group summaries, page load span groups,
  comments. Starred span groups use page_token/Link pagination.
- Every list command supports ${BT}--limit${BT} (default 100). Offset commands also
  support ${BT}--offset${BT}. There is no ${BT}--all${BT} and no unbounded traversal.
- ${BT}release-list${BT} caps ${BT}--per-page${BT} at 10.

## Sorted Results Limit (API error code 60000)

- Sorted endpoints cap how many sorted results they can return. On
  ${BT}{ errors: [...], code: 60000 }${BT}, bugsnag-cli retries once with ${BT}sort=unsorted${BT}.
- After a downgrade, ordering may change; narrow the window with filters.

## Filter Syntax (strictly)

- ${BT}--filter${BT} is repeatable. Only ${BT}k=v${BT}, ${BT}k=v1,v2${BT}, ${BT}k!=v${BT}, and
  ${BT}k:empty=true|false${BT} are supported.
- Serialized as ${BT}filters[FIELD][][type]=...${BT} and ${BT}filters[FIELD][][value]=...${BT}.
- Array query params use bracketed keys: ${BT}--pivots${BT} sends ${BT}pivots[]${BT};
  ${BT}--categories${BT} sends ${BT}categories[]${BT}.
- Performance endpoints accept the same event-style filters. The
  ${BT}PerformanceFilter[]${BT} shape returns HTTP 400; do not use it.
- Time filters such as ${BT}span.since${BT} and ${BT}event.since${BT} accept ISO 8601 UTC or
  relative values like ${BT}7d${BT}; ${BT}ne${BT} is not supported on time filters.

## Path Encoding

- Path IDs preserve existing ${BT}%XX${BT} escapes and encode raw characters once.
- A literal ${BT}%XX${BT} sequence in an ID is indistinguishable from an escape and is
  passed through; this is a documented heuristic.

## Span Pagination

- ${BT}span-group-spans${BT} and ${BT}span-group-spans-by-name${BT} pagination semantics are
  unverified without span data; prefer ${BT}span-group-spans${BT} by ID when possible.

## Trend Path Drift

- The live API accepts singular ${BT}/trend${BT} for error and project trends.
- The plural ${BT}/trends${BT} path listed in the OpenAPI document returns HTTP 404.
- ${BT}error-trend${BT} and ${BT}project-trend${BT} use the singular path.

## Performance Plan Limits

- ${BT}performance-overview${BT} returns HTTP 403 when the organization lacks the
  ${BT}performance-scores${BT} plan feature.
- ${BT}span-group-list${BT} may return an empty array even when healthy; verify the
  project has performance data before concluding there are no spans.

## latest_event Needs No Project

- ${BT}error-latest-event <errorId>${BT} calls ${BT}GET /errors/{error_id}/latest_event${BT};
  the path has no project id, so ${BT}--project${BT} is not accepted or needed.
- All other error-scoped commands require ${BT}--project${BT} or a default project.

## Counts Reflect Filters

- With filters applied, ${BT}error-list${BT} ${BT}events${BT} / ${BT}users${BT} counts are filtered counts,
  not lifetime totals (${BT}unthrottled_occurrence_count${BT} is untouched).
- Some endpoints cap ${BT}per_page${BT} below 100 (events use max 30); the CLI sends
  per_page automatically and the API clamps it.

## JSON Output Mode

- Pass ${BT}--json${BT} BEFORE the command name: ${BT}bugsnag-cli --json error-list${BT}.
- In JSON mode, errors are ${BT}{ "isError": true, "error": "message" }${BT} and the
  process exits with code 1. Check ${BT}isError${BT} before parsing results.
- Shape downstream with jq: ${BT}bugsnag-cli --json error-list | jq ...${BT}.
`;
}
