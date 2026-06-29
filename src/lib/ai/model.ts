import { anthropic } from '@ai-sdk/anthropic';

export const ANTHROPIC_CHAT_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';

export const ANTHROPIC_ROUTER_MODEL =
  process.env.ANTHROPIC_ROUTER_MODEL?.trim() || 'claude-haiku-4-5';

export function getAnthropicChatModel() {
  return anthropic(ANTHROPIC_CHAT_MODEL);
}

export function getAnthropicRouterModel() {
  return anthropic(ANTHROPIC_ROUTER_MODEL);
}
