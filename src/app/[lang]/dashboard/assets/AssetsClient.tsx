'use client';
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Box, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { AssetDrawer } from '@/components/drawers/asset-drawer';

export default function AssetsClient({ assets, problems }: { assets: any[], problems: any[] }) {
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  return (
    <>
      {problems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} /> Имате активи с липсваща документация
          </h3>
          <ul className="list-disc pl-8 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {problems.map((p, i) => (
              <li key={i}>{p.name} - {p.issue}</li>
            ))}
          </ul>
        </div>
      )}

      <Card className="shadow-sm border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Инвентарен номер</TableHead>
                <TableHead>Актив</TableHead>
                <TableHead>Дата на придобиване</TableHead>
                <TableHead className="text-right">Стойност</TableHead>
                <TableHead>Документация</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(a => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50" onClick={() => setSelectedAsset(a)}>
                  <TableCell className="pl-6 font-mono text-sm">{a.inventoryNumber}</TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Box size={16} className="text-muted-foreground" /> {a.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(a.acquisitionDate).toLocaleDateString('bg-BG')}</TableCell>
                  <TableCell className="text-right font-mono">{parseFloat(a.acquisitionCost).toLocaleString('bg-BG', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    {a.documentId ? (
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 gap-1"><CheckCircle size={12}/> Има</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 gap-1"><AlertTriangle size={12}/> Липсва</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.isActive ? <Badge variant="secondary">Активен</Badge> : <Badge variant="outline">Отписан</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Няма намерени активи.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssetDrawer asset={selectedAsset} open={!!selectedAsset} onOpenChange={(o) => !o && setSelectedAsset(null)} />
    </>
  );
}
