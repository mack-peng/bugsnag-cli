export interface FilterParam {
  key: string;
  value: string;
}

export function serializeFilters(exprs: string[]): FilterParam[] {
  const params: FilterParam[] = [];
  for (const expr of exprs) {
    serializeExpression(expr, params);
  }
  return params;
}

function serializeExpression(expr: string, params: FilterParam[]): void {
  const trimmed = expr.trim();
  const neIndex = trimmed.indexOf('!=');
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) {
    throw new Error(`Invalid filter expression: '${expr}'. Expected 'k=v', 'k!=v' or 'k:empty=true|false'`);
  }

  if (neIndex !== -1 && neIndex < eqIndex) {
    const field = trimmed.slice(0, neIndex).trim();
    const value = trimmed.slice(neIndex + 2);
    pushFilterParam(params, field, 'ne', value, expr);
    return;
  }

  const field = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1);

  if (field.endsWith(':empty')) {
    if (value !== 'true' && value !== 'false') {
      throw new Error(`Invalid filter expression: '${expr}'. 'empty' filter value must be 'true' or 'false'`);
    }
    pushFilterParam(params, field.slice(0, -':empty'.length).trim(), 'empty', value, expr);
    return;
  }

  const values = value.split(',').filter(v => v.trim() !== '');
  if (values.length === 0) {
    throw new Error(`Invalid filter expression: '${expr}'. No value given`);
  }
  for (const v of values) {
    pushFilterParam(params, field, 'eq', v, expr);
  }
}

function pushFilterParam(
  params: FilterParam[],
  field: string,
  type: 'eq' | 'ne' | 'empty',
  value: string,
  expr: string
): void {
  if (!field) {
    throw new Error(`Invalid filter expression: '${expr}'. Missing field name`);
  }
  params.push({ key: `filters[${field}][][type]`, value: type });
  params.push({ key: `filters[${field}][][value]`, value });
}
