import { chatPost, preflight } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

export const POST = chatPost;
export const OPTIONS = (request: Request) => preflight(request, "POST, OPTIONS");
