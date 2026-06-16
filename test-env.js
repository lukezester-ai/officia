const { loadEnvConfig } = require('@next/env');
const env = loadEnvConfig(process.cwd());
console.log("Loaded NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
