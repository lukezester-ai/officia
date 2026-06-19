"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, Mic, MicOff, Paperclip, Minimize2, Maximize2, Copy, ThumbsUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: string[];
  toolCalls?: any[];
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Здравей! Аз съм Officia AI. С какво мога да ти помогна?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Копирано в клипборда");
  };

  const addReaction = (messageId: string) => {
    setReactions(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || 0) + 1
    }));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || "Качени файлове",
      timestamp: new Date(),
      attachments: attachments.map(f => f.name),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('message', currentInput);
    attachments.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "Не успях да обработя заявката.",
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Възникна грешка. Моля, опитай отново.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
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

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          
          const formData = new FormData();
          formData.append('file', audioBlob, 'voice.webm');

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          setInput(data.text || '');
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert("Не може да се достъпи микрофона");
      }
    }
  };

  return (
    <>
      {/* Floating Button with animation */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 
                   rounded-full flex items-center justify-center shadow-2xl z-50
                   hover:scale-110 active:scale-95 transition-all duration-300
                   animate-float"
      >
        <Bot className="w-8 h-8 text-white" />
      </button>

      <AnimatePresence> {/* ако ползваш framer, иначе махни */}
        {isOpen && (
          <div className="fixed bottom-24 right-8 w-[400px] h-[560px] bg-zinc-900 border border-white/10 
                         rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 chat-window text-white">
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center animate-spin-slow">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Officia AI</p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Онлайн
                  </p>
                </div>
              </div>

              <div className="flex gap-2 text-white">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/10 rounded-xl transition hover:rotate-12"
                >
                  {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition hover:rotate-90"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 transition-all ${isMinimized ? 'hidden' : ''}`}>
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`group relative flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-pop transition-all duration-200`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className={`max-w-[85%] rounded-3xl px-5 py-3.5 shadow-md transition-all duration-300
                    ${msg.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white' 
                      : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'}
                    group-hover:scale-[1.02] group-hover:shadow-xl`}
                  >
                    <ReactMarkdown className="prose prose-invert prose-sm break-words">{msg.content}</ReactMarkdown>

                    {/* Tool Calls Indicator */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {msg.toolCalls.map((tool, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                            {tool.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 text-xs opacity-70 flex items-center gap-1">
                        📎 {msg.attachments.join(', ')}
                      </div>
                    )}

                    <p className="text-[10px] opacity-60 mt-2 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {/* Hover Actions */}
                    {hoveredMessageId === msg.id && (
                      <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => addReaction(msg.id)}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg flex items-center gap-1"
                        >
                          👍 <span className="text-xs">{reactions[msg.id] || ''}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-zinc-800 rounded-3xl px-5 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-150" />
                      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!isMinimized && (
              <div className="p-4 border-t border-white/10 bg-zinc-950 text-white">
                <div className="flex gap-2 mb-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 hover:bg-zinc-800 rounded-2xl transition hover:scale-110 active:scale-95"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button 
                    onClick={toggleVoice}
                    className={`p-3 rounded-2xl transition-all hover:scale-110 active:scale-95
                      ${isRecording ? 'recording-pulse bg-red-500 text-white' : 'hover:bg-zinc-800'}`}
                  >
                    {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Попитай Officia AI..."
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 
                               text-white focus:outline-none focus:border-violet-500 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || (!input.trim() && attachments.length === 0)}
                    className="bg-gradient-to-br from-blue-600 to-violet-600 text-white disabled:opacity-50 
                               p-4 rounded-2xl transition hover:scale-105 active:scale-95"
                  >
                    <Send size={22} />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && setAttachments(Array.from(e.target.files))}
                />
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
