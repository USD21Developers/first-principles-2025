import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("../public/fp/", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const page = read("en/light-darkness-legacy/index.html");
const study = "light-darkness-legacy";

test("Legacy is listed after Follow Up Studies in both English indexes", () => {
  for (const route of ["toc", "additional-studies"]) {
    const html = read(`en/${route}/index.html`);
    const legacy = html.indexOf(">Legacy<");
    assert.ok(legacy > html.indexOf("../persecution/"));
    assert.match(html.slice(legacy), /href="\.\.\/light-darkness-legacy\/"/);
    assert.match(html.slice(legacy), />Light And Darkness \(Legacy\)</);
  }
});

test("PDF outline, comparisons and confidential closing note are preserved", () => {
  for (const excerpt of [
    "LIGHT &amp; DARKNESS (Legacy Version)",
    "There is no twilight zone.",
    "B. Personal Decision as an Adult",
    "What message must one believe to be saved?",
    "What is the eternal consequence of sin?",
    "TRADITIONS/FALSE DOCTRINES",
    "Became &ldquo;church doctrine&rdquo; in 549 A.D",
    "This is confidential and should only be shared with those who are studying with the person.",
  ]) assert.ok(page.includes(excerpt), excerpt);
  assert.equal([...page.matchAll(/<table /g)].length, 2);
  assert.equal([...page.matchAll(/<h2 /g)].length, 3);
});

test("Four original diagrams have local assets, sizes and meaningful alternatives", () => {
  const figures = [...page.matchAll(/<img src="(img\/[^"]+)"[^>]+>/g)];
  assert.equal(figures.length, 4);
  for (const [tag, path] of figures) {
    assert.ok(existsSync(resolve(root, "en", study, path)));
    assert.match(tag, /width="\d+" height="\d+"/);
    assert.match(tag, /alt="[^"]{30,}"/);
  }
  const css = read(`en/${study}/style.css`);
  assert.match(css, /max-width: 100%/);
  assert.match(css, /height: auto/);
});

test("Local page dependencies and internal navigation resolve", () => {
  for (const match of page.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|javascript:|#)/.test(href)) continue;
    assert.ok(existsSync(resolve(root, "en", study, href)), href);
  }
});

test("Every Legacy scripture link has its complete verse range available locally", () => {
  for (const [tag, reference] of page.matchAll(/<span data-scripture="([^"]+)"[^>]*>/g)) {
    assert.ok(!tag.includes('data-scripture-offline="false"'), reference);
    const slug = reference.toLowerCase().replaceAll(",", "-").replaceAll(" ", "-");
    const data = JSON.parse(read(`en/_assets/scriptures/en/${slug}.json`));
    const [, , first, last = first] = reference.split(",");
    assert.deepEqual(data.verses.map(([v]) => v),
      Array.from({length: Number(last) - Number(first) + 1}, (_, i) => Number(first) + i), slug);
  }
});

test("Romans 3:23-25 includes verse 24 and preserves existing NIV verses verbatim", () => {
  const range = JSON.parse(read("en/_assets/scriptures/en/romans-3-23-25.json"));
  assert.equal(range.version, "NIV");
  assert.match(range.source, /^https:\/\/www\.biblegateway\.com\//);
  for (const number of [23, 24, 25]) {
    const single = JSON.parse(read(`en/_assets/scriptures/en/romans-3-${number}.json`));
    assert.deepEqual(range.verses.find(([v]) => v === number), single.verses[0]);
  }
});

test("New scripture ranges reuse the existing library verbatim", () => {
  for (const [target, source, first, last] of [
    ["acts-2-36-37", "acts-2-36-41", 36, 37],
    ["romans-6-1-4", "romans-6-1-8", 1, 4],
    ["colossians-2-12", "colossians-2-11-12", 12, 12],
  ]) {
    const original = JSON.parse(read(`en/_assets/scriptures/en/${source}.json`));
    const actual = JSON.parse(read(`en/_assets/scriptures/en/${target}.json`));
    assert.deepEqual(actual.verses, original.verses.filter(([v]) => v >= first && v <= last));
  }
});

test("English-only availability and independent Journal/navigation identities", () => {
  const language = read("_assets/js/language.js");
  assert.equal(language.split(`"${study}"`).length - 1, 1);
  for (const locale of ["es", "fr", "pt", "pt-eu", "zh"]) {
    assert.equal(existsSync(resolve(root, locale, study)), false, locale);
  }
  for (const path of ["en/_assets/js/journal.js", "en/toc/toc-journal.js", "en/_assets/js/study-nav.js"]) {
    const source = read(path);
    assert.ok(source.includes(`'${study}'`), path);
    assert.ok(source.includes("'light-darkness'"), path);
  }
});

test("Scripture controls are keyboard accessible and the modal supports Escape", () => {
  const logic = read(`en/${study}/logic.js`);
  assert.match(logic, /setAttribute\("role", "button"\)/);
  assert.match(logic, /setAttribute\("tabindex", "0"\)/);
  assert.match(logic, /event.key === "Enter"/);
  assert.match(logic, /event.key === " "/);
  assert.doesNotMatch(page, /data-bs-keyboard="false"/);
  assert.match(page, /aria-label="Table of contents"/);
});

test("Generated offline worker includes the study, all diagrams and local scripture subsets", () => {
  const worker = read("sw.js");
  for (const suffix of [
    "index.html", "style.css", "logic.js", "i18n/en.json", "i18n/en-decorations.json",
    "img/wall-of-sin.png", "img/all-have-sinned.png", "img/wages-and-gift.png", "img/baptism.png",
  ]) assert.ok(worker.includes(`"url":"en/${study}/${suffix}"`), suffix);
  for (const slug of ["acts-2-36-37", "romans-6-1-4", "colossians-2-12", "romans-3-24", "romans-3-23-25"]) {
    assert.ok(worker.includes(`"url":"en/_assets/scriptures/en/${slug}.json"`), slug);
  }
});
