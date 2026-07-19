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
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F59E0B] font-mono text-xl font-bold text-[#0B1220]">
        O
      </div>
    ) : (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F59E0B]">
        <Sparkles size={16} className="text-[#0B1220]" />
      </div>
    );

  return (
    <Link
      href={`/${lang}`}
      aria-label="Officia MENA — home"
      title="Officia MENA"
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
        className,
      )}
    >
      {icon}
      {showLabel && (
        <span className="font-mono text-lg font-bold tracking-tight text-white">Officia MENA</span>
      )}
    </Link>
  );
}
