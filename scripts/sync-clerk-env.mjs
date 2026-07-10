#!/usr/bin/env node
/**
 * Merge Clerk (and optional E2E) secrets from the process environment into .env.local.
 * Cursor Cloud injects secrets as env vars; Next.js prefers existing process.env over
 * .env.local, but Playwright/dotenv scripts read .env.local directly — keep both in sync.
 */
import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.join(process.cwd(), '.env.local');

const SECRET_KEYS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET',
  'E2E_CLERK_USER_EMAIL',
  'E2E_CLERK_USER_PASSWORD',
];

const PLACEHOLDER_PATTERNS = [
  /YOUR_CLERK/i,
  /officialocaldevplaceholder/i,
  /ZmFrZS1vZmZpY2lhLWRldi/i, // fake-officia-dev encoded host
  /^pk_test_your_/i,
  /^sk_test_your_/i,
];

function isPlaceholder(value) {
  if (!value || value.trim().length < 10) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function parseEnvFile(content) {
  const lines = content.split('\n');
  const map = new Map();
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) map.set(match[1], match[2]);
  }
  return { lines, map };
}

function upsertKey(lines, key, value) {
  const prefix = `${key}=`;
  const idx = lines.findIndex((line) => line.startsWith(prefix));
  const next = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = next;
  } else {
    const clerkSection = lines.findIndex((line) => /Clerk authentication/i.test(line));
    const insertAt = clerkSection >= 0 ? clerkSection + 1 : lines.length;
    lines.splice(insertAt, 0, next);
  }
}

if (!fs.existsSync(envLocalPath)) {
  console.error('❌ .env.local not found — copy from .env.example first.');
  process.exit(1);
}

const incoming = SECRET_KEYS.filter((key) => {
  const value = process.env[key];
  return value && !isPlaceholder(value);
});

if (incoming.length === 0) {
  console.error('❌ No valid Clerk/E2E secrets in the environment.');
  console.error('   Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in Cursor secrets, then re-run.');
  process.exit(1);
}

const content = fs.readFileSync(envLocalPath, 'utf8');
const { lines } = parseEnvFile(content);

for (const key of incoming) {
  upsertKey(lines, key, process.env[key]);
}

fs.writeFileSync(envLocalPath, lines.join('\n').replace(/\n*$/, '\n'));
console.log(`✅ Updated .env.local with: ${incoming.join(', ')}`);
