import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  webpack(config) {
    // OneDrive workspaces can have very limited local disk; persistent webpack
    // cache is redundant in CI and can exceed the available space.
    config.cache = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
