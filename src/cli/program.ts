import fs from 'fs';
import path from 'path';
import os from 'os';
import { minimist } from './minimist';
import { parseCommand } from './command';
import { commands } from './commands';
import { TextOutput, JsonOutput } from './output';
import { loadConfig, maskConfig, writeRcConfig, rcFilePath, getRcConfig, setActiveProfile, createProfile } from '../config/config';
import { createAuthProvider } from '../api/auth';
import { BugsnagClient } from '../api/client';
import { resolveOrg, resolveProject } from '../api/resolve';
import { serializeFilters } from '../api/filters';
import type { FilterParam } from '../api/client';
import { resolveTargetFlag } from '../installer';
import type { Location } from '../installer';
import type { Output } from './output';
import type { MinimistArgs } from './minimist';
import type { AnyCommandSchema, HelpData, HelpEntry } from './command';
import type { Config } from '../config/config';

const globalOptions = ['json', 'raw', 'help', 'h', 'version', 'v', 'p', 'profile', 'auth-token', 'base-url'];
const booleanGlobalOptions = ['help', 'json', 'raw', 'version', 'v', 'h'];
const queryExcludedFlags = ['filter', 'per-page', 'limit', 'project', 'organization', 'full-reports', 'summary-size', 'buckets-count', 'pivots'];
const listPerPageDefaults: Record<string, number> = { 'event-fields': 100 };

const textViewTransforms: Record<string, (data: any) => any> = {
  'org-list': orgListRows,
  'project-list': projectListRows,
  'error-list': errorListRows,
  'error-events': eventListRows,
  'event-show': eventDetailView,
};
function orgListRows(orgs: any[]): any[] {
  return orgs.map((org) => ({ id: org.id, name: org.name }));
}

function projectListRows(projects: any[]): any[] {
  return projects.map((project) => ({
    id: project.id,
    slug: project.slug,
    api_key: maskApiKey(project.api_key),
    type: project.type,
  }));
}

function errorListRows(errors: any[]): any[] {
  return errors.map((error) => ({
    id: error.id,
    crash_class: error.error_class,
    summary: truncateText(error.message, 60),
    first_seen: error.first_seen,
    last_seen: error.last_seen,
    events_count: error.events,
    users_count: error.users,
    status: error.status,
  }));
}

function eventListRows(events: any[]): any[] {
  return events.map((event) => {
    const exception = (event.exceptions && event.exceptions[0]) || {};
    const frame = (exception.stacktrace && exception.stacktrace[0]) || {};
    return {
      id: event.id,
      received_at: event.received_at,
      event_class: truncateText(exception.errorClass ?? exception.error_class, 50),
      message: truncateText(exception.message, 60),
      location: eventLocation(frame),
    };
  });
}

function eventDetailView(event: any): string {  const lines: string[] = [];
  for (const exception of event.exceptions || []) {
    const errorClass = exception.errorClass ?? exception.error_class;
    lines.push(`${errorClass ?? 'Exception'}${exception.message ? ': ' + exception.message : ''}`);
    for (const frame of exception.stacktrace || []) {
      const inProject = frame.inProject ?? frame.in_project;
      const file = frame.file ?? '?';
      const lineNumber = frame.lineNumber ?? frame.line_number;
      const method = frame.method;
      const prefix = inProject === false ? '[lib] ' : '';
      lines.push(`  ${prefix}${method ? method + ' ' : ''}${file}:${lineNumber ?? '?'}`);
    }
  }
  return lines.join('\n');
}

function eventLocation(frame: any): string {
  const file = frame.file ?? '';
  const lineNumber = frame.lineNumber ?? frame.line_number;
  const method = frame.method ?? '';
  const position = file ? `${file}:${lineNumber ?? '?'}` : '';
  if (file && method)
    return `${position} (${method})`;
  if (file)
    return position;
  return method;
}

function maskApiKey(value: any): string {
  if (typeof value !== 'string' || !value)
    return '';
  return value.slice(0, 4) + '***' + value.slice(-2);
}

function truncateText(value: any, max: number): string {
  if (value === undefined || value === null)
    return '';
  const text = String(value);
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function program() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));
  const help: HelpData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'help.json'), 'utf-8'));

  const rawArgs = parseArgs(help);
  if (rawArgs.p && !rawArgs.profile) { rawArgs.profile = rawArgs.p; delete rawArgs.p; }

  const output: Output = rawArgs.json
    ? new JsonOutput()
    : new TextOutput(!!rawArgs.raw);

  const commandName = rawArgs._[0];
  const cmdEntry = commandName ? help.commands[commandName] : undefined;
  const command: AnyCommandSchema | undefined = commands[commandName];

  handleGlobalFlags(rawArgs, commandName, cmdEntry, help, output, pkg.version);

  if (!cmdEntry || !command)
    output.error(`Unknown command: ${commandName}`);

  validateFlags(rawArgs, cmdEntry!);

  if (handleConfigCommands(commandName!, command!, rawArgs, output))
    return;

  if (handleSkillCommands(commandName!, command!, rawArgs, output))
    return;

  await executeApiCommand(command!, cmdEntry!, rawArgs, output);
}

