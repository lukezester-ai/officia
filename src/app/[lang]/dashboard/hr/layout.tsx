import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  try {
    const access = await getEntitlement();
    if (!access.modules.hr) return <PlanLocked module="Кадри и отпуски" planName="Бизнес" monthlyPrice="14,90 €" annualPrice="11,90 €" />;
    return children;
  } catch (error) {
    console.error('[hr]', error);
    return <PlanLocked module="Кадри и отпуски" planName="Бизнес" monthlyPrice="14,90 €" annualPrice="11,90 €" />;
  }
}
