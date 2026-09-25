/**
 * Quick-Reply Questions Parser
 *
 * Extracts a structured <questions> block from an AI response so the chat
 * UI can render tappable buttons / sliders instead of the athlete having to
 * read several questions and type a free-text answer.
 *
 * Expected format (see lib/claude-agent.ts system prompt for the exact
 * instructions given to the model):
 *
 * <questions>
 * Q: Какие виды активности тебе нравятся?
 * TYPE: choice
 * OPTIONS: Бег | Зал | Командные игры | Другое
 *
 * Q: Сколько дней в неделю реально готов(а) тренироваться?
 * TYPE: slider
 * RANGE: 1-7
 * UNIT: дней
 * </questions>
 */

export type QuestionType = 'choice' | 'slider';

export interface ParsedQuestion {
  text: string;
  type: QuestionType;
  options?: string[]; // choice
  min?: number; // slider
  max?: number; // slider
  unit?: string; // slider
}

export interface ParsedQuestions {
  questions: ParsedQuestion[];
  hasQuestions: boolean;
}

export function parseQuestionsFromAI(response: string): ParsedQuestions {
  const blockMatch = /<questions>([\s\S]*?)<\/questions>/.exec(response);
  if (!blockMatch) {
    return { questions: [], hasQuestions: false };
  }

  const block = blockMatch[1];
  // Split into per-question chunks, each starting at a line beginning with "Q:".
  const rawChunks = block
    .split(/(?=^Q:\s)/m)
    .map((c) => c.trim())
    .filter(Boolean);

  const questions: ParsedQuestion[] = [];

  for (const chunk of rawChunks) {
    const qMatch = /^Q:\s*(.+)$/m.exec(chunk);
    const typeMatch = /^TYPE:\s*(choice|slider)\s*$/m.exec(chunk);
    if (!qMatch || !typeMatch) continue;

    const text = qMatch[1].trim();
    const type = typeMatch[1] as QuestionType;

    if (type === 'choice') {
      const optMatch = /^OPTIONS:\s*(.+)$/m.exec(chunk);
      if (!optMatch) continue;
      const options = optMatch[1]
        .split('|')
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2) continue;
      questions.push({ text, type, options });
    } else {
      const rangeMatch = /^RANGE:\s*(\d+)\s*-\s*(\d+)\s*$/m.exec(chunk);
      if (!rangeMatch) continue;
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      if (Number.isNaN(min) || Number.isNaN(max) || min >= max) continue;
      const unitMatch = /^UNIT:\s*(.+)$/m.exec(chunk);
      questions.push({ text, type, min, max, unit: unitMatch ? unitMatch[1].trim() : '' });
    }
  }

  return { questions, hasQuestions: questions.length > 0 };
}

export function getTextBeforeQuestions(response: string): string {
  const idx = response.indexOf('<questions>');
  if (idx === -1) return response;
  return response.substring(0, idx).trim();
}

export function getTextAfterQuestions(response: string): string {
  const m = /<questions>[\s\S]*?<\/questions>/.exec(response);
  if (!m) return '';
  return response.substring(m.index + m[0].length).trim();
}
