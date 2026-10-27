import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as z from 'zod';
import { declareCommand, parseCommand } from '../src/cli/command';

const numberArg = z.preprocess((val, ctx) => {
  const n = Number(val);
  if (Number.isNaN(n)) {
    ctx.addIssue({ code: 'custom', message: `expected number` });
  }
  return n;
}, z.number());

describe('command', () => {
  describe('declareCommand', () => {
    it('returns the command schema unchanged', () => {
      const cmd = declareCommand({
        name: 'test',
        category: 'errors',
        description: 'test command',
        api: { method: 'GET', path: '/test' },
      });
      assert.strictEqual(cmd.name, 'test');
      assert.strictEqual(cmd.api.method, 'GET');
    });
  });

  describe('parseCommand', () => {
    it('parses positional args', () => {
      const cmd = declareCommand({
        name: 'show',
        category: 'errors',
        description: 'show item',
        args: z.object({ id: z.string() }),
        api: { method: 'GET', path: ({ id }) => `/items/${id}` },
      });
      const result = parseCommand(cmd, { _: ['show', 'abc'] });
      assert.strictEqual(result.id, 'abc');
    });

    it('parses numeric positional args', () => {
      const cmd = declareCommand({
        name: 'list',
        category: 'errors',
        description: 'list items',
        options: z.object({ 'per-page': numberArg.optional() }),
        api: { method: 'GET', path: '/items' },
      });
      const result = parseCommand(cmd, { _: ['list'], 'per-page': '30' });
      assert.strictEqual(result['per-page'], 30);
    });

    it('parses provided options', () => {
      const cmd = declareCommand({
        name: 'list',
        category: 'errors',
        description: 'list items',
        options: z.object({ status: z.string().optional() }),
        api: { method: 'GET', path: '/items' },
      });
      const result = parseCommand(cmd, { _: ['list'], status: 'open' });
      assert.strictEqual(result.status, 'open');
    });

    it('rejects unknown options (strict)', () => {
      const cmd = declareCommand({
        name: 'list',
        category: 'errors',
        description: 'list items',
        options: z.object({ status: z.string().optional() }),
        api: { method: 'GET', path: '/items' },
      });
      assert.throws(() => parseCommand(cmd, { _: ['list'], bogus: 'x' }), /unknown/);
    });

    it('rejects invalid enum values', () => {
      const cmd = declareCommand({
        name: 'list',
        category: 'errors',
        description: 'list items',
        options: z.object({ sort: z.enum(['last_seen', 'first_seen']).optional() }),
        api: { method: 'GET', path: '/items' },
      });
      assert.throws(() => parseCommand(cmd, { _: ['list'], sort: 'bogus' }));
    });

    it('rejects too many positional args', () => {
      const cmd = declareCommand({
        name: 'show',
        category: 'errors',
        description: 'show item',
        args: z.object({ id: z.string() }),
        api: { method: 'GET', path: '/items' },
      });
      assert.throws(() => parseCommand(cmd, { _: ['show', '1', '2'] }), /too many arguments/);
    });

    it('rejects invalid number option', () => {
      const cmd = declareCommand({
        name: 'list',
        category: 'errors',
        description: 'list items',
        options: z.object({ limit: numberArg.optional() }),
        api: { method: 'GET', path: '/items' },
      });
      assert.throws(() => parseCommand(cmd, { _: ['list'], limit: 'abc' }), /expected number/);
    });
  });
});
