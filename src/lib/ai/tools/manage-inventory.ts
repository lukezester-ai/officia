// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { inventoryItems, inventoryMovements } from '@/lib/db/schema/inventory';
import { tasks } from '@/lib/db/schema/tasks';
import { eq } from 'drizzle-orm';

export const buildManageInventoryTool = (tenantId: string) => tool({
  description: "Складов робот. Сканира наличностите в склада и автоматично генерира задачи за снабдяване, ако има артикули под критичния минимум. Използвай го, когато потребителят попита за склада, наличностите или поиска автоматична проверка на склада.",
  parameters: z.object({
    minThreshold: z.number().optional().default(5).describe("Критичен минимум бройки. Ако наличността падне под това число, се пуска задача за поръчка."),
  }),
  execute: async ({ minThreshold }) => {
    try {
      // 1. Вземаме всички артикули
      const items = await db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
      if (items.length === 0) {
         return { success: true, message: "В склада няма регистрирани артикули." };
      }

      // 2. Вземаме всички движения
      const movements = await db.select().from(inventoryMovements).where(eq(inventoryMovements.tenantId, tenantId));

      let lowStockItems = [];

      for (const item of items) {
        // Калкулираме текущата наличност: (in) минус (out)
        const itemMoves = movements.filter(m => m.itemId === item.id);
        let stock = 0;
        itemMoves.forEach(m => {
          const qty = parseFloat(m.quantity || '0');
          if (m.type === 'in') stock += qty;
          if (m.type === 'out') stock -= qty;
        });

        // Ако е под критичния минимум
        if (stock <= minThreshold) {
          lowStockItems.push({ id: item.id, name: item.name, stock });
        }
      }

      if (lowStockItems.length === 0) {
         return { success: true, message: `Складът е зареден! Всички артикули са над критичния минимум (праг: ${minThreshold}).` };
      }

      // 3. Автоматично генериране на задачи (Restock Alert)
      const tasksCreated = [];
      const existingTasks = await db.select().from(tasks).where(eq(tasks.tenantId, tenantId));

      for (const item of lowStockItems) {
         const taskTitle = `СНАБДЯВАНЕ: Изчерпва се "${item.name}" (Остават: ${item.stock})`;
         
         // Проверка дали вече нямаме отворена задача за този артикул
         const isAlreadyOrdered = existingTasks.some(t => t.title === taskTitle && t.status !== 'completed');

         if (!isAlreadyOrdered) {
            await db.insert(tasks).values({
               tenantId,
               title: taskTitle,
               description: `🚨 Автоматичен сигнал: Наличността на артикул "${item.name}" е паднала до ${item.stock} бр. (под прага от ${minThreshold}). Моля, пуснете поръчка към доставчика.`,
               priority: 'high',
               assignee: 'Мениджър Снабдяване'
            });
            tasksCreated.push(item.name);
         }
      }

      return {
        success: true,
        message: tasksCreated.length > 0 
           ? `Складовият робот откри ${lowStockItems.length} артикула с ниска наличност и автоматично създаде задачи за доставка на: ${tasksCreated.join(', ')}.`
           : `Открити са ${lowStockItems.length} артикула под минимума, но вече има пуснати задачи за снабдяването им. Не съм създавал дубликати.`,
      };

    } catch (err: any) {
      console.error("AI Manage Inventory Error:", err);
      return { success: false, message: `Грешка при сканиране на склада: ${err.message}` };
    }
  }
});
