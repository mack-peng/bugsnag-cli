import * as z from 'zod';
import { declareCommand } from './command';
import type { AnyCommandSchema } from './command';
import { encodePathSegment } from '../api/path';

const numberArg = z.preprocess((val, ctx) => {
  const number = Number(val);
  if (Number.isNaN(number)) {
    ctx.addIssue({ code: 'custom', message: `expected number, received '${val}'` });
  }
  return number;
}, z.number());

const stringArrayArg = z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v : [v]);

const configKeys = z.enum(['auth-token', 'base-url', 'organization', 'project']);

const configShow = declareCommand({
  name: 'config-show',
  category: 'config',
  description: 'Show current configuration',
  api: { method: 'GET', path: '' },
});

const configSet = declareCommand({
  name: 'config-set',
  category: 'config',
  description: 'Set a configuration value',
  args: z.object({
    key: configKeys.describe('Config key: auth-token, base-url, organization, project'),
    value: z.string().describe('Config value'),
  }),
  api: { method: 'GET', path: '' },
});

const configPath = declareCommand({
  name: 'config-path',
  category: 'config',
  description: 'Show configuration file path',
  api: { method: 'GET', path: '' },
});

const configList = declareCommand({
  name: 'config-list',
  category: 'config',
  description: 'List all profiles',
  api: { method: 'GET', path: '' },
});

const configUse = declareCommand({
  name: 'config-use',
  category: 'config',
  description: 'Switch active profile',
  args: z.object({
    name: z.string().describe('Profile name'),
  }),
  api: { method: 'GET', path: '' },
});

const configNew = declareCommand({
  name: 'config-new',
  category: 'config',
  description: 'Create a new profile',
  args: z.object({
    name: z.string().describe('Profile name'),
  }),
  api: { method: 'GET', path: '' },
});

const skillInstall = declareCommand({
  name: 'skill-install',
  category: 'config',
  description: 'Install Agent Skill for bugsnag-cli (teaches agents how to use the CLI)',
  options: z.object({
    target: z.string().optional().describe('agent target: auto, all, none, opencode, claude, codex, cursor, hermes, gemini (default: auto)'),
    local: z.boolean().optional().describe('install to current directory instead of home'),
    path: z.string().optional().describe('custom base directory (overrides home/current)'),
  }),
  api: { method: 'GET', path: '' },
});

const skillUninstall = declareCommand({
  name: 'skill-uninstall',
  category: 'config',
  description: 'Remove Agent Skill for bugsnag-cli',
  options: z.object({
    target: z.string().optional().describe('agent target: auto, all, none, opencode, claude, codex, cursor, hermes, gemini (default: auto)'),
    local: z.boolean().optional().describe('remove from current directory instead of home'),
    path: z.string().optional().describe('custom base directory'),
  }),
  api: { method: 'GET', path: '' },
});

const orgList = declareCommand({
  name: 'org-list',
  category: 'organizations',
  description: "List the current user's organizations",
  options: z.object({
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  api: { method: 'GET', path: '/user/organizations' },
  list: true,
});


const projectSortArg = z.enum(['created_at', 'name', 'favorite']);

const projectList = declareCommand({
  name: 'project-list',
  category: 'projects',
  description: 'List all projects in an organization',
  options: z.object({
    organization: z.string().optional().describe('organization id or name (or default organization)'),
    q: z.string().optional().describe('search projects by name'),
    sort: projectSortArg.optional().describe("sort field: created_at|name|favorite (default created_at)"),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc; favorite sorts asc)'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  organization: 'id',
  api: {
    method: 'GET',
    path: ({ organizationId }) => {
      if (!organizationId) throw new Error('--organization or default organization required');
      return `/organizations/${organizationId}/projects`;
    },
  },
  list: true,
});

const projectShow = declareCommand({
  name: 'project-show',
  category: 'projects',
  description: 'Show a single project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}`;
    },
  },
});


const errorSortArg = z.enum(['last_seen', 'first_seen', 'users', 'events', 'unsorted']);

const errorList = declareCommand({
  name: 'error-list',
  category: 'errors',
  description: 'List the errors on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    sort: errorSortArg.optional().describe('sort field: last_seen|first_seen|users|events|unsorted (default last_seen; unsorted returns complete results)'),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc)'),
    base: z.string().optional().describe('only events occurring before this time (ISO8601 UTC or relative like 7d)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors`;
    },
  },
  transformRequest: ({ sort, direction }) => ({
    sort: sort ?? 'last_seen',
    direction: direction ?? 'desc',
  }),
  list: true,
});

