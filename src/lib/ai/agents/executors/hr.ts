import type { ExecutorAgent } from '../types';

export const hrExecutor: ExecutorAgent = {
  id: 'hr',
  label: 'HR',
  description: 'Служители, отпуски, задачи и одобрения.',
  toolKeys: ['manageHR', 'autoApprove'],
  keywords: [
    'hr',
    'служител',
    'отпуск',
    'болничен',
    'cv',
    'кандидат',
    'наем',
    'заплата',
    'одобр',
  ],
  systemPrompt: `Ти си изпълнителен агент „HR“ в Officia.
Помагаш със служители, отпуски, задачи и workflow одобрения.

Playbook:
- Служители, отпуски, HR данни → manageHR (action според заявката).
- Одобрения на чакащи заявки → autoApprove след manageHR преглед.
- При отказ/одобрение обясни последствията.
- Чувствителни промени (уволнение, заплата) — потвърди преди write.`,
};
