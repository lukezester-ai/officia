'use server';

import { db } from '@/lib/db/db';
import { inventoryItems, inventoryMovements, productCodes } from '@/lib/db/schema/inventory';
import { companyDivisions } from '@/lib/db/schema/company_structure';
import { eq, and, inArray } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import {
  codeLookupVariants,
  detectCodeType,
  normalizeProductCode,
  type ProductCodeType,
} from '@/lib/inventory/codes';

export type InventoryItemView = {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  currentQuantity: number;
  currentValue: number;
  averageUnitCost: number;
  codes: { code: string; codeType: ProductCodeType; isPrimary: boolean | null }[];
};

async function getDefaultDivisionId(tenantId: string) {
  const divisions = await db
    .select()
    .from(companyDivisions)
    .where(eq(companyDivisions.tenantId, tenantId))
    .limit(1);

  if (divisions.length > 0) {
    return divisions[0].id;
  }

  const [newDiv] = await db
    .insert(companyDivisions)
    .values({
      tenantId,
      name: 'Централен Склад',
    })
    .returning({ id: companyDivisions.id });

  return newDiv.id;
}

function enrichItems(
  items: (typeof inventoryItems.$inferSelect)[],
  movements: (typeof inventoryMovements.$inferSelect)[],
  codesByItem: Map<string, InventoryItemView['codes']>,
) {
  let totalStockValue = 0;

  const enrichedItems: InventoryItemView[] = items.map((item) => {
    const itemMovements = movements.filter((m) => m.itemId === item.id);

    let currentQuantity = 0;
    let currentValue = 0;

    itemMovements.forEach((m) => {
      const qty = parseFloat(m.quantity || '0');
      const cost = parseFloat(m.totalCost || '0');

      if (m.type === 'in' || m.type === 'adjustment') {
        currentQuantity += qty;
        currentValue += cost;
      } else if (m.type === 'out') {
        currentQuantity -= qty;
        currentValue -= cost;
      }
    });

    totalStockValue += currentValue;

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      unitOfMeasure: item.unitOfMeasure,
      currentQuantity,
      currentValue,
      averageUnitCost: currentQuantity > 0 ? currentValue / currentQuantity : 0,
      codes: codesByItem.get(item.id) ?? [{ code: item.sku, codeType: 'sku', isPrimary: true }],
    };
  });

  return { enrichedItems, totalStockValue };
}

async function loadCodesByItem(tenantId: string, itemIds: string[]) {
  const codesByItem = new Map<string, InventoryItemView['codes']>();
  if (itemIds.length === 0) return codesByItem;

  const rows = await db
    .select()
    .from(productCodes)
    .where(and(eq(productCodes.tenantId, tenantId), inArray(productCodes.itemId, itemIds)));

  for (const row of rows) {
    const list = codesByItem.get(row.itemId) ?? [];
    list.push({
      code: row.code,
      codeType: row.codeType,
      isPrimary: row.isPrimary,
    });
    codesByItem.set(row.itemId, list);
  }

  return codesByItem;
}

export async function getInventoryData() {
  try {
    const { tenantId } = await requireTenant();

    const items = await db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
    const movements = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.tenantId, tenantId));
    const codesByItem = await loadCodesByItem(
      tenantId,
      items.map((item) => item.id),
    );

    const { enrichedItems, totalStockValue } = enrichItems(items, movements, codesByItem);

    return {
      success: true,
      data: {
        items: enrichedItems,
        totalStockValue,
        totalItemsCount: items.length,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function lookupItemByCode(rawCode: string) {
  try {
    const { tenantId } = await requireTenant();
    const variants = codeLookupVariants(rawCode);

    if (variants.length === 0) {
      return { success: false, error: 'Въведете валиден код', data: null };
    }

    const codeRows = await db
      .select()
      .from(productCodes)
      .where(and(eq(productCodes.tenantId, tenantId), inArray(productCodes.code, variants)))
      .limit(1);

    let itemId = codeRows[0]?.itemId;

    if (!itemId) {
      const skuRows = await db
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.tenantId, tenantId), inArray(inventoryItems.sku, variants)))
        .limit(1);
      itemId = skuRows[0]?.id;
    }

    if (!itemId) {
      return {
        success: true,
        data: null,
        scannedCode: normalizeProductCode(rawCode),
        suggestedType: detectCodeType(normalizeProductCode(rawCode)),
      };
    }

    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.tenantId, tenantId)));

    if (!item) {
      return { success: false, error: 'Артикулът не е намерен', data: null };
    }

    const movements = await db
      .select()
      .from(inventoryMovements)
      .where(and(eq(inventoryMovements.tenantId, tenantId), eq(inventoryMovements.itemId, item.id)));
    const codesByItem = await loadCodesByItem(tenantId, [item.id]);
    const { enrichedItems } = enrichItems([item], movements, codesByItem);

    return { success: true, data: enrichedItems[0] };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}

