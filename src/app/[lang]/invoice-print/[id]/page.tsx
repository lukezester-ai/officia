import { getInvoiceWithLines } from '@/app/[lang]/dashboard/invoices/actions';
import { requireTenant } from '@/lib/auth/get-tenant';
import { notFound } from 'next/navigation';
import { PrintButton } from './print-button';
import { Metadata } from 'next';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';

export const metadata: Metadata = {
  title: 'Фактура (PDF Печат)',
};

function fmt(n: number | string) {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return (isNaN(num) ? 0 : num).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { tenant } = await requireTenant();
  const res = await getInvoiceWithLines(resolvedParams.id);
  
  if (!res.success || !res.data) {
    return notFound();
  }

  const inv = res.data;
  const effectiveTotal = getInvoiceEffectiveAmount(inv, inv.lines);

  return (
    <div className="min-h-screen bg-zinc-200/50 py-8 print:p-0 print:bg-white flex flex-col items-center">
      
      {/* Плаващ контролен панел (не се принтира) */}
      <div className="fixed top-4 right-4 print:hidden flex gap-4">
        <PrintButton />
      </div>

      {/* Самата фактура (Лист А4) */}
      <div className="bg-white text-zinc-900 shadow-xl print:shadow-none w-[210mm] min-h-[297mm] mx-auto p-12 print:p-0 relative">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-zinc-900">ФАКТУРА</h1>
            <p className="text-zinc-500 font-mono text-lg">№ {inv.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{tenant.name || 'Моята Компания ООД'}</h2>
            <div className="text-sm text-zinc-500 mt-1 leading-relaxed">
              <p>ЕИК/Булстат: {tenant.bulstat || 'Непосочен'}</p>
              <p>ИН по ЗДДС: {tenant.vatNumber || 'Непосочен'}</p>
              <p>Адрес: {tenant.address || 'Непосочен адрес'}</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-12 mb-10 text-sm">
          {/* Получател */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-3">Получател</h3>
            <p className="font-bold text-lg text-zinc-900">{inv.counterpartyName}</p>
            <div className="text-zinc-600 mt-2 space-y-1">
              {inv.counterpartyEik && <p>ЕИК: {inv.counterpartyEik}</p>}
              {inv.counterpartyVat && <p>ИН по ЗДДС: {inv.counterpartyVat}</p>}
              {inv.counterpartyAddress && <p>Адрес: {inv.counterpartyAddress}</p>}
            </div>
          </div>

          {/* Детайли */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Дата на издаване</h3>
              <p className="font-medium">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('bg-BG') : '—'}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Падеж</h3>
              <p className="font-medium text-amber-700">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('bg-BG') : '—'}</p>
            </div>
            {inv.notes && (
              <div className="col-span-2 mt-2">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">Бележки</h3>
                <p className="text-zinc-600 leading-snug">{inv.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Таблица с артикули */}
        <div className="mb-10">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="py-3 px-2 text-zinc-500 font-semibold w-8">#</th>
                <th className="py-3 px-2 text-zinc-500 font-semibold">Описание</th>
                <th className="py-3 px-2 text-zinc-500 font-semibold text-right">Количество</th>
                <th className="py-3 px-2 text-zinc-500 font-semibold text-right">Ед. цена</th>
                <th className="py-3 px-2 text-zinc-500 font-semibold text-right">ДДС %</th>
                <th className="py-3 px-2 text-zinc-900 font-bold text-right">Сума (EUR)</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines?.map((l: any, i: number) => (
                <tr key={l.id || i} className="border-b border-zinc-100">
                  <td className="py-4 px-2 text-zinc-400">{i + 1}</td>
                  <td className="py-4 px-2 font-medium">{l.description}</td>
                  <td className="py-4 px-2 text-right">{l.quantity}</td>
                  <td className="py-4 px-2 text-right">{fmt(l.unitPrice)}</td>
                  <td className="py-4 px-2 text-right text-zinc-500">{l.vatRate}%</td>
                  <td className="py-4 px-2 text-right font-semibold">{fmt(l.lineTotal || 0)}</td>
                </tr>
              ))}
              {(!inv.lines || inv.lines.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400 italic">Няма въведени редове</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Сумарна част */}
        <div className="flex justify-end">
          <div className="w-1/2 bg-zinc-50 p-6 rounded-lg border border-zinc-100">
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="text-zinc-500">Данъчна основа</span>
              <span className="font-semibold">{fmt(inv.netAmount || 0)} EUR</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm border-b border-zinc-200 mb-2">
              <span className="text-zinc-500">ДДС Сума</span>
              <span className="font-semibold">{fmt(inv.vatAmount || 0)} EUR</span>
            </div>
            <div className="flex justify-between items-center py-2 text-lg">
              <span className="font-bold text-zinc-900">ОБЩО ЗА ПЛАЩАНЕ</span>
              <span className="font-black text-violet-700">{fmt(effectiveTotal)} EUR</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-12 left-12 right-12 border-t border-zinc-200 pt-8 text-xs text-zinc-400 flex justify-between">
          <p>Документът е генериран автоматично от Officia ERP.</p>
          <p className="font-mono">officia.cloud</p>
        </div>

      </div>
    </div>
  );
}
