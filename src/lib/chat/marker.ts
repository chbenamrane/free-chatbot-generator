// Removes the NO_ANSWER marker from a streamed answer and reports whether it was present.
// The marker can be split across several chunks, so a possible beginning of it is held back until it is certain.

export const NO_ANSWER_MARKER = "[[NO_ANSWER]]";

export type MarkerState = { unanswered: boolean };

// Length of the longest suffix of "text" that is a proper prefix of the marker.
function heldLength(text: string) {
  for (let n = Math.min(NO_ANSWER_MARKER.length - 1, text.length); n > 0; n--) {
    if (NO_ANSWER_MARKER.startsWith(text.slice(-n))) return n;
  }
  return 0;
}

export async function* stripMarker(stream: AsyncGenerator<string>, state: MarkerState): AsyncGenerator<string> {
  let pending = "";
  for await (const chunk of stream) {
    pending += chunk;
    if (pending.includes(NO_ANSWER_MARKER)) {
      state.unanswered = true;
      pending = pending.split(NO_ANSWER_MARKER).join("");
    }
    const held = heldLength(pending);
    const out = pending.slice(0, pending.length - held);
    pending = pending.slice(pending.length - held);
    if (out) yield out;
  }
  const rest = pending.trimEnd();
  if (rest) yield rest;
}
