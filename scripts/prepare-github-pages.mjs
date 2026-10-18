import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const basePath = process.env.BASE_PATH;

if (!basePath || !/^\/[^/]+\/$/.test(basePath)) {
  throw new Error("BASE_PATH must be a GitHub Pages project path such as /portfolio/.");
}

const mobileDemo = resolve(root, "dist", "demos", "isla-sakay-mobile");
const from = '"/demos/isla-sakay-mobile/';
const to = `"${basePath.slice(0, -1)}/demos/isla-sakay-mobile/`;

function rewrite(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      rewrite(target);
      continue;
    }
    if (!/\.(?:html|js|css|json)$/i.test(entry.name)) continue;
    const original = readFileSync(target, "utf8");
    const updated = original.replaceAll(from, to);
    if (updated !== original) writeFileSync(target, updated);
  }
}

if (!existsSync(mobileDemo) || relative(resolve(root, "dist"), mobileDemo).startsWith("..")) {
  throw new Error("Expected the built mobile demo inside dist/demos.");
}

rewrite(mobileDemo);
console.log(`Prepared the mobile demo for ${basePath}.`);
