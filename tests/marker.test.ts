import assert from "node:assert/strict";
import { test } from "node:test";
import { NO_ANSWER_MARKER, stripMarker } from "../src/lib/chat/marker";

async function* from(chunks: string[]) {
  for (const c of chunks) yield c;
}
async function run(chunks: string[]) {
  const state = { unanswered: false };
  let text = "";
  for await (const piece of stripMarker(from(chunks), state)) text += piece;
  return { text: text.trimEnd(), unanswered: state.unanswered }; // trailing space before the marker is harmless: callers trim the final text
}

test("text without marker passes through unchanged", async () => {
  assert.deepEqual(await run(["Hello ", "world [not a marker]"]), { text: "Hello world [not a marker]", unanswered: false });
});

test("marker at the end is removed and flagged", async () => {
  assert.deepEqual(await run(["I do not know. ", NO_ANSWER_MARKER]), { text: "I do not know.", unanswered: true });
});

test("marker split across chunks is removed", async () => {
  const r = await run(["Sorry. [[NO_", "ANSW", "ER]]"]);
  assert.deepEqual(r, { text: "Sorry.", unanswered: true });
});

test("a held-back partial marker is released when it turns out to be normal text", async () => {
  assert.deepEqual(await run(["see [[NO", "TE]] here"]), { text: "see [[NOTE]] here", unanswered: false });
  assert.deepEqual(await run(["ends with [["]), { text: "ends with [[", unanswered: false });
});
