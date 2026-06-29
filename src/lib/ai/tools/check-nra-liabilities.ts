import { tool } from 'ai';
import { z } from 'zod';

export function buildCheckNraLiabilitiesTool() {
  return tool({
    description: 'Извършва справка за задължения (ДДС, Осигуровки, ДОД, Корпоративен данък) към НАП.',
    inputSchema: z.object({
      dummy: z.string().optional().describe('Не се изисква, оставете празно.'),
    }),
    execute: async ({ dummy }) => {
      // Тук нормално се извиква API-то за Справка Задължения към НАП
      // Симулираме заявката.
      
      const hasLiabilities = Math.random() > 0.5;

      if (!hasLiabilities) {
        return {
          success: true,
          data: {
            totalLiabilities: 0,
            details: []
          },
          message: 'Нямате неплатени задължения към НАП към днешна дата. Всичко е платено!'
        };
      }

      return {
        success: true,
        data: {
          totalLiabilities: 2450.50,
          details: [
            { type: 'ДДС (ЗДДС)', amount: 1200.00, dueDate: '14.07.2026' },
            { type: 'Осигуровки (ДОХ)', amount: 850.50, dueDate: '25.07.2026' },
            { type: 'Данък общ доход (ДОД)', amount: 400.00, dueDate: '25.07.2026' }
          ]
        },
        message: 'Открити са неплатени публични задължения към НАП в размер на 2450.50 лв.'
      };
    },
  });
}
