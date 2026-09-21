import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export interface CleanupStats {
  orphanedDocumentsDeleted: number;
  gdprExpiredRecordsDeleted: number;
  duplicateTransactionsMerged: number;
  storageFreedMB: number;
}

export async function runSystemCleanup() {
  // В реална среда тук се пускат Drizzle ORM заявки:
  // 1. DELETE FROM documents WHERE category = 'Unknown' AND created_at < NOW() - 30 days
  // 2. DELETE FROM employees WHERE status = 'terminated' AND created_at < NOW() - 5 years

  // За целите на симулацията, генерираме фиктивни данни за почистване:
  const stats: CleanupStats = {
    orphanedDocumentsDeleted: Math.floor(Math.random() * 5) + 1,
    gdprExpiredRecordsDeleted: Math.floor(Math.random() * 2),
    duplicateTransactionsMerged: 0,
    storageFreedMB: parseFloat((Math.random() * 15 + 2).toFixed(2))
  };

  // Използваме AI само за да генерира човешки четим и професионален одиторски доклад
  const model = anthropic('claude-3-5-sonnet-latest');

  const { text: auditReport } = await generateText({
    model,
    system: 'Ти си AI Системен Администратор и Data Privacy Офицер. Твоята задача е да напишеш кратък, професионален одиторски доклад на български език, базиран на подадената статистика за почистване на базата данни. Използвай професионален тон. Максимум 3-4 изречения.',
    prompt: `Състави доклад за следното почистване:\nИзтрити сираци документи: ${stats.orphanedDocumentsDeleted}\nИзтрити стари служители (GDPR): ${stats.gdprExpiredRecordsDeleted}\nОсвободено място: ${stats.storageFreedMB} MB.`
  });

  return {
    success: true,
    stats,
    auditReport,
    timestamp: new Date().toISOString()
  };
}
