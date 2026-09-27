import { getEntitlement } from '@/lib/billing/entitlements';
import { PlanLocked } from '@/components/billing/PlanLocked';

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  const access = await getEntitlement();
  if (!access.modules.ai) return <PlanLocked module="AI асистент" />;
  return children;
}
