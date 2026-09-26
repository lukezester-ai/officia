'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, and } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { calculatePayroll } from '@/lib/payroll/calculator';
import {
  buildPayrollDeclaration,
  previousDeclarationPeriod,
  renderPayrollDeclarationXml,
  type DeclarationDraft,
} from '@/lib/payroll/declarations';

export async function getPayrollData() {
  try {
    const { tenantId } = await requireTenant();
    
    // Взимаме само активните служители
    const activeEmployees = await db.select().from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));
      
    const now = new Date();
    const monthName = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'][now.getMonth()];
    let totalGross = 0;
    let totalDoo = 0;
    let totalDzpo = 0;
    let totalZzo = 0;
    let totalTax = 0;
    let totalNet = 0;

    const payrollList = activeEmployees.map(emp => {
      const gross = parseFloat(emp.salary || '0');
      const calc = calculatePayroll(gross, monthName, now.getFullYear());
      const doo = calc.employee.doo;
      const dzpo = calc.employee.dzpo;
      const zzo = calc.employee.zo;
      const tax = calc.ddfl;
      const net = calc.netSalary;
      
      // Добавяне към общите суми
      totalGross += gross;
      totalDoo += doo;
      totalDzpo += dzpo;
      totalZzo += zzo;
      totalTax += tax;
      totalNet += net;

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        position: emp.position,
        gross: gross,
        doo: doo,
        dzpo: dzpo,
        zzo: zzo,
        tax: tax,
        net: net
      };
    });

    return { 
      success: true, 
      data: {
        list: payrollList,
        totals: {
          gross: totalGross,
          doo: totalDoo,
          dzpo: totalDzpo,
          zzo: totalZzo,
          tax: totalTax,
          net: totalNet,
          // Всички удръжки към държавата (от служителя)
          totalDeductions: totalDoo + totalDzpo + totalZzo + totalTax
        }
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPayrollDeclaration(): Promise<
  { success: true; draft: DeclarationDraft; xml: string } | { success: false; error: string }
> {
  try {
    const { tenantId } = await requireTenant();
    const [company] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const activeEmployees = await db.select().from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));
    const period = previousDeclarationPeriod(new Date());
    const draft = buildPayrollDeclaration({
      year: period.year,
      month: period.month,
      eik: company?.bulstat || '',
      employees: activeEmployees.map((employee) => ({
        firstName: employee.firstName,
        lastName: employee.lastName,
        egn: employee.egn,
        grossSalary: Number(employee.salary || '0'),
      })),
    });
    return { success: true, draft, xml: renderPayrollDeclarationXml(draft) };
  } catch (error) {
    console.error('[payroll declaration]', error);
    return { success: false, error: 'Декларацията не можа да се подготви.' };
  }
}

export async function postPayrollToJournal() {
  try {
    const { tenantId } = await requireTenant();
    const payroll = await getPayrollData();
    if (!payroll.success || !payroll.data) {
      return { success: false, error: 'Грешка при изчисление на ведомостта' };
    }

    const { gross, net, totalDeductions } = payroll.data.totals;
    const { journalHeaders } = await import('@/lib/db/schema/journal_entries');

    const [entry] = await db.insert(journalHeaders).values({
      tenantId,
      journalNumber: `PAY-${Date.now().toString().slice(-6)}`,
      entryDate: new Date(),
      description: `Начислени заплати за ${new Date().toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })}`,
      totalAmount: gross.toFixed(2),
      status: 'posted',
      sourceType: 'payroll',
    } as any).returning();

    return { success: true, journalNumber: entry?.journalNumber || `PAY-${Date.now().toString().slice(-6)}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
