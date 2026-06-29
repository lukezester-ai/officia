import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppLogoLinkProps = {
  lang: string;
  variant?: 'sidebar' | 'circle';
  className?: string;
  showLabel?: boolean;
};

export function AppLogoLink({
  lang,
  variant = 'sidebar',
  className,
  showLabel = true,
}: AppLogoLinkProps) {
  const icon =
    variant === 'circle' ? (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-lg shadow-purple-700/30">
        O
      </div>
    ) : (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600">
        <Sparkles size={16} className="text-white" />
      </div>
    );

  return (
    <Link
      href={`/${lang}`}
      aria-label="Officia — начална страница"
      title="Към начална страница"
      className={cn(
        'inline-flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 rounded-lg',
        className,
      )}
    >
      {icon}
      {showLabel && (
        <span className="text-lg font-bold tracking-tight text-white">Officia</span>
      )}
    </Link>
  );
}
