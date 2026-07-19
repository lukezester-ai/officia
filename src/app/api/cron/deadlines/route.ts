// @ts-nocheck
import { NextResponse } from 'next/server';
import { runStatutoryDeadlineCronEngine } from '@/lib/calendar/deadline-rule-engine';
import { runMonthlyDepreciation } from '@/lib/accounting/depreciation-engine';
import { runCurrencyRevaluation } from '@/lib/accounting/revaluation-engine';
import { runAIWatchdog } from '@/lib/ai/watchdog-engine';
import { runBankSyncPipeline, runMonthClosePipeline } from '@/lib/ai/orchestration';

/**
 * Cron: deadlines + depreciation + revaluation + AI watchdog + cross-agent automation.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') || undefined;

    let watchdogResult = null;
    let bankSyncResult = null;
    let monthCloseResult = null;

    if (tenantId) {
      watchdogResult = await runAIWatchdog(tenantId);
      // Nightly bank sync across agents
      bankSyncResult = await runBankSyncPipeline({ tenantId }).catch((err) => ({
        success: false,
        error: err.message,
      }));
    }

    const deadlineResult = await runStatutoryDeadlineCronEngine(tenantId);

    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let depreciationResult = null;
    let revaluationResult = null;

    if (now.getDate() === lastDayOfMonth) {
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const yearStr = String(now.getFullYear());

      if (tenantId) {
        depreciationResult = await runMonthlyDepreciation(tenantId, monthStr, yearStr);
        revaluationResult = await runCurrencyRevaluation(tenantId, monthStr, yearStr);
        // Propose VAT + depreciation via approval queue (human-in-the-loop)
        monthCloseResult = await runMonthClosePipeline({
          tenantId,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        }).catch((err) => ({ success: false, error: err.message }));
      }
    } else if (tenantId && now.getDate() >= 25) {
      // Pre-close window: queue month-close approvals early
      monthCloseResult = await runMonthClosePipeline({
        tenantId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }).catch((err) => ({ success: false, error: err.message }));
    }

    return NextResponse.json({
      watchdog: watchdogResult,
      bankSync: bankSyncResult,
      monthClose: monthCloseResult,
      deadlines: deadlineResult,
      depreciations: depreciationResult,
      revaluations: revaluationResult,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
