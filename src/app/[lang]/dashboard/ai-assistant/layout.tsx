import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  let open = false;
  try {
    const access = await getEntitlement();
    open = access.modules.ai;
  } catch (error) {
    console.error('[ai-assistant]', error);
  }
  if (!open) return <PlanLocked module="AI асистент" planName="Про" monthlyPrice="49 €" annualPrice="39 €" />;
  return children;
}
