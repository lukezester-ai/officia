// @ts-nocheck
import React from 'react';
import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, FileText, Calendar, Edit, Upload, History } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function HrProfilePage(props: { params: Promise<{ lang: string, id: string }> }) {
  const params = await props.params;
  const result = await db.select().from(employees).where(eq(employees.id, params.id));
  const emp = result[0];

  if (!emp) {
    notFound();
  }

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
                <div><span className="text-sm text-muted-foreground block mb-1">Статус</span>
                  <p className="mt-1">{emp.isActive ? <Badge variant="secondary">Активен</Badge> : <Badge variant="outline">Бивш</Badge>}</p>
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
                <div><span className="text-sm text-muted-foreground block mb-1">Възнаграждение (Бруто)</span><p className="font-mono">{emp.salary ? `${parseFloat(emp.salary).toLocaleString('bg-BG')} лв.` : '—'}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="m-0 space-y-4">
          <Card className="shadow-sm border-0">
            <CardContent className="p-8 text-center">
              <Upload size={32} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Няма качени документи (напр. подписан договор, анекси).</p>
              <Button variant="outline">Качи документ</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="m-0 space-y-4">
          <Card className="shadow-sm border-0">
            <CardContent className="p-8 text-center">
              <Calendar size={32} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Няма регистрирани отсъствия през тази година.</p>
              <Button variant="outline">Регистрирай отсъствие</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="m-0 space-y-4">
          <Card className="shadow-sm border-0">
            <CardContent className="p-8 text-center">
              <History size={32} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">История на промените по този профил ще се покаже тук.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
