const blockedPatterns = [
  /\b(ignore|ignorer)\b.*\b(instructions?|consignes?)\b/i,
  /\b(affiche|montre|revele|reveal)\b.*\b(secrets?|cles?|tokens?)\b/i,
];

function normalizeText(message: string): string {
  return message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isBlockedByFinancialPolicy(message: string): boolean {
  const normalizedMessage = normalizeText(message);

  return blockedPatterns.some((pattern) => pattern.test(normalizedMessage));
}
