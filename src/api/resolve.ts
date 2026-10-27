import type { BugsnagClient } from './client';

const HEX24 = /^[0-9a-f]{24}$/;
const RESOLUTION_LIMIT = 1000;

const orgCache = new Map<string, string>();
const projectCache = new Map<string, string>();

export function isHex24(value: string): boolean {
  return HEX24.test(value);
}

export async function resolveOrg(client: BugsnagClient, nameOrId: string): Promise<string> {
  if (isHex24(nameOrId))
    return nameOrId;
  const cached = orgCache.get(nameOrId);
  if (cached)
    return cached;
  const organizations = await client.list('GET', '/user/organizations', {
    queryParams: { per_page: 100 },
    limit: RESOLUTION_LIMIT,
  });
  for (const org of organizations) {
    if (matchesIdentifier(org, nameOrId)) {
      orgCache.set(nameOrId, org.id);
      return org.id;
    }
  }
  throw new Error(`Organization '${nameOrId}' not found`);
}

export async function resolveProject(
  client: BugsnagClient,
  orgNameOrId: string | undefined,
  nameOrId: string
): Promise<string> {
  if (isHex24(nameOrId))
    return nameOrId;
  const cacheKey = `${orgNameOrId || ''}/${nameOrId}`;
  const cached = projectCache.get(cacheKey);
  if (cached)
    return cached;
  if (!orgNameOrId)
    throw new Error(
      `Organization is required to resolve project '${nameOrId}'. Set --organization or run: bugsnag-cli config-set organization <org>`
    );
  const orgId = await resolveOrg(client, orgNameOrId);
  const projects = await client.list('GET', `/organizations/${orgId}/projects`, {
    queryParams: { per_page: 100 },
    limit: RESOLUTION_LIMIT,
  });
  for (const project of projects) {
    if (matchesIdentifier(project, nameOrId)) {
      projectCache.set(cacheKey, project.id);
      return project.id;
    }
  }
  throw new Error(`Project '${nameOrId}' not found under organization '${orgNameOrId}'`);
}

function matchesIdentifier(resource: any, value: string): boolean {
  const key = value.toLowerCase();
  return resource.id === value
    || (typeof resource.name === 'string' && resource.name.toLowerCase() === key)
    || (typeof resource.slug === 'string' && resource.slug.toLowerCase() === key);
}
