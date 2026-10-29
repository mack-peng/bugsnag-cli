import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { BugsnagClient, buildQueryString, parseNextLinkUrl, parseTotalCount, nextLinkPath } from '../src/api/client';
import type { FilterParam } from '../src/api/client';
import { createAuthProvider } from '../src/api/auth';

interface MockResponse {
  status: number;
  headers?: Record<string, string>;
  body?: any;
}

interface FetchCall {
  url: string;
  init: any;
}

const originalFetch = global.fetch;

function stubFetch(responses: MockResponse[]): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  global.fetch = (async (url: string, init: any) => {
    calls.push({ url, init });
    const response = responses[calls.length - 1];
    if (!response)
      throw new Error('mock exhausted responses');
    const body = response.status === 204
      ? null
      : (typeof response.body === 'string' ? response.body : JSON.stringify(response.body ?? {}));
    return new Response(body, {
      status: response.status,
      headers: response.headers || {},
    });
  }) as any;
  return { calls, restore: () => { global.fetch = originalFetch; } };
}

const client = new BugsnagClient('https://api.bugsnag.com', createAuthProvider({ token: 'mytoken' }));

describe('parseNextLinkUrl', () => {
  it('returns null when no header', () => {
    assert.strictEqual(parseNextLinkUrl(null), null);
    assert.strictEqual(parseNextLinkUrl(''), null);
  });

  it('extracts url from RFC-style next link', () => {
    const link = '<https://api.bugsnag.com/projects/x/errors?per_page=5&sort=last_seen>; rel="next"';
    assert.strictEqual(parseNextLinkUrl(link), 'https://api.bugsnag.com/projects/x/errors?per_page=5&sort=last_seen');
  });

  it('finds the next entry among multiple links', () => {
    const link = '<https://api.bugsnag.com/a?offset=prev>; rel="previous", <https://api.bugsnag.com/a?offset=next>; rel="next"';
    assert.strictEqual(parseNextLinkUrl(link), 'https://api.bugsnag.com/a?offset=next');
  });

  it('returns null when no next entry', () => {
    const link = '<https://api.bugsnag.com/a>; rel="previous"';
    assert.strictEqual(parseNextLinkUrl(link), null);
  });
});

describe('nextLinkPath', () => {
  it('strips the base url prefix', () => {
    const path = nextLinkPath('<https://api.bugsnag.com/projects/x/errors?offset=abc&per_page=5>; rel="next"', 'https://api.bugsnag.com');
    assert.strictEqual(path, '/projects/x/errors?offset=abc&per_page=5');
  });

  it('keeps the path when host differs', () => {
    const path = nextLinkPath('<https://other.example.com/a?offset=b>; rel="next"', 'https://api.bugsnag.com');
    assert.strictEqual(path, '/a?offset=b');
  });

  it('returns null for missing link', () => {
    assert.strictEqual(nextLinkPath(null, 'https://api.bugsnag.com'), null);
  });
});

describe('parseTotalCount', () => {
  it('parses numeric totals', () => {
    assert.strictEqual(parseTotalCount('1235'), 1235);
  });

  it('returns null for missing or invalid totals', () => {
    assert.strictEqual(parseTotalCount(null), null);
    assert.strictEqual(parseTotalCount('abc'), null);
  });
});

describe('buildQueryString', () => {
  it('builds simple query string', () => {
    assert.strictEqual(buildQueryString({ a: 1, b: 'x y' }), '?a=1&b=x%20y');
  });

  it('skips null/undefined/empty strings', () => {
    assert.strictEqual(buildQueryString({ a: 1, b: undefined, c: null, d: '' }), '?a=1');
  });

  it('repeats array values', () => {
    assert.strictEqual(buildQueryString({ pivots: ['app.version', 'user.id'] }), '?pivots=app.version&pivots=user.id');
  });

  it('serializes boolean flags as strings', () => {
    assert.strictEqual(buildQueryString({ full_reports: true }), '?full_reports=true');
  });

  it('returns empty string for empty params', () => {
    assert.strictEqual(buildQueryString(undefined), '');
    assert.strictEqual(buildQueryString({}), '');
  });

  it('appends filter pairs after params in order', () => {
    const pairs: FilterParam[] = [
      { key: 'filters[user.email][][type]', value: 'eq' },
      { key: 'filters[user.email][][value]', value: 'a@b.c' },
    ];
    assert.strictEqual(
      buildQueryString({ sort: 'last_seen' }, pairs),
      '?sort=last_seen&filters%5Buser.email%5D%5B%5D%5Btype%5D=eq&filters%5Buser.email%5D%5B%5D%5Bvalue%5D=a%40b.c'
    );
  });
});

