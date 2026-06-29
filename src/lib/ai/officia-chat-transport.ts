'use client';

import { DefaultChatTransport } from 'ai';

export const officiaChatTransport = new DefaultChatTransport({
  api: '/api/ai/chat',
});
