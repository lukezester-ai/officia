'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { acceptTeamInvite } from '@/app/[lang]/dashboard/settings/team/actions';
import { toast } from 'sonner';

export default function AcceptInvitePage() {
  const params = useSearchParams();
  const routeParams = useParams();
  const router = useRouter();
  const lang = String(routeParams?.lang ?? 'bg');
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    acceptTeamInvite(token).then((res) => {
      if (res.success) {
        setStatus('ok');
        toast.success('Поканата е приета');
        router.replace(`/${lang}/dashboard`);
      } else {
        setStatus('error');
        toast.error(res.error);
      }
    });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
      <div className="text-center">
        {status === 'loading' && <p>Обработка на покана...</p>}
        {status === 'ok' && <p>Успешно! Пренасочване...</p>}
        {status === 'error' && <p>Невалидна или изтекла покана. Влезте с поканения email.</p>}
      </div>
    </div>
  );
}
