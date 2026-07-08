import { ArrowLeft, Calendar, FileText, History, ShieldCheck, User, CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEmployeeProfile } from '../actions';
import { StatusUpdater } from './_status-updater';
import { EmployeeProfileActions } from './EmployeeProfileActions';
import { LeaveRequestDialog } from '../LeaveRequestDialog';

const contractKind = { permanent: 'Безсрочен', fixed_term: 'Срочен', civil_contract: 'Граждански' } as const;
const leaveType = { annual: 'Платен отпуск', sick: 'Болничен', unpaid: 'Неплатен', maternity: 'Майчинство', parental: 'Родителски', other: 'Друг' } as const;

export default async function HrProfilePage(props: { params: Promise<{ lang: string; id: string }> }) {
  const params = await props.params;
  const result = await getEmployeeProfile(params.id);
  if (!result.success) notFound();
  const { employee, contracts, leaves, history } = result.data;

  return <div className="max-w-5xl space-y-6">
    <div className="flex items-center gap-4">
      <Link href={`/${params.lang}/dashboard/hr`}><Button variant="outline" size="icon" className="h-9 w-9"><ArrowLeft size={16} /></Button></Link>
      <div><h1 className="text-2xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h1><p className="mt-0.5 text-sm text-muted-foreground">{employee.position || 'Липсва длъжност'} · {employee.department || 'Липсва отдел'}</p></div>
      <EmployeeProfileActions employee={employee} />
    </div>

    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid h-12 w-full grid-cols-5 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
        <TabsTrigger value="overview">Основни</TabsTrigger><TabsTrigger value="contracts">Договори</TabsTrigger><TabsTrigger value="security">Защитени данни</TabsTrigger><TabsTrigger value="leaves">Отпуски</TabsTrigger><TabsTrigger value="history">История</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-6 space-y-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User size={18} />Лични и служебни данни</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Value label="Имена" value={`${employee.firstName} ${employee.lastName}`} /><Value label="Имейл" value={employee.email} /><Value label="Телефон" value={employee.phone} /><Value label="Адрес" value={employee.address} />
          <Value label="Основна заплата" value={employee.salary ? `${Number(employee.salary).toLocaleString('bg-BG', { minimumFractionDigits: 2 })} €` : null} />
          <div><span className="mb-1 block text-sm text-muted-foreground">Работен статус</span><StatusUpdater employeeId={employee.id} currentStatus={employee.workStatus || 'at_work'} /></div>
        </CardContent></Card>
      </TabsContent>
      <TabsContent value="contracts" className="mt-6 space-y-3">
        {contracts.map((contract) => <Card key={contract.id}><CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 font-semibold"><FileText size={16} />{contract.contractNumber}<Badge variant="outline">{contract.status === 'active' ? 'Активен' : contract.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{contractKind[contract.kind]} · от {new Date(contract.startDate).toLocaleDateString('bg-BG')}{contract.endDate ? ` до ${new Date(contract.endDate).toLocaleDateString('bg-BG')}` : ''}</p></div><span className="text-sm text-muted-foreground">Подписан: {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('bg-BG') : 'не'}</span></CardContent></Card>)}
        {!contracts.length && <Empty icon={<FileText />} text="Няма въведени договори. Използвайте бутона „Нов договор“ горе." />}
      </TabsContent>
      <TabsContent value="security" className="mt-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck size={18} />Защитени данни</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p>ЕГН/ЛНЧ: {employee.personalIdentifierEncrypted ? 'въведено и криптирано' : 'не е въведено'}</p><p>IBAN: {employee.bankIbanEncrypted ? 'въведен и криптиран' : 'не е въведен'}</p><p>Банка: {employee.bankName || '—'}</p><p className="text-xs text-muted-foreground">Стойностите не се визуализират обратно. При промяна се въвеждат наново и се записват в audit trail без самите чувствителни стойности.</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="leaves" className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">{leaves.length} регистрирани отпуски</p>
          <LeaveRequestDialog employeeId={employee.id} />
        </div>
        {leaves.map((leave) => <Card key={leave.id}><CardContent className="flex items-center justify-between p-5"><div className="flex items-center gap-3"><Calendar size={18} /><div><p className="font-medium">{leaveType[leave.type]}</p><p className="text-sm text-muted-foreground">{new Date(leave.startDate).toLocaleDateString('bg-BG')} – {new Date(leave.endDate).toLocaleDateString('bg-BG')}</p></div></div><Badge variant="outline" className={leave.status === 'approved' ? 'text-emerald-400 border-emerald-800/50' : leave.status === 'rejected' ? 'text-red-400 border-red-800/50' : 'text-amber-400 border-amber-800/50'}>{leave.status === 'approved' ? 'Одобрен' : leave.status === 'rejected' ? 'Отказан' : 'Чакащ'}</Badge></CardContent></Card>)}
        {!leaves.length && <Empty icon={<Calendar />} text="Няма регистрирани отсъствия." />}
      </TabsContent>
      <TabsContent value="history" className="mt-6 space-y-3">
        {history.map((entry) => <Card key={entry.id}><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><History size={16} /><div><p className="text-sm font-medium">{entry.action} · {entry.tableName}</p><p className="text-xs text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString('bg-BG') : ''}</p></div></div></CardContent></Card>)}
        {!history.length && <Empty icon={<History />} text="Все още няма промени в audit trail." />}
      </TabsContent>
    </Tabs>
  </div>;
}

function Value({ label, value }: { label: string; value: string | null | undefined }) { return <div><span className="mb-1 block text-sm text-muted-foreground">{label}</span><p className="font-medium">{value || '—'}</p></div>; }
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">{icon}<p>{text}</p></CardContent></Card>; }
