import assert from "node:assert/strict";
import { test } from "node:test";
import { corsHeaders, isOriginAllowed, preflightHeaders, selfOriginFrom } from "../src/lib/api/cors";
import { parseAppearance } from "../src/lib/bots/appearance";
import { cacheKey, normalizeQuestion } from "../src/lib/chat/cache";

test("isOriginAllowed", () => {
  assert.equal(isOriginAllowed(null, ["https://a.com"], null), true, "no Origin header: not a browser");
  assert.equal(isOriginAllowed("https://a.com", [], null), true, "empty list allows any website");
  assert.equal(isOriginAllowed("https://a.com", ["https://a.com"], null), true);
  assert.equal(isOriginAllowed("https://b.com", ["https://a.com"], null), false);
  assert.equal(isOriginAllowed("https://admin.me", ["https://a.com"], "https://admin.me"), true, "own origin is always allowed");
  assert.equal(isOriginAllowed("https://a.com.evil.com", ["https://a.com"], null), false);
});

test("selfOriginFrom prefers APP_URL then forwarded headers", () => {
  assert.equal(selfOriginFrom(new Headers(), "https://bots.example.com/some/path"), "https://bots.example.com");
  assert.equal(selfOriginFrom(new Headers({ host: "localhost:3010" }), undefined), "http://localhost:3010");
  assert.equal(selfOriginFrom(new Headers({ host: "internal:3000", "x-forwarded-host": "bots.example.com", "x-forwarded-proto": "https" }), undefined), "https://bots.example.com");
  assert.equal(selfOriginFrom(new Headers(), undefined), null);
});

test("cors headers are only sent for allowed origins", () => {
  assert.equal(corsHeaders("https://a.com", true, "POST")["Access-Control-Allow-Origin"], "https://a.com");
  assert.equal(corsHeaders("https://b.com", false, "POST")["Access-Control-Allow-Origin"], undefined);
  assert.equal(preflightHeaders("https://a.com", "POST")["Access-Control-Allow-Origin"], "https://a.com");
});

test("parseAppearance falls back to defaults on bad data", () => {
  const a = parseAppearance({ color: "red", position: "middle", radius: 999, suggestions: ["a", "", "b"], title: 42 });
  assert.equal(a.color, "#4f46e5");
  assert.equal(a.position, "right");
  assert.equal(a.radius, 16);
  assert.deepEqual(a.suggestions, []);
  assert.equal(a.title, "");
  assert.deepEqual(parseAppearance(null), parseAppearance({}));
  assert.equal(parseAppearance({ color: "#00ff00", position: "left" }).color, "#00ff00");
});

test("question normalization for the cache", () => {
  assert.equal(normalizeQuestion("  What's  YOUR name?! "), "what s your name");
  assert.equal(cacheKey("Hello, world!"), cacheKey("hello world"));
  assert.notEqual(cacheKey("hello"), cacheKey("hello there"));
});