function parseArgs(help: HelpData): MinimistArgs {
  return minimist(process.argv.slice(2), {
    boolean: [...help.booleanOptions, ...booleanGlobalOptions],
    string: ['_'],
  });
}

function handleGlobalFlags(
  args: MinimistArgs,
  commandName: string | undefined,
  cmdEntry: HelpEntry | undefined,
  help: HelpData,
  output: Output,
  version: string
): void {
  if (args.version || args.v) {
    output.version(version);
    process.exit(0);
  }

  if (args.help || args.h || !commandName) {
    output.help(cmdEntry ? cmdEntry.help : help.global);
    process.exit(0);
  }
}

function setupClient(args: MinimistArgs): { config: Config; client: BugsnagClient } {
  const config = loadConfig(args);
  const auth = createAuthProvider({ token: config['auth-token'] });
  const client = new BugsnagClient(config['base-url'], auth);
  return { config, client };
}

function handleConfigCommands(
  commandName: string,
  command: AnyCommandSchema,
  args: MinimistArgs,
  output: Output
): boolean {
  const cmdArgs = splitArgs(args);

  try {
    const parsed = parseCommand(command, cmdArgs as Record<string, string> & { _: string[] });

    switch (commandName) {
      case 'config-show': {
        const profileName = args.profile as string || undefined;
        if (profileName) {
          const rc = getRcConfig();
          const profile = rc.profiles[profileName];
          if (!profile)
            output.error(`Profile '${profileName}' not found`);
          const profileTyped = profile as unknown as Record<string, string>;
          console.log(output.format({
            active: rc.active,
            profile: profileName,
            'base-url': profileTyped['base-url'] || '(not set)',
            organization: profileTyped.organization || '(not set)',
            project: profileTyped.project || '(not set)',
            'auth-token': profileTyped['auth-token'] ? profileTyped['auth-token'].slice(0, 4) + '***' + profileTyped['auth-token'].slice(-2) : '(not set)',
          }));
          return true;
        }
        const { config } = setupClient(args);
        console.log(output.format(maskConfig(config)));
        return true;
      }
      case 'config-set': {
        const profileName = args.profile as string || undefined;
        const result = writeRcConfig(parsed.key, parsed.value, profileName);
        console.log(output.format(result));
        return true;
      }
      case 'config-path': {
        console.log(output.format(rcFilePath));
        return true;
      }
      case 'config-list': {
        const rc = getRcConfig();
        const profiles = Object.entries(rc.profiles).map(([name, p]) => ({
          name,
          active: name === rc.active,
          'base-url': (p as unknown as Record<string, string>)['base-url'] || '(not set)',
          organization: p.organization || '(not set)',
          project: p.project || '(not set)',
        }));
        console.log(output.format(profiles));
        return true;
      }
      case 'config-use': {
        setActiveProfile(parsed.name);
        console.log(output.format({ active: parsed.name }));
        return true;
      }
      case 'config-new': {
        createProfile(parsed.name);
        console.log(output.format({ created: parsed.name }));
        return true;
      }
    }
  } catch (e: any) {
    output.error(e instanceof Error ? e.message : String(e));
  }

  return false;
}

