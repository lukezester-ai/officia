'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

const dashboardPath = '/bg/dashboard';

function sameOriginPath(target: string) {
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return dashboardPath;
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!path.startsWith('/') || path.startsWith('//')) return dashboardPath;
    return path;
  } catch {
    return target.startsWith('/') && !target.startsWith('//') ? target : dashboardPath;
  }
}

export function FinishAuthRedirect({ message }: { message: string }) {
  const { isLoaded } = useAuth();
  const clerk = useClerk();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    const go = (target: string) => {
      window.location.replace(sameOriginPath(target));
    };
    const timer = window.setTimeout(() => go(dashboardPath), 8000);

    clerk
      .handleRedirectCallback(
        {
          signInUrl: '/sign-in',
          signUpUrl: '/sign-up',
          signInForceRedirectUrl: dashboardPath,
          signUpForceRedirectUrl: dashboardPath,
        },
        async (to) => {
          window.clearTimeout(timer);
          go(to);
        },
      )
      .catch(() => {
        window.clearTimeout(timer);
        go(dashboardPath);
      });

    return () => window.clearTimeout(timer);
  }, [clerk, isLoaded]);

  return (
    <div className="flex max-w-sm flex-col items-center gap-4 text-center">
      <p className="text-sm text-zinc-200">{message}</p>
      <a href={dashboardPath} className="text-sm font-semibold text-white underline underline-offset-4">
        Отвори таблото
      </a>
    </div>
  );
}
