export function encodePathSegment(value: string): string {
  if (/%[0-9A-Fa-f]{2}/.test(value))
    return value;
  return encodeURIComponent(value);
}
