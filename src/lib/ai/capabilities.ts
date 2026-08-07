export type FeatureTier = 0 | 1 | 2 | 3 | 4;
export type Feature = {
  key: string;
  label: string;
  tier: FeatureTier;
  requiredEnvVars: string[];
  description: string;
};

const ALL_FEATURES: Feature[] = [
  { key: 'readOnly', label: 'Read-only инструменти (справки, анализи)', tier: 0, requiredEnvVars: [], description: 'getFinancialSummary, searchDocuments, generateChart' },
  { key: 'aiChat', label: 'AI чат асистент', tier: 1, requiredEnvVars: ['ANTHROPIC_API_KEY'], description: 'Основен AI чат без извикване на инструменти' },
  { key: 'aiTools', label: 'AI инструменти (създаване на фактури, ДДС, банково равнение)', tier: 2, requiredEnvVars: ['ANTHROPIC_API_KEY'], description: 'createInvoice, bankMatch, createExpense, createJournalEntry, generateVat, depreciateAssets, manageHR, manageInventory, processInbox, autoApprove, analyzeContract' },
  { key: 'complianceTools', label: 'Налогово-справочни инструменти', tier: 2, requiredEnvVars: ['ANTHROPIC_API_KEY'], description: 'checkNraStatus, checkNraLiabilities' },
  { key: 'voiceTranscription', label: 'Гласово разпознаване', tier: 3, requiredEnvVars: ['DEEPGRAM_API_KEY', 'OPENAI_API_KEY'], description: 'Deepgram и OpenAI Whisper транскрипция' },
  { key: 'embeddings', label: 'Embeddings за RAG', tier: 3, requiredEnvVars: ['VOYAGE_API_KEY'], description: 'Векторни embeddings за семантично търсене' },
  { key: 'digitalSignatures', label: 'Електронен подпис', tier: 4, requiredEnvVars: ['EVROTRUST_API_KEY'], description: 'Evrotrust електронен подпис' },
  { key: 'napIntegration', label: 'НАП интеграция', tier: 4, requiredEnvVars: ['NAP_ENCRYPTION_KEY'], description: 'НАП B2G шлюз за данъчни декларации' },
  { key: 'ocr', label: 'OCR разпознаване на документи', tier: 2, requiredEnvVars: ['ANTHROPIC_API_KEY'], description: 'Claude Vision OCR за фактури и документи' },
];

export function getAvailableTiers(): FeatureTier[] {
  const available: FeatureTier[] = [0];
  if (process.env.ANTHROPIC_API_KEY) { available.push(1, 2); }
  if (process.env.DEEPGRAM_API_KEY || process.env.OPENAI_API_KEY) { available.push(3); }
  if (process.env.VOYAGE_API_KEY && process.env.ANTHROPIC_API_KEY) { /* tier 3 embeddings already covered */ }
  if (process.env.EVROTRUST_API_KEY) { available.push(4); }
  if (process.env.NAP_ENCRYPTION_KEY) { available.push(4); }
  return [...new Set(available)].sort();
}

export function getEnabledFeatures(): Feature[] {
  const availableTiers = getAvailableTiers();
  return ALL_FEATURES.filter(f => availableTiers.includes(f.tier));
}

export function isFeatureEnabled(key: string): boolean {
  return getEnabledFeatures().some(f => f.key === key);
}

export function getMissingEnvVars(): string[] {
  const allRequired = new Set(ALL_FEATURES.flatMap(f => f.requiredEnvVars));
  return [...allRequired].filter(v => !process.env[v]);
}

export function getFeatureStatusTable(): string {
  const lines: string[] = [];
  lines.push('| Feature | Tier | Key needed | Status |');
  lines.push('|---------|------|------------|--------|');
  for (const f of ALL_FEATURES) {
    const available = getAvailableTiers().includes(f.tier);
    const keyLabel = f.requiredEnvVars.length > 0 ? f.requiredEnvVars.join(', ') : '—';
    lines.push(`| ${f.label} | ${f.tier} | ${keyLabel} | ${available ? '✅' : '❌'} |`);
  }
  return lines.join('\n');
}
