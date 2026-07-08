import { describe, expect, it, vi, beforeEach } from 'vitest';

const defaultRow: any[] = [];
let whereResult = defaultRow;

const queryChain: any = {};
queryChain.from = vi.fn().mockReturnValue(queryChain);
queryChain.innerJoin = vi.fn().mockReturnValue(queryChain);
queryChain.where = vi.fn().mockImplementation(() => Promise.resolve(whereResult));
queryChain.groupBy = vi.fn().mockImplementation(() => Promise.resolve(whereResult));

const mockDb = { select: vi.fn(() => queryChain) };

vi.mock('@/lib/db/db', () => ({ db: mockDb }));
vi.mock('@/lib/db/schema/journal_entries', () => ({ journalLines: {}, journalHeaders: {} }));
vi.mock('@/lib/db/schema/account_plan', () => ({ accountPlan: {} }));
vi.mock('server-only', () => ({}));

describe('ReportEngine Cash Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whereResult = defaultRow;
  });

  it('should calculate operating cash flow with net profit and working capital', async () => {
    whereResult = [{ total: 10000 }];
    const { ReportEngine } = await import('@/lib/accounting/report-engine');

    vi.spyOn(queryChain, 'where').mockImplementation(() => Promise.resolve([{ total: 10000 }]));
    const r1 = vi.spyOn(queryChain, 'where');
    // Order of queries:
    // 1. revenue (sumByAccountType) -> returns 10000
    // 2. expenses (sumByAccountType) -> returns 6000
    // 3. depreciation 603 (sumByAccountCodes) -> returns 500
    // 4. receivables 411 start (sumByAccountCodesBalances) -> returns 1500
    // 5. receivables 411 end -> returns 2000
    // 6. payables 401 start -> returns 2000
    // 7. payables 401 end -> returns 3000
    // 8. vatPurchases 4531 start -> returns 600
    // 9. vatPurchases 4531 end -> returns 800
    // 10. vatSales 4532 start -> returns 900
    // 11. vatSales 4532 end -> returns 1200
    // 12. fixedAssets 201+204 (sumByAccountCodes) -> returns 1000
    // 13. loans 151 start -> returns 500
    // 14. loans 151 end -> returns 1000
    // 15. capital 101 start -> returns 0
    // 16. capital 101 end -> returns 0
    // 17. cash 501+503 end -> returns 5000
    // 18. cash 501+503 start -> returns 4000
    const results = [
      [{ total: 10000 }],  // 1. revenue
      [{ total: 6000 }],   // 2. expenses
      [{ total: 500 }],    // 3. depreciation
      [{ total: 1500 }],   // 4. receivables start
      [{ total: 2000 }],   // 5. receivables end
      [{ total: 2000 }],   // 6. payables start
      [{ total: 3000 }],   // 7. payables end
      [{ total: 600 }],    // 8. vatPurchases start
      [{ total: 800 }],    // 9. vatPurchases end
      [{ total: 900 }],    // 10. vatSales start
      [{ total: 1200 }],   // 11. vatSales end
      [{ total: 1000 }],   // 12. fixedAssets (period)
      [{ total: 500 }],    // 13. loans start
      [{ total: 1000 }],   // 14. loans end
      [{ total: 0 }],      // 15. capital start
      [{ total: 0 }],      // 16. capital end
      [{ total: 5000 }],   // 17. cash end
      [{ total: 4000 }],   // 18. cash start
    ];
    let callCount = 0;
    r1.mockImplementation(() => {
      const r = results[callCount] || [{ total: 0 }];
      callCount++;
      return Promise.resolve(r);
    });

    const result = await ReportEngine.generateCashFlowDetailed(
      'test-tenant', new Date('2026-01-01'), new Date('2026-01-31'),
    );

    expect(result.netProfit).toBe(4000);
    expect(result.depreciation).toBe(500);

    expect(result.workingCapital.receivables.start).toBe(1500);
    expect(result.workingCapital.receivables.end).toBe(2000);
    expect(result.workingCapital.receivables.change).toBe(500);

    expect(result.workingCapital.payables.start).toBe(2000);
    expect(result.workingCapital.payables.end).toBe(3000);
    expect(result.workingCapital.payables.change).toBe(1000);

    expect(result.operating.total).toBeGreaterThan(0);
    expect(result.cash.start).toBe(4000);
    expect(result.cash.end).toBe(5000);
  });

  it('should return zeros when no data exists', async () => {
    vi.spyOn(queryChain, 'where').mockImplementation(() => Promise.resolve([]));

    const { ReportEngine } = await import('@/lib/accounting/report-engine');
    const result = await ReportEngine.generateCashFlowDetailed(
      'test-tenant', new Date('2026-01-01'), new Date('2026-01-31'),
    );

    expect(result.netProfit).toBe(0);
    expect(result.depreciation).toBe(0);
    expect(result.operating.total).toBe(0);
    expect(Math.abs(result.investing.total)).toBe(0);
    expect(result.financing.total).toBe(0);
    expect(result.netCashFlow).toBe(0);
  });
});
