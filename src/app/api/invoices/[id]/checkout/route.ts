import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getStripeSessionUrl } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const invoiceId = parseInt(await Promise.resolve(params.id), 10);
    if (isNaN(invoiceId)) {
      return new NextResponse("Invalid Invoice ID", { status: 400 });
    }

    // Get invoice
    const invoiceRecord = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    
    if (!invoiceRecord || invoiceRecord.length === 0) {
      return new NextResponse("Invoice not found", { status: 404 });
    }
    
    const invoice = invoiceRecord[0];
    
    // Check if already paid
    if (invoice.status === 'paid' || invoice.status === 'платена') {
      return new NextResponse("Invoice is already paid", { status: 400 });
    }

    const amount = Number(invoice.totalAmount || invoice.total || invoice.amount || 0);

    // Create session
    const { url, id } = await getStripeSessionUrl(
      invoiceId, 
      amount, 
      'eur', // Change to BGN or other if needed dynamically
      undefined, 
      invoice.invoiceNumber || invoiceId.toString()
    );

    // Update invoice with intent ID
    await db.update(invoices).set({
      stripePaymentIntentId: id,
      paymentUrl: url
    }).where(eq(invoices.id, invoiceId));

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT_ERROR]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
