import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoAnalysis, compactRowsForAi } from "../lib/analytics.js";

test("demo analysis ranks profit from Russian sales columns", () => {
  const answer = buildDemoAnalysis([
    { Товар: "A", Продажи: "100", Расходы: "40" },
    { Товар: "B", Продажи: "200", Расходы: "80" }
  ], "Какие товары прибыльнее?");
  assert.match(answer, /Best result: B — profit 120\.00/);
  assert.match(answer, /Total profit across 2 analyzed rows: 180\.00/);
});

test("compactRowsForAi caps rows and long strings", () => {
  const rows = Array.from({ length: 250 }, (_, index) => ({ id: index, text: "x".repeat(700) }));
  const compact = compactRowsForAi(rows, 200);
  assert.equal(compact.length, 200);
  assert.equal(compact[0].text.length, 500);
});
