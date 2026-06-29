import type { ExecutorAgent } from '../types';

export const bankingExecutor: ExecutorAgent = {
  id: 'banking',
  label: 'Банкиране',
  description: 'Съпоставяне на банкови транзакции с фактури и плащания.',
  toolKeys: ['bankMatch'],
  keywords: [
    'bank',
    'банка',
    'банков',
    'извлечение',
    'reconcile',
    'съгласуван',
    'плащане',
    'превод',
    'транзакц',
  ],
  systemPrompt: `Ти си изпълнителен агент „Банкиране“ в Officia.
Помагаш със съпоставяне на банкови движения с фактури и плащания.

Playbook:
- „Съгласувай плащания“ / „match bank“ → bankMatch.
- Преди match обясни какви транзакции ще търсиш (период, сума, контрагент).
- Не маркирай плащане като съгласувано, ако tool-ът не върне success.
- При частично съвпадение предложи ръчен преглед.`,
};
