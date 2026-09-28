import { createAdminToken, credentialsMatch, readAdminToken } from './admin-token';

describe('admin login token', () => {
  it('accepts the admin username and password together', () => {
    expect(credentialsMatch('admin', 'correct-password', 'correct-password')).toBe(true);
    expect(credentialsMatch('other', 'correct-password', 'correct-password')).toBe(false);
    expect(credentialsMatch('admin', 'wrong-password', 'correct-password')).toBe(false);
  });

  it('accepts a signed session until it expires', () => {
    const now = Date.parse('2026-09-28T00:00:00.000Z');
    const token = createAdminToken('session-secret-value', now);
    expect(readAdminToken(token, 'session-secret-value', now + 1000)).toBe(true);
    expect(readAdminToken(token, 'other-secret-value', now + 1000)).toBe(false);
    expect(readAdminToken(`${token}x`, 'session-secret-value', now + 1000)).toBe(false);
    expect(readAdminToken(token, 'session-secret-value', now + 15 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});