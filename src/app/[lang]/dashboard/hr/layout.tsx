import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const access = await getEntitlement();
  if (!access.modules.hr) return <PlanLocked module="Кадри и отпуски" />;
  return children;
}
