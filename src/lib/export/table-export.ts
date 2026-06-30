'use client';

import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

export type ExportColumn<T> = {
  key: keyof T | string;
  header: string;
  value?: (row: T) => string | number;
};

function cellValue<T extends Record<string, unknown>>(row: T, col: ExportColumn<T>): string {
  if (col.value) return String(col.value(row));
  const raw = row[col.key as keyof T];
  if (raw == null) return '';
  return String(raw);
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: ExportColumn<T>[],
) {
  const header = columns.map((c) => c.header);
  const lines = rows.map((row) =>
    columns.map((col) => `"${cellValue(row, col).replace(/"/g, '""')}"`).join(','),
  );
  const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export async function downloadXlsx<T extends Record<string, unknown>>(
  filename: string,
  sheetName: string,
  rows: T[],
  columns: ExportColumn<T>[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Officia';
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  ws.addRow(columns.map((c) => c.header));
  rows.forEach((row) => ws.addRow(columns.map((col) => cellValue(row, col))));
  ws.getRow(1).font = { bold: true };
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
