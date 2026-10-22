import { leadPost, preflight } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

export const POST = leadPost;
export const OPTIONS = (request: Request) => preflight(request, "POST, OPTIONS");
