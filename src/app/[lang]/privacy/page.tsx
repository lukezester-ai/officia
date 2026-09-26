import Link from 'next/link';

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main className="min-h-screen bg-[#070b14] px-6 py-16 text-zinc-200">
      <article className="mx-auto max-w-2xl space-y-6">
        <Link href={`/${lang}`} className="text-sm text-zinc-400 hover:text-white">Към началото</Link>
        <h1 className="text-3xl font-bold text-white">Поверителност</h1>
        <p>Officia се поддържа от AgriNexus Ltd. За въпроси: info@agrinexus.eu.</p>
        <p>В акаунта се пазят данните, които фирмата въвежда: профил, контрагенти, фактури, склад, служители, заплати и сделки. Те се ползват, за да работи таблото на тази фирма.</p>
        <p>Достъпът е за потребителите на същия акаунт. Данните не се продават. Паролата за вход се държи от услугата за вход, не в текстовете на фактурите.</p>
        <p>Може да поискате корекция или изтриване на акаунта на info@agrinexus.eu.</p>
      </article>
    </main>
  );
}
