// @ts-nocheck
import React from 'react';
import DocumentsClient from './DocumentsClient';
import { getDocuments } from './actions';

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            AI Документи
          </h1>
          <p className="text-zinc-400 mt-2">Качвайте договори и заповеди. AI ще ги анализира и ще предложи задачи.</p>
        </div>
      </div>

      <DocumentsClient initialDocuments={documents} />
    </div>
  );
}
