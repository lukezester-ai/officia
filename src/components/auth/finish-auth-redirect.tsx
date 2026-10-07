'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';

const dashboardPath = '/bg/dashboard';

function sameOriginTarget(target: string) {
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!path.startsWith('/') || path.startsWith('//')) return null;
    return path;
  } catch {
    return null;
  }
}

function handshakeTarget(target: string) {
  const same = sameOriginTarget(target);
  if (!same) return null;
  const url = new URL(same, window.location.origin);
  if (!url.searchParams.has('__clerk_handshake') && !url.searchParams.has('__clerk_db_jwt')) return null;
  return same;
}

function appPath(target?: string) {
  if (!target) return dashboardPath;
  const same = sameOriginTarget(target);
  if (!same) return dashboardPath;
  const path = new URL(same, window.location.origin).pathname;
  return path.startsWith('/') && !path.startsWith('//') ? path : dashboardPath;
}

export function FinishAuthRedirect({ message }: { message: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const started = useRef(false);
  const sent = useRef(false);
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    const leave = (target?: string) => {
      if (sent.current) return;
      sent.current = true;
      const decorated = target ? handshakeTarget(target) : null;
      if (decorated) {
        window.location.replace(decorated);
        return;
      }
      void clerk.redirectWithAuth(appPath(target)).catch(() => setProblem(true));
    };

    if (isSignedIn) {
      leave();
      return;
    }

    void clerk
      .handleRedirectCallback(
        {
          signInUrl: '/sign-in',
          signUpUrl: '/sign-up',
          signInForceRedirectUrl: dashboardPath,
          signUpForceRedirectUrl: dashboardPath,
          signInFallbackRedirectUrl: dashboardPath,
          signUpFallbackRedirectUrl: dashboardPath,
        },
        async (to) => {
          // Keep Clerk's handshake query. A bare /bg/dashboard hop makes
          // auth.protect() send the browser back to sign-in.
          leave(to);
        },
      )
      .catch(() => {
        if (sent.current) return;
        if (clerk.session) {
          leave();
          return;
        }
        setProblem(true);
      });
  }, [clerk, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || sent.current) return;
    sent.current = true;
    void clerk.redirectWithAuth(dashboardPath).catch(() => setProblem(true));
  }, [clerk, isLoaded, isSignedIn]);

  return (
    <div className="flex max-w-sm flex-col items-center gap-4 text-center">
      <p className="text-sm text-zinc-200">
        {problem ? 'Входът с Google не завърши. Върни се и опитай отново.' : message}
      </p>
      {problem ? (
        <a href="/sign-in" className="text-sm font-semibold text-white underline underline-offset-4">
          Към входа
        </a>
      ) : isSignedIn ? (
        <button
          type="button"
          className="cursor-pointer text-sm font-semibold text-white underline underline-offset-4"
          onClick={() => {
            void clerk.redirectWithAuth(dashboardPath).catch(() => setProblem(true));
          }}
        >
          Отвори таблото
        </button>
      ) : null}
    </div>
  );
}
