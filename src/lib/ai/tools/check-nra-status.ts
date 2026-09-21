import { tool } from 'ai';
import { z } from 'zod';

export function buildCheckNraStatusTool() {
  return tool({
    description: 'Извлича детайли за фирма от Търговския регистър и НАП по даден ЕИК / Булстат (VAT номер).',
    inputSchema: z.object({
      eik: z.string().describe('ЕИК (Булстат) номер на фирмата за проверка (напр. 206123456).'),
    }),
    execute: async ({ eik }) => {
      if (process.env.ALLOW_INTEGRATION_SIMULATION === 'true') {
        return {
          success: false,
          eik,
          message: 'Симулация: ТР/НАП справката не е свързана и не се връщат измислени фирмени данни.',
        };
      }
      return {
        success: false,
        eik,
        message: 'Справката към Търговския регистър и НАП не е конфигурирана.',
      };
    },
  });
}
