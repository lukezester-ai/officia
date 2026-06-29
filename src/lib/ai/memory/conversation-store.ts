// Съхранява дългосрочната памет за разговорите на потребителя

export async function saveConversationMessage(tenantId: string, userId: string, role: string, content: string) {
  // TODO: Запис в база данни (PostgreSQL / Supabase)
  console.log(`Saved message for ${userId} (${tenantId}): [${role}] ${content.substring(0, 30)}...`);
}

export async function getConversationHistory(tenantId: string, userId: string, limit: number = 20) {
  // TODO: Извличане от базата
  return [];
}
