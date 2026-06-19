// @ts-nocheck
import React from 'react';
import { User, Bot } from 'lucide-react';
import { Message } from '@/hooks/useAIAssistant';
import ToolCallDisplay from './ToolCallDisplay';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 shadow-sm rounded-tl-none'}`}>
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        
        {/* Ако има резултати от извикани инструменти, ги показваме */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            {message.toolResults.map((tr: any, idx: number) => (
              <ToolCallDisplay key={idx} toolResult={tr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
