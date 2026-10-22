import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAppearance } from "../src/lib/bots/appearance";
import { parseLeadForm, publicLeadForm, validateLead } from "../src/lib/bots/lead-form";

const form = (over: object = {}) =>
  parseLeadForm({
    enabled: true,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "E-mail", type: "email", required: false },
      { key: "phone", label: "Phone", type: "tel", required: false },
    ],
    ...over,
  });

test("defaults: disabled, with name and e-mail fields ready", () => {
  const f = parseLeadForm(undefined);
  assert.equal(f.enabled, false);
  assert.deepEqual(f.fields.map((x) => x.key), ["name", "email"]);
  assert.equal(publicLeadForm(f), null, "nothing is exposed while disabled");
  assert.ok(publicLeadForm(form()));
});

test("bad stored data falls back to defaults instead of breaking", () => {
  const f = parseLeadForm({ enabled: "yes", when: "never", afterMessages: 99, fields: [{ key: "Bad Key!", label: "", type: "x", required: 1 }] });
  assert.equal(f.enabled, false);
  assert.equal(f.when, "start");
  assert.equal(f.afterMessages, 2);
  assert.deepEqual(f.fields.map((x) => x.key), ["name", "email"]);
  assert.equal(parseLeadForm({ fields: Array.from({ length: 7 }, (_, i) => ({ key: `k${i}`, label: "x", type: "text", required: false })) }).fields.length, 2, "more than 6 fields is invalid");
});

test("duplicate field keys are dropped", () => {
  const f = form({ fields: [{ key: "name", label: "A", type: "text", required: true }, { key: "name", label: "B", type: "text", required: true }] });
  assert.equal(f.fields.length, 1);
});

test("validateLead accepts a good submission and keeps only configured fields", () => {
  const r = validateLead(form(), { name: "  Marie  ", email: "marie@example.com", phone: "+33 6 12 34 56 78", admin: "true" }, false);
  assert.deepEqual(r, { ok: true, data: { name: "Marie", email: "marie@example.com", phone: "+33 6 12 34 56 78" }, consent: false });
});

test("validateLead rejects missing, malformed and oversized values", () => {
  assert.deepEqual(validateLead(form(), { email: "a@b.co" }, false), { ok: false, key: "name", message: "Name is required." });
  assert.equal(validateLead(form(), { name: "A", email: "nope" }, false).ok, false);
  assert.equal(validateLead(form(), { name: "A", phone: "abc" }, false).ok, false);
  assert.equal(validateLead(form(), { name: "A", phone: "12" }, false).ok, false);
  assert.equal(validateLead(form(), { name: "x".repeat(201) }, false).ok, false);
  assert.equal(validateLead(form(), { name: ["A"] }, false).ok, false, "non-string values are ignored");
  assert.equal(validateLead(form(), null, false).ok, false);
});

test("control characters are stripped and optional empty fields are skipped", () => {
  const r = validateLead(form(), { name: "Ann\nBob\u0000", email: "" }, false);
  assert.ok(r.ok && r.data.name === "Ann Bob" && !("email" in r.data));
});

test("consent is required when a consent text is configured", () => {
  const f = form({ consentText: "I agree to be contacted" });
  assert.equal(validateLead(f, { name: "A" }, false).ok, false);
  assert.equal(validateLead(f, { name: "A" }, "true").ok, false, "only the boolean true counts");
  const ok = validateLead(f, { name: "A" }, true);
  assert.ok(ok.ok && ok.consent);
});

test("a disabled form accepts nothing", () => {
  assert.equal(validateLead(parseLeadForm({ enabled: false }), { name: "A" }, true).ok, false);
});

test("showReset defaults to off and is read from the appearance", () => {
  assert.equal(parseAppearance({}).showReset, false);
  assert.equal(parseAppearance({ showReset: true }).showReset, true);
  assert.equal(parseAppearance({ showReset: "yes" }).showReset, false);
});

test("checkLeadFormInput is strict where parseLeadForm is lenient", async () => {
  const { checkLeadFormInput } = await import("../src/lib/bots/lead-form");
  const base = { enabled: true, fields: [{ key: "name", label: "Name", type: "text", required: true }] };
  assert.ok(checkLeadFormInput(base).ok);
  assert.equal(checkLeadFormInput({ ...base, fields: [{ key: "name", label: "", type: "text", required: true }] }).ok, false, "an empty label is refused, not replaced by defaults");
  assert.equal(checkLeadFormInput({ ...base, fields: [{ key: "ssn", label: "SSN", type: "text", required: true }] }).ok, false, "unknown keys are refused");
  assert.equal(checkLeadFormInput({ ...base, fields: [{ key: "email", label: "E", type: "text", required: true }] }).ok, false, "a preset keeps its type");
  assert.equal(checkLeadFormInput({ ...base, fields: [base.fields[0], base.fields[0]] }).ok, false, "duplicates are refused");
  assert.equal(checkLeadFormInput({ ...base, fields: [] }).ok, false, "an enabled form needs a field");
  assert.ok(checkLeadFormInput({ enabled: false, fields: [] }).ok, "an empty disabled form is fine");
  assert.ok(checkLeadFormInput({ ...base, fields: [{ key: "custom1", label: "Budget", type: "text", required: false }] }).ok);
  assert.equal(checkLeadFormInput(null).ok, false);
});
