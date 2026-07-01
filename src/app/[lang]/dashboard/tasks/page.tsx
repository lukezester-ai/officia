import React from 'react';
import TasksClient from './TasksClient';
import AiInboxClient from './AiInboxClient';
import { getSuggestedTasks } from '../documents/actions';
import { getInboxItems } from '../ai-inbox/actions';

export default async function TasksPage() {
  const [suggestedTasks, inboxItems] = await Promise.all([
    getSuggestedTasks().catch(() => []),
    getInboxItems().catch(() => []),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
          Задачи и одобрения от изкуствения интелект
        </h1>
        <p className="text-zinc-400 mt-2">
          Преглеждайте предложените задачи и одобрявайте рисковите действия, преди да променят счетоводни, кадрови, данъчни или имуществени данни.
        </p>
      </div>

      <AiInboxClient initialItems={inboxItems} />
      <TasksClient initialTasks={suggestedTasks} />
    </div>
  );
}
