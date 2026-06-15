'use client';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'ai',
  content: 'Здравейте! Аз съм вашият AI Асистент. Мога да проверя неплатени фактури, молби за отпуск или да извлека данни от документи. Как мога да помогна днес?',
};

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
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

    // Mock AI response logic
    setTimeout(() => {
      const text = userMessage.content.toLowerCase();
      let aiResponse = 'Извинете, все още се уча. Можете ли да перифразирате въпроса си свързан със счетоводството или кадрите?';

      if (text.includes('фактур') || text.includes('неплатен')) {
        aiResponse = 'В момента имате **2,050.50 лв. неплатени фактури** (1 бр. очакваща плащане от DevSolutions BG).\n\nЗа този месец успешно са получени 2,400.00 лв. Искате ли да генерирам напомнителен имейл?';
      } else if (text.includes('отпуск') || text.includes('почивка')) {
        aiResponse = 'Имате 1 нова молба за отпуск, която чака вашето одобрение:\n\n- **Мария Георгиева** (HR Manager)\n- Период: 20 Юни - 25 Юни (Annual Leave)\n\nМожете да я одобрите от секция "Human Resources".';
      } else if (text.includes('заплат')) {
        aiResponse = 'Месечната ведомост за заплати е готова. Общата сума за изплащане на активните служители този месец е **10,500.00 BGN**.';
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', content: aiResponse },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-[#4F46E5]" />
        <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D]">AI Assistant</h1>
      </div>
      
      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-gray-100">
        <CardContent className="flex-1 p-0 flex flex-col">
          
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6 pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="h-8 w-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={16} className="text-[#4F46E5]" />
                    </div>
                  )}
                  
                  <div className={`max-w-[75%] p-4 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#4F46E5] text-white rounded-tr-sm' 
                      : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-100'
                  }`}>
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                      <User size={16} className="text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-4 justify-start">
                  <div className="h-8 w-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} className="text-[#4F46E5]" />
                  </div>
                  <div className="max-w-[75%] p-4 rounded-2xl bg-gray-50 text-gray-500 rounded-tl-sm border border-gray-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-3 items-center">
            <Input 
              placeholder="Попитайте за неплатени фактури, отпуски или заплати..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 h-12 shadow-sm rounded-full px-6 bg-slate-50 focus-visible:ring-[#4F46E5]"
            />
            <Button type="submit" disabled={isTyping} className="h-12 w-12 rounded-full p-0 bg-[#4F46E5] hover:bg-[#4338CA] shrink-0 shadow-md">
              <Send size={18} className="ml-[-2px]" />
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
