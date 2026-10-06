import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  let open = false;
  try {
    const access = await getEntitlement();
    open = access.modules.payroll;
  } catch (error) {
    console.error('[payroll]', error);
  }
  if (!open) return <PlanLocked module="ТРЗ" planName="Бизнес" monthlyPrice="14,90 €" annualPrice="11,90 €" />;
  return children;
}
