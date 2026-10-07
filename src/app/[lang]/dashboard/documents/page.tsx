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

      {!res.success ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Архивът не се зареди. Презареди страницата.
        </div>
      ) : null}

      <DocumentsClient initialDocuments={documents} />
    </div>
  );
}
