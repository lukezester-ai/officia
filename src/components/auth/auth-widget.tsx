'use client';

import { useEffect, useState } from 'react';

type Phase = 'loading' | 'ready' | 'failed';

export function AuthWidget({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (document.querySelector('.cl-rootBox, .cl-card')) {
        setPhase('ready');
        window.clearInterval(timer);
        return;
      }
      if (Date.now() - started < 5000) return;
      window.clearInterval(timer);
      const key = 'officia-auth-reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.assign(window.location.pathname + window.location.search);
        return;
      }
      setPhase('failed');
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      {phase === 'loading' ? <p className="text-sm text-zinc-300">Формата се зарежда…</p> : null}
      {phase === 'failed' ? (
        <p className="max-w-sm text-center text-sm text-zinc-200">
          Формата не се зареди. Презареди страницата. Ако браузърът спира clerk.accounts.dev, разреши този адрес.
        </p>
      ) : null}
      {children}
    </>
  );
}
