# Isla Sakay frontend showcase

This independent React + Vite app preserves the original Isla Sakay frontend design and management screens. It uses fictional in-memory records for a portfolio demonstration. No database, backend, account credentials, payment services, or original deployment configuration are needed.

From the portfolio root, run `npm run build:isla-demo` to build this app and refresh `public/demos/isla-sakay/`. Then run the portfolio's usual development or build command. The demo opens at `/demos/isla-sakay/index.html#/dashboard`; the original public website design is at `/demos/isla-sakay/index.html#/home`. The explicit HTML path also works in the portfolio's Vite development server.

To work on the demo separately, run `npm ci` and `npm run dev` in this directory. Vite uses relative asset paths and hash routes so the built frontend can be served as a static subdirectory.

Sample records and supported local interactions live in `src/demo/`. Changes reset when the page reloads. The demo starts with a fictional administrator so visitors can explore without logging in.

The original `Isla-Sakay/` directory is not referenced by this copy. Once the standalone showcase is confirmed, removing that original folder does not affect this demo.
