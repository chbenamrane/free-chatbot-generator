import type { Metadata } from "next";
import { connection } from "next/server";
import { Collapsible } from "@/components/Collapsible";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { KNOWLEDGE_BUDGET_CHARS } from "@/lib/knowledge/search";
import { AddKnowledge } from "./AddKnowledge";
import { SearchTest } from "./SearchTest";
import { SourceItem } from "./SourceItem";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage({ params }: PageProps<"/admin/bots/[id]/knowledge">) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const sources = await db.knowledgeSource.findMany({ where: { botId: id }, orderBy: { createdAt: "desc" } });
  const totalChars = sources.reduce((sum, s) => sum + s.content.length, 0);
  const fits = totalChars <= KNOWLEDGE_BUDGET_CHARS;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        <Collapsible title="Teach the chatbot" defaultOpen>
          <AddKnowledge botId={id} />
        </Collapsible>
        <Collapsible title="Test what it finds">
          <SearchTest botId={id} />
        </Collapsible>
      </div>

      <Collapsible
        title={`What it knows (${sources.length})`}
        aside={
          <span className="text-xs font-normal text-muted">
            {totalChars.toLocaleString("en")} characters · {fits ? "sent in full with every question" : "searched for each question"}
          </span>
        }
        defaultOpen
      >
        {sources.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet. Add text, Q&amp;As, a web page or a file on the left.</p>
        ) : (
          <div className="space-y-1.5">
            {sources.map((s) => (
              <SourceItem
                key={s.id}
                botId={id}
                source={{ id: s.id, type: s.type, origin: s.origin, title: s.title, content: s.content, url: s.url, chunkCount: s.chunkCount, createdAt: s.createdAt.toISOString() }}
              />
            ))}
          </div>
        )}
      </Collapsible>
    </div>
  );
}
