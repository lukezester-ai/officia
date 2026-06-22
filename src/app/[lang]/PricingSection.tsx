"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold tracking-tight mb-4">Прост, честен ценови план</h2>
        <p className="text-zinc-400 mb-8">Без скрити такси. Без изненади.</p>
        
        <div className="flex justify-center items-center gap-3 mb-12">
          <span className={`text-sm ${!isAnnual ? 'text-white font-semibold' : 'text-zinc-400'}`}>Месечно</span>
          <button 
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-7 bg-white/10 rounded-full border border-white/20 transition-colors focus:outline-none"
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-indigo-500 rounded-full transition-transform ${isAnnual ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm flex items-center gap-1.5 ${isAnnual ? 'text-white font-semibold' : 'text-zinc-400'}`}>
            Годишно
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              -20%
            </span>
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/3 border border-white/10 rounded-2xl p-8 text-left transition-all hover:bg-white/5">
            <div className="text-sm text-zinc-400 font-medium mb-2 uppercase tracking-wider">Стартер</div>
            <div className="text-4xl font-bold mb-1">Безплатно</div>
            <div className="text-zinc-500 text-sm mb-6">14 дни · без кредитна карта</div>
            <div className="space-y-3 text-sm text-zinc-400 mb-8">
              {['До 50 фактури/месец', 'Базово счетоводство', '1 потребител', 'Email поддръжка'].map(i => (
                <div key={i} className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" />{i}</div>
              ))}
            </div>
            <Link href={"/sign-up"} className="block text-center border border-white/15 hover:border-white/30 rounded-xl py-3 text-sm font-medium transition-all hover:bg-white/10">
              Започни безплатно
            </Link>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 border border-indigo-500/30 rounded-2xl p-8 text-left relative overflow-hidden shadow-2xl shadow-indigo-900/50">
            <div className="absolute top-4 right-4 bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full">Популярен</div>
            <div className="text-sm text-indigo-200 font-medium mb-2 uppercase tracking-wider">Про</div>
            <div className="flex items-end gap-1 mb-1">
              <div className="text-4xl font-bold">
                {isAnnual ? '39.20 €' : '49.00 €'}
              </div>
              <div className="text-lg font-normal text-indigo-200 mb-1">/мес</div>
            </div>
            <div className="text-indigo-200 text-sm mb-6">
              {isAnnual ? 'Таксува се 470.40 € веднъж годишно' : 'Таксува се всеки месец'}
            </div>
            <div className="space-y-3 text-sm text-indigo-100 mb-8">
              {['Неограничени фактури', 'AI анализ на документи', 'Банкова синхронизация', 'До 10 потребители', 'Приоритетна поддръжка'].map(i => (
                <div key={i} className="flex items-center gap-2"><CheckCircle size={14} className="text-white" />{i}</div>
              ))}
            </div>
            <Link href={"/sign-up"} className="block text-center bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl py-3 text-sm font-semibold transition-all shadow-lg hover:shadow-xl">
              Започни пробния период
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
