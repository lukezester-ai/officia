import { db } from '../db/db';
import { bankTransactions } from '../db/schema/bank_transactions';
import { invoices } from '../db/schema/invoices';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import { autoCloseMatchedDocument } from './auto-close';

export async function runMatchEngineForTransaction(transactionId: string) {
  try {
    const [tx] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, transactionId)).limit(1);
    if (!tx || tx.isReconciled || tx.matchedInvoiceId) return { success: false, reason: 'Transaction not eligible' };

    // Find candidate invoices based on exact amount match
    // Only search unpaid invoices (issued or draft)
    const txAmount = parseFloat(tx.amount || '0');
    // Only looking for positive amounts (incoming payments) to match with Sales Invoices
    if (txAmount <= 0) return { success: false, reason: 'Only processing incoming payments for sales invoices currently' };

    const candidates = await db.select().from(invoices)
      .where(
        or(
          eq(invoices.status, 'issued'),
          eq(invoices.status, 'draft')
        )
      );

    let bestMatch = null;
    let maxConfidence = 0;

    for (const inv of candidates) {
      let confidence = 0;
      const invTotal = parseFloat(inv.totalAmount || '0');

      // Amount Match (highest weight)
      if (Math.abs(invTotal - txAmount) < 0.01) {
        confidence += 0.6;
      }

      // Name Match (string similarity simplified)
      const tName = (tx.counterpartyName || '').toLowerCase();
      const iName = (inv.counterpartyName || '').toLowerCase();
      if (tName && iName && (tName.includes(iName) || iName.includes(tName))) {
        confidence += 0.3;
      }

      // Invoice Number in description Match
      const desc = (tx.description || '').toLowerCase();
      const invNum = (inv.invoiceNumber || '').toLowerCase();
      if (invNum && desc.includes(invNum)) {
        confidence += 0.4;
      }

      if (confidence > maxConfidence) {
        maxConfidence = Math.min(confidence, 1.0); // Cap at 1.0
        bestMatch = inv;
      }
    }

    if (bestMatch && maxConfidence >= 0.85) {
      // Auto-confirm and auto-close invoice for high confidence matches (e.g. 87% auto-match)
      await db.update(bankTransactions).set({
        matchedInvoiceId: bestMatch.id,
        matchConfidence: String(maxConfidence),
        matchStatus: 'confirmed',
        isReconciled: true,
        reviewRequired: false
      }).where(eq(bankTransactions.id, transactionId));
      
      await autoCloseMatchedDocument(transactionId);
      
      return { success: true, matchedInvoice: bestMatch.id, confidence: maxConfidence, autoClosed: true };
    } else if (bestMatch && maxConfidence >= 0.5) {
      // Suggest the match for review
      await db.update(bankTransactions).set({
        matchedInvoiceId: bestMatch.id,
        matchConfidence: String(maxConfidence),
        matchStatus: 'proposed',
        reviewRequired: true
      }).where(eq(bankTransactions.id, transactionId));
      
      return { success: true, matchedInvoice: bestMatch.id, confidence: maxConfidence };
    }

    // If no match found, flag for review anyway if we suspect it's a payment
    if (txAmount > 0) {
      await db.update(bankTransactions).set({
        reviewRequired: true
      }).where(eq(bankTransactions.id, transactionId));
    }

    return { success: true, matchedInvoice: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
