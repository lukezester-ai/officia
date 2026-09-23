import { requireApiSession } from '@/lib/auth/api-guard';
import { enforceTenantRateLimit, DEFAULT_ROUTE_LIMIT } from '@/lib/rate-limit/tenant-limit';

/**
 * Tenant-aware distributed limiter. IP buckets are not used: they couple NAT
 * tenants and reset independently on each application instance.
 */
export async function withRateLimit(
  req: Request,
  handler: () => Promise<Response>,
  route = 'api',
) {
  const { ctx, response } = await requireApiSession();
  if (response || !ctx) return response!;

  const denied = await enforceTenantRateLimit({
    tenantId: ctx.tenantId,
    route,
    limit: DEFAULT_ROUTE_LIMIT,
  });
  if (denied) return denied;
  return handler();
}
