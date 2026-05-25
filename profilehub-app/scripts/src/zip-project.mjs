import { createWriteStream } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const archiver = require("/home/runner/workspace/node_modules/.pnpm/archiver@8.0.0/node_modules/archiver/index.js");

const EXCLUDE = new Set(["node_modules", ".git", "dist", ".vite", ".turbo", "coverage", ".local"]);
const OUT = "/tmp/profilehub.zip";
const ROOT = "/home/runner/workspace";

const output = createWriteStream(OUT);
const archive = archiver("zip", { zlib: { level: 6 } });

output.on("close", () => {
  const mb = (archive.pointer() / 1024 / 1024).toFixed(1);
  console.log(`Done — ${mb} MB → ${OUT}`);
});
archive.on("error", (err) => { throw err; });
archive.pipe(output);

async function addDir(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (EXCLUDE.has(e.name)) continue;
    const full = join(dir, e.name);
    const arc = join(base, e.name);
    if (e.isDirectory()) await addDir(full, arc);
    else archive.file(full, { name: arc });
  }
}

await addDir(ROOT, "profilehub");
await archive.finalize();
