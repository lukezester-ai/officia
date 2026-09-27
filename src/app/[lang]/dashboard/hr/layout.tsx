import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  try {
    const access = await getEntitlement();
    if (!access.modules.hr) return <PlanLocked module="Кадри и отпуски" />;
    return children;
  } catch (error) {
    console.error('[hr]', error);
    return <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Кадрите не се заредиха, защото базата не отговори. Презареди страницата.</p>;
  }
}
