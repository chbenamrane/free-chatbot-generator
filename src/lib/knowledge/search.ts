// Finds the pieces of knowledge relevant to a question.
//   - small knowledge base (fits in the budget): everything is sent, nothing can be missed;
//   - larger: PostgreSQL full-text search ranks the chunks and the best ones are sent.

import "server-only";
import { db } from "@/lib/db";
import { buildTsQuery } from "./query";

export const KNOWLEDGE_BUDGET_CHARS = 6000;
const MAX_HITS = 8;

export type KnowledgeHit = { id: string; sourceId: string; title: string; type: string; content: string; rank: number };
export type Retrieval = { mode: "none" | "all" | "search"; hits: KnowledgeHit[] };

export async function retrieveKnowledge(botId: string, question: string): Promise<Retrieval> {
  const [{ total }] = await db.$queryRaw<{ total: bigint | null }[]>`SELECT COALESCE(SUM(LENGTH(content)), 0) AS total FROM "KnowledgeChunk" WHERE "botId" = ${botId}`;
  if (!total || total === BigInt(0)) return { mode: "none", hits: [] };

  if (total <= BigInt(KNOWLEDGE_BUDGET_CHARS)) {
    const hits = await db.$queryRaw<KnowledgeHit[]>`
      SELECT c.id, c."sourceId", s.title, s.type, c.content, 0::float8 AS rank
      FROM "KnowledgeChunk" c JOIN "KnowledgeSource" s ON s.id = c."sourceId"
      WHERE c."botId" = ${botId}
      ORDER BY s."createdAt", c.position`;
    return { mode: "all", hits };
  }

  const query = buildTsQuery(question);
  if (!query) return { mode: "search", hits: [] };
  // Q&A pairs (written by the owner, or saved from the improvement loop) are slightly favoured.
  const hits = await db.$queryRaw<KnowledgeHit[]>`
    SELECT c.id, c."sourceId", s.title, s.type, c.content,
           (ts_rank_cd(c.tsv, q.query) * CASE WHEN s.type = 'faq' THEN 1.5 ELSE 1 END)::float8 AS rank
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeSource" s ON s.id = c."sourceId",
         to_tsquery('simple', ${query}) AS q(query)
    WHERE c."botId" = ${botId} AND c.tsv @@ q.query
    ORDER BY rank DESC, c.position
    LIMIT ${MAX_HITS}`;

  // Keep the best chunks that fit in the budget.
  const kept: KnowledgeHit[] = [];
  let used = 0;
  for (const hit of hits) {
    if (used + hit.content.length > KNOWLEDGE_BUDGET_CHARS && kept.length > 0) break;
    kept.push(hit);
    used += hit.content.length;
  }
  return { mode: "search", hits: kept };
}
