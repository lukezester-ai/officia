import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { eq } from 'drizzle-orm';
import { sendInvoiceToNAP } from '@/lib/e-invoice/send-to-nap';
import { UblInvoiceData } from '@/lib/e-invoice/ubl-generator';
import { napB2GClient } from '@/lib/accounting/nap-b2g-client';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const invoiceId = parseInt(params.id, 10);
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    if (!invoice.tenantId) {
      return NextResponse.json({ error: 'Invoice missing organization binding' }, { status: 400 });
    }

    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId));

    // Fetch NAP key for the organization
    const apiKey = await napB2GClient.getIntegrationKey(invoice.tenantId);
    if (!apiKey) {
      return NextResponse.json({ error: 'Не е намерена активна НАП интеграция за тази организация. Моля, добавете ключ в настройките.' }, { status: 403 });
    }

    const ublData: UblInvoiceData = {
      invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
      issueDate: invoice.issueDate || new Date(),
      dueDate: invoice.dueDate || invoice.issueDate || new Date(),
      currency: 'BGN',
      supplier: {
        name: 'Моята Фирма ООД', // В реална среда се взима от Tenant профила
        vatNumber: 'BG123456789',
        companyId: '123456789',
        address: 'гр. София, ул. Примерна 1'
      },
      customer: {
        name: invoice.clientName || invoice.counterpartyName || 'Неизвестен Клиент',
        vatNumber: invoice.clientVatNumber || invoice.counterpartyVat || 'Неизвестен',
        companyId: invoice.counterpartyEik || undefined,
        address: invoice.clientAddress || invoice.counterpartyAddress || 'Неизвестен адрес'
      },
      items: lines.map(line => ({
        description: line.description || 'Артикул',
        quantity: parseFloat(line.quantity as string) || 1,
        unitPrice: parseFloat(line.unitPrice as string) || 0,
        netAmount: parseFloat(line.lineNet as string) || 0,
        vatRate: parseFloat(line.vatRate as string) || 20,
        vatAmount: parseFloat(line.lineVat as string) || 0
      })),
      totals: {
        netAmount: parseFloat(invoice.netAmount as string) || 0,
        vatAmount: parseFloat(invoice.vatAmount as string) || 0,
        payableAmount: parseFloat(invoice.totalAmount as string) || parseFloat(invoice.total as string) || 0
      }
    };

    const result = await sendInvoiceToNAP(ublData, 'production', apiKey);

    if (result.success) {
      // Обновяване на статуса на фактурата
      await db.update(invoices)
        .set({ einvoiceStatus: 'approved' })
        .where(eq(invoices.id, invoiceId));
        
      return NextResponse.json({ success: true, message: 'Успешно изпратена фактура към НАП (e-Invoicing).' });
    } else {
      await db.update(invoices)
        .set({ einvoiceStatus: 'error', errorReason: result.error || 'Unknown error' })
        .where(eq(invoices.id, invoiceId));
        
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Send to NAP API]', error);
    return NextResponse.json({ error: 'Възникна грешка при обработката' }, { status: 500 });
  }
}
