import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIpFrom, trustProxyMode } from "../src/lib/client-ip";

const headers = new Headers({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "6.6.6.6, 203.0.113.5" });

test("no proxy is trusted by default: forged headers are ignored", () => {
  assert.equal(trustProxyMode(undefined), "none");
  assert.equal(trustProxyMode("anything"), "none");
  assert.equal(clientIpFrom(headers, "none"), null);
});

test("cloudflare mode reads cf-connecting-ip only", () => {
  assert.equal(clientIpFrom(headers, "cloudflare"), "198.51.100.7");
  assert.equal(clientIpFrom(new Headers({ "x-forwarded-for": "6.6.6.6" }), "cloudflare"), null);
});

test("xff mode takes the last entry, the one added by the own proxy", () => {
  assert.equal(trustProxyMode(" XFF "), "xff");
  assert.equal(clientIpFrom(headers, "xff"), "203.0.113.5");
  assert.equal(clientIpFrom(new Headers(), "xff"), null);
});
