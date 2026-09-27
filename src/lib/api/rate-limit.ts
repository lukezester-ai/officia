const WINDOW_MS = 60_000;
const LIMIT = 60;
const buckets = new Map<string, { count: number; reset: number }>();

function clientKey(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'local';
  let path = '/';
  try {
    path = new URL(req.url).pathname;
  } catch {
    path = '/';
  }
  return `${ip}:${path}`;
}

export function consumeRateLimit(key: string, limit: number, windowMs = WINDOW_MS) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false as const, reset: bucket.reset };
  return { ok: true as const };
}

export async function withRateLimit(req: Request, handler: () => Promise<Response>) {
  const hit = consumeRateLimit(clientKey(req), LIMIT);
  if (!hit.ok) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'X-RateLimit-Reset': String(hit.reset) },
    });
  }
  return handler();
}
