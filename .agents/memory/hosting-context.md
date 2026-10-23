---
name: Hosting context
description: User-stated production hosting and distribution constraints for First Principles.
---

The user states that production runs at `usd21.app` on an AlmaLinux server in shared cPanel hosting. The app is also registered in the Apple App Store and Google Play. The app does not need a login.

**Why:** These are the user's production environment and distribution requirements, not a Replit-hosted deployment.

**How to apply:** Investigate external Apache/cPanel routing and legacy browser caches when diagnosing production entry URLs. Preserve store identities and do not add authentication to remember a language.
