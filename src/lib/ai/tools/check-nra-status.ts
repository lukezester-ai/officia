import { tool } from 'ai';
import { z } from 'zod';

export function buildCheckNraStatusTool() {
  return tool({
    description: 'Извлича детайли за фирма от Търговския регистър и НАП по даден ЕИК / Булстат (VAT номер).',
    inputSchema: z.object({
      eik: z.string().describe('ЕИК (Булстат) номер на фирмата за проверка (напр. 206123456).'),
    }),
    execute: async ({ eik }) => {
      // Тук нормално бихме викнали API на НАП/ТР или VIES
      // Тъй като това е демо, генерираме реалистични данни.
      
      const isVatRegistered = parseInt(eik.substring(eik.length - 1)) % 2 === 0;

      return {
        success: true,
        data: {
          eik,
          companyName: `ТЕСТОВА ФИРМА ${eik.substring(0, 4)} ЕООД`,
          address: 'гр. София, ул. Примерна 123',
          manager: 'Иван Иванов',
          status: 'Активен',
          vatRegistered: isVatRegistered,
          vatNumber: isVatRegistered ? `BG${eik}` : null,
          lastChecked: new Date().toISOString()
        },
        message: `Успешно извлечени данни за ЕИК ${eik} от НАП/ТР.`
      };
    },
  });
}
