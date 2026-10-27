import * as z from 'zod';
import { declareCommand } from './command';
import type { AnyCommandSchema } from './command';

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
    sort: projectSortArg.optional().describe('sort field (default created_at)'),
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
    sort: errorSortArg.optional().describe('sort field (default last_seen; unsorted for complete results)'),
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
    sort: timestampSortArg.optional().describe('sort field (timestamp only)'),
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

const commandsArray: AnyCommandSchema[] = [
  orgList,
  projectList, projectShow,
  errorList, errorShow,
  errorEvents, errorLatestEvent, eventShow, eventFields,
  errorPivots, errorPivotValues, errorTrend,
  configShow, configSet, configPath, configList, configUse, configNew,
  skillInstall, skillUninstall,
];

export const commands = Object.fromEntries(commandsArray.map(cmd => [cmd.name, cmd]));
