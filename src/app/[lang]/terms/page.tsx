import Link from 'next/link';

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main className="min-h-screen bg-[#070b14] px-6 py-16 text-zinc-200">
      <article className="mx-auto max-w-2xl space-y-6">
        <Link href={`/${lang}`} className="text-sm text-zinc-400 hover:text-white">Към началото</Link>
        <h1 className="text-3xl font-bold text-white">Условия</h1>
        <p>Officia е програма за вътрешната работа на фирмата: фактури, склад, сделки и заплати. Услугата се предоставя от AgriNexus Ltd.</p>
        <p>Фирмата, която ползва акаунта, отговаря за верността на въведените данни и за това какво подава навън. Officia не подава декларации към НАП и не превежда пари към банка.</p>
        <p>Черновите за заплати и файловете за преводи са за преглед и качване от самата фирма. Спечелена сделка създава фактура-чернова в Officia.</p>
        <p>Акаунтът може да бъде спрян при злоупотреба. За въпроси: info@agrinexus.eu.</p>
      </article>
    </main>
  );
}
