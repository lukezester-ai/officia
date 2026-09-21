import { tool } from 'ai';
import { z } from 'zod';

export function buildCheckNraLiabilitiesTool() {
  return tool({
    description: 'Извършва справка за задължения (ДДС, Осигуровки, ДОД, Корпоративен данък) към НАП.',
    inputSchema: z.object({
      dummy: z.string().optional().describe('Не се изисква, оставете празно.'),
    }),
    execute: async () => {
      if (process.env.ALLOW_INTEGRATION_SIMULATION === 'true') {
        return {
          success: false,
          message: 'Симулация: справката за задължения към НАП не е свързана и не се връщат измислени суми.',
        };
      }
      return {
        success: false,
        message: 'Справката за задължения към НАП не е конфигурирана.',
      };
    },
  });
}
