// src/ai/anthropic-client.ts
import { anthropic } from '@ai-sdk/anthropic';

// Initialize the Anthropic model. The SDK reads ANTHROPIC_API_KEY from the environment.
// Using the model ID directly satisfies the expected parameter type.
export const anthropicClient = anthropic('claude-3-5-sonnet-20241022');
