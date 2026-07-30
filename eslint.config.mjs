import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores must be in a standalone config object
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Generated PWA / Workbox bundles
      "public/sw.js",
      "public/swe-worker-*.js",
      "public/workbox-*.js",
      // One-off local utility / scratch scripts (not app source)
      "fix-currency.js",
      "test-clerk.js",
      "test-env.js",
      "drop.ts",
      "test-chat.ts",
      "test-report.ts",
      "run-migration.mjs",
      "commit.ps1",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-async-client-component": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
