import PracticeClient from './PracticeClient';
import { Building2 } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function PracticePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Practice Management</h1>
            <p className="text-zinc-400">Глобално табло за управление на клиентско портфолио</p>
          </div>
        </div>
        
        <PracticeClient />
      </div>
    </div>
  );
}