const errorShow = declareCommand({
  name: 'error-show',
  category: 'errors',
  description: 'Show a single error',
  args: z.object({ errorId: z.string().describe('Error ID') }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, errorId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors/${errorId}`;
    },
  },
});


const timestampSortArg = z.enum(['timestamp']);

const errorEvents = declareCommand({
  name: 'error-events',
  category: 'events',
  description: 'List the events on an error',
  args: z.object({ errorId: z.string().describe('Error ID') }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    'full-reports': z.boolean().default(true).describe('fetch full event reports (default true)'),
    sort: timestampSortArg.optional().describe('sort field: timestamp (fixed enum)'),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc)'),
    base: z.string().optional().describe('only events occurring before this time (ISO8601 UTC or relative like 7d)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, errorId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors/${errorId}/events`;
    },
  },
  transformRequest: ({ 'full-reports': fullReports }) => ({
    full_reports: fullReports ?? true,
  }),
  list: true,
});

const errorLatestEvent = declareCommand({
  name: 'error-latest-event',
  category: 'events',
  description: 'View the latest event on an error (no project needed)',
  args: z.object({ errorId: z.string().describe('Error ID') }),
  api: { method: 'GET', path: ({ errorId }) => `/errors/${errorId}/latest_event` },
});

const eventShow = declareCommand({
  name: 'event-show',
  category: 'events',
  description: 'Show a single event',
  args: z.object({ eventId: z.string().describe('Event ID') }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, eventId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/events/${eventId}`;
    },
  },
});

const eventFields = declareCommand({
  name: 'event-fields',
  category: 'events',
  description: 'List the event fields available for filters and pivots',
  options: z.object({
    'per-page': numberArg.optional().describe('results per page (default 100)'),
    limit: numberArg.optional().describe('maximum results to fetch (default 100)'),
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  list: true,
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/event_fields`;
    },
  },
});


const trendResolutionArg = z.enum(['1m', '5m', '30m', '2h', '12h']);

const errorPivots = declareCommand({
  name: 'error-pivots',
  category: 'analysis',
  description: 'List the pivots on an error',
  args: z.object({ errorId: z.string().describe('Error ID') }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    pivots: z.string().optional().describe('comma-separated event field display ids to select pivots (e.g. app.release_stage,user.id)'),
    'summary-size': numberArg.optional().describe('top values included in each pivot summary (default 10)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, errorId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors/${errorId}/pivots`;
    },
  },
  transformRequest: ({ pivots, 'summary-size': summarySize }) => ({
    ...(pivots ? { pivots: pivots.split(',').map(s => s.trim()).filter(Boolean) } : {}),
    ...(summarySize !== undefined ? { summary_size: summarySize } : {}),
  }),
  list: true,
});

const errorPivotValues = declareCommand({
  name: 'error-pivot-values',
  category: 'analysis',
  description: 'List the values of a pivot on an error',
  args: z.object({
    errorId: z.string().describe('Error ID'),
    fieldId: z.string().describe('Event field display id, e.g. app.release_stage'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    sort: z.enum(['unsorted']).optional().describe("set to 'unsorted' after a 60000 sorted-limit response"),
    base: z.string().optional().describe('only events occurring before this time'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, errorId, fieldId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors/${errorId}/pivots/${encodeURIComponent(fieldId)}/values`;
    },
  },
});

const errorTrend = declareCommand({
  name: 'error-trend',
  category: 'analysis',
  description: 'List the trend for an error (buckets-count or resolution mode)',
  args: z.object({ errorId: z.string().describe('Error ID') }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    'buckets-count': numberArg.optional().describe('number of trend buckets (default 30, max 50)'),
    resolution: trendResolutionArg.optional().describe('resolution mode: 1m, 5m, 30m, 2h, 12h (mutually exclusive with --buckets-count)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, errorId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors/${errorId}/trend`;
    },
  },
  transformRequest: ({ 'buckets-count': bucketsCount, resolution }) => {
    if (bucketsCount !== undefined && resolution)
      throw new Error('--buckets-count and --resolution are mutually exclusive');
    if (resolution)
      return { resolution };
    return { buckets_count: bucketsCount ?? 30 };
  },
});

const eventList = declareCommand({
  name: 'event-list',
  category: 'events',
  description: 'List the events on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    sort: z.enum(['timestamp']).optional().describe('sort field: timestamp (default timestamp)'),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc)'),
    base: z.string().optional().describe('only events occurring before this time (ISO8601 UTC or relative like 7d)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'full-reports': z.boolean().optional().describe('request full reports (default true)'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/events`;
    },
  },
  transformRequest: ({ 'full-reports': fullReports }) => ({
    full_reports: fullReports ?? true,
  }),
});

