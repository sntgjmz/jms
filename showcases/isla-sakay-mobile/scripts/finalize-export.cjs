const fs = require('node:fs');
const path = require('node:path');

const outputDirectory = path.resolve(__dirname, '../dist');
const indexPath = path.join(outputDirectory, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
// Normalize file-based entry links before Expo Router reads the URL.
html = html.replace('<head>', `<head><script>const demoPath='/demos/isla-sakay-mobile/';const demoStart=location.pathname.indexOf(demoPath);if(demoStart>=0&&(location.pathname.endsWith('/app.html')||location.pathname.endsWith('/index.html'))){history.replaceState({},'',location.pathname.slice(0,demoStart)+demoPath+location.search+location.hash)}</script>`);
html = html.replace(/<title>.*?<\/title>/, '<title>Isla Sakay — Mobile Frontend Demo</title>');
fs.writeFileSync(indexPath, html);

// Vite treats URLs containing node_modules as dependency requests. Exported
// font and navigation assets need an ordinary static path for the portfolio.
const dependencyAssets = path.join(outputDirectory, 'assets', 'node_modules');
const vendorAssets = path.join(outputDirectory, 'assets', 'vendor');
for (const assetDirectory of [dependencyAssets, vendorAssets]) {
  if (!assetDirectory.startsWith(outputDirectory + path.sep)) {
    throw new Error('Generated asset paths must stay within the mobile export.');
  }
}
if (fs.existsSync(dependencyAssets)) {
  if (fs.existsSync(vendorAssets)) fs.rmSync(vendorAssets, { recursive: true, force: true });
  fs.renameSync(dependencyAssets, vendorAssets);
}
function rewriteAssetPaths(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) rewriteAssetPaths(filename);
    else if (/\.(?:js|css|html|json)$/.test(entry.name)) {
      const original = fs.readFileSync(filename, 'utf8');
      const updated = original.replaceAll('/assets/node_modules/', '/assets/vendor/');
      if (updated !== original) fs.writeFileSync(filename, updated);
    }
  }
}
rewriteAssetPaths(outputDirectory);
console.log('Prepared standalone mobile demo entry.');
