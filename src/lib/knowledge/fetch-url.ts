// Downloads a web page and extracts its text. Safe against SSRF: every hop (including redirects) is resolved and
// refused when it points to a private address. Set ALLOW_PRIVATE_URLS=true to learn from an intranet or localhost.

import "server-only";
import { lookup } from "node:dns/promises";
import { htmlToText } from "./html";
import { isPrivateIp, parseHttpUrl } from "./net";

const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 15_000;
const PUBLIC_PORTS = new Set(["", "80", "443", "8080", "8443"]);

export class FetchPageError extends Error {}

async function assertPublic(url: URL) {
  if (process.env.ALLOW_PRIVATE_URLS === "true") return;
  if (!PUBLIC_PORTS.has(url.port)) throw new FetchPageError("This port is not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  try {
    addresses = (await lookup(host, { all: true })).map((a) => a.address);
  } catch {
    throw new FetchPageError("This address cannot be resolved.");
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) throw new FetchPageError("This address points to a private network and cannot be fetched.");
}

async function readCapped(response: Response): Promise<string> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const part of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += part.byteLength;
    if (size > MAX_BYTES) throw new FetchPageError("The page is too large (2 MB maximum).");
    chunks.push(part);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

export async function fetchPage(rawUrl: string): Promise<{ title: string; text: string; url: string }> {
  const first = parseHttpUrl(rawUrl);
  if (!first) throw new FetchPageError("Enter a valid http(s) address.");
  let url: URL = first;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "FreeChatbotGenerator/0.1 (+knowledge import)", Accept: "text/html,text/plain;q=0.9" },
      });
    } catch {
      throw new FetchPageError("The page could not be reached.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next: URL | null = location ? parseHttpUrl(new URL(location, url).toString()) : null;
      if (!next) throw new FetchPageError("The page redirects to an invalid address.");
      url = next;
      continue;
    }
    if (!response.ok) throw new FetchPageError(`The page answered with an error (${response.status}).`);

    const type = response.headers.get("content-type") ?? "";
    if (!/text\/(html|plain)|application\/xhtml/i.test(type)) throw new FetchPageError("Only HTML and text pages are supported.");
    const body = await readCapped(response);
    if (/text\/plain/i.test(type)) return { title: url.hostname, text: body.trim(), url: url.toString() };
    const { title, text } = htmlToText(body);
    return { title: title || url.hostname, text, url: url.toString() };
  }
  throw new FetchPageError("Too many redirects.");
}
