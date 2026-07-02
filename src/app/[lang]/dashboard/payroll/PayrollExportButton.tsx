'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/export/table-export';
import type { PayrollCalculation } from '@/lib/payroll/calculator';

export function PayrollExportButton({ month, rows }: { month: string; rows: PayrollCalculation[] }) {
  const exportRows = rows.map((row) => ({
    employee: row.employeeName,
    position: row.position || '',
    baseSalary: row.baseSalary,
    workingDays: row.workingDays,
    workedDays: row.workedDays,
    bonus: row.bonus,
    gross: row.gross,
    insuranceBase: row.insuranceBase,
    employeeInsurance: row.employeeInsurance,
    employerInsurance: row.employerInsurance,
    tax: row.incomeTax,
    otherDeductions: row.otherDeductions,
    net: row.net,
    employerCost: row.employerCost,
  }));
  return <Button variant="outline" className="gap-2" disabled={!rows.length} onClick={() => downloadCsv(`vedomost-${month}`, exportRows, [
    { key: 'employee', header: 'Служител' }, { key: 'position', header: 'Длъжност' },
    { key: 'baseSalary', header: 'Основна заплата EUR' }, { key: 'workingDays', header: 'Работни дни' },
    { key: 'workedDays', header: 'Отработени дни' }, { key: 'bonus', header: 'Бонус EUR' },
    { key: 'gross', header: 'Брутно EUR' }, { key: 'insuranceBase', header: 'Осигурителен доход EUR' },
    { key: 'employeeInsurance', header: 'Лични осигуровки EUR' }, { key: 'employerInsurance', header: 'Осигуровки работодател EUR' },
    { key: 'tax', header: 'Данък EUR' }, { key: 'otherDeductions', header: 'Други удръжки EUR' },
    { key: 'net', header: 'Нетно EUR' }, { key: 'employerCost', header: 'Разход работодател EUR' },
  ])}><Download size={16} />Експорт CSV</Button>;
}
