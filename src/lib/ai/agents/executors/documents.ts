import type { ExecutorAgent } from '../types';

export const documentsExecutor: ExecutorAgent = {
  id: 'documents',
  label: 'Документи',
  description: 'Търсене в архива, inbox и обработка на документи.',
  toolKeys: ['searchDocuments', 'processInbox'],
  keywords: [
    'document',
    'документ',
    'архив',
    'договор',
    'receipt',
    'касова',
    'сканир',
    'inbox',
    'качи',
    'pdf',
  ],
  systemPrompt: `Ти си изпълнителен агент „Документи“ в Officia.
Помагаш с търсене в архива, AI inbox и обработка на качени документи.

Playbook:
- Търсене по доставчик/дата/тип → searchDocuments.
- Нови inbox елементи / качени файлове → processInbox.
- Структурирай извлечените данни: доставчик, дата, сума, ДДС, номер документ.
- При неясно OCR попитай потребителя преди счетоводен запис.`,
};
