'use client';
// Fix client side crash by avoiding next/image for blob URLs
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, Paperclip, X, File as FileIcon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

export default function AIAssistantPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/ai/chat',
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: 'Здравейте! Аз съм вашият AI Асистент. Мога да проверя неплатени фактури или да извлека данни от документи. Прикачете фактура или просто ме попитайте нещо!',
      }
    ]
  } as any) as any;

  const [files, setFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    if (!files) return;
    const dt = new DataTransfer();
    for (let i = 0; i < files.length; i++) {
      if (i !== index) dt.items.add(files[i]);
    }
    setFiles(dt.files.length > 0 ? dt.files : null);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e, {
      experimental_attachments: files ? files : undefined,
    });
    setFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-[#4F46E5]" />
        <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D]">AI Асистент</h1>
      </div>
      
      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-gray-100">
        <CardContent className="flex-1 p-0 flex flex-col">
          
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6 pb-4">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={16} className="text-[#4F46E5]" />
                    </div>
                  )}
                  
                  <div className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#4F46E5] text-white rounded-tr-sm' 
                      : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-100'
                  }`}>
                    {/* Визуализация на съдържанието */}
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Визуализация на прикачените файлове */}
                    {msg.experimental_attachments?.map((attachment: any, index: number) => (
                      <div key={index} className="mt-3">
                        {attachment.contentType?.startsWith('image/') ? (
                          <div className="relative w-48 h-48 rounded-lg overflow-hidden border border-white/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={attachment.url}
                              alt="Прикачен файл"
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-white/10 p-3 rounded-lg border border-white/20">
                            <FileIcon size={20} />
                            <span className="text-xs truncate">{attachment.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {msg.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                      <User size={16} className="text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4 justify-start">
                  <div className="h-8 w-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} className="text-[#4F46E5]" />
                  </div>
                  <div className="bg-gray-50 text-gray-800 p-4 rounded-2xl rounded-tl-sm border border-gray-100">
                    <div className="flex gap-1 items-center h-5">
                      <span className="w-2 h-2 bg-[#4F46E5]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#4F46E5]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#4F46E5]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center text-red-500 text-sm py-4">
                  Възникна грешка при връзката с асистента. Моля, опитайте отново.
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-gray-100 bg-white">
            {/* Файлови визуализации преди изпращане */}
            {files && files.length > 0 && (
              <div className="flex gap-3 mb-3 px-2 overflow-x-auto">
                {Array.from(files).map((file, index) => (
                  <div key={index} className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 max-w-[200px]">
                    {file.type.startsWith('image/') ? (
                      <div className="w-10 h-10 relative shrink-0 rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt="preview" className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <FileIcon size={24} className="text-indigo-500 shrink-0" />
                    )}
                    <span className="text-xs truncate text-gray-600">{file.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-200 p-0.5 text-gray-500 hover:text-red-500 shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={onSubmit} className="flex gap-3 relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4F46E5] transition-colors"
                title="Прикачи фактура или документ"
              >
                <Paperclip size={20} />
              </button>
              
              <input 
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                multiple
                accept="image/*,application/pdf"
              />

              <Input 
                value={input}
                onChange={handleInputChange}
                placeholder="Попитай асистента или прикачи фактура за сканиране..."
                className="flex-1 rounded-xl border-gray-200 focus-visible:ring-[#4F46E5] py-6 pl-12 text-[15px]"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                disabled={(!input.trim() && (!files || files.length === 0)) || isLoading}
                className="bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl px-6 h-auto"
              >
                <Send size={18} className="mr-2" />
                Изпрати
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
