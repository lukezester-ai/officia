'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSignature, FileKey, Zap, CheckCircle, Clock } from 'lucide-react';
import { DocumentDrawer } from '@/components/drawers/document-drawer';

export default function DocumentsClient({ initialDocuments }: { initialDocuments: any[] }) {
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  const getDocIcon = (type: string) => {
    switch(type) {
      case 'contract': return <FileSignature size={16} className="text-emerald-500" />;
      case 'invoice': return <FileText size={16} className="text-indigo-500" />;
      default: return <FileText size={16} className="text-slate-500" />;
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch(type) {
      case 'contract': return 'Договор';
      case 'invoice': return 'Фактура';
      case 'order': return 'Заповед';
      case 'receipt': return 'Касова бележка';
      default: return 'Друг';
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Име на файл</TableHead>
                <TableHead>Тип документ</TableHead>
                <TableHead>Контрагент (Извлечен)</TableHead>
                <TableHead>Дата на качване</TableHead>
                <TableHead>AI Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Няма качени документи.
                  </TableCell>
                </TableRow>
              ) : (
                initialDocuments.map(doc => (
                  <TableRow 
                    key={doc.id} 
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        {getDocIcon(doc.type)}
                        <span className="truncate max-w-[250px]">{doc.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getDocTypeLabel(doc.type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.metadata?.counterpartyName || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('bg-BG') : '—'}
                    </TableCell>
                    <TableCell>
                      {doc.status === 'analyzed' ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span className="text-emerald-700 dark:text-emerald-400">Анализиран</span>
                          {doc.aiStatus === 'needs_review' && (
                            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">Преглед</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock size={14} /> Обработва се...
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DocumentDrawer 
        document={selectedDoc} 
        open={!!selectedDoc} 
        onOpenChange={(o) => !o && setSelectedDoc(null)} 
      />
    </>
  );
}