const projectPivots = declareCommand({
  name: 'project-pivots',
  category: 'analysis',
  description: 'List the pivots on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    pivots: z.string().optional().describe('comma-separated event field display ids to select pivots (e.g. app.release_stage,user.id)'),
    'summary-size': numberArg.optional().describe('top values included in each pivot summary (default 10)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/pivots`;
    },
  },
  transformRequest: ({ pivots, 'summary-size': summarySize }) => ({
    ...(pivots ? { pivots: pivots.split(',').map((s: string) => s.trim()).filter(Boolean) } : {}),
    ...(summarySize !== undefined ? { summary_size: summarySize } : {}),
  }),
});

const projectPivotValues = declareCommand({
  name: 'project-pivot-values',
  category: 'analysis',
  description: 'List the values of a pivot on a project',
  args: z.object({
    fieldId: z.string().describe('Event field display id, e.g. app.release_stage'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    sort: z.enum(['unsorted']).optional().describe("set to 'unsorted' after a 60000 sorted-limit response"),
    base: z.string().optional().describe('only events occurring before this time'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  api: {
    method: 'GET',
    path: ({ projectId, fieldId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/pivots/${encodePathSegment(fieldId)}/values`;
    },
  },
});

const projectTrend = declareCommand({
  name: 'project-trend',
  category: 'analysis',
  description: 'List the trend for a project (buckets-count or resolution mode)',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    'buckets-count': numberArg.optional().describe('number of trend buckets (default 30, max 50)'),
    resolution: z.enum(['1m', '5m', '30m', '2h', '12h']).optional().describe('resolution mode: 1m, 5m, 30m, 2h, 12h (mutually exclusive with --buckets-count)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/trend`;
    },
  },
  transformRequest: ({ 'buckets-count': bucketsCount, resolution }) => {
    if (bucketsCount !== undefined && resolution)
      throw new Error('--buckets-count and --resolution are mutually exclusive');
    if (resolution)
      return { resolution };
    return { buckets_count: bucketsCount ?? 30 };
  },
});

const projectStability = declareCommand({
  name: 'project-stability',
  category: 'analysis',
  description: 'Show the stability trend for a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/stability_trend`;
    },
  },
});

const savedSearchList = declareCommand({
  name: 'saved-search-list',
  category: 'analysis',
  description: 'List saved searches on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    shared: z.enum(['true', 'false']).optional().describe('limit results to shared or private saved searches'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/saved_searches`;
    },
  },
});

const savedSearchShow = declareCommand({
  name: 'saved-search-show',
  category: 'analysis',
  description: 'Show a saved search',
  args: z.object({
    savedSearchId: z.string().describe('Saved search ID'),
  }),
  api: {
    method: 'GET',
    path: ({ savedSearchId }) => `/saved_searches/${encodePathSegment(savedSearchId)}`,
  },
});

const releaseList = declareCommand({
  name: 'release-list',
  category: 'releases',
  description: 'List releases on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    'release-stage': z.string().optional().describe('release stage to filter by'),
    base: z.string().optional().describe('only releases before this time (ISO8601 UTC)'),
    sort: z.enum(['timestamp', 'percent_of_sessions']).optional().describe('sort field: timestamp|percent_of_sessions (default timestamp)'),
    offset: numberArg.optional().describe('pagination offset (default 0)'),
    'per-page': numberArg.optional().describe('results per page (default 10, max 10)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  perPage: { default: 10, max: 10 },
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/releases`;
    },
  },
  transformRequest: ({ 'release-stage': releaseStage }) => ({
    ...(releaseStage ? { release_stage: releaseStage } : {}),
  }),
});

const releaseShow = declareCommand({
  name: 'release-show',
  category: 'releases',
  description: 'Show a release',
  args: z.object({
    releaseId: z.string().describe('Release ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, releaseId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/releases/${encodePathSegment(releaseId)}`;
    },
  },
});

