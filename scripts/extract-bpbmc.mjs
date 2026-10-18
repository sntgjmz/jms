// One-time extraction helper. Normal demo/portfolio builds never use the PHP reference.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reference = join(root, 'bpbmc');
const target = join(root, 'showcases', 'bpbmc');
const publicPages = new Set(['index.php', 'patient.php', 'clinic.php', 'register.php', 'registered.php', 'forgot-password.php', 'change-password.php']);
const candidates = readdirSync(reference).filter(name => /^main-(?:admin|staff|doctor|patient)(?:-[\w-]+)?\.php$/i.test(name) || publicPages.has(name));
mkdirSync(join(target, 'pages'), { recursive: true });

function marker(block) {
  const expression = block.replace(/^<\?(?:php|=)?/i, '').replace(/\?>$/, '').trim();
  if (expression.length > 380 || /\b(?:if|while|foreach|require|include|session_start|mysqli|header|function|try)\b/.test(expression)) return '';
  if (!block.startsWith('<?=') && !/^echo\b/i.test(expression)) return '';
  if (/['"](?:selected|checked|disabled)['"]/.test(expression)) return '';
  const keys = [...expression.matchAll(/\[['"]([\w-]+)['"]\]/g)].map(match => match[1]);
  const variables = [...expression.matchAll(/\$([\w]+)/g)].map(match => match[1]);
  const field = keys.length > 1 && keys.every(key => /name/.test(key)) ? 'full_name' : keys.at(-1) ?? variables.at(-1);
  if (!field || /password|token|secret/i.test(field)) return '';
  return `__DEMO_${field}__`;
}

function localDependency(url) {
  if (/bootstrap.*\.css/.test(url)) return 'resources/vendor/bootstrap/bootstrap.min.css';
  if (/boxicons/.test(url)) return 'resources/vendor/boxicons/css/boxicons.min.css';
  if (/font-awesome|fontawesome/.test(url)) return 'resources/vendor/fontawesome/css/all.min.css';
  if (/unicons/.test(url)) return 'resources/vendor/unicons/css/line.css';
  return null;
}

const routes = [];
for (const name of candidates) {
  const original = readFileSync(join(reference, name), 'utf8');
  if (!/<html\b/i.test(original)) continue;
  const route = name.replace(/\.php$/i, '');
  const role = route.match(/^main-(admin|staff|doctor|patient)/)?.[1] ?? 'public';
  let html = original
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<\?(?:php|=)?[\s\S]*?\?>/gi, marker)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(class=["']carousel-inner["'][^>]*>)\x60/g, '$1')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+data-(?:password|password-reset-token)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*['"]refresh['"][^>]*>/gi, '')
    .replace(/\s+(?:integrity|crossorigin|referrerpolicy)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '<figure class="demo-location"><img src="resources/images/pasig-branch.png" alt="Original clinic branch photograph"><figcaption>Branch location preview · interactive maps are disabled in this frontend showcase.</figcaption></figure>')
    .replace(/<link\b[^>]*>/gi, tag => {
      const url = tag.match(/href\s*=\s*['"]([^'"]+)['"]/i)?.[1];
      if (!url) return tag;
      if (/^(?:https?:)?\/\//.test(url)) {
        const replacement = localDependency(url);
        return replacement ? `<link rel="stylesheet" href="${replacement}">` : '';
      }
      return tag.replace(/rel="website icon"/i, 'rel="icon"').replace(url, url.split('?')[0]);
    })
    .replace(/<form\b([^>]*)>/gi, (tag, attributes) => {
      const action = attributes.match(/action\s*=\s*['"]([^'"]*)['"]/i)?.[1] ?? '';
      attributes = attributes.replace(/\s*(?:action|method|enctype)\s*=\s*['"][^'"]*['"]/gi, '');
      return `<form${attributes} action="#" data-demo-action="${action.split('?')[0].replace(/[^\w.-]/g, '')}">`;
    })
    .replace(/<a\b([^>]*)>/gi, (tag, attributes) => {
      const href = attributes.match(/href\s*=\s*['"]([^'"]*)['"]/i)?.[1];
      if (!href) return tag;
      let destination = href.trim().split('?')[0].replace(/^\.\//, '');
      if (destination === 'backup.php') destination = 'main-admin-backup-restore.php';
      if (destination === 'backup.html') destination = 'main-admin-backup-restore.php';
      if (destination === 'transaction_log.html') destination = 'main-admin-transaction-log.php';
      if (destination === 'main-admin-transcation-log.php') destination = 'main-admin-transaction-log.php';
      if (destination === 'main-staff-activitylog.php') destination = 'main-staff-activity-log.php';
      if (/logout-(?:clinic|patient)\.php/.test(destination)) destination = role === 'patient' ? 'patient.php' : 'clinic.php';
      const known = candidates.includes(destination);
      if (known && /\.php$/i.test(destination)) {
        const next = destination.replace(/\.php$/i, '');
        attributes = attributes.replace(/href\s*=\s*['"][^'"]*['"]/i, `href="#/${next}"`).replace(/\s+target\s*=\s*['"][^'"]*['"]/gi, '');
        return `<a${attributes} data-demo-route="${next}">`;
      }
      if (/\.php|\.pdf|\.sql|\.xlsx?|^(?:https?:|mailto:|tel:|javascript:)/i.test(href) || /__DEMO_/.test(href)) {
        attributes = attributes.replace(/href\s*=\s*['"][^'"]*['"]/i, 'href="#"').replace(/\s+target\s*=\s*['"][^'"]*['"]/gi, '');
        return `<a${attributes} data-demo-action="${/pdf|medical.*result/i.test(href) ? 'sample-document' : 'simulation'}">`;
      }
      return tag;
    })
    .replace(/\bsrc\s*=\s*(['"])([^'"]+)\1/gi, (tag, quote, url) => {
      if (/itsme\.jpg|__DEMO_|^(?:https?:)?\/\//i.test(url) || /(?:verification|PDF_MEDICALRESULT|pdf\/)/i.test(url)) return 'src="resources/images/icon1.png"';
      return tag;
    })
    .replace(/\b(data-password|password-reset-token)\b/gi, 'demo-omitted');
  // The original patient login closes its head after its body. Keep its design
  // while fixing document structure for ordinary static browser parsing.
  if (html.search(/<body\b/i) < html.search(/<\/head>/i)) {
    html = html.replace(/<\/head>/i, '').replace(/<body\b/i, '</head>\n<body');
  }
  if (!/<\/html>/i.test(html)) html += '\n</html>\n';
  if (/add-appointment/.test(route)) html = html.replace(/<title>.*?<\/title>/is, '<title>Add Appointment</title>');
  html = html.replace(/<head\b[^>]*>/i, `<head>\n<base href="../">\n<meta name="robots" content="noindex,nofollow">\n<link rel="stylesheet" href="resources/vendor/fonts/fonts.css">`);
  html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="demo/demo.css">\n</head>');
  html = html.replace(/<body\b([^>]*)>/i, `<body$1 data-demo-page="${route}" data-demo-role="${role}">`);
  html = html.replace(/<\/body>/i, '<script src="resources/vendor/bootstrap/bootstrap.bundle.min.js"></script>\n<script src="resources/library/swiper/swiper-bundle.min.js"></script>\n<script type="module" src="demo/runtime.js"></script>\n</body>');
  if (/<\?(?:php|=)/i.test(html) || /mysqli_|\bSELECT\s+.+FROM\b/i.test(html)) throw new Error(`PHP/backend text remained in ${name}.`);
  const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.trim() ?? route;
  writeFileSync(join(target, 'pages', `${route}.html`), html, 'utf8');
  routes.push({ route, role, title, source: name });
}
writeFileSync(join(target, 'routes.json'), JSON.stringify(routes, null, 2) + '\n');
console.log(`Extracted ${routes.length} sanitized UI pages. Original PHP and runtime records were not copied.`);
