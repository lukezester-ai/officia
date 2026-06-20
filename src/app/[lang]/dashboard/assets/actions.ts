'use server';

import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { desc } from 'drizzle-orm';

export async function getAssetsData() {
  try {
    const assets = await db.select().from(fixedAssets).orderBy(desc(fixedAssets.acquisitionDate));
    
    // AI Warnings Logic
    const problems = [];
    for (const a of assets) {
      if (!a.documentId) {
        problems.push({ assetId: a.id, name: a.name, issue: 'Липсва фактура за придобиване.' });
      }
    }

    return { 
      success: true, 
      data: {
        assets,
        problems
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
