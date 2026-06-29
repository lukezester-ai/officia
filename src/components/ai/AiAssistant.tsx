"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, Mic, MicOff, Paperclip, Minimize2, Maximize2, Loader2, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { officiaChatTransport } from '@/lib/ai/officia-chat-transport';

const initialMessages: UIMessage[] = [
  {
    id: '1',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'Здравей! Аз съм **Officia AI**. С какво мога да ти помогна днес?',
      },
    ],
  },
];

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

export default function AiAssistant() {
  const { messages, sendMessage: sendChatMessage, status, error } = useChat({
    transport: officiaChatTransport,
    messages: initialMessages,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const isLoading = status === 'submitted' || status === 'streaming';

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Копирано в клипборда");
  };

  const addReaction = (messageId: string) => {
    setReactions(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || 0) + 1
    }));
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const text = input.trim();
    const currentAttachments = [...attachments];

    setInput('');
    setAttachments([]);

    if (currentAttachments.length > 0) {
      await sendChatMessage(text ? { text, files: currentAttachments } : { files: currentAttachments });
      return;
    }

    await sendChatMessage({ text });
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    
    try {
      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.text) {
        setInput(prev => prev + (prev ? ' ' : '') + data.text);
      } else {
        toast.error('Неуспешна транскрипция');
      }
    } catch (error) {
      console.error("Whisper error:", error);
      toast.error("Грешка при транскрипцията на аудиото");
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleVoice = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          transcribeAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Не може да се достъпи микрофона. Проверете разрешенията.");
      }
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full flex items-center justify-center shadow-xl z-[100] hover:shadow-violet-500/30 transition-all text-white"
      >
        <Bot size={28} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] max-h-[80vh] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="p-4 border-b bg-card flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold leading-none mb-1 text-foreground">Officia AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">Онлайн</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-muted hover:text-destructive rounded-lg transition-colors text-muted-foreground">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-5 bg-muted/20 ${isMinimized ? 'hidden' : ''}`}>
              {messages.map((msg: any) => {
                const messageText = getMessageText(msg);
                return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group relative`}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm relative ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-card border text-card-foreground rounded-tl-sm'}`}>
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                      <ReactMarkdown>
                        {messageText}
                      </ReactMarkdown>
                    </div>

                    {msg.toolInvocations?.map((tool: any, i: number) => (
                      tool.toolName ? (
                        <span key={i} className="mt-3 inline-block text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-mono">
                          🛠️ {tool.toolName}
                        </span>
                      ) : null
                    ))}

                    <div className={`text-[10px] mt-2 flex items-center justify-between gap-4 ${msg.role === 'user' ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                      <span>
                        {reactions[msg.id] ? `👍 ${reactions[msg.id]}` : ''}
                      </span>
                    </div>

                    {hoveredMessageId === msg.id && msg.role === 'assistant' && (
                      <div className="absolute -top-3 -right-2 flex gap-1 bg-background border rounded-lg shadow-sm p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(messageText)}
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                          title="Копирай"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => addReaction(msg.id)}
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                          title="Харесва ми"
                        >
                          👍
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )})}

              {error && (
                <div className="text-center text-red-500 text-sm py-2">
                  Възникна грешка при връзката с асистента. Моля, опитайте отново.
                </div>
              )}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-3">
                    <Loader2 size={16} className="text-indigo-500 animate-spin" />
                    <span className="text-xs text-muted-foreground font-medium">Анализира...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!isMinimized && (
              <div className="p-4 border-t bg-card z-10">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((file, i) => (
                      <div key={i} className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1.5 rounded-md flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X size={12}/></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="p-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                      title="Прикачи файл"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button 
                      onClick={toggleVoice} 
                      className={`p-2.5 rounded-xl transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                      title={isRecording ? "Спри записа" : "Гласово въвеждане"}
                    >
                      {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  </div>

                  <div className="flex-1 relative flex items-end bg-muted/50 rounded-2xl border focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all p-1">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Напишете съобщение..."
                      className="flex-1 max-h-[120px] min-h-[40px] bg-transparent resize-none px-3 py-2.5 text-sm focus:outline-none"
                      rows={1}
                      style={{ fieldSizing: 'content' } as any}
                    />
                    <button 
                      onClick={sendMessage} 
                      disabled={(!input.trim() && attachments.length === 0) || isLoading || isTranscribing} 
                      className="m-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shadow-sm shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
