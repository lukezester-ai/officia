import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { InvoicePdfInput, InvoicePdfLine } from '@/lib/invoices/invoice-pdf';

function lineRows(lines: InvoicePdfLine[], netAmount: string) {
  const rows =
    lines.length > 0
      ? lines
      : [{ description: 'Услуги / стоки', quantity: '1', unitPrice: netAmount, lineTotal: netAmount }];

  return rows.map(
    (line) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(line.description ?? '')] }),
          new TableCell({ children: [new Paragraph(line.quantity ?? '1')] }),
          new TableCell({ children: [new Paragraph(line.unitPrice ?? '0')] }),
          new TableCell({ children: [new Paragraph(line.lineTotal ?? '0')] }),
        ],
      }),
  );
}

export async function generateInvoiceDocx(input: InvoicePdfInput): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'ФАКТУРА', bold: true, size: 32 })],
          }),
          new Paragraph(`№ ${input.invoiceNumber}`),
          new Paragraph(`Дата: ${input.issueDate ?? '—'}`),
          new Paragraph(''),
          new Paragraph({ children: [new TextRun({ text: 'Доставчик', bold: true })] }),
          new Paragraph(input.sellerName),
          ...(input.sellerAddress ? [new Paragraph(input.sellerAddress)] : []),
          ...(input.sellerVat ? [new Paragraph(`ДДС №: ${input.sellerVat}`)] : []),
          new Paragraph(''),
          new Paragraph({ children: [new TextRun({ text: 'Получател', bold: true })] }),
          new Paragraph(input.buyerName),
          ...(input.buyerAddress ? [new Paragraph(input.buyerAddress)] : []),
          ...(input.buyerVat ? [new Paragraph(`ДДС №: ${input.buyerVat}`)] : []),
          new Paragraph(''),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Описание', 'Кол.', 'Ед. цена €', 'Сума €'].map(
                  (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] }),
                ),
              }),
              ...lineRows(input.lines, input.netAmount),
            ],
          }),
          new Paragraph(''),
          new Paragraph(`Нето: ${Number(input.netAmount).toFixed(2)} €`),
          new Paragraph(`ДДС: ${Number(input.vatAmount).toFixed(2)} €`),
          new Paragraph({
            children: [new TextRun({ text: `Общо: ${Number(input.totalAmount).toFixed(2)} €`, bold: true })],
          }),
          new Paragraph(''),
          new Paragraph({
            children: [
              new TextRun({
                text: `Генерирано от Officia · ${new Date().toLocaleString('bg-BG')}`,
                size: 18,
                color: '666666',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
