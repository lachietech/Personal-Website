import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const watch = process.argv.includes("--watch");
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}

function run(directory, args) {
  const child = spawn(process.execPath, args, {
    cwd: path.join(root, directory),
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  child.once("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.once("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
}

run("backend", [...(watch ? ["--watch"] : []), "server.js"]);
run("frontend", [...(watch ? ["--watch"] : []), "server/server.js"]);
if (watch)
  run("frontend", [
    path.join(root, "node_modules/vite/bin/vite.js"),
    "build",
    "--watch",
    "--mode",
    "development",
  ]);
process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
