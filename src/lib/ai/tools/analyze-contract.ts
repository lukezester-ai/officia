// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { getContractById, getContracts } from '@/lib/contracts';
import { createToolAuditLogger } from '../audit/audit-logger';

export function buildAnalyzeContractTool(tenantId: string, userId: string | null) {
  const logger = createToolAuditLogger(tenantId, userId);
  
  return tool({
    description: 'Търси, чете и извлича детайли за договорите. Използвай това, когато потребителят иска да анализира конкретен договор или търси списък с всички договори.',
    parameters: z.object({
      action: z.enum(['list', 'get_details']).describe('list - връща списък с всички договори. get_details - връща пълна информация за конкретен договор (изисква contractId).'),
      contractId: z.string().optional().describe('ID на договора. Задължително при action="get_details".'),
    }),
    execute: async ({ action, contractId }) => {
      try {
        if (action === 'list') {
          const contracts = await getContracts();
          
          await logger.log('TOOL_CALLED', 'contracts', null, { action: 'list_contracts', count: contracts.length });
          
          return {
            success: true,
            message: `Намерени са ${contracts.length} договора.`,
            data: contracts.map(c => ({
              id: c.id,
              title: c.title,
              status: c.status,
              startDate: c.startDate,
              endDate: c.endDate
            }))
          };
        }
        
        if (action === 'get_details') {
          if (!contractId) {
            return { success: false, error: 'contractId е задължителен при action="get_details"' };
          }
          
          const contract = await getContractById(contractId);
          if (!contract) {
            await logger.log('TOOL_FAILED', 'contracts', contractId, { action: 'get_contract_details', error: 'Not found' });
            return { success: false, error: `Договор с ID ${contractId} не е намерен.` };
          }
          
          await logger.log('TOOL_CALLED', 'contracts', contractId, { action: 'get_contract_details' });
          
          return {
            success: true,
            data: contract
          };
        }
        
        return { success: false, error: 'Невалидно действие.' };
      } catch (error) {
        await logger.log('TOOL_ERROR', 'contracts', contractId ?? null, { action, error: String(error) });
        return { success: false, error: 'Възникна грешка при изпълнение на инструмента.' };
      }
    },
  });
}
