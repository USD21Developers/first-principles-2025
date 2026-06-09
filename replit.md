# First Principles

A multilingual Bible study series web app (USD21 / First Principles 2025), imported from [GitHub](https://github.com/USD21Developers/first-principles-2025.git). Served as a static site via Vite.

## Run & Operate

- `pnpm --filter @workspace/first-principles run dev` — serve the static site (port assigned by Replit)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Static HTML/CSS/JS (plain, no framework) served by Vite dev server
- Service Worker / PWA: Workbox (pre-built in `public/fp/`)
- API: Express 5 (unused currently)
- DB: PostgreSQL + Drizzle ORM (unused currently)

## Where things live

- `artifacts/first-principles/public/fp/` — all static site content (HTML, CSS, JS, images, SW)
- `artifacts/first-principles/index.html` — root redirect to `/fp/`
- `artifacts/first-principles/vite.config.ts` — Vite static file server config
- `lib/api-spec/openapi.yaml` — API contract (health check only)

## Architecture decisions

- The site is pure static HTML/CSS/JS — no React or build transpilation needed. Vite is used purely as a dev server and for production `serve`.
- All static files from the repo live in `public/` so Vite serves them as-is without transformation.
- Root `index.html` does an instant meta-refresh redirect to `/fp/`, matching the upstream repo's behaviour.

## Product

A multilingual (English, Spanish, French, Portuguese, Chinese) Bible study series app. Supports offline use via a service worker / PWA. Available languages are in `public/fp/en`, `es`, `fr`, `pt`, `pt-eu`, `zh`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The service worker scope is `/fp/` — do not move the SW files from `public/fp/`.
- The `public/fp/` directory is ~86 MB (images, multi-language content). Don't accidentally wipe it.
- `pnpm --filter @workspace/db run push` requires `DATABASE_URL` — provision a DB first if needed.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
