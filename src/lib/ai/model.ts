import { anthropic } from '@ai-sdk/anthropic';

export const ANTHROPIC_CHAT_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';

export function getAnthropicChatModel() {
  return anthropic(ANTHROPIC_CHAT_MODEL);
}
