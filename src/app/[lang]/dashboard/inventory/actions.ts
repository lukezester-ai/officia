'use server';

import { db } from '@/lib/db/db';
import { inventoryItems, inventoryMovements } from '@/lib/db/schema/inventory';
import { companyDivisions } from '@/lib/db/schema/company_structure';
import { eq, and, sql } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getInventoryData() {
  try {
    const { tenantId } = await requireTenant();
    
    // Fetch all items
    const items = await db.select().from(inventoryItems)
      .where(eq(inventoryItems.tenantId, tenantId));
      
    // Fetch all movements to calculate quantities
    const movements = await db.select().from(inventoryMovements)
      .where(eq(inventoryMovements.tenantId, tenantId));
      
    // Calculate stock levels
    let totalStockValue = 0;
    
    const enrichedItems = items.map(item => {
      const itemMovements = movements.filter(m => m.itemId === item.id);
      
      let currentQuantity = 0;
      let currentValue = 0;
      
      itemMovements.forEach(m => {
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
        ...item,
        currentQuantity,
        currentValue,
        averageUnitCost: currentQuantity > 0 ? (currentValue / currentQuantity) : 0
      };
    });

    return { 
      success: true, 
      data: {
        items: enrichedItems,
        totalStockValue,
        totalItemsCount: items.length
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createInventoryItem(data: { sku: string; name: string; unitOfMeasure: string }) {
  try {
    const { tenantId } = await requireTenant();
    
    await db.insert(inventoryItems).values({
      tenantId,
      sku: data.sku,
      name: data.name,
      unitOfMeasure: data.unitOfMeasure,
      costingMethod: 'weighted_average'
    });
    
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
    
    // Ensure a division exists
    let divisions = await db.select().from(companyDivisions).where(eq(companyDivisions.tenantId, tenantId)).limit(1);
    let divisionId = '';
    
    if (divisions.length === 0) {
      const [newDiv] = await db.insert(companyDivisions).values({
        tenantId,
        name: "Централен Склад"
      }).returning({ id: companyDivisions.id });
      divisionId = newDiv.id;
    } else {
      divisionId = divisions[0].id;
    }
    
    await db.insert(inventoryMovements).values({
      tenantId,
      itemId: data.itemId,
      divisionId: divisionId,
      type: data.type,
      quantity: data.quantity.toString(),
      unitCost: data.unitCost.toString(),
      totalCost: (data.quantity * data.unitCost).toString(),
      movementDate: new Date()
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
