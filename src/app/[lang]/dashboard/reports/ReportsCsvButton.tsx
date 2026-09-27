'use client';

import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';

export function ReportsCsvButton({ rows }: { rows: { label: string; value: string }[] }) {
  function download() {
    const csv = `\uFEFF${rows.map((row) => `"${row.label}","${row.value}"`).join('\n')}`;
    const link = document.createElement('a');
    link.href = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
    link.download = 'officia-fakturi.csv';
    link.click();
  }

  return (
    <Button type="button" variant="outline" onClick={download} className="gap-2">
      <FileSpreadsheet size={16} /> Свали CSV
    </Button>
  );
}
