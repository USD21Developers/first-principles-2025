import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/fp/", import.meta.url));
const locales = ["en", "es", "fr", "pt", "pt-eu", "zh"];

/** Validate complete, ordered single-chapter verse coverage, not just file presence. */
export function validatePassage(data, slug, language) {
  const errors = [];
  const match = /^(.+?)-(\d+)-(\d+)(?:-(\d+))?$/.exec(slug);
  if (!match) return ["unsupported passage filename"];
  const [, book, chapter, first, last = first] = match;
  if (data.slug !== slug) errors.push("slug differs from filename");
  if (data.language !== language) errors.push("language differs from library directory");
  if (data.chapter !== Number(chapter)) errors.push("chapter differs from filename");
  if (data.book?.toLowerCase().replaceAll(" ", "-") !== book) errors.push("book differs from filename");
  if (!data.version || !data.display) errors.push("missing version or display label");
  const verses = data.verses;
  if (!Array.isArray(verses) || !verses.every((v) =>
    Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]) &&
    typeof v[1] === "string")) {
    return [...errors, "invalid verse data"];
  }
  if (verses.some(([, text]) => !text.trim())) {
    errors.push("empty verse text: verify whether this is an intentional translation omission");
  }
  const expected = Array.from({ length: Math.max(0, Number(last) - Number(first) + 1) },
    (_, i) => Number(first) + i);
  if (!expected.length || JSON.stringify(verses.map(([n]) => n)) !== JSON.stringify(expected)) {
    errors.push("verse sequence is incomplete, duplicated or out of order");
  }
  return errors;
}

function filesBelow(directory, filename) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path, filename)
      : filename(entry.name) ? [path] : [];
  });
}

export function auditScriptures({ locale, study } = {}) {
  const report = { libraries: [], references: 0, issues: [] };
  const issue = (path, problem) => report.issues.push({
    path: relative(root, path), problem,
  });
  const selected = locale ? [locale] : locales;
  if (selected.some((value) => !locales.includes(value))) throw new Error("Unknown locale");
  for (const routeLocale of selected) {
    const directory = resolve(root, routeLocale);
    // Read the HTML lang value: pt-eu intentionally uses the pt scripture library.
    const pages = filesBelow(directory, (name) => name === "index.html")
      .filter((path) => !study || relative(directory, path) === `${study}/index.html`);
    if (study && pages.length === 0) {
      issue(resolve(directory, study, "index.html"), "study page not found");
    }
    const libraries = new Map();
    for (const path of pages) {
      const html = readFileSync(path, "utf8");
      const language = /<html\b[^>]*\blang=["']([^"']+)["']/i.exec(html)?.[1];
      if (!language) { issue(path, "missing HTML language"); continue; }
      const library = resolve(directory, "_assets/scriptures", language);
      if (!libraries.has(library)) libraries.set(library, new Set());
      const tags = html.replace(/<!--[\s\S]*?-->/g, "").match(/<[^>]*\bdata-scripture=["'][^>]+>/g) || [];
      for (const tag of tags) {
        report.references++;
        const reference = /\bdata-scripture=["']([^"']+)["']/.exec(tag)[1];
        const parts = reference.split(",");
        if (![3, 4].includes(parts.length) || !parts.slice(1).every((n) => /^\d+$/.test(n)) ||
            (parts.length === 4 && Number(parts[3]) < Number(parts[2]))) {
          issue(path, `unsupported reference: ${reference}`);
          continue;
        }
        const slug = reference.toLowerCase().replaceAll(",", "-").replaceAll(" ", "-");
        const passagePath = resolve(library, `${slug}.json`);
        if (existsSync(passagePath)) libraries.get(library).add(passagePath);
        if (/\bdata-scripture-offline=["']false["']/.test(tag)) {
          issue(path, `explicitly unavailable: ${slug}`);
        } else if (!existsSync(resolve(library, `${slug}.json`))) {
          issue(path, `missing passage: ${slug}`);
        }
      }
    }
    for (const [library, referencedFiles] of libraries) {
      const language = basename(library);
      const files = study ? [...referencedFiles].sort()
        : filesBelow(library, (name) => name.endsWith(".json"));
      const uniqueVerses = new Set();
      for (const path of files) {
        try {
          const data = JSON.parse(readFileSync(path, "utf8"));
          for (const error of validatePassage(data, basename(path, ".json"), language)) issue(path, error);
          for (const [verse] of Array.isArray(data.verses) ? data.verses : []) {
            uniqueVerses.add(`${data.book}:${data.chapter}:${verse}`);
          }
        } catch (error) {
          issue(path, `invalid passage JSON: ${error.message}`);
        }
      }
      report.libraries.push({ locale: routeLocale, language, files: files.length, uniqueVerses: uniqueVerses.size });
    }
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argument = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  const report = auditScriptures({ locale: argument("locale"), study: argument("study") });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.issues.length ? 1 : 0;
}
