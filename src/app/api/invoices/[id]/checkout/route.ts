import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getStripeSessionUrl } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id: invoiceIdParam } = await params;
    const invoiceId = parseInt(invoiceIdParam, 10);
    if (isNaN(invoiceId)) {
      return new NextResponse("Invalid Invoice ID", { status: 400 });
    }

    // Get invoice and lines
    const invoiceRecord = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
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
      invoice.invoiceNumber || invoiceId.toString()
    );

    // Update invoice with intent ID and sync normalized totalAmount
    await db.update(invoices).set({
      stripePaymentIntentId: id,
      paymentUrl: url,
      totalAmount: amount.toString()
    }).where(eq(invoices.id, invoiceId));

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT_ERROR]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
