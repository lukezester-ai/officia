// @ts-nocheck
import React from 'react';
import { getHrData } from './actions';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, Plus, ChevronRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default async function HrPage() {
  const res = await getHrData();
  const data = res.success ? res.data : { employees: [], alerts: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Кадри (HR)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управление на служители, документи и договори.</p>
        </div>
        <Link href={`/bg/dashboard/hr/new`}>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus size={16} /> Добави служител
          </Button>
        </Link>
      </div>

      {data.alerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} /> HR Сигнали (Автоматичен одит)
          </h3>
          <ul className="list-disc pl-8 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {data.alerts.map((a: any, i: number) => (
              <li key={i}>{a.name} - {a.issue}</li>
            ))}
          </ul>
        </div>
      )}

      <Card className="shadow-sm border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Служител</TableHead>
                <TableHead>Длъжност</TableHead>
                <TableHead>Отдел</TableHead>
                <TableHead>Тип договор</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.employees.map(emp => (
                <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                        {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{emp.position || '—'}</TableCell>
                  <TableCell>{emp.department || '—'}</TableCell>
                  <TableCell>
                    {emp.contractType === 'full_time' ? 'Трудов договор' : emp.contractType === 'part_time' ? 'Непълно работно време' : 'Граждански / Изпълнител'}
                  </TableCell>
                  <TableCell>
                    {!emp.isActive ? (
                      <Badge variant="outline">Бивш служител</Badge>
                    ) : emp.workStatus === 'on_leave' ? (
                      <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 gap-1">В отпуск</Badge>
                    ) : emp.workStatus === 'sick_leave' ? (
                      <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 gap-1">В болничен</Badge>
                    ) : emp.workStatus === 'unpaid_leave' ? (
                      <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50 gap-1">Неплатен отпуск</Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 gap-1"><CheckCircle size={12}/> На работа</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Link href={`/bg/dashboard/hr/${emp.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        Профил <ChevronRight size={14} />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {data.employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    Няма въведени служители.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
