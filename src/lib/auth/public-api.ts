const PUBLIC_API_PREFIXES = ['/api/webhooks/', '/api/cron/'] as const;
const PUBLIC_API_EXACT = new Set(['/api/health', '/api/ai/webhook']);

export function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_EXACT.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
