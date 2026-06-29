import { accountingExecutor } from './accounting';
import { bankingExecutor } from './banking';
import { documentsExecutor } from './documents';
import { hrExecutor } from './hr';
import type { ExecutorAgent, ExecutorDomain } from '../types';

export const executorAgents: ExecutorAgent[] = [
  accountingExecutor,
  bankingExecutor,
  hrExecutor,
  documentsExecutor,
];

export const executorByDomain: Record<ExecutorDomain, ExecutorAgent> = {
  accounting: accountingExecutor,
  banking: bankingExecutor,
  hr: hrExecutor,
  documents: documentsExecutor,
};
