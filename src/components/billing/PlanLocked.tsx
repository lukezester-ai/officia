import Link from 'next/link';

export function PlanLocked({ module }: { module: string }) {
  return (
    <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8">
      <h1 className="text-2xl font-bold text-white">{module}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Този модул не е включен в плана Стартер. ТРЗ, кадрите и ZIP файлът за ДДС се отключват с Бизнес. AI асистентът се отключва с Про.
      </p>
      <Link href="/bg#pricing" className="mt-6 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
        Виж плановете
      </Link>
    </div>
  );
}

export function TrialEnded() {
  return (
    <div className="max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8">
      <h1 className="text-2xl font-bold text-white">14-дневният достъп приключи</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        Регистрацията е без карта. След 14 дни екраните спират, докато не се плати план.
      </p>
      <Link href="/bg#pricing" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-700">
        Плати план
      </Link>
    </div>
  );
}
