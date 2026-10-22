import assert from "node:assert/strict";
import { test } from "node:test";
import { csvCell, toCsv } from "../src/lib/csv";

test("csvCell quotes special characters", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(42), "42");
});

test("csvCell neutralises spreadsheet formulas", () => {
  for (const evil of ["=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd"]) assert.ok(csvCell(evil).replace(/^"/, "").startsWith("'"), evil);
  assert.equal(csvCell("a=b"), "a=b", "only a leading character matters");
});

test("international phone numbers stay readable, formulas that merely start with + do not", () => {
  assert.equal(csvCell("+33 6 12 34 56 78"), "+33 6 12 34 56 78");
  assert.equal(csvCell("+1 (555) 123-4567"), "+1 (555) 123-4567");
  assert.equal(csvCell("+1+1"), "'+1+1");
  assert.equal(csvCell("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
});

test("toCsv adds a BOM and CRLF line breaks", () => {
  assert.equal(toCsv([["a", "b"], ["1", "2"]]), "﻿a,b\r\n1,2\r\n");
});
