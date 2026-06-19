// @ts-nocheck
import React from 'react';
import TasksClient from './TasksClient';
import { getSuggestedTasks } from '../documents/actions';

export default async function TasksPage() {
  const suggestedTasks = await getSuggestedTasks();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
          AI Задачи за Одобрение
        </h1>
        <p className="text-zinc-400 mt-2">Тези задачи бяха автоматично генерирани от качените документи. Одобрете ги, за да влязат в календара.</p>
      </div>

      <TasksClient initialTasks={suggestedTasks} />
    </div>
  );
}
