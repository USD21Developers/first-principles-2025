import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const entryScript = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/)[1];
const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

async function runEntry(language, { denied = false, scopes = [] } = {}) {
  let destination;
  const registrations = [];
  const window = {
    localStorage: {
      getItem(key) {
        assert.equal(key, "fpLanguage");
        if (denied) throw new Error("Storage denied");
        return language;
      },
    },
    location: {
      origin: "https://usd21.app",
      search: "?utm_platform=ios",
      hash: "#start",
      replace(url) { destination = url; },
    },
  };
  const navigator = {
    serviceWorker: {
      async getRegistrations() { return scopes.map((scope) => ({ scope })); },
      async register(url, options) { registrations.push({ url, options }); },
    },
  };
  vm.runInNewContext(entryScript, { window, navigator, console });
  await new Promise((resolve) => setImmediate(resolve));
  return { destination, registrations };
}

for (const code of ["en", "es", "fr", "pt", "pt-eu", "zh"]) {
  test(`saved ${code} enters its canonical TOC and preserves URL state`, async () => {
    const result = await runEntry(code);
    assert.equal(result.destination, `fp/${code}/toc/?utm_platform=ios#start`);
    assert.equal(result.registrations.length, 0);
  });
}

test("missing, invalid, and inaccessible preferences retain the selector", async () => {
  for (const language of [null, "", "pt-BR", "pt-PT", "../toc"]) {
    assert.equal((await runEntry(language)).destination, "fp/?utm_platform=ios#start");
  }
  assert.equal((await runEntry("en", { denied: true })).destination, "fp/?utm_platform=ios#start");
});

test("entry migrates only an existing root registration", async () => {
  const current = await runEntry("en", { scopes: ["https://usd21.app/fp/"] });
  assert.equal(current.registrations.length, 0);
  const legacy = await runEntry("en", {
    scopes: ["https://usd21.app/", "https://usd21.app/fp/"],
  });
  assert.equal(legacy.registrations.length, 1);
  assert.equal(legacy.registrations[0].url, "sw.js");
  assert.equal(legacy.registrations[0].options.updateViaCache, "none");
});

async function runWorker(scope) {
  const handlers = {};
  const navigations = [];
  let unregistered = false;
  let skippedWaiting = false;
  const self = {
    location: { origin: "https://usd21.app" },
    registration: {
      scope,
      async unregister() { unregistered = true; },
    },
    skipWaiting() { skippedWaiting = true; },
    addEventListener(name, handler) { handlers[name] = handler; },
    clients: {
      async matchAll() {
        return [
          "/", "/index.html", "/toc/", "/fp/en/toc/", "/fp/es/word/", "/word/", "/other/",
        ].map((pathname) => ({
          url: `https://usd21.app${pathname}?utm_platform=ios#start`,
          async navigate(url) { navigations.push(url); },
        }));
      },
    },
  };
  // No caches, storage, or fetch APIs: accessing them fails this test.
  vm.runInNewContext(worker, { self, URL, console });
  handlers.install();
  let activation;
  handlers.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  return { handlers, navigations, unregistered, skippedWaiting };
}

test("root worker retires itself without clearing data or intercepting fetches", async () => {
  const result = await runWorker("https://usd21.app/");
  assert.equal(result.unregistered, true);
  assert.equal(result.skippedWaiting, true);
  assert.equal(result.handlers.fetch, undefined);
  assert.equal(result.navigations.length, 3);
  assert.ok(result.navigations.every((url) => url === "https://usd21.app/?utm_platform=ios#start"));
});

test("migration worker cannot retire the current /fp/ registration", async () => {
  const result = await runWorker("https://usd21.app/fp/");
  assert.equal(result.unregistered, false);
  assert.equal(result.navigations.length, 0);
});
