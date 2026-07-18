import { getPublicTenantInfo } from './actions';
import VendorUploadClient from './VendorUploadClient';
import { notFound } from 'next/navigation';

export default async function VendorPortalPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  
  // Взимаме само името на фирмата (без чувствителни данни)
  const res = await getPublicTenantInfo(tenantId);
  
  if (!res.success || !res.data) {
    return notFound(); // Фирмата не съществува или линкът е грешен
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <VendorUploadClient tenantId={tenantId} tenantName={res.data.name} />
      
      <div className="mt-8 text-slate-400 text-sm flex items-center gap-2">
        <span>Powered by</span>
        <span className="font-bold text-slate-900 tracking-tight">Officia</span>
      </div>
    </div>
  );
}
