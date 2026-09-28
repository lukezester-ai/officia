import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  try {
    const access = await getEntitlement();
    if (!access.modules.payroll) return <PlanLocked module="ТРЗ" planName="Бизнес" monthlyPrice="14,90 €" annualPrice="11,90 €" />;
    return children;
  } catch (error) {
    console.error('[payroll]', error);
    return <PlanLocked module="ТРЗ" planName="Бизнес" monthlyPrice="14,90 €" annualPrice="11,90 €" />;
  }
}
