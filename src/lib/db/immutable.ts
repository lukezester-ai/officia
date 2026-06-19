// @ts-nocheck
// Политики за неизменяемост на данните според Закона за счетоводството (ЗСч)
// Изисква се съхранение 10 години и забрана за триене/директна промяна на осчетоводени операции.

// 1. PostgreSQL Тригер за забрана на UPDATE/DELETE на публикувани записи
// Този SQL се изпълнява като част от миграциите към базата данни.
export const immutableTriggerSQL = `
CREATE OR REPLACE FUNCTION prevent_posted_journal_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Ако опитваме да трием или променяме запис, който вече е публикуван (posted)
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Недопустима операция според ЗСч: Публикувани счетоводни статии не могат да бъдат променяни или изтривани. Използвайте СТОРНО операция.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_immutable ON journal_entries;
CREATE TRIGGER trg_journal_immutable
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_mutation();
`;

/**
 * 2. Логика за Сторно (Correction Entry)
 * Когато трябва да се коригира сбъркана статия, се прави "червено сторно" (отрицателна сума) 
 * или ново осчетоводяване с обратни знаци, което реферира сбъркания запис.
 */
export async function createStornoEntry(originalEntryId: string, reason: string, trustedTimestamp?: string) {
  console.log(`Генериране на Сторно операция за статия ${originalEntryId}...`);
  console.log(`Причина за сторниране: ${reason}`);
  
  if (trustedTimestamp) {
    console.log(`Използван доверен времеви печат (НАП Timestamp): ${trustedTimestamp}`);
  }

  // TODO: Логика за базата данни:
  // 1. Извлича оригиналната статия
  // 2. Създава нова статия със същите дебитни/кредитни сметки, но с ОТРИЦАТЕЛНИ суми (червено сторно)
  // 3. Записва 'reference_id' да сочи към originalEntryId
  // 4. Записва причината в 'description' или 'metadata'
  
  return { 
    success: true, 
    originalEntryId,
    stornoEntryId: 'mock_storno_uuid_' + Date.now() 
  };
}
