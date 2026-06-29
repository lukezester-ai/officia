import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getStripeSessionUrl } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { requireTenant } from '@/lib/auth/get-tenant';

const PUBLIC_PAYABLE_STATUSES = new Set(['issued', 'sent', 'pending', 'издадена', 'изпратена']);

async function canCheckoutInvoice(invoice: { tenantId: string | null; status: string | null }) {
  const { userId } = await auth();

  if (userId) {
    try {
      const { tenantId } = await requireTenant();
      return invoice.tenantId === tenantId;
    } catch {
      // Fall through to public checkout check
    }
  }

  const status = invoice.status?.toLowerCase() ?? '';
  return PUBLIC_PAYABLE_STATUSES.has(status);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: invoiceIdParam } = await params;
    const invoiceId = parseInt(invoiceIdParam, 10);
    if (isNaN(invoiceId)) {
      return new NextResponse('Invalid Invoice ID', { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const lang = typeof body.lang === 'string' ? body.lang : 'bg';

    const invoiceRecord = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);

    if (!invoiceRecord || invoiceRecord.length === 0) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const invoice = invoiceRecord[0];

    if (!(await canCheckoutInvoice(invoice))) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (invoice.status === 'paid' || invoice.status === 'платена') {
      return new NextResponse('Invoice is already paid', { status: 400 });
    }

    const amount = Number(invoice.totalAmount || invoice.total || invoice.amount || 0);

    const { url, id } = await getStripeSessionUrl(
      invoiceId,
      amount,
      'eur',
      undefined,
      invoice.invoiceNumber || invoiceId.toString(),
      lang,
    );

    await db.update(invoices).set({
      stripePaymentIntentId: id,
      paymentUrl: url,
    }).where(eq(invoices.id, invoiceId));

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
