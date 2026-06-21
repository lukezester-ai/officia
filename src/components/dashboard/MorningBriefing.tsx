'use client';

import { useState, useEffect } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { generateMorningBriefing } from '@/app/[lang]/dashboard/actions/briefing';

export function MorningBriefing() {
  const [briefing, setBriefing] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const result = await generateMorningBriefing();
        setBriefing(result);
      } catch (err) {
        setBriefing("Здравей! Готов съм за днешните задачи.");
      } finally {
        setLoading(false);
      }
    }
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-pulse">
        <div className="bg-violet-500/20 text-violet-400 p-2 rounded-xl shrink-0">
          <Bot size={24} />
        </div>
        <div className="space-y-2 py-1 w-full">
          <div className="h-4 bg-violet-500/20 rounded w-3/4"></div>
          <div className="h-4 bg-violet-500/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 blur-xl opacity-0 group-hover:opacity-100 transition duration-1000 -z-10"></div>
      
      <div className="bg-violet-500 text-white p-2.5 rounded-xl shrink-0 shadow-lg shadow-violet-500/20">
        <Sparkles size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-violet-900 dark:text-violet-100 mb-1 flex items-center gap-2">
          Officia AI Проактивен Асистент
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
          {briefing}
        </p>
      </div>
    </div>
  );
}
