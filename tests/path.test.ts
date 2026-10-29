import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encodePathSegment } from '../src/api/path';

describe('encodePathSegment', () => {
  it('encodes a raw slash', () => {
    assert.strictEqual(encodePathSegment('1.app_start.AppStart/Cold'), '1.app_start.AppStart%2FCold');
  });

  it('does not double-encode an already encoded id', () => {
    assert.strictEqual(encodePathSegment('1.app_start.AppStart%2FCold'), '1.app_start.AppStart%2FCold');
  });

  it('leaves a 24-hex id unchanged', () => {
    assert.strictEqual(encodePathSegment('515fb9337c1074f6fd000001'), '515fb9337c1074f6fd000001');
  });

  it('encodes spaces and other reserved characters', () => {
    assert.strictEqual(encodePathSegment('a b'), 'a%20b');
  });
});
