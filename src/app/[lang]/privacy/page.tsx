export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-16">
      <div className="max-w-3xl mx-auto prose prose-invert prose-sm">
        <h1 className="text-3xl font-bold text-white mb-6">Политика за поверителност</h1>
        <p className="text-zinc-400 mb-8">Последна актуализация: юни 2026</p>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">1. Администратор</h2>
          <p>
            Officia обработва лични и фирмени данни като SaaS платформа за счетоводство и документи.
            За въпроси: privacy@officia.bg
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">2. Какви данни събираме</h2>
          <ul className="list-disc pl-6 space-y-2 text-zinc-300">
            <li>Данни за акаунт (име, email) чрез Clerk</li>
            <li>Фирмени данни (ЕИК, ДДС номер, адрес)</li>
            <li>Фактури, счетоводни записи, HR данни, качени документи</li>
            <li>Технически логове за сигурност и диагностика</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">3. Цели на обработката</h2>
          <p>
            Предоставяне на услугата, счетоводни функции, AI анализ на документи (само при активиран API ключ),
            поддръжка и спазване на законови задължения.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">4. Съхранение и сигурност</h2>
          <p>
            Данните се съхраняват в PostgreSQL (Neon/Render). Достъпът е ограничен до фирменото пространство на потребителя.
            Препоръчваме MFA в Clerk. Не продаваме лични данни на трети страни.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">5. Вашите права (GDPR)</h2>
          <p>
            Имате право на достъп, корекция, изтриване и преносимост на данните си.
            Заявки: privacy@officia.bg. Отговор в срок до 30 дни.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">6. Бисквитки</h2>
          <p>
            Използваме сесийни бисквитки за автентикация (Clerk) и предпочитания (език, тема).
          </p>
        </section>
      </div>
    </div>
  );
}
