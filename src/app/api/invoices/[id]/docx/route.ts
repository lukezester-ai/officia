import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';
import { generateInvoiceDocx } from '@/lib/invoices/invoice-docx';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedTenant();
    const { id } = await context.params;
    const invoiceId = Number(id);
    if (!Number.isFinite(invoiceId)) {
      return new Response('Invalid invoice id', { status: 400 });
    }

    let tenantId: string | null = null;
    if (auth.ok) tenantId = auth.tenantId;

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        tenantId
          ? and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId))
          : eq(invoices.id, invoiceId),
      );

    if (!invoice) return new Response('Not found', { status: 404 });

    if (!auth.ok && !['issued', 'sent', 'paid'].includes(invoice.status ?? '')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
    const [tenant] = invoice.tenantId
      ? await db.select().from(tenants).where(eq(tenants.id, invoice.tenantId))
      : [];

    const docx = await generateInvoiceDocx({
      invoiceNumber: invoice.invoiceNumber || String(invoice.id),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      sellerName: tenant?.name || 'Officia',
      sellerAddress: tenant?.address,
      sellerVat: tenant?.vatNumber || tenant?.bulstat,
      buyerName: invoice.counterpartyName || invoice.clientName || 'Клиент',
      buyerAddress: invoice.counterpartyAddress || invoice.clientAddress,
      buyerVat: invoice.counterpartyVat || invoice.clientVatNumber,
      netAmount: invoice.netAmount || '0',
      vatAmount: invoice.vatAmount || '0',
      totalAmount: invoice.totalAmount || '0',
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    });

    const filename = `invoice-${invoice.invoiceNumber || invoice.id}.docx`;
    return new Response(new Uint8Array(docx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Invoice DOCX error:', error);
    return new Response('Failed to generate DOCX', { status: 500 });
  }
}
