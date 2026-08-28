---
name: Service-worker navigation requests
description: Browser constraints that matter when implementing navigation preload and offline cache lookup.
---

Do not construct a new `Request` with a changed URL while carrying over `mode: "navigate"`. Build a plain same-origin GET cache key instead. Also treat `event.preloadResponse` as a promise that can resolve to no response, and fall back to `fetch()`. When page code probes whether a cached document exists, probe its canonical queryless URL separately from the final state-preserving destination and validate the returned response path so a generic offline shell is not mistaken for the requested page.

**Why:** Chromium rejects invalid navigate-mode request construction by failing the entire fetch event with `ERR_FAILED`; an empty preload response can cause the same visible navigation failure. Programmatic fetches may retain query strings that navigation cache keys discard, and a generic offline fallback can return `200` for a missing route.

**How to apply:** For service-worker navigation handlers, await preload first, fetch when it is empty, and use a separately normalized non-navigation request only for cache lookup and storage. For client-side route availability checks, strip query/hash from the probe, preserve them on the eventual navigation URL, and compare normalized response/request paths.