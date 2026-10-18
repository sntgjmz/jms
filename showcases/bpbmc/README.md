# BPBMC frontend showcase

This independent static showcase preserves the original Blessed Paul Bernard Medical Clinic website's HTML, styles, branding images, and layouts. The original system was built in PHP with MySQL and browser JavaScript. Its public website and Admin, Staff, Doctor, and Patient interfaces are represented by 58 sanitized UI pages.

No PHP server or database is needed for this copy. All patients, appointments, medical placeholders, bills, accounts, and activity logs come from fictional browser-memory fixtures. Local edits can be explored across screens and reset when the outer page reloads or the Reset control is used. This is a frontend demonstration; authentication, clinical documents, payments, email, and database backup/restore are simulated.

The original `bpbmc/` project is not a runtime or build dependency. Private documents, uploaded results/IDs, configuration, database files, backend libraries, original server handlers, and Git metadata were excluded. The original folder is left untouched. Keep a separate copy if you need the original backend.

From the portfolio root:

```powershell
npm.cmd run build:bpbmc-demo
npm.cmd run dev
```

Open `/demos/bpbmc/index.html#/main-admin`. The toolbar switches between Public website, Admin, Staff, Doctor, and Patient; the Screen selector exposes each role's pages. Screen navigation changes the outer hash, so browser refresh and static hosting need no rewrite rules.

- `pages/`: editable, sanitized original HTML templates.
- `resources/css/`, `resources/images/`: copied original design assets.
- `resources/vendor/`: local browser libraries and fonts with upstream licenses/attribution.
- `demo/fixtures.js`: editable fictional records.
- `demo/runtime.js`, `demo/demo.css`: local sample interactions and browser/responsive adjustments.
- `demo/shell.js`, `demo/shell.css`, `index.html`: showcase toolbar, routing, and shared in-memory state.
- `routes.json`: original UI page titles, roles, and provenance filenames.

`npm.cmd run build:bpbmc-demo` validates and copies only this independent source into `public/demos/bpbmc/`. The normal portfolio `npm.cmd run build` includes the generated bundle in `dist/`. No extra dependency installation is required for this static demo.

`scripts/extract-bpbmc.mjs` is a one-time source extraction helper and requires the original reference folder only if you deliberately re-extract templates. Normal builds never call it. Re-extraction overwrites `pages/`; edit the independent templates directly for later changes.
