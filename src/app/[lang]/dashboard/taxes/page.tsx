'use client';
import { useState, useEffect } from 'react';
import { getDeclarations, generateDds } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Download, FileCode, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxesPage() {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const res = await getDeclarations();
    if (res.success && res.data) setDeclarations(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const now = new Date();
    // По подразбиране генерираме за предходния месец
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
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Данъци и Декларации</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управление на ДДС, справки-декларации и експорт към НАП.</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Calculator size={16} />
          Генерирай ДДС за мин. месец
        </Button>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-black/5">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg">Справки-Декларации (ЗДДС)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Период</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>ДДС за плащане/възстановяване</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Експорт</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Зареждане...</TableCell></TableRow>
              ) : declarations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Няма генерирани декларации</TableCell></TableRow>
              ) : declarations.map((d) => {
                const isPayable = parseFloat(d.totalAmount || '0') > 0;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.periodStart} - {d.periodEnd}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">{d.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={isPayable ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
                        {parseFloat(d.totalAmount || '0').toFixed(2)} лв.
                      </span>
                    </TableCell>
                    <TableCell>
                       <Badge variant={d.status === 'draft' ? 'secondary' : 'default'} className="flex items-center gap-1 w-max">
                          {d.status === 'draft' ? 'Чернова' : <><CheckCircle size={12}/>Подадена</>}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="outline" size="sm" asChild className="text-xs h-8">
                          {/* В истинското приложение тук ще сложим линк към PDF експортъра */}
                          <a href={`#`} onClick={() => toast('PDF експортът изисква извикване към сървъра (TBD)')}>
                             <Download size={14} className="mr-1.5 text-red-600"/> PDF Справка
                          </a>
                       </Button>
                       <Button variant="outline" size="sm" asChild className="text-xs h-8">
                          <a href={`/api/taxes/dds/xml?id=${d.id}`} target="_blank" download>
                             <FileCode size={14} className="mr-1.5 text-blue-600"/> XML за НАП
                          </a>
                       </Button>
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
