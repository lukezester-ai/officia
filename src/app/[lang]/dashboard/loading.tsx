export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">Зареждане на таблото…</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
