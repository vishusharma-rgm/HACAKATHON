import test from "node:test";
import assert from "node:assert/strict";
import { computeWeightedScore, formatAnalysisDuration } from "../src/lib/scoring.js";

test("computeWeightedScore returns expected weighted result", () => {
  const result = computeWeightedScore({
    skillScore: 80,
    experienceScore: 70,
    projectScore: 60,
    keywordScore: 50,
  });

  assert.equal(result.finalScore, 69);
});

test("formatAnalysisDuration handles invalid and valid values", () => {
  assert.equal(formatAnalysisDuration(0), "N/A");
  assert.equal(formatAnalysisDuration(820), "820ms");
  assert.equal(formatAnalysisDuration(3200), "3.2s");
  assert.equal(formatAnalysisDuration(15400), "15s");
});
