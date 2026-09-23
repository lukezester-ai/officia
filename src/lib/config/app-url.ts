const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) {
    throw new Error('NEXT_PUBLIC_APP_URL is not set');
  }

  const url = new URL(raw);
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
    throw new Error('NEXT_PUBLIC_APP_URL must be https in production');
  }

  return url.origin;
}
