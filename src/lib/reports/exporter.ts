import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type ReportRow = Record<string, string | number>;

export async function exportToExcel(reportData: { rows?: ReportRow[]; title?: string }, reportName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Officia ERP';
  const ws = wb.addWorksheet(reportName.slice(0, 31) || 'Report');
  const rows = reportData.rows ?? [];

  if (rows.length === 0) {
    ws.addRow(['Няма данни за експорт']);
  } else {
    const headers = Object.keys(rows[0]);
    ws.addRow(headers);
    rows.forEach((row) => ws.addRow(headers.map((header) => row[header] ?? '')));
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportToPDF(reportData: { rows?: ReportRow[]; title?: string }, reportName: string) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const title = reportData.title || reportName;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Генерирано: ${new Date().toLocaleString('bg-BG')}`, 14, 26);

  const rows = reportData.rows ?? [];
  if (rows.length === 0) {
    doc.text('Няма данни за експорт', 14, 36);
  } else {
    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => headers.map((header) => String(row[header] ?? '')));
    doc.autoTable({
      startY: 32,
      head: [headers],
      body,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export type TaxDeclarationPdfInput = {
  type: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalAmount?: string | null;
  status?: string | null;
  companyName?: string;
};

export function generateTaxDeclarationPdf(input: TaxDeclarationPdfInput): Buffer {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const companyName = input.companyName || 'Officia';

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Данъчна декларация', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.text(companyName, pageWidth / 2, 22, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  let y = 44;
  const lines = [
    ['Тип', input.type.toUpperCase()],
    ['Период', `${input.periodStart ?? '—'} – ${input.periodEnd ?? '—'}`],
    ['Сума', `${Number(input.totalAmount ?? 0).toFixed(2)} €`],
    ['Статус', input.status ?? '—'],
  ];

  lines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 16, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 52, y);
    y += 10;
  });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Генерирано на ${new Date().toLocaleString('bg-BG')}`, 16, 280);

  return Buffer.from(doc.output('arraybuffer'));
}
