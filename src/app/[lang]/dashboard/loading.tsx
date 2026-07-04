import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
        <p className="text-sm">Зареждане...</p>
      </div>
    </div>
  );
}
