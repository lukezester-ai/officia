import Link from 'next/link';
import { completeOpenBanking } from '../open-banking';

export default async function BankingConnectedPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { lang } = await params;
  const { ref } = await searchParams;
  const result = await completeOpenBanking(ref || '');

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10 text-white">
      <h1 className="text-2xl font-bold">{result.success ? 'Банката е свързана' : 'Връзката не завърши'}</h1>
      <p className="text-sm text-zinc-400">
        {result.success
          ? `Влязоха ${result.count} нови движения от ${result.accounts} сметки.`
          : result.error}
      </p>
      <Link href={`/${lang}/dashboard/banking`} className="inline-flex rounded-md bg-violet-600 px-4 py-2 text-sm">
        Към банковите сметки
      </Link>
    </div>
  );
}
