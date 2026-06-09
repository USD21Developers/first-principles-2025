import { defineConfig } from "vite";
import path from "path";
import fs from "node:fs/promises";

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

export default defineConfig({
  base: basePath,
  root: path.resolve(import.meta.dirname, "public"),
  publicDir: false,
  appType: "mpa",
  plugins: [
    {
      name: "serve-css-as-plain-text",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url;
          if (!url || !url.match(/\.css(\?|$)/)) {
            return next();
          }
          const urlPath = decodeURIComponent(url.split("?")[0]);
          const filePath = path.join(
            import.meta.dirname,
            "public",
            urlPath,
          );
          try {
            const content = await fs.readFile(filePath, "utf-8");
            res.setHeader("Content-Type", "text/css; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            res.end(content);
          } catch {
            next();
          }
        });
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
