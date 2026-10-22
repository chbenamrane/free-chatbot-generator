// Splits a text into chunks small enough to be searched and injected in a prompt.
// Paragraphs are kept together when possible; a paragraph that is too long is cut at sentence boundaries.

export const CHUNK_TARGET = 900; // characters
export const MAX_SOURCE_CHARS = 200_000; // one source cannot be larger than this

function splitSentences(paragraph: string): string[] {
  return paragraph.match(/[^.!?。！？\n]+[.!?。！？]*\s*/gu)?.map((s) => s.trim()).filter(Boolean) ?? [paragraph];
}

// Cuts a piece with no usable boundary into fixed-size slices.
function hardSplit(text: string, size: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

export function chunkText(raw: string, target = CHUNK_TARGET): string[] {
  const text = raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];

  const units: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    if (paragraph.length <= target) units.push(paragraph);
    else {
      for (const sentence of splitSentences(paragraph)) {
        if (sentence.length <= target) units.push(sentence);
        else units.push(...hardSplit(sentence, target));
      }
    }
  }

  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > target) {
      chunks.push(current);
      current = unit;
    } else {
      current = current ? `${current}\n\n${unit}` : unit;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
