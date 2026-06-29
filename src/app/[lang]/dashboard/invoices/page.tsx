import { Suspense } from 'react';
import InvoicesPageContent from './invoices-content';

export default function InvoicesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground py-8 text-center">…</p>}>
      <InvoicesPageContent />
    </Suspense>
  );
}