async function registerProductCode(
  tenantId: string,
  itemId: string,
  rawCode: string,
  codeType?: ProductCodeType,
  isPrimary = false,
) {
  const code = normalizeProductCode(rawCode);
  if (!code) return;

  const existing = await db
    .select()
    .from(productCodes)
    .where(and(eq(productCodes.tenantId, tenantId), eq(productCodes.code, code)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].itemId !== itemId) {
      throw new Error(`Кодът ${code} вече е регистриран към друг артикул.`);
    }
    return;
  }

  await db.insert(productCodes).values({
    tenantId,
    itemId,
    code,
    codeType: codeType ?? detectCodeType(code),
    isPrimary,
  });
}

export async function createInventoryItem(data: {
  sku: string;
  name: string;
  unitOfMeasure: string;
  extraCode?: string;
}) {
  try {
    const { tenantId } = await requireTenant();
    const sku = normalizeProductCode(data.sku);

    const [item] = await db
      .insert(inventoryItems)
      .values({
        tenantId,
        sku,
        name: data.name.trim(),
        unitOfMeasure: data.unitOfMeasure.trim(),
        costingMethod: 'weighted_average',
      })
      .returning();

    await registerProductCode(tenantId, item.id, sku, 'sku', true);

    const extra = data.extraCode ? normalizeProductCode(data.extraCode) : '';
    if (extra && extra !== sku) {
      await registerProductCode(tenantId, item.id, extra, detectCodeType(extra), false);
    }

    return { success: true, data: item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addProductCode(data: { itemId: string; code: string; codeType?: ProductCodeType }) {
  try {
    const { tenantId } = await requireTenant();

    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, data.itemId), eq(inventoryItems.tenantId, tenantId)));

    if (!item) {
      return { success: false, error: 'Артикулът не е намерен' };
    }

    await registerProductCode(tenantId, data.itemId, data.code, data.codeType, false);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addInventoryMovement(data: {
  itemId: string;
  type: 'in' | 'out';
  quantity: number;
  unitCost: number;
}) {
  try {
    const { tenantId } = await requireTenant();
    const divisionId = await getDefaultDivisionId(tenantId);

    await db.insert(inventoryMovements).values({
      tenantId,
      itemId: data.itemId,
      divisionId,
      type: data.type,
      quantity: data.quantity.toString(),
      unitCost: data.unitCost.toString(),
      totalCost: (data.quantity * data.unitCost).toString(),
      movementDate: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function quickInventoryMovement(data: {
  itemId: string;
  type: 'in' | 'out';
  quantity: number;
  unitCost?: number;
}) {
  try {
    const inventory = await getInventoryData();
    const item = inventory.success
      ? inventory.data?.items.find((row) => row.id === data.itemId) ?? null
      : null;

    if (!item) {
      return { success: false, error: 'Артикулът не е намерен' };
    }

    if (data.type === 'out' && item.currentQuantity < data.quantity) {
      return { success: false, error: 'Няма достатъчна наличност за изписване!' };
    }

    const unitCost =
      data.type === 'in'
        ? data.unitCost ?? item.averageUnitCost
        : item.averageUnitCost;

    if (data.type === 'in' && unitCost <= 0) {
      return { success: false, error: 'Въведете единична цена за първо заприходяване.' };
    }

    return addInventoryMovement({
      itemId: item.id,
      type: data.type,
      quantity: data.quantity,
      unitCost,
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
