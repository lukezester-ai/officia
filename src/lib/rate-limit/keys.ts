export function rateLimitKey(tenantId: string, route: string): string {
  const tenant = tenantId?.trim();
  const name = route?.trim();
  if (!tenant) {
    throw new Error('Rate limit tenant id is required');
  }
  if (!name) {
    throw new Error('Rate limit route is required');
  }
  return `officia:rl:v1:${tenant}:${name}`;
}

export const RATE_LIMIT_WINDOW_SEC = 60;
export const DEFAULT_ROUTE_LIMIT = 60;
export const AI_CHAT_ROUTE_LIMIT = 20;
