'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DocumentChatFields } from '@/lib/ai/document-chat-prompt';

interface Message { role: 'user' | 'assistant'; content: string; }

export function DocumentChat({
  documentName,
  extractedText,
  fields,
}: {
  documentName: string;
  extractedText: string;
  fields?: DocumentChatFields;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Питам само по извлечения текст от „${documentName}“. Ако числото не е в него, ще кажа, че не го виждам.` }
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const text = question.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/document-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName,
          extractedText,
          fields,
          question: text,
          messages: history.slice(0, -1),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Няма отговор за този файл.');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response || 'Няма отговор.' }]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: error?.message || 'Няма отговор за този файл.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-xl flex flex-col h-[320px] bg-zinc-950 overflow-hidden">
      <div className="border-b border-white/10 p-3 px-4 font-medium text-sm flex items-center gap-2 text-zinc-200">
        <Bot size={16} className="text-indigo-400"/> Въпрос към извлечения текст
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {m.role === 'assistant' && <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5"><Bot size={12} className="text-indigo-400" /></div>}
              <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/5 text-zinc-200 rounded-tl-sm'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
               <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5"><Bot size={12} className="text-indigo-400" /></div>
              <div className="p-3 rounded-2xl bg-white/5 rounded-tl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-white/10 flex gap-2">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Питай само за това, което е извлечено" className="rounded-full bg-zinc-900 border-white/10 text-white" />
        <Button onClick={ask} disabled={loading} className="rounded-full w-10 h-10 p-0 shrink-0 bg-indigo-600 hover:bg-indigo-500">
          <Send size={16} className="ml-[-2px]"/>
        </Button>
      </div>
    </div>
  );
}
