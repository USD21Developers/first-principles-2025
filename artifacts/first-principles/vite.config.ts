import { defineConfig } from "vite";
import path from "path";
import { readFileSync } from "node:fs";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

const cssCache = new Map<string, string>();

function readCss(filePath: string): string {
  if (cssCache.has(filePath)) return cssCache.get(filePath)!;
  try {
    const content = readFileSync(filePath, "utf-8");
    cssCache.set(filePath, content);
    return content;
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
    outDir: path.resolve(import.meta.dirname, "dist"),
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
