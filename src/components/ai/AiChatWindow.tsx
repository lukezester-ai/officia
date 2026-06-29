import React, { useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import MessageBubble from './MessageBubble';

export default function AiChatWindow() {
  const { messages, isLoading, sendMessage } = useAIAssistant();
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-2 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <Sparkles size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">Officia AI</h3>
          <p className="text-xs text-gray-500">Вашият интелигентен бизнес асистент</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <Sparkles size={32} className="text-blue-200" />
            <p>Здравейте! Аз съм Officia AI.<br />С какво мога да ви помогна днес?</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {isLoading && (
          <div className="flex gap-2 items-center text-gray-400 text-sm mt-4">
            <Loader2 size={16} className="animate-spin" />
            <span>AI мисли...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Попитайте ме нещо или ми дайте задача..."
            className="w-full pl-4 pr-12 py-3 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white disabled:bg-gray-300 transition-colors"
          >
            <Send size={16} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
