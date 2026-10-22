import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth/session";
import { parseLeadForm } from "@/lib/bots/lead-form";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Downloads the contacts of a chatbot as CSV (admin only).
export async function GET(_request: Request, context: RouteContext<"/admin/bots/[id]/leads/export">) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const bot = await db.bot.findUnique({ where: { id }, select: { slug: true, collect: true } });
  if (!bot) return new Response("Not found", { status: 404 });

  const leads = await db.lead.findMany({ where: { botId: id }, orderBy: { createdAt: "desc" }, take: 50_000 });
  const rows = leads.map((lead) => ({ lead, data: (lead.data && typeof lead.data === "object" ? lead.data : {}) as Record<string, unknown> }));

  // Columns: the fields of the current form, then any other key found in older contacts.
  const form = parseLeadForm(bot.collect);
  const keys = form.fields.map((f) => f.key);
  for (const { data } of rows) for (const key of Object.keys(data)) if (!keys.includes(key)) keys.push(key);
  const labels = new Map(form.fields.map((f) => [f.key, f.label]));

  const table = [
    ["Date (UTC)", "Conversation", "Consent", "Website", ...keys.map((k) => labels.get(k) ?? k)],
    ...rows.map(({ lead, data }) => [lead.createdAt.toISOString(), lead.conversationId, lead.consent ? "yes" : "no", lead.origin ?? "", ...keys.map((k) => data[k] ?? "")]),
  ];

  return new Response(toCsv(table), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${bot.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
