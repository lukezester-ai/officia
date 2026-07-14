import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, Download, FileText } from 'lucide-react';
import StripeCheckoutButton from './StripeCheckoutButton';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const invoiceId = parseInt(id, 10);
  
  if (isNaN(invoiceId)) {
    return notFound();
  }

  const invoiceRecord = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoiceRecord || invoiceRecord.length === 0) {
    return notFound();
  }
  const invoice = invoiceRecord[0];

  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId)).catch(() => []);
  const effectiveAmount = getInvoiceEffectiveAmount(invoice, lines);

  const isPaid = invoice.status === 'paid' || invoice.status === 'платена';
  const showSuccessMessage = query.success === 'true';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg border-t-4 border-t-blue-600">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="text-3xl font-bold flex items-center space-x-2">
                <span className="text-blue-600 text-2xl" aria-hidden="true">#</span>
                <span>Invoice #{invoice.invoiceNumber || invoice.id}</span>
              </CardTitle>
              <CardDescription className="mt-1 text-base">
                Issued on {invoice.issueDate || new Date(invoice.createdAt || Date.now()).toLocaleDateString()}
              </CardDescription>
            </div>
            
            <Badge variant="secondary" className={`text-lg px-4 py-1 ${isPaid ? "bg-emerald-100 text-emerald-700" : ""}`}>
              {isPaid ? "Paid" : invoice.status?.toUpperCase() || "DRAFT"}
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {showSuccessMessage && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-center space-x-3">
                <span className="text-green-600 text-2xl" aria-hidden="true">OK</span>
                <div>
                  <p className="font-semibold">Payment successful!</p>
                  <p className="text-sm">Thank you for your payment. The invoice has been marked as paid.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-lg border border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">From</h3>
                <p className="font-bold text-slate-900">{invoice.counterpartyName || "Officia ERP Sender"}</p>
                <p className="text-slate-600 whitespace-pre-line mt-1">{invoice.counterpartyAddress || "Bulgaria"}</p>
                <p className="text-slate-600 mt-1">VAT: {invoice.counterpartyVat || invoice.counterpartyEik || "-"}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Billed To</h3>
                <p className="font-bold text-slate-900">{invoice.clientName || "Client Name"}</p>
                <p className="text-slate-600 whitespace-pre-line mt-1">{invoice.clientAddress || "Client Address"}</p>
                <p className="text-slate-600 mt-1">VAT: {invoice.clientVatNumber || "-"}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {lines.length > 0 ? lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{line.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{line.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">€ {line.unitPrice}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">€ {line.lineTotal || (Number(line.quantity || 0) * Number(line.unitPrice || 0)).toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">Services rendered</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">1</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">€ {effectiveAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">€ {effectiveAmount.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="bg-slate-50 px-6 py-4 flex flex-col items-end space-y-2 border-t border-slate-200">
                <div className="flex justify-between w-64 text-sm text-slate-600">
                  <span>Subtotal:</span>
                  <span>€ {invoice.netAmount || invoice.subtotal || effectiveAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm text-slate-600">
                  <span>VAT:</span>
                  <span>€ {invoice.vatAmount || "0.00"}</span>
                </div>
                <div className="flex justify-between w-64 text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total:</span>
                  <span>€ {effectiveAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Детайли за плащане по банков път</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block">IBAN:</span>
                  <span className="font-mono font-semibold text-slate-900">BG20STSA93000032481635</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Банка:</span>
                  <span className="font-semibold text-slate-900">Банка ДСК (DSK Bank)</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Титуляр:</span>
                  <span className="font-semibold text-slate-900">Агри Нексус ЕООД</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Основание:</span>
                  <span className="font-semibold text-slate-900">Фактура № {invoice.invoiceNumber || invoice.id}</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="bg-slate-50 flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-slate-200">
            <Button variant="outline" className="w-full sm:w-auto mb-4 sm:mb-0">
              <span className="mr-2" aria-hidden="true">PDF</span> Download PDF
            </Button>
            
            {!isPaid && (
              <StripeCheckoutButton invoiceId={invoiceId} amount={effectiveAmount.toFixed(2)} />
            )}
            {isPaid && (
              <div className="flex items-center text-green-600 font-semibold">
                <span className="mr-2" aria-hidden="true">OK</span> Paid in Full
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
