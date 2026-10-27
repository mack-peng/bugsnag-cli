import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TextOutput, JsonOutput } from '../src/cli/output';

describe('TextOutput', () => {
  it('formats arrays as tables', () => {
    const out = new TextOutput();
    const text = out.format([{ id: '1', name: 'foo' }, { id: '2', name: 'bar' }]);
    assert.match(text, /id/);
    assert.match(text, /name/);
    assert.match(text, /foo/);
  });

  it('formats empty arrays', () => {
    const out = new TextOutput();
    assert.match(out.format([]), /empty list/);
  });

  it('formats objects as JSON', () => {
    const out = new TextOutput();
    assert.deepStrictEqual(JSON.parse(out.format({ a: 1 })), { a: 1 });
  });

  it('formats scalars', () => {
    const out = new TextOutput();
    assert.strictEqual(out.format(42), '42');
    assert.strictEqual(out.format('hello'), 'hello');
  });

  it('raw mode stringifies objects', () => {
    const out = new TextOutput(true);
    assert.strictEqual(out.format({ a: 1 }), JSON.stringify({ a: 1 }));
  });
});

describe('JsonOutput', () => {
  it('formats as JSON', () => {
    const out = new JsonOutput();
    assert.deepStrictEqual(JSON.parse(out.format({ a: 1 })), { a: 1 });
  });

  it('formats arrays as JSON', () => {
    const out = new JsonOutput();
    assert.deepStrictEqual(JSON.parse(out.format([1, 2, 3])), [1, 2, 3]);
  });
});
