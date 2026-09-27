'use client';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-5">
      <h1 className="text-lg font-semibold text-white">Страницата не се зареди</h1>
      <p className="mt-2 text-sm text-amber-100/90">
        Сървърът не върна екрана. Най-често базата не отговаря. Презареди и опитай отново.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
      >
        Презареди
      </button>
    </div>
  );
}
