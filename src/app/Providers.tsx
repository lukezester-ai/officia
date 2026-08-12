// src/app/Providers.tsx
'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from 'sonner';
import AiAssistant from '@/components/ai/AiAssistant';
import type { ReactNode } from 'react';

interface ProvidersProps {
  locale: string;
  messages: Record<string, any>;
  children: ReactNode;
}

export function Providers({ locale, messages, children }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {/* Premium Background Grid */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        <ThemeToggle />
        {children}
        <AiAssistant />
        <Toaster theme="system" />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
