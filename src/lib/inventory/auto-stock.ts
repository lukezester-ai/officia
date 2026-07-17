// @ts-nocheck
import { db } from '@/lib/db/db';
import { inventoryItems, inventoryMovements } from '@/lib/db/schema/inventory';
import { invoiceLines, invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoiceLines, purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { companyDivisions } from '@/lib/db/schema/company_structure';
import { eq, ilike, and, sql } from 'drizzle-orm';

/**
 * Helper to check service keyword fallback if AI classification was not explicitly stored on line.
 */
export function isServiceLine(description: string = '', unitOfMeasure: string = '', explicitType?: string): boolean {
  if (explicitType === 'service') return true;
  if (explicitType === 'goods') return false;

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
async function getDefaultDivision(tenantId: string, tx: any = db) {
  const [existing] = await tx.select().from(companyDivisions).where(eq(companyDivisions.tenantId, tenantId)).limit(1);
  if (existing) return existing.id;

  const [newDiv] = await tx.insert(companyDivisions).values({
    tenantId,
    name: "Централен Склад",
    type: "warehouse"
  }).returning();
  return newDiv ? newDiv.id : '00000000-0000-0000-0000-000000000000';
}

/**
 * ТИКЕТ 3: Автоматично заскладяване (In movement + update sklad_items.quantity += X) при одобрена входяща фактура.
 * Изпълнява се в атомарна db.transaction().
 */
export async function syncStockFromPurchaseInvoice(purchaseInvoiceId: string, tenantId: string): Promise<{ success: boolean; movementsAdded: number; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId));
      if (!invoice) return { success: false, movementsAdded: 0, error: 'Фактурата не е намерена' };

      // Изтегляме всички редове от фактурата
      const lines = await tx.select().from(purchaseInvoiceLines).where(eq(purchaseInvoiceLines.invoiceId, purchaseInvoiceId));
      if (!lines || lines.length === 0) return { success: true, movementsAdded: 0 };

      const divisionId = await getDefaultDivision(tenantId, tx);
      let added = 0;

      for (const line of lines) {
        if (!line.description) continue;
        // Проверяваме дали редът е услуга (AI класификация или fallback)
        if (isServiceLine(line.description, '', (line as any).itemType)) continue;

        const qty = parseFloat(line.quantity || '1') || 0;
        if (qty <= 0) continue;

        // Намираме или създаваме стоката в складовата номенклатура
        let [item] = await tx.select().from(inventoryItems).where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            ilike(inventoryItems.name, line.description.trim())
          )
        );

        if (!item) {
          const [newItem] = await tx.insert(inventoryItems).values({
            tenantId,
            sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            name: line.description.trim(),
            unitOfMeasure: 'бр',
            costingMethod: 'weighted_average',
            quantity: qty.toFixed(3),
            itemType: 'goods',
          }).returning();
          item = newItem;
        } else {
          // Актуализираме количеството (sklad_items.quantity += X)
          await tx.update(inventoryItems).set({
            quantity: sql`COALESCE(${inventoryItems.quantity}, 0) + ${qty}`,
          }).where(eq(inventoryItems.id, item.id));
        }

        if (!item) continue;

        // Проверяваме дали вече няма създадено движение за този ред/фактура
        const [existingMovement] = await tx.select().from(inventoryMovements).where(
          and(
            eq(inventoryMovements.referenceId, purchaseInvoiceId as any),
            eq(inventoryMovements.itemId, item.id)
          )
        );

        if (!existingMovement) {
          const unitPrice = parseFloat(line.unitPrice || '0') || 0;
          const total = parseFloat(line.lineNet || '0') || (qty * unitPrice);

          await tx.insert(inventoryMovements).values({
            tenantId,
            itemId: item.id,
            divisionId,
            type: 'in',
            quantity: qty.toFixed(3),
            unitCost: unitPrice.toFixed(4),
            totalCost: total.toFixed(2),
            movementDate: invoice.date ? new Date(invoice.date) : new Date(),
            referenceId: purchaseInvoiceId as any,
          });
          added++;
        }
      }

      return { success: true, movementsAdded: added };
    });
  } catch (err: any) {
    console.error('[syncStockFromPurchaseInvoice] Error:', err);
    return { success: false, movementsAdded: 0, error: err.message };
  }
}

/**
 * ТИКЕТ 4: Изписване на склад (Out movement + decrement sklad_items.quantity -= X) при изходяща фактура.
 * Изпълнява се веднага при статус 'issued' (издадена), а не при 'draft' (чернова), за да не блокира количество за неизпратени фактури!
 */
export async function syncStockFromSalesInvoice(invoiceId: string, tenantId: string): Promise<{ success: boolean; movementsAdded: number; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId as any));
      if (!invoice) return { success: false, movementsAdded: 0, error: 'Фактурата не е намерена' };

      // Изпълнява се САМО ако статусът е издадена (issued / paid)
      if (invoice.status === 'draft') {
        return { success: true, movementsAdded: 0 };
      }

      const lines = await tx.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId as any));
      if (!lines || lines.length === 0) return { success: true, movementsAdded: 0 };

      const divisionId = await getDefaultDivision(tenantId, tx);
      let added = 0;

      for (const line of lines) {
        // Ако няма skladItemId или е класифицирано като услуга, пропускаме
        if (!line.description) continue;
        if (isServiceLine(line.description, '', (line as any).itemType)) continue;

        const qty = parseFloat(line.quantity || '1') || 0;
        if (qty <= 0) continue;

        let item: any = null;
        if ((line as any).skladItemId) {
          [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, (line as any).skladItemId));
        } else {
          [item] = await tx.select().from(inventoryItems).where(
            and(
              eq(inventoryItems.tenantId, tenantId),
              ilike(inventoryItems.name, line.description.trim())
            )
          );
        }

        if (!item) continue;

        // Проверяваме дали вече няма запис за изписване от тази фактура
        const [existingMovement] = await tx.select().from(inventoryMovements).where(
          and(
            eq(inventoryMovements.referenceId, invoiceId as any),
            eq(inventoryMovements.itemId, item.id)
          )
        );

        if (!existingMovement) {
          const unitPrice = parseFloat(line.unitPrice || '0') || 0;
          const total = parseFloat(line.lineNet || '0') || (qty * unitPrice);

          // Дебитен/Кредитен decrement на количеството (sklad_items.quantity -= X)
          await tx.update(inventoryItems).set({
            quantity: sql`GREATEST(0, COALESCE(${inventoryItems.quantity}, 0) - ${qty})`,
          }).where(eq(inventoryItems.id, item.id));

          await tx.insert(inventoryMovements).values({
            tenantId,
            itemId: item.id,
            divisionId,
            type: 'out',
            quantity: qty.toFixed(3),
            unitCost: unitPrice.toFixed(4),
            totalCost: total.toFixed(2),
            movementDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
            referenceId: invoiceId as any,
          });
          added++;
        }
      }

      return { success: true, movementsAdded: added };
    });
  } catch (err: any) {
    console.error('[syncStockFromSalesInvoice] Error:', err);
    return { success: false, movementsAdded: 0, error: err.message };
  }
}
