export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-16">
      <div className="max-w-3xl mx-auto prose prose-invert prose-sm">
        <h1 className="text-3xl font-bold text-white mb-6">Общи условия</h1>
        <p className="text-zinc-400 mb-8">Последна актуализация: юни 2026</p>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">1. Услуга</h2>
          <p>
            Officia предоставя облачен софтуер за фактури, счетоводство и човешки ресурси. Продуктът е в активна разработка.
            Някои функции (PSD2 банка, директно подаване към НАП) са демо или частични — вижте статуса в приложението.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">2. Планове и пробен период</h2>
          <p>
            Новите акаунти получават 14 дни пълен достъъп. След това важи план Стартер (до 50 фактури/месец) или
            платен Pro план. Лимитите се прилагат автоматично в системата.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">3. Отговорност</h2>
          <p>
            Потребителят носи отговорност за проверка на счетоводни и данъчни данни преди подаване към НАП.
            Officia не замества лицензиран счетоводител. Услугата се предоставя „както е“ без гарантиран uptime SLA,
            освен ако не е договорено писмено.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">4. Плащания</h2>
          <p>
            Абонаментите се таксуват чрез Stripe. Плащанията на ваши клиенти по фактури използват отделен процес за плащане чрез Stripe.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">5. Прекратяване</h2>
          <p>
            Можете да спрете ползването по всяко време. При изтриване на акаунт данните се изтриват в разумен срок,
            освен ако законът изисква по-дълго съхранение.
          </p>
        </section>
      </div>
    </div>
  );
}
