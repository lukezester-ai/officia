// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { inventoryItems, inventoryMovements } from '@/lib/db/schema/inventory';
import { companyDivisions } from '@/lib/db/schema/company_structure';
import { tasks } from '@/lib/db/schema/tasks';
import { eq } from 'drizzle-orm';
import {
  runInventoryMovementPipeline,
  runInventoryProductRegistered,
  runInventoryScanPipeline,
} from '@/lib/ai/orchestration';

export const buildManageInventoryTool = (tenantId: string, userId?: string) => tool({
  description:
    "Складов агент. Регистрира продукти, прави вход/изписване, обработва баркод сканирания и следи ниски наличности. Използвай при склад, SKU, баркод, изписване, заприходяване.",
  parameters: z.object({
    action: z
      .enum(['check', 'register', 'receive', 'issue', 'scan'])
      .default('check')
      .describe('check=наличности; register=нов артикул; receive=вход; issue=изписване; scan=баркод'),
    minThreshold: z.number().optional().default(5).describe('Праг за ниска наличност (check)'),
    sku: z.string().optional().describe('SKU при register'),
    name: z.string().optional().describe('Име при register'),
    barcode: z.string().optional().describe('Баркод при register или scan'),
    unitOfMeasure: z.string().optional().default('бр'),
    itemId: z.string().optional().describe('ID на артикул при receive/issue'),
    quantity: z.number().optional().describe('Количество при receive/issue/scan auto-issue'),
    unitCost: z.number().optional().describe('Ед. цена при receive (и issue ако се знае)'),
    autoIssue: z.boolean().optional().describe('При scan: автоматично изписване на 1 бр.'),
  }),
  execute: async ({
    action,
    minThreshold,
    sku,
    name,
    barcode,
    unitOfMeasure,
    itemId,
    quantity,
    unitCost,
    autoIssue,
  }) => {
    try {
      if (action === 'register') {
        if (!sku || !name) {
          return { success: false, message: 'За регистрация са нужни sku и name.' };
        }
        const [item] = await db
          .insert(inventoryItems)
          .values({
            tenantId,
            sku,
            name,
            barcode: barcode || null,
            unitOfMeasure: unitOfMeasure || 'бр',
            costingMethod: 'weighted_average',
            itemType: 'goods',
            quantity: '0',
          })
          .returning();

        const automation = await runInventoryProductRegistered({
          tenantId,
          userId,
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          barcode: item.barcode,
          unitOfMeasure: item.unitOfMeasure,
        });

        return {
          success: true,
          message: `Регистриран артикул "${name}" (SKU ${sku}). Automation: ${automation.correlationId?.slice(0, 8)}`,
          itemId: item.id,
          automation,
        };
      }

      if (action === 'scan') {
        const code = barcode || sku;
        if (!code) return { success: false, message: 'Подай barcode или sku за сканиране.' };
        const result = await runInventoryScanPipeline({
          tenantId,
          userId,
          code,
          autoIssue: !!autoIssue,
          issueQuantity: quantity,
        });
        return result;
      }

      if (action === 'receive' || action === 'issue') {
        if (!itemId || !quantity || quantity <= 0) {
          return { success: false, message: 'Нужни са itemId и quantity > 0.' };
        }

        const divisions = await db.select().from(companyDivisions).where(eq(companyDivisions.tenantId, tenantId)).limit(1);
        let divisionId = divisions[0]?.id;
        if (!divisionId) {
          const [div] = await db.insert(companyDivisions).values({ tenantId, name: 'Централен Склад' }).returning();
          divisionId = div.id;
        }

        const type = action === 'receive' ? 'in' : 'out';
        const cost = unitCost || 0;
        const [movement] = await db
          .insert(inventoryMovements)
          .values({
            tenantId,
            itemId,
            divisionId,
            type,
            quantity: quantity.toString(),
            unitCost: cost.toString(),
            totalCost: (quantity * cost).toString(),
            movementDate: new Date(),
          })
          .returning();

        const automation = await runInventoryMovementPipeline({
          tenantId,
          userId,
          movementId: movement.id,
          itemId,
          type,
          quantity,
          unitCost: cost,
          source: 'ai',
        });

        return {
          success: true,
          message:
            type === 'out'
              ? `Изписани ${quantity} бр. Наличност след: ${automation.stockAfter}. Контировка в AI Inbox.`
              : `Заприходени ${quantity} бр. Наличност след: ${automation.stockAfter}.`,
          automation,
        };
      }

      // check (default)
      const items = await db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
      if (items.length === 0) {
        return { success: true, message: 'В склада няма регистрирани артикули.' };
      }

      const movements = await db.select().from(inventoryMovements).where(eq(inventoryMovements.tenantId, tenantId));
      const lowStockItems = [];

      for (const item of items) {
        const itemMoves = movements.filter((m) => m.itemId === item.id);
        let stock = 0;
        itemMoves.forEach((m) => {
          const qty = parseFloat(m.quantity || '0');
          if (m.type === 'in' || m.type === 'adjustment') stock += qty;
          if (m.type === 'out') stock -= qty;
        });
        if (stock <= minThreshold) {
          lowStockItems.push({ id: item.id, name: item.name, sku: item.sku, barcode: item.barcode, stock });
        }
      }

      if (lowStockItems.length === 0) {
        return {
          success: true,
          message: `Складът е зареден! ${items.length} артикула над прага ${minThreshold}.`,
        };
      }

      const tasksCreated = [];
      const existingTasks = await db.select().from(tasks).where(eq(tasks.tenantId, tenantId));

      for (const item of lowStockItems) {
        const taskTitle = `СНАБДЯВАНЕ: Изчерпва се "${item.name}" (Остават: ${item.stock})`;
        const isAlreadyOrdered = existingTasks.some((t) => t.title === taskTitle && t.status !== 'completed');
        if (!isAlreadyOrdered) {
          await db.insert(tasks).values({
            tenantId,
            title: taskTitle,
            description: `Автоматичен сигнал: наличността на "${item.name}" е ${item.stock} (под ${minThreshold}).`,
            priority: 'high',
            assignee: 'Мениджър Снабдяване',
          });
          tasksCreated.push(item.name);
        }
      }

      return {
        success: true,
        message:
          tasksCreated.length > 0
            ? `Ниски наличности: ${lowStockItems.length}. Създадени задачи: ${tasksCreated.join(', ')}.`
            : `Ниски наличности: ${lowStockItems.length}, задачите вече съществуват.`,
        lowStockItems,
      };
    } catch (err: any) {
      console.error('AI Manage Inventory Error:', err);
      return { success: false, message: `Грешка при складова операция: ${err.message}` };
    }
  },
});
