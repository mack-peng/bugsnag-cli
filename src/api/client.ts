import type { AuthProvider } from './auth';

export interface FilterParam {
  key: string;
  value: string;
}

export interface RequestOptions {
  queryParams?: Record<string, any>;
  filterParams?: FilterParam[];
  body?: any;
  timeout?: number;
}

export interface ListOptions {
  queryParams?: Record<string, any>;
  filterParams?: FilterParam[];
  limit?: number;
  timeout?: number;
  pagination?: 'link' | 'offset';
  offset?: number;
}

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_LIMIT = 100;

const SORTED_RESULTS_CODE = 60000;

export class BugsnagClient {
  private baseUrl: string;
  private auth: AuthProvider;
  private defaultTimeout: number;
  private lastLink: string | null = null;
  private lastTotalCountValue: number | null = null;

  constructor(baseUrl: string, auth: AuthProvider, defaultTimeout = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.auth = auth;
    this.defaultTimeout = defaultTimeout;
  }

  get lastLinkHeader(): string | null {
    return this.lastLink;
  }

  get lastTotalCount(): number | null {
    return this.lastTotalCountValue;
  }

  async request(method: string, path: string, options: RequestOptions = {}): Promise<any> {
    const query = buildQueryString(options.queryParams, options.filterParams);
    const url = this.baseUrl + path + query;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.auth.getHeaders(),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || this.defaultTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      this.lastLink = response.headers.get('link');
      this.lastTotalCountValue = parseTotalCount(response.headers.get('X-Total-Count'));

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        await sleep(retryAfter * 1000);
        return this.request(method, path, options);
      }

      if (response.status === 204)
        return null;

      const json: any = await response.json().catch(() => ({}));

      if (sortedResultsLimited(json) && canDowngradeToUnsorted(options)) {
        const downgraded: RequestOptions = {
          ...options,
          queryParams: { ...options.queryParams, sort: 'unsorted' },
        };
        return this.request(method, path, downgraded);
      }

      if (!response.ok)
        throw new Error(errorMessage(json, response.status));

      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  async list(method: string, path: string, options: ListOptions = {}): Promise<any[]> {
    const results: any[] = [];
    const limit = options.limit ?? DEFAULT_LIMIT;

    if (options.pagination === 'offset') {
      const perPage = Number(options.queryParams?.per_page ?? 30);
      let offset = options.offset ?? 0;
      while (results.length < limit) {
        const page = await this.request(method, path, {
          ...options,
          queryParams: { ...options.queryParams, offset, per_page: perPage },
        });
        const rows = Array.isArray(page) ? page : extractPageRows(page);
        if (!rows.length)
          break;
        results.push(...rows.slice(0, limit - results.length));
        if (rows.length < perPage || results.length >= limit)
          break;
        offset += rows.length;
      }
      return results;
    }

    let nextPath: string | null = null;
    do {
      const page = nextPath
        ? await this.request(method, nextPath)
        : await this.request(method, path, options);

      const rows = Array.isArray(page) ? page : extractPageRows(page);
      const remaining = limit - results.length;
      if (remaining > 0 && rows.length > 0)
        results.push(...rows.slice(0, remaining));

      nextPath = nextLinkPath(this.lastLink, this.baseUrl);
    } while (nextPath && results.length < limit);

    return results;
  }
}

export function nextLinkPath(link: string | null, baseUrl: string): string | null {
  const nextUrl = parseNextLinkUrl(link);
  if (!nextUrl)
    return null;
  if (nextUrl.startsWith(baseUrl))
    return nextUrl.slice(baseUrl.length) || '/';
  try {
    const parsed = new URL(nextUrl);
    return parsed.pathname + parsed.search;
  } catch {
    return nextUrl;
  }
}

export function parseNextLinkUrl(link: string | null): string | null {
  if (!link)
    return null;
  for (const segment of link.split(',')) {
    if (!(/rel="?next"?/).test(segment))
      continue;
    const match = segment.match(/<([^>]+)>/);
    if (match)
      return match[1];
  }
  return null;
}

export function parseTotalCount(value: string | null): number | null {
  if (value === null)
    return null;
  const count = Number(value);
  return Number.isNaN(count) ? null : count;
}

export function buildQueryString(
  params?: Record<string, any>,
  pairs?: FilterParam[]
): string {
  const parts: string[] = [];
  const push = (key: string, value: any) =>
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (isBlank(value))
        continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          if (!isBlank(v))
            push(key, v);
        }
      } else {
        push(key, value);
      }
    }
  }
  if (pairs) {
    for (const pair of pairs) {
      if (pair.value === undefined || pair.value === null || pair.value === '')
        continue;
      push(pair.key, pair.value);
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

function extractPageRows(response: any): any[] {
  if (!response || typeof response !== 'object')
    return [];
  const key = Object.keys(response).find((k) => Array.isArray(response[k]));
  return key ? response[key] : [response];
}

function sortedResultsLimited(json: any): boolean {
  return !!json && typeof json === 'object' && json.code === SORTED_RESULTS_CODE;
}

function canDowngradeToUnsorted(options: RequestOptions): boolean {
  const sort = options.queryParams ? options.queryParams.sort : undefined;
  return typeof sort === 'string' && sort !== 'unsorted';
}

function errorMessage(json: any, status: number): string {
  if (typeof json === 'string' && json)
    return json;
  if (json && typeof json === 'object') {
    if (Array.isArray(json.errors) && json.errors.length)
      return json.errors.join(', ');
    if (typeof json.detail === 'string')
      return json.detail;
    if (typeof json.message === 'string')
      return json.message;
    if (typeof json.error === 'object' && json.error !== null)
      return json.error.title || json.error.message || JSON.stringify(json.error);
    if (typeof json.error === 'string' && json.error)
      return json.error;
    if (typeof json.description === 'string')
      return json.description;
  }
  return `HTTP ${status}`;
}

function isBlank(value: any): boolean {
  return value === undefined || value === null || value === '';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
