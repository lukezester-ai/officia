'use client';
// @ts-nocheck

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, X, MessageSquare } from 'lucide-react';
import { askAssistant } from './actions';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'ai',
  content: 'Здравейте! Аз съм вашият AI Асистент. Мога да проверя неплатени фактури, молби за отпуск или да направя справка за заплати. Как мога да помогна днес?',
};

export function AiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsTyping(true);

    const responseText = await askAssistant(userMessage.content);

    setMessages((prev) => [
      ...prev,
      { id: (Date.now() + 1).toString(), role: 'ai', content: responseText },
    ]);
    setIsTyping(false);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] shadow-xl shadow-indigo-500/20 z-50 p-0 transition-transform duration-200"
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageSquare size={24} className="text-white" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl z-40 flex flex-col border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
      <div className="bg-[#4F46E5] text-white p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Officia AI</h3>
            <p className="text-xs text-indigo-100">Вашият умен асистент</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <X size={18} />
        </Button>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4 bg-slate-50/50" ref={scrollRef}>
        <div className="space-y-4 pb-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="h-8 w-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-[#4F46E5]" />
                </div>
              )}
              
              <div className={`max-w-[80%] p-3.5 rounded-2xl whitespace-pre-wrap text-[13px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#4F46E5] text-white rounded-br-sm' 
                  : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
              }`}>
                {/* Parse simple markdown like **bold** */}
                {msg.content.split('**').map((part, i) => 
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-[#4F46E5]" />
              </div>
              <div className="p-4 rounded-2xl bg-white text-gray-500 rounded-bl-sm border border-gray-100 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2 items-center">
        <Input 
          placeholder="Попитайте нещо..." 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 h-10 shadow-none rounded-full px-4 bg-slate-50 border-gray-200 focus-visible:ring-[#4F46E5] text-sm"
        />
        <Button 
          type="submit" 
          disabled={isTyping || !prompt.trim()} 
          className="h-10 w-10 rounded-full p-0 bg-[#4F46E5] hover:bg-[#4338CA] shrink-0"
        >
          <Send size={16} className="ml-[-2px]" />
        </Button>
      </form>
    </div>
    )}
    </>
  );
}
