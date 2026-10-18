import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const showcase = join(workspace, "showcases", "isla-sakay-mobile");
const demoParent = join(workspace, "public", "demos");
const destination = resolve(demoParent, "isla-sakay-mobile");
const commands = [
  [join(showcase, "node_modules", "typescript", "bin", "tsc"), "--noEmit"],
  [join(showcase, "node_modules", "expo", "bin", "cli"), "export", "--platform", "web", "--output-dir", "dist", "--max-workers", "2"],
  [join(showcase, "scripts", "finalize-export.cjs")],
];

for (const command of commands) {
  if (!existsSync(command[0])) {
    console.error("Install the mobile demo dependencies first: npm.cmd ci --prefix showcases/isla-sakay-mobile");
    process.exit(1);
  }
  const result = spawnSync(process.execPath, command, {
    cwd: showcase,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production", EXPO_OFFLINE: "1", CI: "1" },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const built = join(showcase, "dist");
if (!existsSync(join(built, "index.html"))) throw new Error("The mobile export has no index.html.");

function verifyOutput(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (/^\.env(?:\.|$)|^\.git$|^google-services\.json$|\.(?:sql|key|pem)$/i.test(entry.name)) {
      throw new Error(`Unexpected private/source file in mobile export: ${entry.name}`);
    }
    if (entry.isDirectory()) verifyOutput(join(directory, entry.name));
  }
}
verifyOutput(built);

// Verify the exact absolute target before replacing this generated directory.
if (relative(resolve(demoParent), destination) !== "isla-sakay-mobile") {
  throw new Error("Mobile output must stay within public/demos/isla-sakay-mobile.");
}
mkdirSync(demoParent, { recursive: true });
rmSync(destination, { recursive: true, force: true });
cpSync(built, destination, { recursive: true });
cpSync(join(built, "index.html"), join(destination, "app.html"));

// Expo Router can keep its native-style screen paths inside the frame. The
// visitor's outer URL always stays at a real static file, so refresh works on
// ordinary static hosting and the portfolio's Vite development server.
writeFileSync(join(destination, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#102736" />
    <link rel="icon" href="./favicon.ico" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="description" content="Explore Isla Sakay's original passenger and boat-operator mobile interfaces using fictional sample data." />
    <title>Isla Sakay — Mobile Frontend Demo</title>
    <style>html,body{width:100%;height:100%;margin:0;background:#102736;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}noscript{display:block;padding:24px;color:#edf3f8;font:16px/1.6 system-ui}a{color:#f0c988}</style>
  </head>
  <body>
    <iframe id="mobile-demo" title="Isla Sakay mobile app frontend — fictional sample data"></iframe>
    <noscript>This interactive frontend demo requires JavaScript. <a href="../../#work">Return to the portfolio</a>.</noscript>
    <script>
      const parameters = new URLSearchParams(location.search);
      const role = parameters.get('role');
      const app = new URL('./app.html', location.href);
      if (role === 'passenger' || role === 'operator') app.searchParams.set('role', role);
      document.getElementById('mobile-demo').src = app.pathname + app.search;
    </script>
  </body>
</html>
`, "utf8");
console.log("Isla Sakay mobile demos ready at public/demos/isla-sakay-mobile/index.html?role=passenger or operator.");
