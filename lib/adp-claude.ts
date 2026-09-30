// lib/adp-claude.ts
//
// The real model call for the ADP safe AI coach (server only). The coach
// module (adp/src/services/claudeCoachService.ts) takes this as an injected
// ModelCall; everything the model answers is checked there by 21 rules
// before an athlete sees it.
//
// Uses the same ANTHROPIC_API_KEY as the chat. No key → null → the athlete
// gets the engine's rules-only plan (the demo keeps working without AI).

import Anthropic from '@anthropic-ai/sdk';
import type { ModelCall } from '@/adp/src/services/planGuard';

/** Can be set separately; defaults to the chat's model. */
export const ADP_COACH_MODEL = process.env.ADP_COACH_MODEL ?? process.env.CLAUDE_MODEL ?? 'claude-sonnet-5';

/** The answer is a small JSON plan; past this we stop waiting and show the rules plan. */
export const ADP_COACH_TIMEOUT_MS = 20_000;
const MAX_TOKENS = 1500;

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  client = apiKey ? new Anthropic({ apiKey }) : null;
  return client;
}

export function adpModelCall(): ModelCall | null {
  const c = getClient();
  if (!c) return null;
  return async (request) => {
    const res = await c.messages.create(
      { model: ADP_COACH_MODEL, max_tokens: MAX_TOKENS, system: request.system, messages: request.messages },
      { timeout: ADP_COACH_TIMEOUT_MS, maxRetries: 0 }
    );
    return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n');
  };
}
