import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export type InvoicePdfLine = {
  description: string | null;
  quantity: string | null;
  unitPrice: string | null;
  lineTotal: string | null;
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  issueDate: string | null;
  dueDate?: string | null;
  status?: string | null;
  sellerName: string;
  sellerAddress?: string | null;
  sellerVat?: string | null;
  sellerLogo?: string | null;
  buyerName: string;
  buyerAddress?: string | null;
  buyerVat?: string | null;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  lines: InvoicePdfLine[];
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = res.headers.get('content-type') || 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  let logoBase64: string | null = null;
  if (input.sellerLogo) {
    logoBase64 = await fetchImageAsBase64(input.sellerLogo);
  }

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 28, 'F');
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, 3, 22, 22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ФАКТУРА', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`№ ${input.invoiceNumber}`, pageWidth / 2, 20, { align: 'center' });
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ФАКТУРА', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`№ ${input.invoiceNumber}`, pageWidth / 2, 20, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let y = 38;
  doc.setFont('helvetica', 'bold');
  doc.text('Доставчик:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(input.sellerName, 14, y + 6);
  if (input.sellerAddress) doc.text(input.sellerAddress, 14, y + 11);
  if (input.sellerVat) doc.text(`ДДС №: ${input.sellerVat}`, 14, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('Получател:', pageWidth / 2 + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.text(input.buyerName, pageWidth / 2 + 4, y + 6);
  if (input.buyerAddress) doc.text(input.buyerAddress, pageWidth / 2 + 4, y + 11);
  if (input.buyerVat) doc.text(`ДДС №: ${input.buyerVat}`, pageWidth / 2 + 4, y + 16);

  y += 28;
  doc.text(`Дата: ${input.issueDate ?? '—'}`, 14, y);
  if (input.dueDate) doc.text(`Падеж: ${input.dueDate}`, 80, y);
  if (input.status) doc.text(`Статус: ${input.status}`, 140, y);

  const tableLines =
    input.lines.length > 0
      ? input.lines
      : [
          {
            description: 'Услуги / стоки',
            quantity: '1',
            unitPrice: input.netAmount,
            lineTotal: input.netAmount,
          },
        ];

  doc.autoTable({
    startY: y + 6,
    head: [['Описание', 'Кол.', 'Ед. цена €', 'Сума €']],
    body: tableLines.map((line) => [
      line.description ?? '',
      line.quantity ?? '1',
      line.unitPrice ?? '0',
      line.lineTotal ?? '0',
    ]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Нето: ${Number(input.netAmount).toFixed(2)} €`, pageWidth - 14, finalY, { align: 'right' });
  doc.text(`ДДС: ${Number(input.vatAmount).toFixed(2)} €`, pageWidth - 14, finalY + 6, { align: 'right' });
  doc.setFontSize(12);
  doc.text(`Общо: ${Number(input.totalAmount).toFixed(2)} €`, pageWidth - 14, finalY + 14, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Генерирано от Officia · ${new Date().toLocaleString('bg-BG')}`, 14, 285);

  return Buffer.from(doc.output('arraybuffer'));
}
