// Public address of this instance (used in the embed snippets). APP_URL wins; otherwise it is derived from the request.

import "server-only";
import { headers } from "next/headers";
import { selfOriginFrom } from "@/lib/api/cors";

export async function getBaseUrl(): Promise<string> {
  return selfOriginFrom(await headers(), process.env.APP_URL) ?? "https://YOUR-INSTANCE";
}
