import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  let open = false;
  try {
    const access = await getEntitlement();
    open = access.modules.hr;
  } catch (error) {
    console.error('[hr]', error);
  }
  if (!open) return <PlanLocked module="Кадри и отпуски" planName="Бизнес" monthlyPrice="14,90 €" annualPrice="11,90 €" />;
  return children;
}
