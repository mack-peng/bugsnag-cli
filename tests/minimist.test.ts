import { describe, it } from 'node:test';
import assert from 'node:assert';
import { minimist } from '../src/cli/minimist';

describe('minimist', () => {
  it('parses positional args and flags', () => {
    const r = minimist(['error-list', '--sort', 'last_seen']);
    assert.deepStrictEqual(r._, ['error-list']);
    assert.strictEqual(r.sort, 'last_seen');
  });

  it('parses --key=value', () => {
    const r = minimist(['cmd', '--base-url=https://x']);
    assert.strictEqual(r['base-url'], 'https://x');
  });

  it('treats declared booleans as flags', () => {
    const r = minimist(['cmd', '--json'], { boolean: ['json'] });
    assert.strictEqual(r.json, true);
  });

  it('supports --no-flag', () => {
    const r = minimist(['cmd', '--no-raw']);
    assert.strictEqual(r.raw, false);
  });

  it('supports negating declared boolean flags', () => {
    const r = minimist(['cmd', '--full-reports', 'x'], { boolean: ['full-reports'] });
    assert.strictEqual(r['full-reports'], true);
    const r2 = minimist(['cmd', '--no-full-reports'], { boolean: ['full-reports'] });
    assert.strictEqual(r2['full-reports'], false);
  });

  it('collects repeated flags into an array', () => {
    const r = minimist(['cmd', '--filter', 'a=b', '--filter', 'c:d']);
    assert.deepStrictEqual(r.filter, ['a=b', 'c:d']);
  });

  it('treats args after -- as positional', () => {
    const r = minimist(['run', '--', '--not-a-flag']);
    assert.deepStrictEqual(r._, ['run', '--not-a-flag']);
  });

  it('parses short flags', () => {
    const r = minimist(['cmd', '-p', 'staging']);
    assert.strictEqual(r.p, 'staging');
  });
});
