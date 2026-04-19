/**
 * Copy docs/words_alpha.txt into dist/resource/ after tsc (for runtime loading).
 */
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, "..");
const repoRoot = join(serverRoot, "..", "..");
const src = join(repoRoot, "docs", "words_alpha.txt");
const destDir = join(serverRoot, "dist", "resource");
const dest = join(destDir, "words_alpha.txt");

if (!existsSync(src)) {
  console.error(`copy-words: missing source file: ${src}`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`copy-words: ${src} -> ${dest}`);
