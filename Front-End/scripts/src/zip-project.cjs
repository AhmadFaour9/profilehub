const JSZip = require("/home/runner/workspace/node_modules/.pnpm/jszip@3.10.1/node_modules/jszip");
const fs = require("fs");
const path = require("path");

const EXCLUDE = new Set(["node_modules", ".git", "dist", ".vite", ".turbo", "coverage", ".local"]);
const ROOT = "/home/runner/workspace";
const OUT = "/tmp/profilehub.zip";

const zip = new JSZip();

function addDir(dir, base) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (EXCLUDE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const arc = base ? base + "/" + e.name : e.name;
    if (e.isDirectory()) {
      addDir(full, arc);
    } else {
      zip.file("profilehub/" + arc, fs.readFileSync(full));
    }
  }
}

console.log("Collecting files...");
addDir(ROOT, "");

console.log("Compressing...");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } })
  .then((buf) => {
    fs.writeFileSync(OUT, buf);
    const mb = (buf.length / 1024 / 1024).toFixed(1);
    console.log(`Done — ${mb} MB → ${OUT}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
