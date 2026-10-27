import { describe, it } from 'node:test';
import assert from 'node:assert';
import { serializeFilters } from '../src/api/filters';

describe('serializeFilters', () => {
  it('serializes a simple eq expression', () => {
    assert.deepStrictEqual(serializeFilters(['error.status=open']), [
      { key: 'filters[error.status][][type]', value: 'eq' },
      { key: 'filters[error.status][][value]', value: 'open' },
    ]);
  });

  it('serializes ne expressions', () => {
    assert.deepStrictEqual(serializeFilters(['error.status!=open']), [
      { key: 'filters[error.status][][type]', value: 'ne' },
      { key: 'filters[error.status][][value]', value: 'open' },
    ]);
  });

  it('serializes empty expressions', () => {
    assert.deepStrictEqual(serializeFilters(['user.id:empty=true']), [
      { key: 'filters[user.id][][type]', value: 'empty' },
      { key: 'filters[user.id][][value]', value: 'true' },
    ]);
    assert.deepStrictEqual(serializeFilters(['user.id:empty=false']), [
      { key: 'filters[user.id][][type]', value: 'empty' },
      { key: 'filters[user.id][][value]', value: 'false' },
    ]);
  });

  it('serializes multi-value expressions as interleaved eq pairs', () => {
    const pairs = serializeFilters(['user.email=a@x.com,b@x.com']);
    assert.deepStrictEqual(pairs, [
      { key: 'filters[user.email][][type]', value: 'eq' },
      { key: 'filters[user.email][][value]', value: 'a@x.com' },
      { key: 'filters[user.email][][type]', value: 'eq' },
      { key: 'filters[user.email][][value]', value: 'b@x.com' },
    ]);
  });

  it('preserves order across multiple expressions', () => {
    const pairs = serializeFilters(['event.since=1d', 'error.status=open']);
    assert.deepStrictEqual(pairs, [
      { key: 'filters[event.since][][type]', value: 'eq' },
      { key: 'filters[event.since][][value]', value: '1d' },
      { key: 'filters[error.status][][type]', value: 'eq' },
      { key: 'filters[error.status][][value]', value: 'open' },
    ]);
  });

  it('trims whitespace around expressions and fields', () => {
    assert.deepStrictEqual(serializeFilters([' error.status =open']), [
      { key: 'filters[error.status][][type]', value: 'eq' },
      { key: 'filters[error.status][][value]', value: 'open' },
    ]);
  });

  it('accepts values that contain equals signs', () => {
    assert.deepStrictEqual(serializeFilters(['app.version=1.2=3']), [
      { key: 'filters[app.version][][type]', value: 'eq' },
      { key: 'filters[app.version][][value]', value: '1.2=3' },
    ]);
  });

  it('returns empty output for no expressions', () => {
    assert.deepStrictEqual(serializeFilters([]), []);
  });

  it('rejects expressions without a value', () => {
    assert.throws(() => serializeFilters(['error.status']), /Invalid filter expression/);
  });

  it('rejects expressions without a field', () => {
    assert.throws(() => serializeFilters(['=open']), /Invalid filter expression/);
  });

  it('rejects empty filters with invalid value', () => {
    assert.throws(() => serializeFilters(['user.id:empty=yes']), /'empty' filter value must be 'true' or 'false'/);
  });

  it('rejects multi-value expressions with no values', () => {
    assert.throws(() => serializeFilters(['k=,,']), /Invalid filter expression/);
  });
});
