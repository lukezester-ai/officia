import Link from 'next/link';
import { FileText } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-400">
        <FileText size={28} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Страницата не е намерена</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Този адрес не съществува или е преместен. Провери линка или се върни към таблото.
      </p>
      <Link
        href="../dashboard"
        className={cn(buttonVariants({ variant: 'default' }), 'mt-6 gap-2 bg-violet-600 hover:bg-violet-700')}
      >
        Към таблото
      </Link>
    </div>
  );
}
