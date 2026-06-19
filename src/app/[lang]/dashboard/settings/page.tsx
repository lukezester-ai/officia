// @ts-nocheck
'use client';

import { useState } from 'react';
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileCheck2,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const roleItems = ['Owner', 'Admin', 'Accountant', 'HR', 'Viewer'];

const readinessItems = [
  {
    title: 'Tenant изолация',
    description: 'Данните са организирани по фирма и потребителски контекст.',
    status: 'Активно',
    icon: LockKeyhole,
  },
  {
    title: 'PWA поддръжка',
    description: 'Платформата може да се инсталира като мобилно уеб приложение.',
    status: 'Активно',
    icon: FileCheck2,
  },
  {
    title: 'Audit trail',
    description: 'Критичните действия имат структура за проследяване и отчетност.',
    status: 'Активно',
    icon: Activity,
  },
  {
    title: 'Backup и export',
    description: 'Следваща стъпка: автоматичен архив и експорт по период.',
    status: 'Следва',
    icon: Database,
  },
];

const auditEvents = [
  { action: 'Създадена фактура', actor: 'Счетоводство', time: 'преди 18 мин' },
  { action: 'Качен документ', actor: 'Документи', time: 'преди 2 ч' },
  { action: 'AI Cleaner проверка', actor: 'Автоматизация', time: 'преди 5 дни' },
];

type CleanerReport = {
  auditReport: string;
  stats: {
    orphanedDocumentsDeleted: number;
    gdprExpiredRecordsDeleted: number;
    storageFreedMB: number;
  };
};

export default function SettingsPage() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastReport, setLastReport] = useState<CleanerReport | null>(null);

  const handleRunCleanup = async () => {
    setIsCleaning(true);
    toast.info('Стартиране на AI Cleaner агента...', { duration: 3000 });

    try {
      const response = await fetch('/api/ai/clean', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Грешка при почистване');
      }

      setLastReport(data);
      toast.success('Почистването завърши успешно!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Неочаквана грешка при почистване');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="border-[#4F46E5]/30 text-[#4F46E5]">
              Platform control
            </Badge>
            <Badge variant="secondary">Production ready</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D] dark:text-white">
            Настройки на платформата
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Център за фирмени данни, достъп, сигурност, автоматизации и оперативна готовност.
          </p>
        </div>
        <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] sm:w-auto">
          <Bell size={16} />
          Настрой известия
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-gray-200 shadow-sm dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="text-[#4F46E5]" size={20} />
              Фирмен профил
            </CardTitle>
            <CardDescription>Основни данни за работното пространство</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-semibold text-[#0F1F3D] dark:text-white">Officia Workspace</p>
              <p className="text-sm text-gray-500">Българска бизнес платформа</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-gray-500">БУЛСТАТ</p>
                <p className="font-medium">Очаква данни</p>
              </div>
              <div className="rounded-md border bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-gray-500">ДДС номер</p>
                <p className="font-medium">Очаква данни</p>
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs text-gray-500">
                <span>Завършеност на профила</span>
                <span>72%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-[#4F46E5]" style={{ width: '72%' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="text-[#4F46E5]" size={20} />
              Роли и достъп
            </CardTitle>
            <CardDescription>Ясна структура за екип, счетоводство и HR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {roleItems.map((role) => (
                <Badge key={role} variant="outline" className="h-7 px-3">
                  {role}
                </Badge>
              ))}
            </div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-medium">
                <KeyRound size={16} />
                Clerk authentication е активна
              </div>
              <p className="mt-1 text-xs opacity-80">
                Следваща добра стъпка: детайлни permissions за фактури, HR и документи.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="text-[#4F46E5]" size={20} />
              Audit trail
            </CardTitle>
            <CardDescription>Последни събития в системата</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditEvents.map((event) => (
              <div key={`${event.action}-${event.time}`} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm dark:border-slate-800">
                <div>
                  <p className="font-medium text-[#0F1F3D] dark:text-white">{event.action}</p>
                  <p className="text-xs text-gray-500">{event.actor}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{event.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-gray-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="text-[#4F46E5]" size={20} />
              Оперативна готовност
            </CardTitle>
            <CardDescription>Какво вече изглежда като истинска бизнес платформа и какво следва</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {readinessItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.status === 'Активно';

              return (
                <div key={item.title} className="rounded-lg border p-4 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon size={17} className="text-[#4F46E5]" />
                      {item.title}
                    </div>
                    <Badge variant={isActive ? 'secondary' : 'outline'}>{item.status}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-500">{item.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-gray-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="text-[#4F46E5]" size={20} />
                Защита на данните
              </CardTitle>
              <CardDescription>Политика за съхранение и GDPR контрол</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2 text-sm dark:border-slate-800">
                <span className="text-gray-600 dark:text-gray-400">Счетоводни документи</span>
                <span className="font-medium">5 години</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Архив служители</span>
                <span className="font-medium">3 години</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HardDrive className="text-[#4F46E5]" size={20} />
                Пространство
              </CardTitle>
              <CardDescription>Използвано cloud storage пространство</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-3xl font-bold text-[#0F1F3D] dark:text-white">42.5 GB</span>
                <span className="mb-1 text-sm text-gray-500">от 100 GB</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-[#4F46E5]" style={{ width: '42.5%' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="relative overflow-hidden border-rose-100 bg-white shadow-sm dark:border-rose-900 dark:bg-slate-900">
        <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-5">
          <Trash2 size={120} />
        </div>
        <CardHeader className="relative z-10 border-b border-gray-50 pb-4 dark:border-slate-800/50">
          <CardTitle className="flex items-center gap-2 text-rose-600">
            <Trash2 size={20} />
            AI Cleaner Agent
          </CardTitle>
          <CardDescription>
            Агентът може да намира файлове без свързана фактура и стари GDPR записи. Автоматичният режим е планиран за неделя в 03:00 ч.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex w-fit items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm text-gray-500 dark:bg-slate-800">
              <Clock size={16} />
              Последно пускане: преди 5 дни
            </div>
            <Button
              onClick={handleRunCleanup}
              disabled={isCleaning}
              variant="outline"
              className="w-full border-rose-200 text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700 sm:w-auto"
            >
              {isCleaning ? 'Сканиране на базата...' : 'Стартирай принудително почистване'}
            </Button>
          </div>

          {lastReport && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
              <h4 className="mb-3 flex items-center gap-2 border-b border-emerald-200/50 pb-2 font-semibold text-emerald-800">
                <CheckCircle2 size={18} />
                Одиторски доклад от AI
              </h4>
              <p className="text-sm leading-relaxed text-emerald-700">{lastReport.auditReport}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="rounded-md border border-emerald-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-800/50 dark:bg-slate-800 dark:text-emerald-400">
                  Изтрити документи: {lastReport.stats.orphanedDocumentsDeleted}
                </div>
                {lastReport.stats.gdprExpiredRecordsDeleted > 0 && (
                  <div className="rounded-md border border-emerald-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-800/50 dark:bg-slate-800 dark:text-emerald-400">
                    GDPR записи: {lastReport.stats.gdprExpiredRecordsDeleted}
                  </div>
                )}
                <div className="rounded-md border border-emerald-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-800/50 dark:bg-slate-800 dark:text-emerald-400">
                  Освободено: {lastReport.stats.storageFreedMB} MB
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
