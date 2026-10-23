import assert from "node:assert/strict";
import test from "node:test";
import { auditScriptures, validatePassage } from "./audit-scriptures.mjs";

const passage = {
  slug: "romans-3-23-25", language: "en", version: "NIV",
  display: "Romans 3:23-25", book: "Romans", chapter: 3,
  verses: [[23, "fixture"], [24, "fixture"], [25, "fixture"]],
};

test("Auditor accepts a complete range and flags missing, duplicate and unordered verses", () => {
  assert.deepEqual(validatePassage(passage, passage.slug, "en"), []);
  for (const numbers of [[23, 25], [23, 24, 24], [25, 24, 23]]) {
    const errors = validatePassage({ ...passage, verses: numbers.map((v) => [v, "fixture"]) }, passage.slug, "en");
    assert.ok(errors.some((error) => error.includes("verse sequence")));
  }
});

test("Auditor rejects mismatched metadata and empty verse text", () => {
  for (const override of [{ language: "fr" }, { chapter: 4 }, { book: "Acts" }, { slug: "wrong" }, { verses: [[23, ""]] }]) {
    assert.ok(validatePassage({ ...passage, ...override }, passage.slug, "en").length);
  }
});

test("All Legacy references and their English passage files pass the audit", () => {
  const report = auditScriptures({ locale: "en", study: "light-darkness-legacy" });
  assert.ok(report.references > 20);
  assert.deepEqual(report.issues, []);
});

test("Audit uses pt-eu's actual pt language and library, not an invented locale path", () => {
  const report = auditScriptures({ locale: "pt-eu", study: "sin-repentance" });
  assert.equal(report.libraries[0].language, "pt");
  assert.ok(report.libraries[0].files > 0);
  assert.deepEqual(report.issues, []);
});