function handleSkillCommands(
  commandName: string,
  command: AnyCommandSchema,
  args: MinimistArgs,
  output: Output
): boolean {
  if (commandName !== 'skill-install' && commandName !== 'skill-uninstall') return false;

  const targetFlag = (args.target as string) || 'auto';
  const loc: Location = args.local ? 'local' : 'global';
  const baseDir = (args.path as string) || os.homedir();

  try {
    const targets = resolveTargetFlag(targetFlag, loc);
    if (targets.length === 0) {
      console.log(output.format({ installed: [], note: 'no targets selected (--target=none)' }));
      return true;
    }

    const files: Array<{ path: string; action: string; agent: string }> = [];

    for (const target of targets) {
      const result = commandName === 'skill-install'
        ? target.install(loc)
        : target.uninstall(loc);
      for (const f of result.files) {
        if (args.path) {
          const rel = f.path.replace(os.homedir(), '').replace(/^\//, '');
          f.path = path.join(baseDir, rel);
        }
        files.push({ ...f, agent: target.displayName });
      }
    }

    const summary = files.map(f => `${f.agent}: ${f.action} ${f.path}`);
    console.log(output.format({ files: summary }));
    return true;
  } catch (e: any) {
    output.error(e instanceof Error ? e.message : String(e));
  }

  return false;
}

async function executeApiCommand(
  command: AnyCommandSchema,
  cmdEntry: HelpEntry,
  args: MinimistArgs,
  output: Output
) {
  try {
    const { config, client } = setupClient(args);
    const cmdArgs = splitArgs(args);
    const parsed = parseCommand(command, cmdArgs as Record<string, string> & { _: string[] });

    await injectContext(command, parsed, config, client);

    const pathStr = typeof command.api.path === 'function'
      ? (command.api.path as (...a: any[]) => string)(parsed)
      : command.api.path;

    const result = await dispatchRequest(command, args, parsed, client, pathStr, cmdEntry);

    let finalResult = command.list
      ? result
      : (command.transformResponse ? command.transformResponse(result) : result);
    if (!output.json && !output.raw) {
      const textView = textViewTransforms[command.name];
      if (textView)
        finalResult = textView(finalResult);
    }
    console.log(output.format(finalResult));
  } catch (e: any) {
    output.error(e instanceof Error ? e.message : String(e));
  }
}

async function injectContext(
  command: AnyCommandSchema,
  parsed: Record<string, any>,
  config: Config,
  client: BugsnagClient
): Promise<void> {
  if (command.organization)
    parsed.organization = parsed.organization ?? config.organization;
  if (command.project === 'id')
    parsed.project = parsed.project ?? config.project;

  if (command.organization && parsed.organization)
    parsed.organizationId = await resolveOrg(client, parsed.organization);
  if (command.project === 'id' && parsed.project) {
    const orgRef = parsed.organization ?? config.organization;
    if (orgRef && !parsed.organizationId)
      parsed.organizationId = await resolveOrg(client, orgRef);
    parsed.projectId = await resolveProject(client, parsed.organizationId, parsed.project);
  }
}

async function dispatchRequest(
  command: AnyCommandSchema,
  args: MinimistArgs,
  parsed: Record<string, any>,
  client: BugsnagClient,
  pathStr: string,
  cmdEntry: HelpEntry
): Promise<any> {
  const queryFlags = extractQueryFlags(args, cmdEntry, queryExcludedFlags);
  const transformed = command.transformRequest ? command.transformRequest(parsed) : parsed;

  if (command.list) {
    const perPage = parsed['per-page'] !== undefined ? parsed['per-page'] : listPerPageDefaults[command.name] ?? 30;
    const limit = parsed.limit !== undefined ? parsed.limit : 100;
    const queryParams = { ...queryFlags, ...filterQueryParams(transformed), per_page: perPage };
    return client.list('GET', pathStr, { queryParams, filterParams: filterParamsFor(parsed), limit });
  }

  const method = command.api.method;
  const isBodyMethod = method !== 'GET' && method !== 'DELETE';
  const queryParams = isBodyMethod
    ? queryFlags
    : { ...queryFlags, ...filterQueryParams(transformed) };
  const apiOptions: Record<string, any> = { queryParams };
  if (isBodyMethod)
    apiOptions.body = transformed;
  else
    apiOptions.filterParams = filterParamsFor(parsed);
  return client.request(method, pathStr, apiOptions);
}

function filterParamsFor(parsed: Record<string, any>): FilterParam[] {
  const exprs = parsed.filter;
  if (!exprs)
    return [];
  return serializeFilters(exprs);
}

function splitArgs(args: MinimistArgs): MinimistArgs {
  const result: MinimistArgs = { _: args._ };
  for (const key of Object.keys(args)) {
    if (key === '_' || globalOptions.includes(key)) continue;
    result[key] = args[key];
  }
  return result;
}

function extractQueryFlags(args: MinimistArgs, cmdEntry: HelpEntry, excludeFromQuery: string[] = []): Record<string, any> {
  const params: Record<string, any> = {};
  const cmdFlags = Object.keys(cmdEntry.flags || {});
  for (const key of Object.keys(args)) {
    if (key === '_' || globalOptions.includes(key)) continue;
    if (excludeFromQuery.includes(key)) continue;
    if (cmdFlags.includes(key))
      params[key] = args[key];
  }
  return params;
}

function filterQueryParams(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && typeof value !== 'object')
      result[key] = value;
  }
  return result;
}

function validateFlags(args: MinimistArgs, cmdEntry: { flags: Record<string, 'boolean' | 'string'> }) {
  const unknownFlags: string[] = [];
  for (const key of Object.keys(args)) {
    if (key === '_') continue;
    if (globalOptions.includes(key)) continue;
    if (!(key in cmdEntry.flags))
      unknownFlags.push(key);
  }
  if (unknownFlags.length)
    throw new Error(`Unknown option${unknownFlags.length > 1 ? 's' : ''}: ${unknownFlags.map(f => `--${f}`).join(', ')}`);
}
