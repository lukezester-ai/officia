'use client';
import { useState, useEffect } from 'react';
import { getDeclarations, generateDds, generateProfitTaxAction, exportBatchDeclarationsAction } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Download, FileArchive, CheckCircle, PieChart, Calendar, Clock, AlertTriangle, ArrowUpRight, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxesPage() {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDds, setGeneratingDds] = useState(false);
  const [generatingProfitTax, setGeneratingProfitTax] = useState(false);
  const [exportingBatch, setExportingBatch] = useState(false);

  const load = async () => {
    const res = await getDeclarations();
    if (res.success && res.data) setDeclarations(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerateDds = async () => {
    setGeneratingDds(true);
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); 
    if (month === 0) { month = 12; year -= 1; }

    const res = await generateDds(year, month);
    if (res.success) {
      toast.success(`ДДС декларацията за ${month}/${year} е генерирана!`);
      await load();
    } else {
      toast.error('Грешка: ' + res.error);
    }
    setGeneratingDds(false);
  };

  const handleGenerateProfitTax = async () => {
    setGeneratingProfitTax(true);
    const now = new Date();
    const year = now.getFullYear() - 1; // За предходната година

    const res = await generateProfitTaxAction(year);
    if (res.success) {
      toast.success(`Годишният Данък Печалба за ${year} е изчислен!`);
      await load();
    } else {
      toast.error('Грешка: ' + res.error);
    }
    setGeneratingProfitTax(false);
  };

  const handleExportDeclaration = (d: any) => {
    const isProfit = d.type === 'profit_tax';
    const headers = ['ID Декларация', 'Тип', 'Период От', 'Период До', 'Сума (EUR)', 'Статус', 'Дата на създаване'];
    const row = [
      d.id || '',
      isProfit ? 'Корпоративен данък печалба (10%)' : 'ДДС Справка-декларация',
      d.periodStart || '',
      d.periodEnd || '',
      parseFloat(d.totalAmount || '0').toFixed(2),
      d.status === 'draft' ? 'Чернова' : 'Подадена',
      d.createdAt ? new Date(d.createdAt).toLocaleDateString('bg-BG') : ''
    ];

    const csvContent = '\uFEFF' + [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Declaration_${d.type}_${d.periodStart || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Декларацията е изтеглена успешно като CSV справка!');
  };

  const ddsDeclarations = declarations.filter(d => d.type === 'dds');
  const profitDeclarations = declarations.filter(d => d.type === 'profit_tax');

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Данъци и Декларации</h1>
          <p className="text-sm text-zinc-400 mt-1">Управление на ДДС, годишен данък печалба, срокове и експорт към НАП.</p>
        </div>
        <Button
          onClick={async () => {
            setExportingBatch(true);
            const now = new Date();
            let y = now.getFullYear();
            let m = now.getMonth();
            if (m === 0) { m = 12; y -= 1; }
            toast.loading('Генериране на пълен пакет за НАП (ДДС + ТРЗ XML)...');
            const res = await exportBatchDeclarationsAction(y, m);
            toast.dismiss();
            if (res.success && res.zipBase64) {
              const byteCharacters = atob(res.zipBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/zip' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `NAP_Batch_Package_${m}_${y}.zip`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success(`Пълният пакет за НАП (ДДС + ТРЗ Обр.1/6 за ${m}/${y}) е изтеглен!`);
            } else {
              toast.error('Грешка при масов експорт: ' + (res.error || 'Неизвестна грешка'));
            }
            setExportingBatch(false);
          }}
          disabled={exportingBatch}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-lg shadow-emerald-900/30"
        >
          <Download size={16} />
          {exportingBatch ? 'Пакетиране...' : 'Масов Експорт за НАП (ДДС + ТРЗ ZIP)'}
        </Button>
      </div>

      {/* ДАНЪЧЕН КАЛЕНДАР И ЗАКОНОВИ СРОКОВЕ (TICKET 5) */}
      <Card className="shadow-sm border-white/10 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-900/90 overflow-hidden border-l-4 border-l-indigo-500">
        <CardHeader className="border-b border-white/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Calendar className="text-indigo-400" size={18} />
              Законови Данъчни и Осигурителни Срокове (НАП / НОИ)
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">Автоматично следене на задължителните дати за подаване на декларации и плащания</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-white/5 border-white/10 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors text-xs"
            onClick={() => {
              const now = new Date();
              const y = now.getFullYear();
              const m = String(now.getMonth() + 1).padStart(2, '0');
              const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Officia//BG Tax Calendar//BG',
                'BEGIN:VEVENT',
                `SUMMARY:НАП - Краен срок за ДДС и Образец 1/6 (${m}/${y})`,
                `DTSTART;VALUE=DATE:${y}${m}14`,
                `DTEND;VALUE=DATE:${y}${m}15`,
                'DESCRIPTION:Подаване на Справка-декларация по ЗДДС, VIES и Осигурителни декларации Образец 1 и 6 за предходния месец.',
                'END:VEVENT',
                'BEGIN:VEVENT',
                `SUMMARY:НАП - Авансови вноски ЗКПО/ЗДДФЛ и Интрастат (${m}/${y})`,
                `DTSTART;VALUE=DATE:${y}${m}25`,
                `DTEND;VALUE=DATE:${y}${m}26`,
                'DESCRIPTION:Внасяне на месечни/тримесечни авансови вноски по ЗКПО и подаване на Интрастат декларации.',
                'END:VEVENT',
                'END:VCALENDAR'
              ].join('\r\n');
              const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `NAP_Tax_Calendar_${y}.ics`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success('Данъчният календар за НАП (.ics) е изтеглен!');
            }}
          >
            <Bell size={14} /> Изтегли НАП Календар (.ics)
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { date: '14-то число', title: 'ДДС Справка & VIES', desc: 'За предходен месец (ЗДДС)', status: new Date().getDate() <= 14 ? 'Предстои' : 'Срокът изтече' },
            { date: '14-то число', title: 'Образец 1 & 6 (ТРЗ)', desc: 'Осигурителни вноски НОИ/НАП', status: new Date().getDate() <= 14 ? 'Предстои' : 'Срокът изтече' },
            { date: '25-то число', title: 'Авансов Данък & Интрастат', desc: 'Вноски ЗКПО / ЗДДФЛ', status: new Date().getDate() <= 25 ? 'Предстои' : 'Срокът изтече' },
            { date: '31 Март', title: 'Годишно Приключване (ГФО)', desc: 'ГДД чл. 92 ЗКПО / чл. 50 ЗДДФЛ', status: new Date().getMonth() <= 2 ? 'Предстои' : 'Завършено' }
          ].map((item, idx) => {
            const isPending = item.status === 'Предстои';
            return (
              <div key={idx} className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col justify-between hover:border-white/20 transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.date}
                    </span>
                    <h3 className="font-semibold text-white mt-2.5 text-sm">{item.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{item.desc}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold px-1.5 py-0.5 ${isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ДДС СЕКЦИЯ */}
      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calculator className="text-amber-500" size={18} />
            Справки-Декларации (ЗДДС)
          </CardTitle>
          <Button onClick={handleGenerateDds} disabled={generatingDds} size="sm" className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            <Calculator size={14} />
            ДДС за мин. месец
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-400">Период</TableHead>
                <TableHead className="text-zinc-400">Тип</TableHead>
                <TableHead className="text-zinc-400">ДДС за плащане/възстановяване</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-right text-zinc-400">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Зареждане...</TableCell></TableRow>
              ) : ddsDeclarations.length === 0 ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Няма генерирани декларации</TableCell></TableRow>
              ) : ddsDeclarations.map((d) => {
                const isPayable = parseFloat(d.totalAmount || '0') > 0;
                const dDate = new Date(d.periodStart);
                const zipUrl = `/api/accounting/vat-export?year=${dDate.getFullYear()}&month=${dDate.getMonth() + 1}`;
                return (
                  <TableRow key={d.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-medium text-zinc-200 tabular-nums">
                      {d.periodStart} - {d.periodEnd}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase bg-white/5 text-zinc-300 border-white/10">ДДС</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`tabular-nums font-semibold ${isPayable ? "text-rose-400" : "text-emerald-400"}`}>
                        {parseFloat(d.totalAmount || '0').toFixed(2)} €
                      </span>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className={`flex items-center gap-1 w-max ${d.status === 'draft' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {d.status === 'draft' ? 'Чернова' : <><CheckCircle size={12}/>Подадена</>}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <a 
                         href={zipUrl} 
                         download
                         className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-violet-600 hover:text-white hover:border-violet-600 text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <FileArchive size={14} className="mr-1.5"/> Експорт за НАП (.zip)
                       </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ДАНЪК ПЕЧАЛБА СЕКЦИЯ */}
      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <PieChart className="text-violet-500" size={18} />
            Годишен Данък Печалба (Корпоративен)
          </CardTitle>
          <Button onClick={handleGenerateProfitTax} disabled={generatingProfitTax} size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            <Calculator size={14} />
            Генерирай за мин. година
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-400">Период</TableHead>
                <TableHead className="text-zinc-400">Тип</TableHead>
                <TableHead className="text-zinc-400">Данък за плащане</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-right text-zinc-400">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Зареждане...</TableCell></TableRow>
              ) : profitDeclarations.length === 0 ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Няма генерирани декларации за данък печалба</TableCell></TableRow>
              ) : profitDeclarations.map((d) => {
                return (
                  <TableRow key={d.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-medium text-zinc-200 tabular-nums">
                      {d.periodStart} - {d.periodEnd}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase bg-violet-500/10 text-violet-400 border-violet-500/20">КОРП. ДАНЪК</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums font-semibold text-amber-400">
                        {parseFloat(d.totalAmount || '0').toFixed(2)} €
                      </span>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className={`flex items-center gap-1 w-max ${d.status === 'draft' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {d.status === 'draft' ? 'Чернова' : <><CheckCircle size={12}/>Подадена</>}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <button 
                         onClick={() => handleExportDeclaration(d)}
                         className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Download size={14} className="mr-1.5"/> Експорт Справка (CSV)
                       </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
