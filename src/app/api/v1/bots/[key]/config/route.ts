import { configGet, preflight } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/v1/bots/[key]/config">) {
  const { key } = await context.params;
  return configGet(request, key);
}

export const OPTIONS = (request: Request) => preflight(request, "GET, OPTIONS");
