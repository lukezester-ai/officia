'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Send, User, Paperclip, X, File as FileIcon, Mic, Loader2, ShieldCheck, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AgentManagerPanel } from './AgentManagerPanel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Здравейте! Аз съм **Officia AI**. Мога да отговарям на въпроси за счетоводство, ДДС, ТРЗ и Bulgarian legal requirements. С какво мога да помогна?',
  },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && files.length === 0) return;
    if (isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || '(прикачени файлове)',
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setFiles([]);
    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
        parts: [{ type: 'text', text: m.content }],
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) throw new Error('Грешка при връзка със сървъра');

      const data = await response.json();

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Няма отговор от асистента.',
      }]);
    } catch (err: any) {
      console.error('AI error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Грешка при свързване с AI. ${err.message || 'Моля, опитайте отново.'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Браузърът не поддържа гласово въвеждане. Използвайте Chrome.'); return; }
    const r = new SR();
    r.lang = 'bg-BG';
    r.interimResults = true;
    r.onstart = () => setIsListening(true);
    r.onresult = (e: any) => setInput(Array.from(e.results).map((res: any) => res[0].transcript).join(''));
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start();
  };

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Заглавие & Табове */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Асистент & Супервайзър</h1>
            <p className="text-xs text-zinc-500">Захранен от Anthropic Claude · Реагира на български</p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-xs text-emerald-400 self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Всички 6 агента са активни
        </span>
      </div>

      <Tabs defaultValue="chat" className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full sm:w-80 grid-cols-2 h-11 items-center bg-slate-900 border border-white/10 rounded-xl p-1 shrink-0 mb-4">
          <TabsTrigger value="chat" className="rounded-lg h-9 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium flex items-center gap-2">
            <Bot size={15} /> Чат Асистент
          </TabsTrigger>
          <TabsTrigger value="manager" className="rounded-lg h-9 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium flex items-center gap-2">
            <ShieldCheck size={15} /> Agent Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-[500px] m-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-white/10 bg-white/3 min-h-0">
            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-5 pb-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0 mt-1">
                          <Bot size={15} className="text-violet-400" />
                        </div>
                      )}
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-white/5 text-zinc-200 rounded-tl-sm border border-white/10'
                      }`}>
                        <div className="prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                          <User size={15} className="text-zinc-400" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="h-8 w-8 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
                        <Bot size={15} className="text-violet-400" />
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                        <Loader2 size={14} className="text-violet-400 animate-spin" />
                        <span className="text-xs text-zinc-500">Officia AI пише...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-white/10 bg-[#0A0F1C] shrink-0">
                {files.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
                        <FileIcon size={12} className="text-violet-400" />
                        <span className="truncate max-w-[140px]">{f.name}</span>
                        <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-rose-400">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar print:hidden">
                  <button 
                    onClick={() => setInput('Трябва ли да се регистрирам по чл. 97а ЗДДС за услуги към САЩ?')}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs hover:bg-violet-500/20 transition-colors"
                  >
                    ЗДДС: Регистрация за САЩ?
                  </button>
                  <button 
                    onClick={() => setInput('Кога се подава годишната данъчна декларация по ЗКПО?')}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs hover:bg-teal-500/20 transition-colors"
                  >
                    ЗКПО: ГДД Срок?
                  </button>
                  <button 
                    onClick={() => setInput('Какво гласи чл. 114 от Кодекса на труда за работа през определени дни?')}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs hover:bg-amber-500/20 transition-colors"
                  >
                    КТ: Договор на парче?
                  </button>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/5 text-zinc-500 hover:text-violet-400 rounded-lg transition-colors" title="Прикачи файл">
                      <Paperclip size={18} />
                    </button>
                    <button onClick={toggleListening} className={`p-2 rounded-lg transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'hover:bg-white/5 text-zinc-500 hover:text-violet-400'}`} title="Гласово въвеждане">
                      <Mic size={18} />
                    </button>
                  </div>

                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={isListening ? 'Слушам...' : 'Напишете въпрос или команда...'}
                      disabled={isLoading}
                      rows={1}
                      className="w-full resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                      style={{ fieldSizing: 'content', maxHeight: '120px' } as any}
                    />
                  </div>

                  <Button
                    onClick={sendMessage}
                    disabled={(!input.trim() && files.length === 0) || isLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 h-11 shrink-0"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </Button>
                </div>

                <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden"
                  onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manager" className="flex-1 overflow-y-auto m-0 pb-10">
          <AgentManagerPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
