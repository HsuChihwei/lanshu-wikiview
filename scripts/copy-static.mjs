import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const standaloneDir = resolve(root, ".next", "standalone");
const staticSrc = resolve(root, ".next", "static");
const staticDst = resolve(standaloneDir, ".next", "static");
const publicSrc = resolve(root, "public");
const publicDst = resolve(standaloneDir, "public");

if (!existsSync(standaloneDir)) {
  console.error(".next/standalone not found. Run `next build` first.");
  process.exit(1);
}

if (existsSync(staticSrc) && !existsSync(staticDst)) {
  console.log("Copying .next/static → .next/standalone/.next/static");
  cpSync(staticSrc, staticDst, { recursive: true });
}

if (existsSync(publicSrc) && !existsSync(publicDst)) {
  console.log("Copying public → .next/standalone/public");
  cpSync(publicSrc, publicDst, { recursive: true });
}

console.log("Static assets copied.");
