import { feedbackPost, preflight } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

export const POST = feedbackPost;
export const OPTIONS = (request: Request) => preflight(request, "POST, OPTIONS");
