import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFsExists = vi.fn();
const mockFsReadFile = vi.fn();
const mockHttpsRequest = vi.fn();
const mockCreateSign = vi.fn();
const mockSignUpdate = vi.fn();
const mockSignEnd = vi.fn();
const mockSign = vi.fn();
const mockCreateHash = vi.fn();

vi.mock('fs', () => ({
  existsSync: (...args: any[]) => mockFsExists(...args),
  readFileSync: (...args: any[]) => mockFsReadFile(...args),
}));

vi.mock('https', () => ({
  default: { request: (...args: any[]) => mockHttpsRequest(...args) },
  request: (...args: any[]) => mockHttpsRequest(...args),
}));

vi.mock('crypto', () => ({
  default: {
    createSign: (...args: any[]) => mockCreateSign(...args),
    createHash: (...args: any[]) => mockCreateHash(...args),
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
  },
  createSign: (...args: any[]) => mockCreateSign(...args),
  createHash: (...args: any[]) => mockCreateHash(...args),
  randomUUID: () => '00000000-0000-0000-0000-000000000000',
}));

function makeMockReqRes() {
  const mockRes = { on: vi.fn(), statusCode: 200 };
  const mockReq = { on: vi.fn(), write: vi.fn(), end: vi.fn() };
  mockRes.on.mockImplementation((event: string, cb: Function) => {
    if (event === 'data') cb(Buffer.from('<response><status>ACCEPTED</status></response>'));
    if (event === 'end') cb();
    return mockRes;
  });
  return { mockRes, mockReq };
}

describe('send-to-nap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NAP_ENABLED', 'true');
    vi.stubEnv('NAP_MOCK_MODE', 'false');
    vi.stubEnv('NAP_TEST_CERT_PATH', '/certs/test.pem');
    vi.stubEnv('NAP_TEST_KEY_PATH', '/certs/test-key.pem');
    mockFsExists.mockReturnValue(true);
    mockFsReadFile.mockReturnValue('fake-cert-pem-data');

    mockCreateSign.mockReturnValue({
      update: mockSignUpdate,
      end: mockSignEnd,
      sign: mockSign,
    });
    mockSign.mockReturnValue(Buffer.from('fake-signature'));
    mockCreateHash.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('fake-digest'),
    });
  });

  it('should return mock mode when NAP_MOCK_MODE=true', async () => {
    vi.stubEnv('NAP_MOCK_MODE', 'true');
    const mod = await import('@/lib/e-invoice/send-to-nap');
    const result = await mod.sendInvoiceToNAP('<Invoice/>', 'test');
    expect(result.success).toBe(true);
    expect(result.mode).toBe('mock');
  });

  it('should return disabled when NAP_ENABLED is not true', async () => {
    vi.stubEnv('NAP_ENABLED', 'false');
    const mod = await import('@/lib/e-invoice/send-to-nap');
    const result = await mod.sendInvoiceToNAP('<Invoice/>', 'test');
    expect(result.success).toBe(false);
    expect(result.mode).toBe('disabled');
  });

  it('should send SOAP request via HTTPS with mTLS', async () => {
    const { mockRes, mockReq } = makeMockReqRes();
    mockRes.on.mockImplementation((event: string, cb: Function) => {
      if (event === 'data') cb(Buffer.from('<response><status>REGISTERED</status><napRegistrationId>NAP-ABC</napRegistrationId></response>'));
      if (event === 'end') cb();
      return mockRes;
    });
    mockHttpsRequest.mockImplementation((_opts: any, cb: Function) => { cb(mockRes); return mockReq; });

    const mod = await import('@/lib/e-invoice/send-to-nap');
    const result = await mod.sendInvoiceToNAP('<Invoice><Amount>100</Amount></Invoice>', 'test');

    expect(result.success).toBe(true);
    expect(result.mode).toBe('live');
    expect(mockHttpsRequest).toHaveBeenCalledTimes(1);

    const opts = mockHttpsRequest.mock.calls[0][0];
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('text/xml; charset=utf-8');
    expect(opts.headers['SOAPAction']).toContain('RegisterInvoice');
  });

  it('should parse NAP REGISTERED status', async () => {
    const { mockRes, mockReq } = makeMockReqRes();
    mockRes.on.mockImplementation((event: string, cb: Function) => {
      if (event === 'data') cb(Buffer.from('<response><status>REGISTERED</status><napRegistrationId>NAP-XYZ-789</napRegistrationId></response>'));
      if (event === 'end') cb();
      return mockRes;
    });
    mockHttpsRequest.mockImplementation((_opts: any, cb: Function) => { cb(mockRes); return mockReq; });

    const mod = await import('@/lib/e-invoice/send-to-nap');
    const result = await mod.sendInvoiceToNAP('<Invoice/>', 'test');
    expect(result.success).toBe(true);
    expect(result.napRegistrationId).toBe('NAP-XYZ-789');
  });

  it('should handle NAP rejection response', async () => {
    const { mockRes, mockReq } = makeMockReqRes();
    mockRes.on.mockImplementation((event: string, cb: Function) => {
      if (event === 'data') cb(Buffer.from('<response><error>Invalid BULSTAT</error></response>'));
      if (event === 'end') cb();
      return mockRes;
    });
    mockHttpsRequest.mockImplementation((_opts: any, cb: Function) => { cb(mockRes); return mockReq; });

    const mod = await import('@/lib/e-invoice/send-to-nap');
    const result = await mod.sendInvoiceToNAP('<Invoice/>', 'test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid BULSTAT');
  });

  it('should handle HTTPS request errors', async () => {
    mockHttpsRequest.mockImplementation((_opts: any, _cb: Function) => {
      const mockReq = { on: vi.fn(), write: vi.fn(), end: vi.fn() };
      mockReq.on.mockImplementation((event: string, cb: Function) => {
        if (event === 'error') cb(new Error('Connection refused'));
        return mockReq;
      });
      return mockReq;
    });

    const mod = await import('@/lib/e-invoice/send-to-nap');
    const result = await mod.sendInvoiceToNAP('<Invoice/>', 'test');
    expect(result.success).toBe(false);
    expect(result.mode).toBe('live');
  });
});