const releaseGroupList = declareCommand({
  name: 'release-group-list',
  category: 'releases',
  description: 'List release groups on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    'release-stage-name': z.string().describe('release stage name (required)'),
    'top-only': z.boolean().optional().describe('return only top release groups'),
    'visible-only': z.boolean().optional().describe('return only visible release groups'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/release_groups`;
    },
  },
  transformRequest: ({ 'release-stage-name': releaseStageName, 'top-only': topOnly, 'visible-only': visibleOnly }) => ({
    release_stage_name: releaseStageName,
    ...(topOnly !== undefined ? { top_only: topOnly } : {}),
    ...(visibleOnly !== undefined ? { visible_only: visibleOnly } : {}),
  }),
});

const releaseGroupShow = declareCommand({
  name: 'release-group-show',
  category: 'releases',
  description: 'Show a release group',
  args: z.object({
    releaseGroupId: z.string().describe('Release group ID'),
  }),
  api: {
    method: 'GET',
    path: ({ releaseGroupId }) => `/release_groups/${encodePathSegment(releaseGroupId)}`,
  },
});

const commentList = declareCommand({
  name: 'comment-list',
  category: 'comments',
  description: 'List comments on an error',
  args: z.object({
    errorId: z.string().describe('Error ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    sort: z.string().optional().describe('sort field (default created_at)'),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc)'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    offset: numberArg.optional().describe('pagination offset (default 0)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  pagination: 'offset',
  api: {
    method: 'GET',
    path: ({ projectId, errorId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors/${encodePathSegment(errorId)}/comments`;
    },
  },
  transformRequest: ({ sort, direction }) => ({
    sort: sort ?? 'created_at',
    direction: direction ?? 'desc',
  }),
});

const errorUpdateOperations = ['open', 'fix', 'ignore', 'snooze', 'discard', 'undiscard', 'assign', 'override_severity'] as const;
const errorUpdateOperationArg = z.enum(errorUpdateOperations);

const errorUpdateOptionShape = {
  project: z.string().optional().describe('project id or name (or default project)'),
  operation: errorUpdateOperationArg.describe('update operation: open|fix|ignore|snooze|discard|undiscard|assign|override_severity'),
  severity: z.enum(['info', 'warning', 'error']).optional().describe('new severity (required with override_severity)'),
  'assigned-collaborator-id': z.string().optional().describe('collaborator ID to assign (assign only)'),
  'assigned-team-id': z.string().optional().describe('team ID to assign (assign only)'),
  unassign: z.boolean().optional().describe('clear the current assignment (assign only)'),
  'reopen-if': z.enum(['occurs_after', 'n_occurrences_in_m_hours', 'n_additional_occurrences', 'n_additional_users']).optional().describe('snooze reopen rule (required with snooze)'),
  seconds: numberArg.optional().describe('seconds before reopening (occurs_after)'),
  occurrences: numberArg.optional().describe('occurrences threshold (n_occurrences_in_m_hours)'),
  hours: numberArg.optional().describe('hours window (n_occurrences_in_m_hours)'),
  'additional-occurrences': numberArg.optional().describe('additional occurrences allowed (n_additional_occurrences)'),
  'additional-users': numberArg.optional().describe('additional users affected (n_additional_users)'),
};

