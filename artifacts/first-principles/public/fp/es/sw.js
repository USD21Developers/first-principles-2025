/* Legacy language-scope migration worker. New pages register /fp/sw.js only. */
"use strict";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    await Promise.all(clients
      .filter((client) => client.url.startsWith(self.registration.scope))
      .map((client) => client.navigate(client.url)));
  })());
});