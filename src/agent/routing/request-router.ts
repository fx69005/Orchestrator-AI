export type RequestRoute = 'conversation' | 'calculation';

const calculationPattern =
  /\b(calcul(?:e|er|ez|ons)?|addition(?:ne|ner|nez|nons)?|somme)\b/i;

export function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  const blocks = content as unknown[];

  return blocks
    .map((block) => {
      if (typeof block === 'string') {
        return block;
      }

      if (typeof block === 'object' && block !== null) {
        const record = block as Record<string, unknown>;

        if (typeof record.text === 'string') {
          return record.text;
        }
      }

      return '';
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * First explicit routing rule.
 *
 * This classifier is intentionally simple and deterministic. It is a
 * learning step, not a general natural-language classifier.
 */
export function routeRequest(message: string): RequestRoute {
  return calculationPattern.test(message) ? 'calculation' : 'conversation';
}
