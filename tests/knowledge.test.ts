import assert from "node:assert/strict";
import { test } from "node:test";
import { chunkText } from "../src/lib/knowledge/chunk";
import { htmlToText } from "../src/lib/knowledge/html";
import { isPrivateIp, parseHttpUrl } from "../src/lib/knowledge/net";
import { buildTsQuery } from "../src/lib/knowledge/query";

test("chunkText keeps short text in one chunk and splits long text", () => {
  assert.deepEqual(chunkText("  Hello world  "), ["Hello world"]);
  assert.deepEqual(chunkText("   "), []);
  const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
  const chunks = chunkText(long, 200);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every((c) => c.length <= 200));
  assert.equal(chunks.join(" ").replace(/\s+/g, " ").length >= long.length - chunks.length, true);
});

test("chunkText groups paragraphs and hard-splits text with no boundary", () => {
  const chunks = chunkText("A\n\nB\n\nC", 100);
  assert.deepEqual(chunks, ["A\n\nB\n\nC"]);
  const blob = "x".repeat(2500);
  assert.ok(chunkText(blob, 900).every((c) => c.length <= 900));
});

test("htmlToText drops scripts and navigation, decodes entities", () => {
  const { title, text } = htmlToText(
    `<html><head><title>Caf&eacute; &amp; Co</title></head><body><nav>Menu</nav><script>alert(1)</script><h1>Hello</h1><p>Prices &gt; 10&nbsp;EUR</p><ul><li>One</li><li>Two</li></ul></body></html>`,
  );
  assert.equal(title, "Café & Co");
  assert.ok(text.includes("Hello"));
  assert.ok(text.includes("Prices > 10 EUR"));
  assert.ok(text.includes("- One"));
  assert.ok(!text.includes("alert"));
  assert.ok(!text.includes("Menu"));
});

test("isPrivateIp blocks internal addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "not-an-ip"]) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) assert.equal(isPrivateIp(ip), false, ip);
});

test("parseHttpUrl only accepts http(s) without credentials", () => {
  assert.ok(parseHttpUrl("https://example.com/a?b=1"));
  assert.equal(parseHttpUrl("ftp://example.com"), null);
  assert.equal(parseHttpUrl("https://user:pw@example.com"), null);
  assert.equal(parseHttpUrl("javascript:alert(1)"), null);
  assert.equal(parseHttpUrl("nope"), null);
});

test("buildTsQuery is injection-safe and uses prefixes for long words", () => {
  assert.equal(buildTsQuery("!!!"), null);
  assert.equal(buildTsQuery("What are your prices?"), "'what' | 'are' | 'your' | 'pric':*");
  const q = buildTsQuery("a'); DROP TABLE x; --")!;
  assert.ok(!/[;()\\]/.test(q.replace(/'/g, "")));
  assert.equal(buildTsQuery("café"), "'café'");
});
