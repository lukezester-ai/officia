'use client';
// @ts-nocheck
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, User, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message { role: 'user' | 'assistant'; content: string; }

export function DocumentChat({ documentName, extractedText }: { documentName: string, extractedText: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Здравейте! Готов съм да отговарям на въпроси относно документа "${documentName}".` }
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    
    // Mock AI response
    setTimeout(() => {
      let answer = 'Тъй като в момента работим със симулиран AI, виждам само базов извлечен текст. В реалната система тук щевърна точна информация от фактурата.';
      if (question.toLowerCase().includes('сума') || question.toLowerCase().includes('общо')) {
        answer = 'Извлечената обща сума от този документ е 2,400.00 EUR.';
      } else if (question.toLowerCase().includes('дата')) {
        answer = 'Разчетох датата 01 Юни 2026 г. в горния ляв ъгъл на документа.';
      } else if (question.toLowerCase().includes('ддс')) {
        answer = 'Размерът на начисленото ДДС е 400.00 EUR според таблицата с артикулите.';
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="border rounded-xl flex flex-col h-[500px] bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b p-3 px-4 font-medium text-sm flex items-center gap-2">
        <Bot size={16} className="text-[#4F46E5]"/> Чат с документа
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {m.role === 'assistant' && <div className="h-6 w-6 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-0.5"><Bot size={12} className="text-[#4F46E5]" /></div>}
              <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${m.role === 'user' ? 'bg-[#4F46E5] text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
               <div className="h-6 w-6 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-0.5"><Bot size={12} className="text-[#4F46E5]" /></div>
              <div className="p-3 rounded-2xl bg-gray-100 rounded-tl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t bg-white flex gap-2">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Попитай за ДДС, дати, суми..." className="rounded-full" />
        <Button onClick={ask} disabled={loading} className="rounded-full w-10 h-10 p-0 shrink-0 bg-[#4F46E5] hover:bg-[#4338CA]">
          <Send size={16} className="ml-[-2px]"/>
        </Button>
      </div>
    </div>
  );
}

