// Builds a PostgreSQL full-text query (tsquery, "simple" configuration) from a visitor's question.
// The "simple" configuration does no stemming, so it works for any language; long words are matched by prefix
// ("prices" and "pricing" both find "price") to compensate. Tokens only contain letters and digits: safe to embed.

const MAX_TOKENS = 14;

export function tokenize(question: string): string[] {
  const seen = new Set<string>();
  for (const match of question.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu)) {
    const token = match[0];
    if (token.length >= 2 && token.length <= 40) seen.add(token);
  }
  return [...seen].slice(0, MAX_TOKENS);
}

export function buildTsQuery(question: string): string | null {
  const tokens = tokenize(question);
  if (tokens.length === 0) return null;
  return tokens
    .map((token) => (token.length >= 5 ? `'${token.slice(0, Math.max(4, token.length - 3))}':*` : `'${token}'`))
    .join(" | ");
}
