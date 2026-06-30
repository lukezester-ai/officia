'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv, downloadXlsx } from '@/lib/export/table-export';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Чернова',
  issued: 'Издадена',
  paid: 'Платена',
  cancelled: 'Анулирана',
};

export function ExportInvoicesButton({ invoices }: { invoices: any[] }) {
  const rows = invoices.map((inv) => ({
    number: inv.invoiceNumber || inv.id,
    counterparty: inv.counterpartyName || '',
    issueDate: inv.issueDate || '',
    total: inv.totalAmount || '0',
    status: STATUS_LABELS[inv.status] || inv.status,
  }));

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={rows.length === 0}
        onClick={() =>
          downloadCsv('fakturi', rows, [
            { key: 'number', header: 'Номер' },
            { key: 'counterparty', header: 'Контрагент' },
            { key: 'issueDate', header: 'Дата' },
            { key: 'total', header: 'Сума €' },
            { key: 'status', header: 'Статус' },
          ])
        }
      >
        <Download size={14} /> CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={rows.length === 0}
        onClick={() =>
          downloadXlsx('fakturi', 'Фактури', rows, [
            { key: 'number', header: 'Номер' },
            { key: 'counterparty', header: 'Контрагент' },
            { key: 'issueDate', header: 'Дата' },
            { key: 'total', header: 'Сума €' },
            { key: 'status', header: 'Статус' },
          ])
        }
      >
        <Download size={14} /> Excel
      </Button>
    </div>
  );
}
