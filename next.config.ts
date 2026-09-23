import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Render currently runs `npx next build` (Turbopack). Cap static workers so
  // "Collecting page data" does not open dozens of Postgres pools and hang.
  experimental: {
    cpus: 4,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 200,
  },
  async redirects() {
    return [
      { source: '/', destination: '/bg', permanent: false },
      { source: '/login', destination: '/sign-in', permanent: false },
      { source: '/register', destination: '/sign-up', permanent: false },
    ];
  },
  webpack(config) {
    // OneDrive workspaces can have very limited local disk; persistent webpack
    // cache is redundant in CI and can exceed the available space.
    config.cache = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
