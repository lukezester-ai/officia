'use client';
import { useState, useEffect } from 'react';
import { getDeclarations, generateDds, generateProfitTaxAction, generateObra1, generateObra6, generateVies, exportPayrollNapXml } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Download, FileArchive, CheckCircle, PieChart, Users, Receipt, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxesPage() {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDds, setGeneratingDds] = useState(false);
  const [generatingProfitTax, setGeneratingProfitTax] = useState(false);

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

  const ddsDeclarations = declarations.filter(d => d.type === 'dds');
  const profitDeclarations = declarations.filter(d => d.type === 'profit_tax');
  const obra1Declarations = declarations.filter(d => d.type === 'obra1');
  const obra6Declarations = declarations.filter(d => d.type === 'obra6');
  const viesDeclarations = declarations.filter(d => d.type === 'vies');

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Данъци и Декларации</h1>
          <p className="text-sm text-zinc-400 mt-1">Управление на ДДС, годишен данък печалба и експорт към НАП.</p>
        </div>
      </div>

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

      {/* ОБР. 1 — ОСИГУРИТЕЛНА ДЕКЛАРАЦИЯ */}
      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Users className="text-sky-500" size={18} />
            Обр. 1 — Осигурителна декларация
          </CardTitle>
          <Button onClick={async () => {
            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth();
            if (month === 0) { month = 12; year -= 1; }
            const res = await generateObra1(year, month);
            if (res.success) { toast.success(`Обр. 1 за ${month}/${year} е генерирана!`); await load(); }
            else { toast.error('Грешка: ' + res.error); }
          }} size="sm" className="gap-2 bg-sky-600 hover:bg-sky-700 text-white">
            <Calculator size={14} />
            Обр. 1 за мин. месец
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-400">Период</TableHead>
                <TableHead className="text-zinc-400">Служители</TableHead>
                <TableHead className="text-zinc-400">Осиг. доход</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-right text-zinc-400">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Зареждане...</TableCell></TableRow>
              ) : obra1Declarations.length === 0 ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Няма генерирани декларации</TableCell></TableRow>
              ) : obra1Declarations.map((d) => (
                <TableRow key={d.id} className="border-white/10 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium text-zinc-200 tabular-nums">{d.periodStart} - {d.periodEnd}</TableCell>
                  <TableCell className="text-zinc-300">{d.data?.employeeCount || 0}</TableCell>
                  <TableCell className="tabular-nums font-semibold text-zinc-200">
                    {parseFloat(d.totalAmount || '0').toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`flex items-center gap-1 w-max ${d.status === 'draft' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {d.status === 'draft' ? 'Чернова' : <><CheckCircle size={12}/>Подадена</>}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <a href={`/api/tax-declarations/${d.id}/pdf`} download
                      className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100">
                      <Download size={14} className="mr-1.5"/> PDF
                    </a>
                    <button onClick={async () => {
                      const res = await exportPayrollNapXml(d.id);
                      if (res.success && res.xml) {
                        const blob = new Blob([res.xml], { type: 'text/xml;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = res.fileName; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('XML файлът е изтеглен');
                      } else { toast.error(res.error); }
                    }}
                      className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100">
                      <FileArchive size={14} className="mr-1.5"/> XML
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ОБР. 6 — ДАНЪЧНА ДЕКЛАРАЦИЯ */}
      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Receipt className="text-orange-500" size={18} />
            Обр. 6 — Данък общ доход (удържан)
          </CardTitle>
          <Button onClick={async () => {
            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth();
            if (month === 0) { month = 12; year -= 1; }
            const res = await generateObra6(year, month);
            if (res.success) { toast.success(`Обр. 6 за ${month}/${year} е генерирана!`); await load(); }
            else { toast.error('Грешка: ' + res.error); }
          }} size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Calculator size={14} />
            Обр. 6 за мин. месец
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-400">Период</TableHead>
                <TableHead className="text-zinc-400">Брутен доход</TableHead>
                <TableHead className="text-zinc-400">Удържан данък</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-right text-zinc-400">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Зареждане...</TableCell></TableRow>
              ) : obra6Declarations.length === 0 ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Няма генерирани декларации</TableCell></TableRow>
              ) : obra6Declarations.map((d) => {
                const data = d.data as any;
                return (
                  <TableRow key={d.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium text-zinc-200 tabular-nums">{d.periodStart} - {d.periodEnd}</TableCell>
                    <TableCell className="tabular-nums text-zinc-200">{data?.totals?.totalGross?.toFixed(2) || '0.00'} €</TableCell>
                    <TableCell className="tabular-nums font-semibold text-rose-400">{parseFloat(d.totalAmount || '0').toFixed(2)} €</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`flex items-center gap-1 w-max ${d.status === 'draft' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {d.status === 'draft' ? 'Чернова' : <><CheckCircle size={12}/>Подадена</>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <a href={`/api/tax-declarations/${d.id}/pdf`} download
                        className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100">
                        <Download size={14} className="mr-1.5"/> PDF
                      </a>
                      <button onClick={async () => {
                        const res = await exportPayrollNapXml(d.id);
                        if (res.success && res.xml) {
                          const blob = new Blob([res.xml], { type: 'text/xml;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = res.fileName; a.click();
                          URL.revokeObjectURL(url);
                          toast.success('XML файлът е изтеглен');
                        } else { toast.error(res.error); }
                      }}
                        className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100">
                        <FileArchive size={14} className="mr-1.5"/> XML
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VIES — ВЪТРЕОБЩНОСТНА ТЪРГОВИЯ */}
      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Globe className="text-emerald-500" size={18} />
            VIES — Вътреобщностна търговия (ЕС)
          </CardTitle>
          <Button onClick={async () => {
            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth();
            if (month === 0) { month = 12; year -= 1; }
            const res = await generateVies(year, month);
            if (res.success) { toast.success(`VIES за ${month}/${year} е генерирана!`); await load(); }
            else { toast.error('Грешка: ' + res.error); }
          }} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Calculator size={14} />
            VIES за мин. месец
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-400">Период</TableHead>
                <TableHead className="text-zinc-400">Доставки (ЕС)</TableHead>
                <TableHead className="text-zinc-400">Придобивания (ЕС)</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-right text-zinc-400">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Зареждане...</TableCell></TableRow>
              ) : viesDeclarations.length === 0 ? (
                <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center py-8 text-zinc-500">Няма генерирани декларации</TableCell></TableRow>
              ) : viesDeclarations.map((d) => {
                const data = d.data as any;
                return (
                  <TableRow key={d.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium text-zinc-200 tabular-nums">{d.periodStart} - {d.periodEnd}</TableCell>
                    <TableCell className="tabular-nums text-zinc-200">{data?.totals?.salesNet?.toFixed(2) || '0.00'} € ({data?.totals?.salesCount || 0})</TableCell>
                    <TableCell className="tabular-nums text-zinc-200">{data?.totals?.purchasesNet?.toFixed(2) || '0.00'} € ({data?.totals?.purchasesCount || 0})</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`flex items-center gap-1 w-max ${d.status === 'draft' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {d.status === 'draft' ? 'Чернова' : <><CheckCircle size={12}/>Подадена</>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <a href={`/api/tax-declarations/${d.id}/pdf`} download
                        className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100">
                        <Download size={14} className="mr-1.5"/> PDF
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
                       <a 
                         href={`/api/tax-declarations/${d.id}/pdf`}
                         download
                         className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 text-xs font-medium h-8 px-2.5 transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Download size={14} className="mr-1.5"/> PDF Справка
                       </a>
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
