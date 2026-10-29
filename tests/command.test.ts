import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as z from 'zod';
import { declareCommand, parseCommand, assertWriteAllowed } from '../src/cli/command';
import { commands } from '../src/cli/commands';

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

  describe('assertWriteAllowed', () => {
    it('allows read-only commands without --write', () => {
      const cmd = declareCommand({
        name: 'read',
        category: 'errors',
        description: 'read',
        api: { method: 'GET', path: '/read' },
      });
      assert.doesNotThrow(() => assertWriteAllowed(cmd, false));
    });

    it('rejects mutating commands without --write', () => {
      const cmd = declareCommand({
        name: 'write',
        category: 'errors',
        description: 'write',
        mutating: true,
        api: { method: 'PATCH', path: '/write' },
      });
      assert.throws(() => assertWriteAllowed(cmd, false), /re-run with --write/);
    });

    it('allows mutating commands with --write', () => {
      const cmd = declareCommand({
        name: 'write',
        category: 'errors',
        description: 'write',
        mutating: true,
        api: { method: 'PATCH', path: '/write' },
      });
      assert.doesNotThrow(() => assertWriteAllowed(cmd, true));
    });
  });

  describe('command transforms', () => {
    it('rejects trend buckets-count with resolution', () => {
      const transform = commands['project-trend'].transformRequest!;
      assert.throws(
        () => transform({ projectId: 'p', 'buckets-count': 10, resolution: '5m' }),
        /mutually exclusive/
      );
    });

    it('rejects buckets-count outside 1..50', () => {
      const transform = commands['project-trend'].transformRequest!;
      assert.throws(
        () => transform({ projectId: 'p', 'buckets-count': 60 }),
        /between 1 and 50/
      );
      assert.throws(
        () => transform({ projectId: 'p', 'buckets-count': 0 }),
        /between 1 and 50/
      );
    });

    it('requires severity for override_severity', () => {
      const transform = commands['error-update'].transformRequest!;
      assert.throws(
        () => transform({ projectId: 'p', errorId: 'e', operation: 'override_severity' }),
        /--severity is required/
      );
    });

    it('requires an assignment target for assign', () => {
      const transform = commands['error-update'].transformRequest!;
      assert.throws(
        () => transform({ projectId: 'p', errorId: 'e', operation: 'assign' }),
        /assign requires/
      );
    });

    it('builds an assign body', () => {
      const transform = commands['error-update'].transformRequest!;
      assert.deepStrictEqual(
        transform({ projectId: 'p', errorId: 'e', operation: 'assign', 'assigned-collaborator-id': 'u1' }),
        { operation: 'assign', assigned_collaborator_id: 'u1' }
      );
    });

    it('builds a snooze body', () => {
      const transform = commands['error-update'].transformRequest!;
      assert.deepStrictEqual(
        transform({ projectId: 'p', errorId: 'e', operation: 'snooze', 'reopen-if': 'occurs_after', seconds: 3600 }),
        { operation: 'snooze', reopen_rules: { reopen_if: 'occurs_after', seconds: 3600 } }
      );
    });

    it('builds a bulk update path with repeated error_ids', () => {
      const path = commands['error-bulk-update'].api.path as (args: any) => string;
      assert.strictEqual(
        path({ projectId: 'p', 'error-ids': 'a,b' }),
        '/projects/p/errors?error_ids=a&error_ids=b'
      );
    });

    it('serializes pivots as a bracketed array', () => {
      const transform = commands['project-pivots'].transformRequest!;
      assert.deepStrictEqual(
        transform({ projectId: 'p', pivots: 'a,b' }),
        { 'pivots[]': ['a', 'b'] }
      );
    });

    it('serializes categories as a bracketed array', () => {
      const transform = commands['starred-span-group-list'].transformRequest!;
      assert.deepStrictEqual(
        transform({ projectId: 'p', categories: 'app_start,network' }),
        { 'categories[]': ['app_start', 'network'] }
      );
    });
  });
});
