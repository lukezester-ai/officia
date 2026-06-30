'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/export/table-export';

type PayrollRow = {
  name: string;
  position: string;
  gross: number;
  doo: number;
  dzpo: number;
  zzo: number;
  tax: number;
  net: number;
};

export function PayrollExportButton({ rows }: { rows: PayrollRow[] }) {
  return (
    <Button
      variant="outline"
      className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
      onClick={() =>
        downloadCsv(
          `payroll-${new Date().toISOString().slice(0, 7)}`,
          rows,
          [
            { key: 'name', header: 'Служител' },
            { key: 'position', header: 'Длъжност' },
            { key: 'gross', header: 'Бруто €' },
            { key: 'doo', header: 'ДОО €' },
            { key: 'dzpo', header: 'ДЗПО €' },
            { key: 'zzo', header: 'ЗЗО €' },
            { key: 'tax', header: 'ДОД €' },
            { key: 'net', header: 'Нето €' },
          ],
        )
      }
      disabled={rows.length === 0}
    >
      <Download size={16} /> Експорт CSV
    </Button>
  );
}
