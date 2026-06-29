import { tool } from 'ai';
import { z } from 'zod';

export const buildGenerateChartTool = () => tool({
  description: "Използвай този инструмент, за да нарисуваш визуална графика в чата на потребителя. Подходящ е, когато потребителят иска да види графики, чартове или сравнения на данни (напр. приходи по месеци, разходи по категории и т.н.). Първо събери данните от другите инструменти и след това ги подай на този инструмент.",
  inputSchema: z.object({
    title: z.string().describe("Заглавие на графиката"),
    type: z.enum(['bar', 'line', 'pie']).describe("Вид на графиката"),
    xAxisKey: z.string().describe("Името на полето от данните, което да се показва по хоризонталната X ос (напр. 'month' или 'category')"),
    yAxisKey: z.string().describe("Името на полето от данните, което да се показва по вертикалната Y ос (напр. 'amount' или 'total')"),
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).describe("Масив от обекти с данните (напр. [{ month: 'Jan', amount: 100 }, { month: 'Feb', amount: 200 }])"),
  }),
  execute: async ({ title, type, xAxisKey, yAxisKey, data }) => {
    // Връщаме данните обратно към клиента, за да ги изрендерира като React Компонент (Recharts)
    return {
      success: true,
      message: `Графиката "${title}" е успешно изчертана на екрана.`,
      chartData: {
         title,
         type,
         xAxisKey,
         yAxisKey,
         data
      }
    };
  }
});
