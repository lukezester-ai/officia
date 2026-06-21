// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { counterparties } from '@/lib/db/schema/counterparties';
import { eq, and, ilike } from 'drizzle-orm';

export const buildCreateInvoiceTool = (tenantId: string, userId: string) => tool({
  description: "Създава нова продажна фактура към клиент. Използвай този инструмент, когато потребителят иска да издаде фактура.",
  parameters: z.object({
    clientName: z.string().describe("Име на клиента (контрагента). Ще бъде потърсен в базата или създаден, ако не съществува."),
    items: z.array(z.object({
      description: z.string().describe("Описание на стоката/услугата"),
      quantity: z.number().describe("Количество"),
      unitPrice: z.number().describe("Единична цена без ДДС"),
      vatRate: z.number().optional().default(20).describe("Данъчна ставка (20 за стандартна, 0 за ВОД/без ДДС)"),
    })).describe("Списък с артикули"),
    dueDate: z.string().optional().describe("Дата на падеж във формат YYYY-MM-DD"),
    notes: z.string().optional().describe("Допълнителни бележки към фактурата"),
  }),
  execute: async ({ clientName, items, dueDate, notes }) => {
    try {
      // 1. Търсим контрагента по име (case-insensitive)
      let counterparty = await db.query.counterparties.findFirst({
        where: and(
          eq(counterparties.tenantId, tenantId),
          ilike(counterparties.name, `%${clientName}%`)
        )
      });
      
      if (!counterparty) {
        // Създаваме го, ако не съществува
        const [newCp] = await db.insert(counterparties).values({
          tenantId,
          name: clientName,
          type: 'client',
        }).returning();
        counterparty = newCp;
      }

      // 2. Изчисляваме сумите
      let subtotal = 0;
      let vatAmount = 0;
      
      const lineItemsToInsert = items.map(item => {
        const lineNet = item.quantity * item.unitPrice;
        const lineVat = lineNet * (item.vatRate / 100);
        const lineTotal = lineNet + lineVat;
        
        subtotal += lineNet;
        vatAmount += lineVat;
        
        return {
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          vatRate: item.vatRate.toString(),
          lineNet: lineNet.toString(),
          lineVat: lineVat.toString(),
          lineTotal: lineTotal.toString(),
        };
      });
      
      const totalAmount = subtotal + vatAmount;

      // 3. Записваме фактурата (Генерираме случаен 10-цифрен номер за MVP)
      const randomNum = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      
      const [newInvoice] = await db.insert(invoices).values({
        tenantId,
        userId,
        invoiceNumber: randomNum,
        type: 'sale',
        clientName: counterparty.name,
        counterpartyName: counterparty.name,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        notes: notes || 'Създадена автоматично от AI Асистент.',
        subtotal: subtotal.toString(),
        vatAmount: vatAmount.toString(),
        totalAmount: totalAmount.toString(),
        total: totalAmount.toString(),
        aiStatus: 'ok',
        aiConfidence: '0.99'
      }).returning();

      // 4. Записваме редовете на фактурата
      if (lineItemsToInsert.length > 0) {
        await db.insert(invoiceLines).values(
          lineItemsToInsert.map(line => ({
            ...line,
            invoiceId: newInvoice.id,
          }))
        );
      }

      return {
        success: true,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        message: `Фактура №${newInvoice.invoiceNumber} за клиент "${counterparty.name}" беше създадена успешно! Обща сума: ${totalAmount.toFixed(2)} лв.`,
      };
    } catch (err: any) {
      console.error("AI Create Invoice Error:", err);
      return {
        success: false,
        message: `Възникна грешка при създаването на фактурата: ${err.message}`
      };
    }
  },
});
