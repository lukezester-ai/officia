import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  const access = await getEntitlement();
  if (!access.modules.payroll) return <PlanLocked module="ТРЗ" />;
  return children;
}
