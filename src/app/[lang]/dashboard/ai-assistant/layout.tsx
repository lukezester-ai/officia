import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  try {
    const access = await getEntitlement();
    if (!access.modules.ai) return <PlanLocked module="AI асистент" />;
    return children;
  } catch (error) {
    console.error('[ai-assistant]', error);
    return <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">AI асистентът не се зареди, защото базата не отговори. Презареди страницата.</p>;
  }
}
