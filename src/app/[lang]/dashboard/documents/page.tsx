import React from 'react';
import DocumentsClient from './DocumentsClient';
import { getDocuments } from './actions';
export default async function DocumentsPage() {
  const res = await getDocuments();
  const documents = res.success ? res.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Архив & AI Документи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Интелигентно извличане на данни и управление на файлове.</p>
        </div>
      </div>

      <DocumentsClient initialDocuments={documents} />
    </div>
  );
}
