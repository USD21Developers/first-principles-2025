/* Migration-only worker for installations predating the /fp/ application.
 * Keep this available at /sw.js so existing root registrations can update.
 * The application worker remains /fp/sw.js; no caches or user data are deleted.
 */
"use strict";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    if (self.registration.scope !== self.location.origin + "/") return;

    await self.registration.unregister();
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    await Promise.all(windows.map(async (client) => {
      const url = new URL(client.url);
      if (url.origin !== self.location.origin) return;
      // Only restart legacy entry pages. Do not interrupt studies, current /fp/
      // pages, store deep links, or unrelated pages on this shared origin.
      if (!["/", "/index.html", "/toc", "/toc/", "/toc/index.html"].includes(url.pathname)) return;
      try {
        // The network root page can read fpLanguage; service workers cannot.
        await client.navigate(self.location.origin + "/" + url.search + url.hash);
      } catch (error) {
        console.warn("Legacy entry page will migrate on its next navigation:", error);
      }
    }));
  })());
});

// Deliberately no fetch handler: never serve a cached legacy application.
