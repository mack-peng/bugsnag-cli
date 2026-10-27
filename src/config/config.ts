import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { MinimistArgs } from '../cli/minimist';

export interface ProfileConfig {
  'auth-token': string;
  'base-url': string;
  organization?: string;
  project?: string;
}

interface RcFile {
  active: string;
  profiles: Record<string, ProfileConfig>;
}

export interface Config {
  'auth-token': string;
  'base-url': string;
  organization?: string;
  project?: string;
  output: 'text' | 'json';
  raw: boolean;
}

export const DEFAULT_BASE_URL = 'https://api.bugsnag.com';

export const rcFilePath = path.join(os.homedir(), '.bugsnagrc');

let cachedRc: { rc: RcFile; mtime: number } | null = null;

function readRcFile(): RcFile {
  try {
    const stat = fs.statSync(rcFilePath);
    if (cachedRc && cachedRc.mtime === stat.mtimeMs)
      return cachedRc.rc;
    const content = fs.readFileSync(rcFilePath, 'utf-8');
    const rc = JSON.parse(content);
    cachedRc = { rc, mtime: stat.mtimeMs };
    return rc;
  } catch {
    return { active: 'default', profiles: {} };
  }
}

function writeRcFile(rc: RcFile): void {
  fs.writeFileSync(rcFilePath, JSON.stringify(rc, null, 2) + '\n');
  cachedRc = null;
}

function resolveProfileName(args: MinimistArgs): string {
  const fromArgs = (args.p as string) || (args.profile as string);
  const fromEnv = process.env.BUGSNAG_PROFILE;
  if (fromArgs)
    return fromArgs;
  if (fromEnv)
    return fromEnv;
  return readRcFile().active;
}

function resolveProfile(args: MinimistArgs): ProfileConfig {
  const name = resolveProfileName(args);
  const rc = readRcFile();
  const profile = rc.profiles[name];
  if (!profile)
    throw new Error(`Profile '${name}' not found. Run: bugsnag-cli config-new ${name}`);
  return profile;
}

export function loadConfig(args: MinimistArgs): Config {
  const profile = resolveProfile(args);
  const profileTyped = profile as unknown as Record<string, string>;

  const authToken = (args['auth-token'] as string) || process.env.BUGSNAG_AUTH_TOKEN
    || profileTyped['auth-token'] || profileTyped.authToken || profileTyped['auth_token'];
  const baseUrl = (args['base-url'] as string) || process.env.BUGSNAG_BASE_URL
    || profileTyped['base-url'] || profileTyped.baseUrl || DEFAULT_BASE_URL;
  const organization = (args.organization as string) || process.env.BUGSNAG_ORGANIZATION
    || profileTyped.organization;
  const project = (args.project as string) || process.env.BUGSNAG_PROJECT
    || profileTyped.project;

  if (!authToken)
    throw new Error(
      'Missing required config. Set BUGSNAG_AUTH_TOKEN env var, or use --auth-token flag, or run: bugsnag-cli config-set auth-token <value>'
    );

  return {
    'auth-token': authToken as string,
    'base-url': baseUrl as string,
    organization,
    project,
    output: args.json ? 'json' : 'text',
    raw: !!args.raw,
  };
}

export function maskConfig(config: Config): Record<string, string> {
  return {
    'base-url': config['base-url'],
    organization: config.organization || '(not set)',
    project: config.project || '(not set)',
    'auth-token': config['auth-token'] ? config['auth-token'].slice(0, 4) + '***' + config['auth-token'].slice(-2) : '(not set)',
    output: config.output,
  };
}

export function writeRcConfig(key: string, value: string, profileName?: string): Record<string, string> {
  const rc = readRcFile();
  const name = profileName || rc.active;
  if (!rc.profiles[name])
    rc.profiles[name] = { 'auth-token': '', 'base-url': DEFAULT_BASE_URL };
  const p = rc.profiles[name];
  (p as unknown as Record<string, string>)[key] = value;
  writeRcFile(rc);
  return { profile: name, [key]: key === 'auth-token' ? '****' : value };
}

export function getRcConfig(): { active: string; profiles: Record<string, ProfileConfig> } {
  const rc = readRcFile();
  return { active: rc.active, profiles: rc.profiles };
}

export function setActiveProfile(name: string): void {
  const rc = readRcFile();
  if (!rc.profiles[name])
    throw new Error(`Profile '${name}' not found`);
  rc.active = name;
  writeRcFile(rc);
}

export function createProfile(name: string): void {
  const rc = readRcFile();
  if (rc.profiles[name])
    throw new Error(`Profile '${name}' already exists`);
  rc.profiles[name] = { 'auth-token': '', 'base-url': DEFAULT_BASE_URL };
  writeRcFile(rc);
}
