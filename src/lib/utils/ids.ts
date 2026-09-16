const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function parseUuidParam(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isUuid(trimmed) ? trimmed : null;
}
