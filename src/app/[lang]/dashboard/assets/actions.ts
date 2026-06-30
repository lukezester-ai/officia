'use server';

import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { desc, eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getAssetsData() {
  try {
    const { tenantId } = await requireTenant();
    const assets = await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.tenantId, tenantId))
      .orderBy(desc(fixedAssets.acquisitionDate));

    const problems = [];
    for (const a of assets) {
      if (!a.documentId) {
        problems.push({ assetId: a.id, name: a.name, issue: 'Липсва фактура за придобиване.' });
      }
    }

    return {
      success: true,
      data: { assets, problems },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
