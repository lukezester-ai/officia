import ApprovalClient from './ApprovalClient';
import { requireTenant } from '@/lib/auth/get-tenant';
import { redirect } from 'next/navigation';

export default async function MobileApprovalsPage() {
  // Аутентикация
  const { tenantId, user } = await requireTenant();
  
  if (!tenantId) {
    redirect('/sign-in');
  }

  // Този route е предвиден да се отваря предимно от мобилни устройства.
  // Затова нямаме сложни Layout-и. Самият layout.tsx в mobile папката би бил много изчистен.
  return (
    <div className="bg-zinc-950 min-h-screen text-white font-sans selection:bg-violet-500/30">
      <ApprovalClient />
    </div>
  );
}
