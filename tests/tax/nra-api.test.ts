import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('nra_api', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NAP_ENABLED', 'true');
    vi.stubEnv('NAP_MOCK_MODE', 'false');
    vi.stubEnv('NAP_API_TOKEN', 'test-token-123');
    vi.stubEnv('NAP_API_URL', 'https://api.nra.bg');
  });

  it('should return mock result when NAP_MOCK_MODE=true', async () => {
    vi.stubEnv('NAP_MOCK_MODE', 'true');
    const mod = await import('@/lib/tax/nra_api');
    const result = await mod.submitInvoiceToNRA('<Invoice/>');
    expect(result.success).toBe(true);
    expect(result.mode).toBe('mock');
    expect(result.referenceId).toContain('MOCK-NRA-');
  });

  it('should return disabled when NAP_API_TOKEN is not set', async () => {
    vi.stubEnv('NAP_API_TOKEN', '');
    const mod = await import('@/lib/tax/nra_api');
    const result = await mod.submitInvoiceToNRA('<Invoice/>');
    expect(result.success).toBe(false);
    expect(result.mode).toBe('disabled');
  });

  it('should send XML to NAP API via fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ referenceId: 'NRA-123', status: 'RECEIVED' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const mod = await import('@/lib/tax/nra_api');
    const result = await mod.submitInvoiceToNRA('<Invoice><Amount>100</Amount></Invoice>');

    expect(result.success).toBe(true);
    expect(result.referenceId).toBe('NRA-123');
    expect(result.status).toBe('RECEIVED');
    expect(result.mode).toBe('live');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.nra.bg/e-invoice/submit',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
          'Content-Type': 'application/xml; charset=utf-8',
        }),
        body: '<Invoice><Amount>100</Amount></Invoice>',
      }),
    );
  });

  it('should handle NAP API HTTP errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid request',
    });
    vi.stubGlobal('fetch', mockFetch);

    const mod = await import('@/lib/tax/nra_api');
    const result = await mod.submitInvoiceToNRA('<Invoice/>');

    expect(result.success).toBe(false);
    expect(result.error).toContain('NAP HTTP 400');
  });

  it('should handle fetch exceptions', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const mod = await import('@/lib/tax/nra_api');
    const result = await mod.submitInvoiceToNRA('<Invoice/>');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should check invoice status via fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ACCEPTED', message: 'Приета' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const mod = await import('@/lib/tax/nra_api');
    const result = await mod.checkInvoiceStatus('NRA-123');

    expect(result.success).toBe(true);
    expect(result.status).toBe('ACCEPTED');
    expect(result.mode).toBe('live');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.nra.bg/e-invoice/status/NRA-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      }),
    );
  });
});