function buildErrorUpdateBody(parsed: Record<string, any>): Record<string, any> {
  const operation = parsed.operation;
  const body: Record<string, any> = { operation };

  if (operation === 'override_severity') {
    if (!parsed.severity)
      throw new Error('--severity is required for override_severity');
    body.severity = parsed.severity;
  }

  if (operation === 'assign') {
    const collaboratorId = parsed['assigned-collaborator-id'];
    const teamId = parsed['assigned-team-id'];
    if (collaboratorId && teamId)
      throw new Error('--assigned-collaborator-id and --assigned-team-id are mutually exclusive');
    if (!collaboratorId && !teamId && !parsed.unassign)
      throw new Error('assign requires --assigned-collaborator-id, --assigned-team-id, or --unassign');
    if (parsed.unassign)
      body.assigned_collaborator_id = '';
    else if (collaboratorId)
      body.assigned_collaborator_id = collaboratorId;
    else
      body.assigned_team_id = teamId;
  }

  if (operation === 'snooze') {
    const reopenIf = parsed['reopen-if'];
    if (!reopenIf)
      throw new Error('--reopen-if is required for snooze');
    const rules: Record<string, any> = { reopen_if: reopenIf };
    if (reopenIf === 'occurs_after') {
      if (parsed.seconds === undefined)
        throw new Error('--seconds is required for occurs_after');
      rules.seconds = parsed.seconds;
    } else if (reopenIf === 'n_occurrences_in_m_hours') {
      if (parsed.occurrences === undefined || parsed.hours === undefined)
        throw new Error('--occurrences and --hours are required for n_occurrences_in_m_hours');
      rules.occurrences = parsed.occurrences;
      rules.hours = parsed.hours;
    } else if (reopenIf === 'n_additional_occurrences') {
      if (parsed['additional-occurrences'] === undefined)
        throw new Error('--additional-occurrences is required for n_additional_occurrences');
      rules.additional_occurrences = parsed['additional-occurrences'];
    } else if (reopenIf === 'n_additional_users') {
      if (parsed['additional-users'] === undefined)
        throw new Error('--additional-users is required for n_additional_users');
      rules.additional_users = parsed['additional-users'];
    }
    body.reopen_rules = rules;
  }

  return body;
}

const errorUpdate = declareCommand({
  name: 'error-update',
  category: 'errors',
  description: 'Update an error (requires --write)',
  args: z.object({
    errorId: z.string().describe('Error ID'),
  }),
  options: z.object(errorUpdateOptionShape),
  mutating: true,
  project: 'id',
  api: {
    method: 'PATCH',
    path: ({ projectId, errorId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/errors/${encodePathSegment(errorId)}`;
    },
  },
  transformRequest: buildErrorUpdateBody,
});

const errorBulkUpdate = declareCommand({
  name: 'error-bulk-update',
  category: 'errors',
  description: 'Update multiple errors (requires --write)',
  options: z.object({
    ...errorUpdateOptionShape,
    'error-ids': z.string().describe('comma-separated error IDs (required)'),
  }),
  mutating: true,
  project: 'id',
  api: {
    method: 'PATCH',
    path: ({ projectId, 'error-ids': errorIds }) => {
      if (!projectId) throw new Error('--project or default project required');
      const ids = String(errorIds).split(',').map(s => s.trim()).filter(Boolean);
      if (!ids.length) throw new Error('--error-ids requires at least one ID');
      return `/projects/${projectId}/errors?${ids.map(id => `error_ids=${encodeURIComponent(id)}`).join('&')}`;
    },
  },
  transformRequest: buildErrorUpdateBody,
});

const spanGroupList = declareCommand({
  name: 'span-group-list',
  category: 'performance',
  description: 'List span groups on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    sort: z.string().optional().describe('sort field (e.g. total_spans, duration_p95, last_seen)'),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc)'),
    'starred-only': z.boolean().optional().describe('return only starred span groups'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    offset: numberArg.optional().describe('pagination offset (default 0)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  pagination: 'offset',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_groups`;
    },
  },
  transformRequest: ({ 'starred-only': starredOnly }) => ({
    ...(starredOnly !== undefined ? { starred_only: starredOnly } : {}),
  }),
});

const spanGroupSummaries = declareCommand({
  name: 'span-group-summaries',
  category: 'performance',
  description: 'List span group summaries on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    offset: numberArg.optional().describe('pagination offset (default 0)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  pagination: 'offset',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_group_summaries`;
    },
  },
});

const spanGroupShow = declareCommand({
  name: 'span-group-show',
  category: 'performance',
  description: 'Show a span group',
  args: z.object({
    spanGroupId: z.string().describe('Span group ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, spanGroupId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_groups/${encodePathSegment(spanGroupId)}`;
    },
  },
});

