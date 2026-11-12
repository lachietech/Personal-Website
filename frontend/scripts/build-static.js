import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
export function copyStaticFiles() {
  mkdirSync(dist, { recursive: true });
  cpSync(path.join(root, "public"), dist, {
    recursive: true,
    filter: (source) => source !== path.join(root, "public/static/react"),
  });
  cpSync(path.join(root, "src/assets"), path.join(dist, "static"), {
    recursive: true,
  });
}
