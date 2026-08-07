import { getContracts } from '@/lib/contracts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { getDictionary } from '@/lib/get-dictionary';

export default async function ContractsPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const dict = await getDictionary(params.lang as any);
  const contractsList = await getContracts();
  
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Договори</h1>
          <p className="text-muted-foreground mt-2">Управлявайте всички договори, споразумения и анекси.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/${params.lang}/dashboard/contracts/new`}>
            <Plus className="h-4 w-4" /> Нов договор
          </Link>
        </Button>
      </div>
      
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {contractsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Няма намерени договори</h3>
              <p className="text-muted-foreground mt-2 mb-4 max-w-sm">Все още не сте добавили договори в системата. Започнете като създадете първия си договор.</p>
              <Button variant="outline" asChild>
                <Link href={`/${params.lang}/dashboard/contracts/new`}>Създай договор</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заглавие</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Начална дата</TableHead>
                  <TableHead>Крайна дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractsList.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <Link href={`/${params.lang}/dashboard/contracts/${contract.id}`} className="hover:underline text-primary">
                        {contract.title}
                      </Link>
                      {contract.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{contract.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.status === 'active' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Активен</Badge>}
                      {contract.status === 'draft' && <Badge variant="secondary">Чернова</Badge>}
                      {contract.status === 'terminated' && <Badge variant="destructive">Прекратен</Badge>}
                      {contract.status === 'expired' && <Badge variant="outline">Изтекъл</Badge>}
                    </TableCell>
                    <TableCell>{contract.startDate ? new Date(contract.startDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                    <TableCell>{contract.endDate ? new Date(contract.endDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${params.lang}/dashboard/contracts/${contract.id}`}>Детайли</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
