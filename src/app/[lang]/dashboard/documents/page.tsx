import React from 'react';
import DocumentsClient from './DocumentsClient';
import { getDocuments } from './actions';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Архив & AI Документи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Интелигентно извличане на данни и управление на файлове.</p>
        </div>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Upload size={16} /> Качи файл
        </Button>
      </div>

      <DocumentsClient initialDocuments={documents} />
    </div>
  );
}
