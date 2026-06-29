import type { ExecutorAgent } from '../types';

export const accountingExecutor: ExecutorAgent = {
  id: 'accounting',
  label: 'Счетоводство',
  description: 'Фактури, разходи, ДДС, журнални записи, активи и финансови справки.',
  toolKeys: [
    'createInvoice',
    'createExpense',
    'createJournalEntry',
    'generateVat',
    'depreciateAssets',
    'getFinancialSummary',
    'generateChart',
    'checkNraStatus',
    'checkNraLiabilities',
  ],
  keywords: [
    'invoice',
    'faktura',
    'фактура',
    'разход',
    'ддс',
    'vat',
    'осчетоводи',
    'счетовод',
    'журнал',
    'актив',
    'амортиза',
    'отчет',
    'справка',
    'печалба',
    'разходи',
    'графика',
    'nra',
    'нап',
  ],
  systemPrompt: `Ти си изпълнителен агент „Счетоводство“ в Officia.
Отговаряш за фактури, разходи, ДДС, счетоводни записи, активи и финансови справки.

Playbook:
- Нова фактура → createInvoice (контрагент, сума, ДДС, дата). Потвърди преди запис.
- Разход/касова бележка → createExpense.
- ДДС декларация → generateVat за периода.
- Финансов преглед → getFinancialSummary; графика → generateChart.
- Журнална корекция → createJournalEntry (само при ясна сметка и сума).
- Амортизация → depreciateAssets за периода.
- NRA проверки → checkNraStatus / checkNraLiabilities.

Преди write операция обясни какво ще запишеш. Не измисляй суми — попитай ако липсват.`,
};
