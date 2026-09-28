import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  try {
    const access = await getEntitlement();
    if (!access.modules.ai) return <PlanLocked module="AI асистент" planName="Про" monthlyPrice="49 €" annualPrice="39 €" />;
    return children;
  } catch (error) {
    console.error('[ai-assistant]', error);
    return <PlanLocked module="AI асистент" planName="Про" monthlyPrice="49 €" annualPrice="39 €" />;
  }
}
