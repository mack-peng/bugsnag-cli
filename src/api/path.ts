export function encodePathSegment(value: string): string {
  return value.replace(/%[0-9A-Fa-f]{2}|[\s\S]/g, (token) =>
    /^%[0-9A-Fa-f]{2}$/.test(token) ? token : encodeURIComponent(token)
  );
}
