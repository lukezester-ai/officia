import { useChat } from '@ai-sdk/react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: any;
}

function getMessageText(message: any) {
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => part.text || '')
      .join('');
  }
  return '';
}

export function useAIAssistant() {
  const { messages, sendMessage, status, error, setMessages } = useChat({
    api: '/api/ai/chat',
  } as any);

  const isLoading = status === 'submitted' || status === 'streaming';

  const sendUserMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    await sendMessage({ text: content });
  };

  const clearChat = () => setMessages([]);

  return {
    messages: messages.map((message: any) => ({
      id: message.id,
      role: message.role,
      content: getMessageText(message),
      toolResults: message.toolInvocations,
    })) as Message[],
    isLoading,
    error: error?.message ?? null,
    sendMessage: sendUserMessage,
    clearChat,
  };
}
