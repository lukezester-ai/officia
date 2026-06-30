// src/ai/anthropic-client.ts
import { anthropic } from '@ai-sdk/anthropic';

export const anthropicClient = anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Optional: control data retention (none = no logging)
  dataControl: process.env.ANTHROPIC_DATA_CONTROL as 'none' | 'all' | undefined,
});
