import type { PromptVersion } from './types.js';
import { v1 } from './v1.js';
import { v2 } from './v2.js';
import { v3 } from './v3.js';

export const PROMPTS: Record<string, PromptVersion> = { v1, v2, v3 };
export const DEFAULT_PROMPT_ID = 'v3';

export function getPrompt(id: string = DEFAULT_PROMPT_ID): PromptVersion {
  const prompt = PROMPTS[id];
  if (!prompt) throw new Error(`Prompt desconhecido: ${id} (disponíveis: ${Object.keys(PROMPTS).join(', ')})`);
  return prompt;
}
