'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const lang = (params.lang as string) || 'bg';

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
        <AlertTriangle size={28} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Нещо се обърка</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Страницата не можа да се зареди. Опитай отново или се върни към таблото.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-zinc-600">Код: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} className="gap-2 bg-violet-600 hover:bg-violet-700">
          <RefreshCw size={16} />
          Опитай отново
        </Button>
        <Button asChild variant="outline" className="gap-2 border-white/10 bg-white/5 text-zinc-200">
          <Link href={`/${lang}/dashboard`}>
            <Home size={16} />
            Към таблото
          </Link>
        </Button>
      </div>
    </div>
  );
}