describe('BugsnagClient.request', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('sends the token auth header', async () => {
    const mock = stubFetch([{ status: 200, body: { ok: true } }]);
    try {
      await client.request('GET', '/user/organizations');
      assert.strictEqual(mock.calls[0].init.headers['Authorization'], 'token mytoken');
      assert.strictEqual(mock.calls[0].init.headers['Content-Type'], 'application/json');
    } finally {
      mock.restore();
    }
  });

  it('retries on 429 and then succeeds', async () => {
    const mock = stubFetch([
      { status: 429, headers: { 'Retry-After': '0' }, body: {} },
      { status: 200, body: [{ id: '1' }] },
    ]);
    try {
      const result = await client.request('GET', '/user/organizations');
      assert.deepStrictEqual(result, [{ id: '1' }]);
      assert.strictEqual(mock.calls.length, 2);
    } finally {
      mock.restore();
    }
  });

  it('retries once with sort=unsorted on a 60000 response', async () => {
    const mock = stubFetch([
      { status: 200, headers: { Link: '' }, body: { errors: ['Unable to return complete results'], code: 60000 } },
      { status: 200, body: [{ id: 'a' }, { id: 'b' }] },
    ]);
    try {
      const result = await client.request('GET', '/projects/p/errors', {
        queryParams: { sort: 'last_seen', per_page: 30 },
        filterParams: [{ key: 'filters[error.status][][type]', value: 'eq' }, { key: 'filters[error.status][][value]', value: 'open' }],
      });
      assert.deepStrictEqual(result, [{ id: 'a' }, { id: 'b' }]);
      assert.strictEqual(mock.calls.length, 2);
      assert.match(mock.calls[1].url, /sort=unsorted/);
      assert.match(mock.calls[1].url, /error\.status/);
    } finally {
      mock.restore();
    }
  });

  it('does not downgrade when sort is already unsorted', async () => {
    const mock = stubFetch([
      { status: 422, body: { errors: ['Unable to return complete results'], code: 60000 } },
    ]);
    try {
      await assert.rejects(
        () => client.request('GET', '/projects/p/errors', { queryParams: { sort: 'unsorted' } }),
        /Unable to return complete results/
      );
      assert.strictEqual(mock.calls.length, 1);
    } finally {
      mock.restore();
    }
  });

  it('rejects after the abort timeout', async () => {
    global.fetch = (async (_url: string, init: any) => {
      return new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }) as any;
    try {
      await assert.rejects(
        () => client.request('GET', '/slow', { timeout: 20 }),
        /aborted/
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('surfaces bugsnag error arrays', async () => {
    const mock = stubFetch([{ status: 404, body: { errors: ['Project not found'] } }]);
    try {
      await assert.rejects(
        () => client.request('GET', '/projects/x/errors'),
        /Project not found/
      );
    } finally {
      mock.restore();
    }
  });

  it('returns null for 204 responses', async () => {
    const mock = stubFetch([{ status: 204 }]);
    try {
      const result = await client.request('GET', '/projects/p/stability_trend');
      assert.strictEqual(result, null);
    } finally {
      mock.restore();
    }
  });
});

describe('BugsnagClient.list', () => {
  it('follows Link pagination and injects per_page', async () => {
    const mkBody = (startId: number) => [{ id: String(startId) }, { id: String(startId + 1) }];
    const mkLink = (offset: string) => ({ Link: `<https://api.bugsnag.com/projects/p/errors?offset=${offset}&per_page=30>; rel="next"`, 'X-Total-Count': '6' });
    const mock = stubFetch([
      { status: 200, headers: mkLink('off1'), body: mkBody(1) },
      { status: 200, headers: mkLink('off2'), body: mkBody(3) },
      { status: 200, headers: mkLink('off3'), body: mkBody(5) },
    ]);
    try {
      const result = await client.list('GET', '/projects/p/errors', { queryParams: { sort: 'last_seen', per_page: 30 }, limit: 5 });
      assert.strictEqual(result.length, 5);
      assert.strictEqual(mock.calls.length, 3);
      assert.match(mock.calls[0].url, /per_page=30/);
      assert.match(mock.calls[1].url, /offset=off1/);
      assert.match(mock.calls[1].url, /per_page=30/);
      assert.strictEqual(client.lastTotalCount, 6);
    } finally {
      mock.restore();
    }
  });

  it('stops when no next link exists', async () => {
    const mock = stubFetch([
      { status: 200, body: [{ id: '1' }] },
    ]);
    try {
      const result = await client.list('GET', '/projects/p/errors', { limit: 100 });
      assert.deepStrictEqual(result, [{ id: '1' }]);
      assert.strictEqual(mock.calls.length, 1);
    } finally {
      mock.restore();
    }
  });

  it('truncates the final page at the limit', async () => {
    const mock = stubFetch([
      { status: 200, headers: { Link: '<https://api.bugsnag.com/p/errors?offset=o2>; rel="next"' }, body: [{ id: '1' }, { id: '2' }] },
      { status: 200, headers: { Link: '<https://api.bugsnag.com/p/errors?offset=o3>; rel="next"' }, body: [{ id: '3' }, { id: '4' }, { id: '5' }] },
    ]);
    try {
      const result = await client.list('GET', '/projects/p/errors', { limit: 3 });
      assert.deepStrictEqual(result.map(r => r.id), ['1', '2', '3']);
      assert.strictEqual(mock.calls.length, 2);
    } finally {
      mock.restore();
    }
  });

  it('sends filters as serialized query pairs', async () => {
    const mock = stubFetch([
      { status: 200, body: [{ id: '1' }] },
    ]);
    try {
      await client.list('GET', '/projects/p/errors', {
        queryParams: { sort: 'last_seen' },
        filterParams: [
          { key: 'filters[error.status][][type]', value: 'eq' },
          { key: 'filters[error.status][][value]', value: 'open' },
          { key: 'filters[user.id][][type]', value: 'empty' },
          { key: 'filters[user.id][][value]', value: 'false' },
        ],
      });
      const url = decodeURIComponent(mock.calls[0].url);
      assert.match(url, /filters\[error\.status\]\[\]\[type\]=eq/);
      assert.match(url, /filters\[error\.status\]\[\]\[value\]=open/);
      assert.match(url, /filters\[user\.id\]\[\]\[type\]=empty/);
      assert.match(url, /filters\[user\.id\]\[\]\[value\]=false/);
    } finally {
      mock.restore();
    }
  });
});

describe('BugsnagClient.list offset pagination', () => {
  it('increments offset and stops on a short page', async () => {
    const mock = stubFetch([
      { status: 200, body: [{ id: '1' }, { id: '2' }] },
      { status: 200, body: [{ id: '3' }] },
    ]);
    try {
      const result = await client.list('GET', '/projects/p/span_groups', {
        queryParams: { per_page: 2 },
        pagination: 'offset',
      });
      assert.deepStrictEqual(result.map(r => r.id), ['1', '2', '3']);
      assert.strictEqual(mock.calls.length, 2);
      assert.match(mock.calls[0].url, /offset=0/);
      assert.match(mock.calls[1].url, /offset=2/);
    } finally {
      mock.restore();
    }
  });

  it('stops at the limit without requesting another page', async () => {
    const mock = stubFetch([
      { status: 200, body: [{ id: '1' }, { id: '2' }] },
      { status: 200, body: [{ id: '3' }, { id: '4' }] },
    ]);
    try {
      const result = await client.list('GET', '/projects/p/span_groups', {
        queryParams: { per_page: 2 },
        pagination: 'offset',
        limit: 3,
      });
      assert.deepStrictEqual(result.map(r => r.id), ['1', '2', '3']);
      assert.strictEqual(mock.calls.length, 2);
    } finally {
      mock.restore();
    }
  });

  it('stops on an empty page', async () => {
    const mock = stubFetch([
      { status: 200, body: [{ id: '1' }, { id: '2' }] },
      { status: 200, body: [] },
    ]);
    try {
      const result = await client.list('GET', '/projects/p/span_groups', {
        queryParams: { per_page: 2 },
        pagination: 'offset',
      });
      assert.deepStrictEqual(result.map(r => r.id), ['1', '2']);
      assert.strictEqual(mock.calls.length, 2);
    } finally {
      mock.restore();
    }
  });
});
