import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getStripeSessionUrl } from '@/lib/stripe';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';
import { parseUuidParam } from '@/lib/utils/ids';
import { withRateLimit } from '@/lib/api/rate-limit';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRateLimit(req, () => createCheckout(req, params), 'invoices:checkout');
}

async function createCheckout(req: Request, params: Promise<{ id: string }>) {
  try {
    const { tenantId } = await requireTenant();

    const { id: invoiceIdParam } = await params;
    const invoiceId = parseUuidParam(invoiceIdParam);
    if (!invoiceId) {
      return new NextResponse("Invalid Invoice ID", { status: 400 });
    }

    const invoiceRecord = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId))).limit(1);
    if (!invoiceRecord || invoiceRecord.length === 0) {
      return new NextResponse("Invoice not found", { status: 404 });
    }
    const invoice = invoiceRecord[0];

    // Check if already paid
    if (invoice.status === 'paid' || invoice.status === 'платена') {
      return new NextResponse("Invoice is already paid", { status: 400 });
    }

    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId)).catch(() => []);
    const amount = getInvoiceEffectiveAmount(invoice, lines);

    if (amount <= 0) {
      return new NextResponse("Invoice amount must be greater than 0", { status: 400 });
    }

    // Create session
    const { url, id } = await getStripeSessionUrl(
      invoiceId, 
      amount, 
      'eur', // Change to BGN or other if needed dynamically
      undefined, 
      invoice.invoiceNumber || invoiceId
    );

    // Update invoice with intent ID and sync normalized totalAmount
    await db.update(invoices).set({
      stripePaymentIntentId: id,
      paymentUrl: url,
      totalAmount: amount.toString()
    }).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('[STRIPE_CHECKOUT_ERROR]', error);
    const msg = String(error?.message || '');
    if (msg.includes('Not authenticated') || msg.includes('Unauthorized')) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
