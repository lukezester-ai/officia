// @ts-nocheck
import { NextResponse } from 'next/server';
import { runStatutoryDeadlineCronEngine } from '@/lib/calendar/deadline-rule-engine';
import { runMonthlyDepreciation } from '@/lib/accounting/depreciation-engine';
import { runCurrencyRevaluation } from '@/lib/accounting/revaluation-engine';
import { runAIWatchdog } from '@/lib/ai/watchdog-engine';

/**
 * ТИКЕТ 6, ЕПИК 2, ЕПИК 3 и WATCHDOG: Cron API Endpoint за дедлайни, амортизации, преоценка и надзор.
 * Извиква се от Vercel Cron или външен таймер веднъж дневно / при влизане.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') || undefined;

    // 0. AI Watchdog (Надзорник) - сканира за аномалии
    let watchdogResult = null;
    if (tenantId) {
      watchdogResult = await runAIWatchdog(tenantId);
    }

    // 1. Проверка за нормативни срокове (ДДС, Осигуровки)
    const deadlineResult = await runStatutoryDeadlineCronEngine(tenantId);

    // 2. Проверка дали днес е последният ден от месеца за Амортизации и Преоценка
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
      }
    }

    return NextResponse.json({
      watchdog: watchdogResult,
      deadlines: deadlineResult,
      depreciations: depreciationResult,
      revaluations: revaluationResult
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
