// @ts-nocheck
export async function buildRichContext(tenantId: string, userId: string): Promise<string> {
  // TODO: Тук ще извличаме реални данни от базата за конкретния tenant
  // Например: текущ cash balance, предстоящи плащания, неплатени фактури
  
  const currentDate = new Date().toISOString();
  
  return `
  Текуща дата: ${currentDate}
  Tenant ID: ${tenantId}
  User ID: ${userId}
  
  Бизнес контекст:
  - Фирмата е регистрирана по ДДС.
  - Основна валута: BGN
  - Последни действия: Създадена е фактура #10023.
  - Текущ паричен баланс: 25,400 BGN
  
  Допълнителни насоки:
  Всички финансови операции трябва да бъдат съобразени със счетоводните стандарти в България.
  `;
}
