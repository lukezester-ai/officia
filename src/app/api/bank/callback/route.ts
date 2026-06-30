import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { getAccountDetails, getRequisition } from '@/lib/banking/nordigen';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireTenant();
    const url = new URL(req.url);
    const requisitionId = url.searchParams.get('ref');
    const lang = url.searchParams.get('lang') || 'bg';

    if (!requisitionId) {
      return NextResponse.redirect(new URL(`/${lang}/dashboard/banking?error=missing_ref`, req.url));
    }

    const requisition = await getRequisition(requisitionId);

    for (const externalAccountId of requisition.accounts || []) {
      const details = await getAccountDetails(externalAccountId);
      const iban = details.account?.iban;
      const name = details.account?.name || 'Bank Account';

      const [existing] = await db
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, tenantId),
            eq(bankAccounts.externalAccountId, externalAccountId),
          ),
        );

      if (!existing) {
        await db.insert(bankAccounts).values({
          tenantId,
          institutionName: name,
          iban: iban || null,
          currency: details.account?.currency || 'EUR',
          provider: 'nordigen',
          externalRequisitionId: requisitionId,
          externalAccountId,
        });
      }
    }

    return NextResponse.redirect(new URL(`/${lang}/dashboard/banking?connected=1`, req.url));
  } catch (error) {
    console.error('Bank callback error:', error);
    return NextResponse.redirect(new URL('/bg/dashboard/banking?error=callback', req.url));
  }
}
