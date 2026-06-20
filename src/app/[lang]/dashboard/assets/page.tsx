// @ts-nocheck
import React from 'react';
import { getAssetsData } from './actions';
import AssetsClient from './AssetsClient';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function AssetsPage() {
  const res = await getAssetsData();
  const data = res.success ? res.data : { assets: [], problems: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дълготрайни активи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Инвентар, амортизации и свързани документи.</p>
        </div>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={16} /> Нов актив
        </Button>
      </div>

      <AssetsClient assets={data.assets} problems={data.problems} />
    </div>
  );
}
