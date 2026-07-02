import { getPayrollData } from './actions';
import { PayrollClient } from './PayrollClient';

export default async function PayrollPage(props: { searchParams: Promise<{ month?: string }> }) {
  const searchParams = await props.searchParams;
  const result = await getPayrollData(searchParams.month);

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        <h1 className="text-xl font-semibold">Работни заплати (ТРЗ)</h1>
        <p className="mt-2">{result.error}</p>
      </div>
    );
  }

  return <PayrollClient key={result.data.month} initial={result.data} />;
}
