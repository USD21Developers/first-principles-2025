import { defineConfig } from "vite";
import path from "path";
import { readFileSync } from "node:fs";
import type { ViteDevServer } from "vite";

const rawPort = process.env.PORT || "21405";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

function readCss(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export default defineConfig({
  base: basePath,
  root: path.resolve(import.meta.dirname, "public"),
  publicDir: false,
  appType: "mpa",
  plugins: [
    {
      name: "inline-css-dev",
      apply: "serve",
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url || "").split("?")[0];
          const isWorker = pathname === "/fp/sw.js" || /^\/fp\/[^/]+\/sw\.js$/.test(pathname);
          const isHtml = pathname.endsWith("/") || pathname.endsWith(".html");

          if (isWorker || isHtml) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else {
            res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
          }
          if (isWorker) res.setHeader("Service-Worker-Allowed", "/fp/");
          next();
        });
      },
      transformIndexHtml(html, ctx) {
        const htmlDir = path.dirname(ctx.filename);
        return html.replace(
          /<link\b[^>]+\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+\.css)["'][^>]*(?:\/)?>[ \t]*\n?/g,
          (fullTag, href) => {
            const cssPath = href.startsWith("/")
              ? path.join(import.meta.dirname, "public", href)
              : path.resolve(htmlDir, href);
            const css = readCss(cssPath);
            return css ? `<style>${css}</style>\n` : fullTag;
          },
        );
      },
    },
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, "dist", "public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
