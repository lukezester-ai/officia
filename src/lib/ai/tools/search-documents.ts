import { tool } from 'ai';
import { z } from 'zod';

export const searchDocumentsTool = tool({
  description: "Търси в качените документи, договори и фактури на базата на ключови думи или семантика",
  parameters: z.object({
    query: z.string().describe("Заявка за търсене"),
    documentType: z.enum(["all", "invoice", "contract", "receipt"]).optional().describe("Филтър по тип документ"),
  }),
  execute: async ({ query, documentType }) => {
    console.log("Searching documents:", { query, documentType });
    
    // Mock response
    return {
      results: [
        { id: "doc_1", name: "Договор за наем 2024.pdf", relevance: 0.92 },
        { id: "doc_2", name: "Фактура Топлофикация Април.pdf", relevance: 0.75 },
      ],
      message: `Намерени са 2 документа отговарящи на заявката.`,
    };
  },
});
