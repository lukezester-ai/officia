export const DEAL_STAGES = [
  { id: 'lead', label: 'Заявка' },
  { id: 'offer', label: 'Оферта' },
  { id: 'negotiation', label: 'Преговори' },
  { id: 'won', label: 'Спечелена' },
  { id: 'lost', label: 'Загубена' },
] as const;

export type DealStage = (typeof DEAL_STAGES)[number]['id'];

const STAGE_IDS = new Set<string>(DEAL_STAGES.map((stage) => stage.id));

export function isDealStage(value: string): value is DealStage {
  return STAGE_IDS.has(value);
}

export function parseDealAmount(value: string): number | null {
  const amount = Number(String(value).replace(',', '.').trim());
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (Math.abs(amount - Math.round(amount * 100) / 100) > 0.001) return null;
  return amount;
}
