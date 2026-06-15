'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    // Action will be implemented later
    alert(`Joined waitlist with ${email}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <div className="mb-4">
          <span className="bg-[#4F46E5]/10 text-[#4F46E5] px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase">
            Coming Soon 2026
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-[#0F1F3D] tracking-tight mb-6">
          <span className="text-[#4F46E5]">O</span>fficia
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 mb-10 leading-relaxed">
          Your entire office. Smarter.
          <br className="hidden md:block"/> Accounting, HR, Documents and AI. All in one place.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto">
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="h-14 px-8 text-lg font-medium bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-sm w-full rounded-full"
          >
            Влез в Таблото (Dashboard)
          </Button>
        </div>
      </div>
    </div>
  );
}
