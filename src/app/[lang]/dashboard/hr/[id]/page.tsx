// @ts-nocheck
import React from 'react';
import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { eq, desc, and } from 'drizzle-orm';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { activityLogs } from '@/lib/db/schema/activity_logs';
import { documents } from '@/lib/db/schema/documents';
import { requireTenant } from '@/lib/auth/get-tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, FileText, Calendar, Edit, Upload, History, Clock } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StatusUpdater } from './_status-updater';

const TYPE_LABELS: Record<string, string> = {
  annual:  '🏖️ Платен отпуск',
  sick:    '🏥 Болничен',
  unpaid:  '📋 Неплатен отпуск',
  other:   '📌 Друг',
};

const STATUS_LABELS: Record<string, string> = {
  pending:  '⏳ Чака одобрение',
  approved: '✅ Одобрен',
  rejected: '❌ Отхвърлен',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export default async function HrProfilePage(props: { params: Promise<{ lang: string, id: string }> }) {
  const params = await props.params;
  const { tenantId } = await requireTenant();

  const result = await db.select().from(employees).where(and(eq(employees.id, params.id), eq(employees.tenantId, tenantId)));
  const emp = result[0];

  if (!emp) {
    notFound();
  }

  const empLeaves = await db
    .select()
    .from(leaveRequests)
    .where(and(eq(leaveRequests.employeeId, params.id), eq(leaveRequests.tenantId, tenantId)))
    .orderBy(desc(leaveRequests.createdAt));

  const empLogs = await db
    .select()
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, tenantId), eq(activityLogs.entityId, params.id)))
    .orderBy(desc(activityLogs.createdAt))
    .limit(20);

  const empDocs = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.createdAt))
    .limit(10);

  function countDays(start: string, end: string) {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  }

  const ANNUAL_LIMIT = 20;
  const approvedAnnual = empLeaves
    .filter(l => l.status === 'approved' && l.type === 'annual')
    .reduce((s, l) => s + countDays(l.startDate, l.endDate), 0);
  const approvedSick = empLeaves
    .filter(l => l.status === 'approved' && l.type === 'sick')
    .reduce((s, l) => s + countDays(l.startDate, l.endDate), 0);
  const approvedUnpaid = empLeaves
    .filter(l => l.status === 'approved' && l.type === 'unpaid')
    .reduce((s, l) => s + countDays(l.startDate, l.endDate), 0);
  const annualLeft = Math.max(0, ANNUAL_LIMIT - approvedAnnual);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href={`/${params.lang}/dashboard/hr`}>
          <Button variant="outline" size="icon" className="h-9 w-9"><ArrowLeft size={16} /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{emp.firstName} {emp.lastName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{emp.position || 'Липсва длъжност'} • {emp.department || 'Липсва отдел'}</p>
        </div>
        <div className="ml-auto">
          <Button className="gap-2"><Edit size={16} /> Редактирай</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12 items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-6">
          <TabsTrigger value="overview" className="rounded-lg h-9">Основни</TabsTrigger>
          <TabsTrigger value="contract" className="rounded-lg h-9">Договор</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg h-9">Документи</TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-lg h-9">Отпуски</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg h-9">История</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0 space-y-4">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><User size={18}/> Лични данни</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div><span className="text-sm text-muted-foreground block mb-1">Име</span><p className="font-medium">{emp.firstName} {emp.lastName}</p></div>
                <div><span className="text-sm text-muted-foreground block mb-1">Имейл</span><p className="font-medium">{emp.email}</p></div>
                <div><span className="text-sm text-muted-foreground block mb-1">Телефон</span><p className="font-medium">{emp.phone || '—'}</p></div>
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">Работен статус</span>
                  <StatusUpdater employeeId={emp.id} currentStatus={emp.workStatus || 'at_work'} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract" className="m-0 space-y-4">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><FileText size={18}/> Договорни отношения</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div><span className="text-sm text-muted-foreground block mb-1">Дата на започване</span><p className="font-medium">{new Date(emp.startDate).toLocaleDateString('bg-BG')}</p></div>
                <div><span className="text-sm text-muted-foreground block mb-1">Крайна дата</span><p className="font-medium">{emp.endDate ? new Date(emp.endDate).toLocaleDateString('bg-BG') : 'Безсрочен'}</p></div>
                <div><span className="text-sm text-muted-foreground block mb-1">Тип заетост</span><p className="font-medium uppercase text-xs tracking-wider mt-1.5">{emp.contractType}</p></div>
                <div><span className="text-sm text-muted-foreground block mb-1">Възнаграждение (Бруто)</span><p className="font-mono">{emp.salary ? `${parseFloat(emp.salary).toLocaleString('bg-BG')} €` : '—'}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="m-0 space-y-4">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><FileText size={18}/> Документи и досие на служителя</CardTitle>
              <Link href={`/${params.lang}/dashboard/documents`}>
                <Button size="sm" variant="outline" className="gap-1.5"><Upload size={14}/> Към Документи</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {empDocs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Upload size={32} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                  Няма прикачени документи към това трудово досие.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Наименование</th>
                        <th className="pb-3 font-medium">Тип</th>
                        <th className="pb-3 font-medium">Статус</th>
                        <th className="pb-3 font-medium text-right">Дата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {empDocs.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-muted/30">
                          <td className="py-3 font-medium flex items-center gap-2">
                            <FileText size={15} className="text-indigo-400 shrink-0" />
                            {doc.title || 'Документ'}
                          </td>
                          <td className="py-3 text-muted-foreground">{doc.type || 'contract'}</td>
                          <td className="py-3">
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-normal">
                              {doc.status || 'Активен'}
                            </Badge>
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('bg-BG') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="m-0 space-y-6">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm border-0 bg-indigo-500/10 border border-indigo-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Платен отпуск (Оставащ)</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{annualLeft} от {ANNUAL_LIMIT} дни</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 bg-rose-500/10 border border-rose-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-rose-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Използвани болнични</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{approvedSick} дни</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 bg-slate-500/10 border border-slate-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-8 w-8 text-slate-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Неплатен отпуск</p>
                  <p className="text-xl font-bold text-slate-600 dark:text-slate-400">{approvedUnpaid} дни</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaves Table */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={18}/> История на отсъствията
              </CardTitle>
              <Link href={`/${params.lang}/dashboard/hr`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  ➕ Нова заявка / Управление
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {empLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Няма регистрирани отсъствия за този служител.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3">Вид</th>
                        <th className="pb-3">Период</th>
                        <th className="pb-3 text-center">Дни</th>
                        <th className="pb-3">Статус</th>
                        <th className="pb-3">Причина</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {empLeaves.map((req: any) => (
                        <tr key={req.id} className="hover:bg-muted/30">
                          <td className="py-3 font-medium">
                            {TYPE_LABELS[req.type] || req.type}
                          </td>
                          <td className="py-3 tabular-nums text-muted-foreground">
                            {new Date(req.startDate).toLocaleDateString('bg-BG')} — {new Date(req.endDate).toLocaleDateString('bg-BG')}
                          </td>
                          <td className="py-3 text-center font-semibold">
                            {countDays(req.startDate, req.endDate)}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[req.status] || 'bg-slate-500/10 text-slate-500'}`}>
                              {STATUS_LABELS[req.status] || req.status}
                            </span>
                          </td>
                          <td className="py-3 text-muted-foreground truncate max-w-[200px]">
                            {req.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="m-0 space-y-4">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><History size={18}/> Одит и история на промените</CardTitle></CardHeader>
            <CardContent>
              {empLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <History size={32} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                  Няма регистрирани скорошни промени за този профил.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Действие / Събитие</th>
                        <th className="pb-3 font-medium">Обект</th>
                        <th className="pb-3 font-medium text-right">Дата и час</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {empLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted/30">
                          <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                            {log.action}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            <Badge variant="secondary" className="font-mono text-xs">{log.entityType}</Badge>
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString('bg-BG') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
