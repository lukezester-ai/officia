// Redis Rate Limiting v1 — two LOGIN-like clients share one Redis.
// IP / in-memory Maps are not a valid implementation of this gate.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from 'redis';

function envKey(key) {
  if (process.env[key]) return String(process.env[key]).trim();
  try {
    const txt = fs.readFileSync(path.resolve('.env.local'), 'utf8');
    const m = txt.match(new RegExp(`^(?:export\\s+)?${key}=(.*)$`, 'm'));
    return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
  } catch {
    return undefined;
  }
}

const REDIS_URL = process.env.REDIS_URL || envKey('REDIS_URL') || 'redis://127.0.0.1:6379';
const redisSrc = fs.readFileSync(path.resolve('src/lib/rate-limit/redis.ts'), 'utf8');
const lua = redisSrc.match(/const INCR_EXPIRE = `([\s\S]*?)`;/)[1];

function rateLimitKey(tenantId, route) {
  return `officia:rl:v1:${tenantId}:${route}`;
}

async function incr(client, key, windowSec = 60) {
  return Number(await client.sendCommand(['EVAL', lua, '1', key, String(windowSec)]));
}

let instanceA = null;
let instanceB = null;
let provisionErr = null;

before(async () => {
  try {
    instanceA = createClient({
      url: REDIS_URL,
      socket: { connectTimeout: 1500, reconnectStrategy: false },
    });
    await instanceA.connect();
    instanceB = createClient({
      url: REDIS_URL,
      socket: { connectTimeout: 1500, reconnectStrategy: false },
    });
    await instanceB.connect();
    await instanceA.ping();
  } catch (err) {
    console.error('[redis-rate-limit] setup failed:', err && (err.message || err.code));
    if (process.env.CI) throw err;
    provisionErr = err;
    if (instanceA) await instanceA.quit().catch(() => {});
    if (instanceB) await instanceB.quit().catch(() => {});
    instanceA = null;
    instanceB = null;
  }
});

after(async () => {
  if (instanceA) await instanceA.quit().catch(() => {});
  if (instanceB) await instanceB.quit().catch(() => {});
});

function ok(t) {
  if (provisionErr) {
    t.skip('Redis недостижим: ' + (provisionErr.message || provisionErr.code));
    return false;
  }
  return true;
}

test('contract: limiter is Lua INCR+EXPIRE, not an in-memory Map', () => {
  assert.match(redisSrc, /INCR/);
  assert.match(redisSrc, /EXPIRE/);
  const api = fs.readFileSync(path.resolve('src/lib/api/rate-limit.ts'), 'utf8');
  assert.match(api, /enforceTenantRateLimit/);
  assert.doesNotMatch(api, /new Map/);
  const ai = fs.readFileSync(path.resolve('src/app/api/ai/chat/route.ts'), 'utf8');
  assert.match(ai, /enforceTenantRateLimit/);
  assert.doesNotMatch(ai, /rateLimitMap/);
  assert.doesNotMatch(ai, /new Map/);
});

test('two application instances share one tenant counter', async (t) => {
  if (!ok(t)) return;
  const tenant = crypto.randomUUID();
  const key = rateLimitKey(tenant, 'ai:chat');
  await instanceA.del(key);
  const limit = 20;
  for (let i = 0; i < 10; i += 1) {
    assert.equal(await incr(instanceA, key), i + 1);
  }
  for (let i = 10; i < 20; i += 1) {
    assert.equal(await incr(instanceB, key), i + 1);
  }
  const overflow = await incr(instanceA, key);
  assert.equal(overflow, 21);
  assert.ok(overflow > limit);
  await instanceA.del(key);
});

test('tenant A exhaustion does not throttle tenant B', async (t) => {
  if (!ok(t)) return;
  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();
  const keyA = rateLimitKey(tenantA, 'ai:chat');
  const keyB = rateLimitKey(tenantB, 'ai:chat');
  await instanceA.del(keyA);
  await instanceB.del(keyB);
  for (let i = 0; i < 21; i += 1) {
    await incr(instanceA, keyA);
  }
  assert.equal(await incr(instanceB, keyB), 1);
  await instanceA.del(keyA);
  await instanceB.del(keyB);
});

test('same tenant, different routes are independent', async (t) => {
  if (!ok(t)) return;
  const tenant = crypto.randomUUID();
  const chat = rateLimitKey(tenant, 'ai:chat');
  const bank = rateLimitKey(tenant, 'bank:match');
  await instanceA.del(chat);
  await instanceA.del(bank);
  await incr(instanceA, chat);
  assert.equal(await incr(instanceB, bank), 1);
  await instanceA.del(chat);
  await instanceA.del(bank);
});