const spanGroupTimeline = declareCommand({
  name: 'span-group-timeline',
  category: 'performance',
  description: 'Show a span group timeline',
  args: z.object({
    spanGroupId: z.string().describe('Span group ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, spanGroupId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_groups/${encodePathSegment(spanGroupId)}/timeline`;
    },
  },
});

const spanGroupDistribution = declareCommand({
  name: 'span-group-distribution',
  category: 'performance',
  description: 'Show a span group distribution',
  args: z.object({
    spanGroupId: z.string().describe('Span group ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, spanGroupId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_groups/${encodePathSegment(spanGroupId)}/distribution`;
    },
  },
});

const spanGroupPerformanceTargets = declareCommand({
  name: 'span-group-performance-targets',
  category: 'performance',
  description: 'List performance targets for a span group',
  args: z.object({
    spanGroupId: z.string().describe('Span group ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, spanGroupId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_groups/${encodePathSegment(spanGroupId)}/performance_targets`;
    },
  },
});

const spanGroupSpans = declareCommand({
  name: 'span-group-spans',
  category: 'performance',
  description: 'List spans for a span group',
  args: z.object({
    spanGroupId: z.string().describe('Span group ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    sort: z.enum(['duration', 'timestamp', 'full_page_load_lcp', 'full_page_load_fid', 'full_page_load_cls', 'full_page_load_ttfb', 'full_page_load_fcp', 'rendering_slow_frame_percentage', 'rendering_frozen_frame_percentage']).optional().describe('sort field'),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc)'),
    'per-page': numberArg.optional().describe('results per page (default 20)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  perPage: { default: 20 },
  api: {
    method: 'GET',
    path: ({ projectId, spanGroupId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_groups/${encodePathSegment(spanGroupId)}/spans`;
    },
  },
});

const spanGroupSpansByName = declareCommand({
  name: 'span-group-spans-by-name',
  category: 'performance',
  description: 'List spans for a span group by category and name',
  args: z.object({
    category: z.enum(['app_start', 'view_load', 'network', 'page_load', 'route_change', 'full_page_load', 'navigation', 'custom']).describe('Span group category'),
    name: z.string().describe('Span group name'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, category, name }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/span_group_categories/${encodePathSegment(category)}/span_groups/${encodePathSegment(name)}/spans`;
    },
  },
});

const starredSpanGroupList = declareCommand({
  name: 'starred-span-group-list',
  category: 'performance',
  description: 'List starred span group descriptions',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    categories: z.string().optional().describe('comma-separated categories: app_start,view_load,network,page_load,route_change,full_page_load,navigation,custom'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    offset: numberArg.optional().describe('pagination offset (default 0)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  pagination: 'offset',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/starred_span_groups`;
    },
  },
  transformRequest: ({ categories }) => ({
    ...(categories ? { categories: categories.split(',').map((s: string) => s.trim()).filter(Boolean) } : {}),
  }),
});

const pageLoadSpanGroupList = declareCommand({
  name: 'page-load-span-group-list',
  category: 'performance',
  description: 'List page load span groups on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    sort: z.string().optional().describe('sort field (e.g. name, total_spans, lcp, cls)'),
    direction: z.enum(['asc', 'desc']).optional().describe('sort direction (default desc)'),
    'starred-only': z.boolean().optional().describe('return only starred page load span groups'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
    'per-page': numberArg.optional().describe('results per page (default 30)'),
    offset: numberArg.optional().describe('pagination offset (default 0)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  pagination: 'offset',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/page_load_span_groups`;
    },
  },
  transformRequest: ({ 'starred-only': starredOnly }) => ({
    ...(starredOnly !== undefined ? { starred_only: starredOnly } : {}),
  }),
});

const pageLoadSpanGroupShow = declareCommand({
  name: 'page-load-span-group-show',
  category: 'performance',
  description: 'Show a page load span group',
  args: z.object({
    pageLoadSpanGroupId: z.string().describe('Page load span group ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    filter: stringArrayArg.optional().describe('filter expression, repeatable: k=v, k!=v, k:empty=true|false'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId, pageLoadSpanGroupId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/page_load_span_groups/${encodePathSegment(pageLoadSpanGroupId)}`;
    },
  },
});

const traceFields = declareCommand({
  name: 'trace-fields',
  category: 'performance',
  description: 'List trace fields on a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/trace_fields`;
    },
  },
});

const traceSpans = declareCommand({
  name: 'trace-spans',
  category: 'performance',
  description: 'List spans for a trace on a project',
  args: z.object({
    traceId: z.string().describe('Trace ID'),
  }),
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    from: z.string().describe('beginning of window (ISO8601 UTC)'),
    to: z.string().describe('end of window (ISO8601 UTC)'),
    'target-span-id': z.string().optional().describe('span ID to focus on'),
    'per-page': numberArg.optional().describe('results per page (default 20)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  project: 'id',
  list: true,
  perPage: { default: 20 },
  api: {
    method: 'GET',
    path: ({ projectId, traceId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/traces/${encodePathSegment(traceId)}/spans`;
    },
  },
  transformRequest: ({ 'target-span-id': targetSpanId }) => ({
    ...(targetSpanId ? { target_span_id: targetSpanId } : {}),
  }),
});

const orgTraceSpans = declareCommand({
  name: 'org-trace-spans',
  category: 'performance',
  description: 'List spans for a trace in an organization',
  args: z.object({
    traceId: z.string().describe('Trace ID'),
  }),
  options: z.object({
    organization: z.string().optional().describe('organization id or name (or default organization)'),
    from: z.string().describe('beginning of window (ISO8601 UTC)'),
    to: z.string().describe('end of window (ISO8601 UTC)'),
    'target-span-id': z.string().optional().describe('span ID to focus on'),
    'per-page': numberArg.optional().describe('results per page (default 20)'),
    limit: numberArg.optional().describe('cumulative fetch limit (default 100)'),
  }),
  organization: 'id',
  list: true,
  perPage: { default: 20 },
  api: {
    method: 'GET',
    path: ({ organizationId, traceId }) => {
      if (!organizationId) throw new Error('--organization or default organization required');
      return `/organizations/${organizationId}/traces/${encodePathSegment(traceId)}/spans`;
    },
  },
  transformRequest: ({ 'target-span-id': targetSpanId }) => ({
    ...(targetSpanId ? { target_span_id: targetSpanId } : {}),
  }),
});

const performanceOverview = declareCommand({
  name: 'performance-overview',
  category: 'performance',
  description: 'Show the performance score overview for a project',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
    'release-stage-name': z.string().optional().describe('release stage name to filter by'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/performance_overview`;
    },
  },
  transformRequest: ({ 'release-stage-name': releaseStageName }) => ({
    ...(releaseStageName ? { release_stage_name: releaseStageName } : {}),
  }),
});

const networkGroupingShow = declareCommand({
  name: 'network-grouping-show',
  category: 'performance',
  description: 'Show the network endpoint grouping ruleset',
  options: z.object({
    project: z.string().optional().describe('project id or name (or default project)'),
  }),
  project: 'id',
  api: {
    method: 'GET',
    path: ({ projectId }) => {
      if (!projectId) throw new Error('--project or default project required');
      return `/projects/${projectId}/network_endpoint_grouping`;
    },
  },
});

const commandsArray: AnyCommandSchema[] = [
  orgList,
  projectList, projectShow,
  errorList, errorShow,
  errorEvents, errorLatestEvent, eventShow, eventFields,
  errorPivots, errorPivotValues, errorTrend,
  eventList, projectPivots, projectPivotValues, projectTrend, projectStability,
  savedSearchList, savedSearchShow,
  releaseList, releaseShow, releaseGroupList, releaseGroupShow,
  commentList, errorUpdate, errorBulkUpdate,
  spanGroupList, spanGroupSummaries, spanGroupShow, spanGroupTimeline, spanGroupDistribution,
  spanGroupPerformanceTargets, spanGroupSpans, spanGroupSpansByName,
  starredSpanGroupList, pageLoadSpanGroupList, pageLoadSpanGroupShow,
  traceFields, traceSpans, orgTraceSpans, performanceOverview, networkGroupingShow,
  configShow, configSet, configPath, configList, configUse, configNew,
  skillInstall, skillUninstall,
];

export const commands = Object.fromEntries(commandsArray.map(cmd => [cmd.name, cmd]));
