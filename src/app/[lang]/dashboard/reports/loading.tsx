// Loading skeleton за Reports страницата
export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-900 rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>

      {/* CFO panel skeleton */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-6 h-40" />

      {/* Tabs skeleton */}
      <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-xl" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
