import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(artifactRoot, "public", "fp");
const destination = path.join(artifactRoot, "dist", "public", "fp");

await rm(destination, { recursive: true, force: true });
await mkdir(path.dirname(destination), { recursive: true });
await cp(source, destination, {
  recursive: true,
  filter: (sourcePath) => !sourcePath.split(path.sep).includes("node_modules"),
});

console.log("Copied First Principles static files to dist/public/fp.");