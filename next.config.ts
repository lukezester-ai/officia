import type { NextConfig } from 'next';
import path from 'node:path';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https: http://res.cloudinary.com;
  font-src 'self' data:;
  connect-src 'self' https://api.clerk.com https://api.stripe.com https://*.clerk.com wss://*.clerk.com https://api.deepgram.com wss://*.deepgram.com;
  frame-src 'self' https://clerk.com https://*.clerk.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, '').trim(),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'lucide-react': path.resolve(process.cwd(), 'src/lib/lucide-react-shim.tsx'),
    };
    return config;
  },
};

export default withPWA(nextConfig);
