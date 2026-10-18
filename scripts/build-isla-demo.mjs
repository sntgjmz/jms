import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const showcase = join(workspace, "showcases", "isla-sakay");
const demoParent = join(workspace, "public", "demos");
const destination = resolve(demoParent, "isla-sakay");

// The copied frontend is the only build input. The original Isla-Sakay folder
// can be removed without affecting this script or the resulting portfolio.
const commands = [
  [join(showcase, "node_modules", "typescript", "bin", "tsc"), "-b"],
  [join(showcase, "node_modules", "vite", "bin", "vite.js"), "build"],
];

for (const command of commands) {
  if (!existsSync(command[0])) {
    console.error(
      "Install demo dependencies first: npm.cmd ci --prefix showcases/isla-sakay",
    );
    process.exit(1);
  }
  const result = spawnSync(process.execPath, command, {
    cwd: showcase,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const built = join(showcase, "dist");
if (!existsSync(join(built, "index.html")))
  throw new Error("The demo build has no index.html.");

// Verify the absolute target before replacing this generated output directory.
if (relative(resolve(demoParent), destination) !== "isla-sakay") {
  throw new Error("Demo output must stay within public/demos/isla-sakay.");
}
mkdirSync(demoParent, { recursive: true });
rmSync(destination, { recursive: true, force: true });
cpSync(built, destination, { recursive: true });

function rejectPrivateFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (/^\.env(?:\.|$)|^\.git$|\.(?:sql|key|pem)$/i.test(entry.name)) {
      throw new Error(
        `Unexpected private/source file in demo output: ${entry.name}`,
      );
    }
    if (entry.isDirectory()) rejectPrivateFiles(join(directory, entry.name));
  }
}
rejectPrivateFiles(destination);
console.log("Isla Sakay frontend demo ready at public/demos/isla-sakay/.");
