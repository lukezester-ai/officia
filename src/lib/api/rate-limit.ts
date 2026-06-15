// В реална среда:
// import { Ratelimit } from '@upstash/ratelimit';
// import { Redis } from '@upstash/redis';

// Mocks за да не гърми TypeScript, докато не инсталираме Upstash
const redis = { url: '', token: '' };
const limiter = {
  limit: async (req: Request) => ({ success: true, reset: Date.now() })
};

export async function withRateLimit(req: Request, handler: () => Promise<Response>) {
  const { success, reset } = await limiter.limit(req);
  if (!success) {
    return new Response('Too Many Requests', { status: 429, headers: { 'X-RateLimit-Reset': reset.toString() } });
  }
  return handler();
}
