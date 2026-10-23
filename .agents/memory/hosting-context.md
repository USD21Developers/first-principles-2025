---
name: Hosting context
description: User-stated production hosting and distribution constraints for First Principles.
---

The user states that production runs at `usd21.app` on an AlmaLinux server in shared cPanel hosting. The app is also registered in the Apple App Store and Google Play. The app does not need a login.

**Why:** These are the user's production environment and distribution requirements, not a Replit-hosted deployment.

**How to apply:** Investigate external Apache/cPanel routing and legacy browser caches when diagnosing production entry URLs. Preserve store identities and do not add authentication to remember a language.

Retain a migration-only worker at the legacy root worker URL; the application worker must remain scoped to `/fp/`. Do not remove the migration endpoint just because current clients no longer register a root worker.

**Why:** Dormant installations can retain an old root-scoped worker that intercepts the entry page before new page logic runs. Revalidation headers on current HTML do not bypass that worker, and a broken legacy worker endpoint prevents its replacement.

**How to apply:** Keep migration responses reachable as JavaScript, preserve user storage, and include root migration assets in the external server pull process without overwriting its server-specific Apache configuration.
