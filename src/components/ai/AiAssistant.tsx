"use client";

import React, { useState } from 'react';
import { Bot, X } from 'lucide-react';
import AiChatWindow from './AiChatWindow';

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center hover:scale-105 hover:bg-blue-700 transition-all z-50 ${isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
      >
        <Bot size={28} />
      </button>

      {/* Chat Window Panel */}
      <div 
        className={`fixed bottom-6 right-6 w-full max-w-[400px] h-[600px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden z-50 flex flex-col transition-all origin-bottom-right duration-300 ease-out ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 p-1.5 bg-white/50 hover:bg-gray-100 rounded-full text-gray-500 z-10 transition-colors"
        >
          <X size={18} />
        </button>
        
        {isOpen && <AiChatWindow />}
      </div>
    </>
  );
}
