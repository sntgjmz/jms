import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'showcases', 'bpbmc');
const parent = resolve(root, 'public', 'demos');
const destination = resolve(parent, 'bpbmc');
for (const file of ['index.html','demo/shell.js','demo/runtime.js','demo/fixtures.js','demo/demo.css','routes.json','resources/vendor/fonts/fonts.css']) {
  if (!existsSync(join(source, file))) throw new Error(`Missing independent demo file: ${file}`);
}
function check(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const path = join(directory,entry.name);
    if(entry.isSymbolicLink()) throw new Error('The BPBMC demo must not rely on symlinks.');
    if(entry.isDirectory()) { check(path); continue; }
    if(/^\.env|^\.git$|\.(?:php|sql|db|sqlite|pem|key)$/i.test(entry.name)) throw new Error(`Unexpected server/private file: ${path}`);
    if(/\.(?:html|js|css)$/.test(entry.name)) {
      const text = readFileSync(path,'utf8');
      if(/<\?(?:php|=)/i.test(text) || /\b(?:mysqli_connect|new\s+PDO)\b/.test(text)) throw new Error(`Backend code in ${path}`);
      if(/(?:src|href)\s*=\s*['"]https?:\/\//i.test(text) || /@import\s+url\(['"]?https?:/i.test(text)) throw new Error(`Remote runtime dependency in ${path}`);
    }
  }
}
check(source);
if(relative(parent,destination) !== 'bpbmc') throw new Error('The generated target must stay within public/demos/bpbmc.');
mkdirSync(parent,{recursive:true});
rmSync(destination,{recursive:true,force:true});
mkdirSync(destination,{recursive:true});
for(const entry of ['index.html','routes.json','demo','pages','resources']) cpSync(join(source,entry),join(destination,entry),{recursive:true});
console.log('BPBMC frontend ready at public/demos/bpbmc/index.html#/main-admin. No PHP server or database required.');
