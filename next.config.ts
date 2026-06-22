import type { NextConfig } from 'next';
import path from 'node:path';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // strict types and linting for production
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'lucide-react': path.resolve(process.cwd(), 'src/lib/lucide-react-shim.tsx'),
    };
    return config;
  },
};

export default withPWA(nextConfig);
