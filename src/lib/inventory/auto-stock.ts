// @ts-nocheck
import { db } from '@/lib/db/db';
import { inventoryItems, inventoryMovements } from '@/lib/db/schema/inventory';
import { invoiceLines } from '@/lib/db/schema/invoices';
import { purchaseInvoiceLines } from '@/lib/db/schema/purchase-invoices';
import { companyDivisions } from '@/lib/db/schema/company_structure';
import { eq, ilike, and } from 'drizzle-orm';

/**
 * Checks if the given line description or unit represents a Service (услуга).
 * If true, no inventory stock movements should be created.
 */
export function isServiceLine(description: string = '', unitOfMeasure: string = ''): boolean {
  const desc = description.toLowerCase();
  const unit = unitOfMeasure.toLowerCase();

  const serviceKeywords = [
    'услуга', 'услуги', 'консултация', 'консултации', 'абонамент', 'наем',
    'поддръжка', 'хостинг', 'доставка', 'разход', 'разходи', 'сервиз',
    'обучение', 'одит', 'реклама', 'маркетинг', 'софтуер', 'разработка'
  ];

  const serviceUnits = ['час', 'ч.', 'мес', 'месец', 'услуга', 'усл'];

  if (serviceUnits.some(u => unit.includes(u))) return true;
  if (serviceKeywords.some(kw => desc.includes(kw))) return true;

  return false;
}

/**
 * Helper to get or create default warehouse division for tenant.
 */
async function getDefaultDivision(tenantId: string) {
  const [existing] = await db.select().from(companyDivisions).where(eq(companyDivisions.tenantId, tenantId)).limit(1);
  if (existing) return existing.id;

  const [newDiv] = await db.insert(companyDivisions).values({
    tenantId,
    name: "Централен Склад",
    type: "warehouse"
  }).returning();
  return newDiv ? newDiv.id : '00000000-0000-0000-0000-000000000000';
}

/**
 * TICKET 3: Automatically updates warehouse stock (creates 'in' movements) when a Purchase Invoice is approved.
 */
export async function syncStockFromPurchaseInvoice(purchaseInvoiceId: string, tenantId: string): Promise<{ success: boolean; movementsAdded: number; error?: string }> {
  try {
    const lines = await db.select().from(purchaseInvoiceLines).where(eq(purchaseInvoiceLines.invoiceId, purchaseInvoiceId));
    if (!lines || lines.length === 0) return { success: true, movementsAdded: 0 };

    const divisionId = await getDefaultDivision(tenantId);
    let added = 0;

    for (const line of lines) {
      if (!line.description) continue;
      if (isServiceLine(line.description)) continue; // Skip services

      const qty = parseFloat(line.quantity || '1') || 0;
      if (qty <= 0) continue;

      // Find or create item
      let [item] = await db.select().from(inventoryItems).where(
        and(
          eq(inventoryItems.tenantId, tenantId),
          ilike(inventoryItems.name, line.description.trim())
        )
      );

      if (!item) {
        const [newItem] = await db.insert(inventoryItems).values({
          tenantId,
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          name: line.description.trim(),
          unitOfMeasure: 'бр',
          costingMethod: 'weighted_average'
        }).returning();
        item = newItem;
      }

      if (!item) continue;

      // Check if movement already created for this line/invoice
      const [existingMovement] = await db.select().from(inventoryMovements).where(
        and(
          eq(inventoryMovements.referenceId, purchaseInvoiceId as any),
          eq(inventoryMovements.itemId, item.id)
        )
      );

      if (!existingMovement) {
        const unitPrice = parseFloat(line.unitPrice || '0') || 0;
        const total = parseFloat(line.lineNet || '0') || (qty * unitPrice);

        await db.insert(inventoryMovements).values({
          tenantId,
          itemId: item.id,
          divisionId,
          type: 'in',
          quantity: String(qty),
          unitCost: String(unitPrice),
          totalCost: String(total),
          movementDate: new Date(),
          referenceId: purchaseInvoiceId as any
        });
        added++;
      }
    }

    return { success: true, movementsAdded: added };
  } catch (error: any) {
    console.error('[syncStockFromPurchaseInvoice] Error:', error);
    return { success: false, movementsAdded: 0, error: error.message };
  }
}

/**
 * TICKET 4: Automatically deducts warehouse stock (creates 'out' movements) when a Sales Invoice is issued/paid.
 */
export async function syncStockFromSalesInvoice(invoiceId: string, tenantId: string): Promise<{ success: boolean; movementsAdded: number; error?: string }> {
  try {
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, Number(invoiceId) as any));
    if (!lines || lines.length === 0) return { success: true, movementsAdded: 0 };

    const divisionId = await getDefaultDivision(tenantId);
    let added = 0;

    for (const line of lines) {
      if (!line.description) continue;
      if (isServiceLine(line.description)) continue; // Skip services

      const qty = parseFloat(line.quantity || '1') || 0;
      if (qty <= 0) continue;

      // Find item
      const [item] = await db.select().from(inventoryItems).where(
        and(
          eq(inventoryItems.tenantId, tenantId),
          ilike(inventoryItems.name, line.description.trim())
        )
      );

      if (!item) continue; // Only deduct if item exists in inventory

      // Check if out movement already exists
      const [existingMovement] = await db.select().from(inventoryMovements).where(
        and(
          eq(inventoryMovements.referenceId, invoiceId as any),
          eq(inventoryMovements.itemId, item.id),
          eq(inventoryMovements.type, 'out')
        )
      );

      if (!existingMovement) {
        const unitPrice = parseFloat(line.unitPrice || '0') || 0;
        const total = parseFloat(line.lineNet || '0') || (qty * unitPrice);

        await db.insert(inventoryMovements).values({
          tenantId,
          itemId: item.id,
          divisionId,
          type: 'out',
          quantity: String(qty),
          unitCost: String(unitPrice),
          totalCost: String(total),
          movementDate: new Date(),
          referenceId: invoiceId as any
        });
        added++;
      }
    }

    return { success: true, movementsAdded: added };
  } catch (error: any) {
    console.error('[syncStockFromSalesInvoice] Error:', error);
    return { success: false, movementsAdded: 0, error: error.message };
  }
}
