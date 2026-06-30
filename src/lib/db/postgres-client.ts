export function normalizeDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return rawUrl
      .replace(/([?&])channel_binding=[^&]*(&)?/g, (_, sep, amp) => (amp ? sep : ''))
      .replace(/[?&]$/, '');
  }
}

export function needsPostgresSsl(url: string): boolean {
  return (
    url.includes('neon.tech') ||
    url.includes('render.com') ||
    url.includes('sslmode=require') ||
    url.includes('supabase.co')
  );
}

export function getPostgresClientOptions(url: string) {
  const normalizedUrl = normalizeDatabaseUrl(url);
  return {
    url: normalizedUrl,
    options: {
      prepare: false as const,
      ...(needsPostgresSsl(normalizedUrl) ? { ssl: 'require' as const } : {}),
    },
  };
}
