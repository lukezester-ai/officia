'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { eq, and } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getPayrollData() {
  try {
    const { tenantId } = await requireTenant();
    
    // Взимаме само активните служители
    const activeEmployees = await db.select().from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));
      
    // Параметри за 2024/2025 (Трета категория труд, родени след 1959)
    // Максимален осигурителен доход
    const MAX_INSURANCE_BASE = 3750;
    
    // Проценти за сметка на служителя:
    const DOO_PERCENT = 10.52; // Държавно обществено осигуряване
    const DZPO_PERCENT = 2.20;  // Допълнително задължително пенсионно
    const ZZO_PERCENT = 3.20;   // Здравно осигуряване
    const TAX_PERCENT = 10.00;  // ДОД (Данък общ доход)

    // Обработка на ведомостта
    let totalGross = 0;
    let totalDoo = 0;
    let totalDzpo = 0;
    let totalZzo = 0;
    let totalTax = 0;
    let totalNet = 0;

    const payrollList = activeEmployees.map(emp => {
      const gross = parseFloat(emp.salary || '0');
      
      // Осигурителен доход (ограничен до тавана)
      const insBase = Math.min(gross, MAX_INSURANCE_BASE);
      
      const doo = (insBase * DOO_PERCENT) / 100;
      const dzpo = (insBase * DZPO_PERCENT) / 100;
      const zzo = (insBase * ZZO_PERCENT) / 100;
      
      // Данъчна основа = Бруто - Осигуровки за сметка на лицето
      const totalIns = doo + dzpo + zzo;
      const taxBase = Math.max(0, gross - totalIns);
      const tax = (taxBase * TAX_PERCENT) / 100;
      
      const net = gross - totalIns - tax;
      
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
