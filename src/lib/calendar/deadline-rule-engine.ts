// @ts-nocheck
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, and } from 'drizzle-orm';

export interface StatutoryDeadlineRule {
  id: string;
  title: string;
  description: string;
  dueDateStr: string; // e.g. "14-07-2026"
  priority: 'normal' | 'high' | 'critical';
  type: string;
}

/**
 * ТИКЕТ 6: Deadline/Calendar модул (Hardcoded Rule Engine + Notification Queue).
 * Генерира известия и задачи в съществуващата система (ai_inbox_items) без нужда от тежък UI календар.
 * Правила за българското данъчно и осигурително законодателство:
 * 1. 14-о число: ДДС Справка-декларация и дневници към НАП за предходния месец.
 * 2. 25-о число: Декларации Образец 1 и Образец 6 (Осигуровки) към НАП.
 * 3. 25-о число: Внасяне на ДОО, ДЗПО, ЗО и ДДФЛ (ТРЗ плащания).
 * 4. 30 юни: Подаване на ГДД по чл. 92 от ЗКПО и публикуване на ГФО.
 */
export async function runStatutoryDeadlineCronEngine(tenantId?: string): Promise<{ success: boolean; generatedAlertsCount: number; errors?: string[] }> {
  const errors: string[] = [];
  let alertsCount = 0;

  try {
    const activeTenants = tenantId
      ? await db.select().from(tenants).where(eq(tenants.id, tenantId))
      : await db.select().from(tenants);

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Изчисляваме предходния месец за данъчния период
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const taxPeriodMonth = lastMonthDate.getMonth() + 1;
    const taxPeriodYear = lastMonthDate.getFullYear();

    for (const tenant of activeTenants) {
      const rulesToTrigger: StatutoryDeadlineRule[] = [];

      // ПРАВИЛО 1: ДДС декларация (до 14-о число на текущия месец за миналия)
      if (currentDay <= 14) {
        // Проверяваме дали вече имаме подадена ДДС декларация за периода
        const existingVat = await db.select().from(vatJournals).where(
          and(
            eq(vatJournals.tenantId, tenant.id),
            eq(vatJournals.periodMonth, taxPeriodMonth),
            eq(vatJournals.periodYear, taxPeriodYear)
          )
        );

        if (existingVat.length === 0) {
          rulesToTrigger.push({
            id: `vat_deadline_${taxPeriodYear}_${taxPeriodMonth}`,
            title: `⏰ Изтича срокът за ДДС (до 14-${String(currentMonth).padStart(2, '0')}-${currentYear})`,
            description: `Справка-декларацията и дневниците по ДДС за м. ${String(taxPeriodMonth).padStart(2, '0')}/${taxPeriodYear} трябва да се подадат в НАП до 14-о число.`,
            dueDateStr: `14-${String(currentMonth).padStart(2, '0')}-${currentYear}`,
            priority: currentDay >= 12 ? 'critical' : 'high',
            type: 'statutory_deadline_vat',
          });
        }
      }

      // ПРАВИЛО 2: Осигуровки Образец 1 и Образец 6 (до 25-о число на текущия месец)
      if (currentDay <= 25) {
        rulesToTrigger.push({
          id: `payroll_obr1_6_${taxPeriodYear}_${taxPeriodMonth}`,
          title: `📑 НАП Декларации Обр. 1 и 6 (до 25-${String(currentMonth).padStart(2, '0')}-${currentYear})`,
          description: `Крайният срок за подаване на данни за осигурените лица (Обр. 1 и 6) за м. ${String(taxPeriodMonth).padStart(2, '0')}/${taxPeriodYear} е 25-о число.`,
          dueDateStr: `25-${String(currentMonth).padStart(2, '0')}-${currentYear}`,
          priority: currentDay >= 22 ? 'critical' : 'normal',
          type: 'statutory_deadline_payroll',
        });
      }

      // ПРАВИЛО 3: Плащане на заплати, осигуровки и ДДФЛ (до 25-о число)
      if (currentDay <= 25 && currentDay >= 15) {
        rulesToTrigger.push({
          id: `payroll_payment_${taxPeriodYear}_${taxPeriodMonth}`,
          title: `💶 Внасяне на осигурителни вноски и ДДФЛ (до 25-${String(currentMonth).padStart(2, '0')}-${currentYear})`,
          description: `Дължимите осигурителни вноски (ДОО, ДЗПО, ЗО) и данък общ доход за м. ${String(taxPeriodMonth).padStart(2, '0')}/${taxPeriodYear} трябва да се преведат по сметките на НАП.`,
          dueDateStr: `25-${String(currentMonth).padStart(2, '0')}-${currentYear}`,
          priority: currentDay >= 23 ? 'critical' : 'high',
          type: 'statutory_deadline_tax_pay',
        });
      }

      // ПРАВИЛО 4: Годишни данъчни декларации (до 30 юни всяка година)
      if (currentMonth >= 5 && currentMonth <= 6) {
        rulesToTrigger.push({
          id: `annual_zkpo_${currentYear}`,
          title: `🏛️ Годишен финансов отчет и ГДД по чл. 92 ЗКПО (до 30.06.${currentYear})`,
          description: `Годишната данъчна декларация по ЗКПО за финансовата ${currentYear - 1} г. и публикуването на ГФО в Търговския регистър изтичат на 30 юни.`,
          dueDateStr: `30-06-${currentYear}`,
          priority: currentMonth === 6 && currentDay >= 20 ? 'critical' : 'normal',
          type: 'statutory_deadline_annual',
        });
      }

      // Вписваме в ai_inbox_items, ако вече няма отворено известие за същия sourceId
      for (const rule of rulesToTrigger) {
        const [existingAlert] = await db.select().from(aiInboxItems).where(
          and(
            eq(aiInboxItems.tenantId, tenant.id),
            eq(aiInboxItems.sourceId, rule.id),
            eq(aiInboxItems.status, 'open')
          )
        );

        if (!existingAlert) {
          await db.insert(aiInboxItems).values({
            tenantId: tenant.id,
            type: rule.type,
            sourceType: 'rule_engine_cron',
            sourceId: rule.id,
            title: rule.title,
            description: rule.description,
            confidence: '1.00',
            status: 'open',
            priority: rule.priority,
            metaJson: { dueDate: rule.dueDateStr, generatedAt: new Date().toISOString() },
            createdAt: new Date(),
          });
          alertsCount++;
        }
      }
    }

    return { success: true, generatedAlertsCount: alertsCount };
  } catch (err: any) {
    console.error('[runStatutoryDeadlineCronEngine] Error:', err);
    errors.push(err.message);
    return { success: false, generatedAlertsCount: alertsCount, errors };
  }
}
