'use client';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Bot, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentChat } from '@/components/ai/document-chat';

const initialDocs = [
  { id: '1', fileName: 'Faktura-1001-TechCorp.pdf', category: 'Invoice', status: 'processed', date: '2026-06-10', extracted: 'INV-1001\nTotal: 2400 BGN' },
  { id: '2', fileName: 'Dogovor_Naem_2026.pdf', category: 'Contract', status: 'processed', date: '2026-05-15', extracted: 'Договор за наем...' },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState(initialDocs);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.info('Сканиране и анализ от Claude AI...', { duration: 3000 });

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          
          const response = await fetch('/api/ai/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              imageBase64: base64Data,
              mimeType: file.type 
            })
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to process document');
          }

          const newDoc = {
            id: Date.now().toString(),
            fileName: file.name,
            category: 'Document',
            status: 'processed',
            date: data.date,
            extracted: `Доставчик: ${data.counterpartyName}\nФактура №: ${data.invoiceNumber}\nСума: ${data.totalAmount} ${data.currency}\n\nДетайли:\n${data.extractedText}`
          };

          setDocs(prev => [newDoc, ...prev]);
          toast.success(`Успешно разчетен: ${data.counterpartyName} - ${data.totalAmount} ${data.currency}`);
        } catch (err: any) {
          toast.error(err.message || 'Грешка при AI обработката');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error('Грешка при четене на файла');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D] dark:text-white">Архив и AI Документи</h1>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-[#4F46E5] hover:bg-[#4338CA] gap-2">
          <Upload size={16} /> Качи Документ
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm border-gray-100 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Качени файлове</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Файл</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Качен на</TableHead>
                    <TableHead>AI Статус</TableHead>
                    <TableHead className="text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id} className={selectedDoc?.id === doc.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" /> {doc.fileName}
                      </TableCell>
                      <TableCell>{doc.category}</TableCell>
                      <TableCell className="text-gray-500">{doc.date}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 gap-1 px-2">
                          <Bot size={12} /> Разчетен
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedDoc(doc)}>
                          Отвори Чат
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {isUploading && (
                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2 text-gray-500">
                        <FileText size={16} className="animate-pulse" /> Сканиране...
                      </TableCell>
                      <TableCell>...</TableCell>
                      <TableCell>...</TableCell>
                      <TableCell><Badge variant="outline" className="animate-pulse">Обработка...</Badge></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          {selectedDoc ? (
            <div className="sticky top-6">
              <DocumentChat documentName={selectedDoc.fileName} extractedText={selectedDoc.extracted} />
            </div>
          ) : (
            <Card className="h-[500px] border-dashed dark:border-slate-700 flex flex-col items-center justify-center text-center p-6 text-gray-500 bg-gray-50/50 dark:bg-slate-800/50 shadow-none">
              <Bot size={48} className="text-gray-300 mb-4" />
              <p className="font-medium text-gray-900 dark:text-white">Изберете документ за анализ</p>
              <p className="text-sm mt-2 max-w-xs">AI Асистентът може да отговори на всякакви въпроси относно съдържанието му.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
