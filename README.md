# Jose Miguel Santiago — Web Developer & Virtual Assistant Portfolio

A responsive portfolio for web development and virtual assistance, built with React, TypeScript, Vite, and Tailwind CSS v4. The design includes a soft charcoal dark theme and a warm ivory light theme, with forest green, dusty peach accents, and editorial serif headings.

## Run locally

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. In Windows PowerShell, use `npm.cmd` instead of `npm` if your execution policy blocks npm's PowerShell script.

```sh
npm run build
npm run preview
```

The build creates a static site in `dist/`.

## Publish with GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`. It builds the portfolio and publishes it whenever you push to the `main` branch. It also sets the correct Vite base path automatically, so the demos, downloads, portrait, and other public assets work at a project-site URL such as `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

1. Create a new empty GitHub repository. A clear name is `jose-miguel-portfolio`.
2. In that repository, open **Settings → Pages** and choose **GitHub Actions** under **Build and deployment**.
3. In this project folder, open PowerShell and run the commands below. Replace the URL with your repository URL.

```powershell
git init
git add .
git commit -m "Publish portfolio"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

4. Wait for the “Deploy portfolio to GitHub Pages” workflow in the **Actions** tab to finish. Its deployment page shows your live URL.

Later updates use:

```powershell
git add .
git commit -m "Update portfolio"
git push
```

## Personalize it

- `src/data/profile.ts`: name, role, degree, college, graduation year, honor, contact email, and optional résumé URL. To enable the résumé link, add your PDF at `public/resume.pdf` and set `resumeUrl` to `'/resume.pdf'`. No PDF was present when this design was built, so the link is hidden by default.
- `src/data/background.ts`: four education entries, two internships, and twelve courses/certificates. Add verified internship responsibilities through the optional `description` field when they are available. The background section uses keyboard-accessible tabs. KodeKloud exam preparation is listed as coursework.
- `src/data/web-projects.ts`: your development projects. Isla Sakay has actual interface screenshots and four demo links; BPBMC has its original clinic design and five interface links. Each project's `caseStudy` supplies its purpose, core workflows, and contribution when verified. Each card presents one primary demo while keeping all role-specific interfaces in an accessible disclosure. Fill `liveUrl` and `sourceUrl` when real public links are available.
- `src/data/projects.ts`: project titles, categories, descriptions, briefs, approach, tools, and download links.
- `public/projects/`: eleven actual downloadable Markdown/CSV work samples. Replace these with your own deliverables as you develop your portfolio.
- `src/components/ProjectPreview.tsx`: editable illustrative work previews. These are built with HTML and CSS rather than screenshots.
- `src/App.tsx`: section copy, navigation, services, about section, and direct-contact panel.
- `src/index.css`: global styles, Tailwind theme colors, typography, and the dark/light color tokens. Edit the default `:root` variables and `:root[data-theme="light"]` overrides to tune either palette.
- `src/App.css`: page layout, component styles, and responsive breakpoints.
- `index.html`: page title, search and social descriptions, author metadata, and truthful Person structured data. Add canonical and social-image URLs only after the portfolio has a public address and share image.

The portfolio gives virtual assistance and web development distinct, always-visible work tracks. Virtual assistance appears first with eleven self-directed, downloadable samples; web development follows with two interactive systems. The sample labels and disclosures make clear that the virtual assistance scenarios are fictional portfolio exercises and do not claim paid client work, testimonials, or measured business results. The records-intake sample uses synthetic identifiers only and is not evidence of medical-records employment, electronic medical-record access, or HIPAA certification. Review the personal copy and list only services and tools you are comfortable offering.

The project filters and accessible detail dialogs work in the browser. Each dialog includes a real sample download. The contact section does not collect or submit visitor details. It provides a direct email link, a copy-address button, and a short checklist of useful information to include when contacting Jose.

Fonts load from Google Fonts with system and Georgia fallbacks. The site remains usable without the remote fonts. The accessible theme control follows the visitor's system preference initially and remembers an explicit light or dark choice. Keyboard focus styles, a skip link, native modal focus handling, and reduced-motion preferences are supported.

## Isla Sakay frontend showcase

Two independent copies preserve the original screens, components, styling, and image assets. Both use fictional records held in browser memory; changes reset on reload.

| Interface | Independent source | Portfolio demo URL |
| --- | --- | --- |
| Admin website | `showcases/isla-sakay/` | `/demos/isla-sakay/index.html#/dashboard` |
| Public website | `showcases/isla-sakay/` | `/demos/isla-sakay/index.html#/home` |
| Passenger mobile app | `showcases/isla-sakay-mobile/` | `/demos/isla-sakay-mobile/index.html?role=passenger` |
| Boat operator mobile app | `showcases/isla-sakay-mobile/` | `/demos/isla-sakay-mobile/index.html?role=operator` |

The mobile showcase is a browser export of the original Expo/React Native interfaces. On larger screens it appears in a centered phone-width view. The original project has passenger and boat operator mobile roles; its administrator interface belongs to the website. A role selector, reset button, and return-to-portfolio link are included. The static mobile entry keeps Expo screen navigation inside a same-origin frame, so refreshing the outer page works without special server rewrites.

The original application has a backend and database. These showcases do not connect to them, store real bookings, process payments, or send device notifications. Mobile weather is a fixed sample, sign-in selects a fictional local role, and payment receipts are sample records. Browser printing replaces native ticket printing/sharing; device-only services are disabled. The demo banners and portfolio captions make the sample-data context visible.

The local adapter demonstrates common interactions rather than the complete backend rules. Recurring schedule edits and deletions affect the selected sample occurrence.

- Generated web build: `public/demos/isla-sakay/`
- Generated mobile build: `public/demos/isla-sakay-mobile/`
- Actual portfolio screenshots: `public/projects/isla-sakay-dashboard.png`, `isla-sakay-passenger.png`, and `isla-sakay-operator.png`
- Editable web sample records and request handlers: `showcases/isla-sakay/src/demo/`
- Editable mobile records: `showcases/isla-sakay-mobile/demo/fixtures.ts`
- Mobile sample service behavior: `showcases/isla-sakay-mobile/services/api.ts`
- Portfolio typing/encoding skills: `profile.skills` in `src/data/profile.ts`

The copied showcases do not import from the original `Isla-Sakay/` reference folder. Keep both `showcases/` copies if you want to edit the demos later. Keep an external backup of the original project if you need its backend, database, or native deployment configuration; those are outside this frontend extraction. The two generated `public/demos/` directories are sufficient for a normal portfolio build and static hosting.

After editing the copied frontend, rebuild its independent dependencies and bundle:

```sh
npm ci --prefix showcases/isla-sakay
npm ci --prefix showcases/isla-sakay-mobile
npm run build:isla-demo
npm run build:isla-mobile-demo
npm run build
```

Dependency installation is needed only the first time or after changing a copied demo's dependency files. On Windows PowerShell, use `npm.cmd` if required by your execution policy. Rebuild only the showcase you edited: `build:isla-demo` refreshes the web bundle and `build:isla-mobile-demo` typechecks, exports, and packages the mobile bundle. The usual `npm run build` includes both generated demos in `dist/` without needing the original project, database, Java backend, or Expo development server. Use the explicit `index.html` demo URLs above in Vite and on static hosts.

## BPBMC frontend showcase

`showcases/bpbmc/` is an independent static extraction of the PHP website for Blessed Paul Bernard Medical Clinic. It preserves the original purple/blue portal design, public website, HTML layouts, styles, and public branding images. The portfolio identifies the original stack as PHP, MySQL, JavaScript, HTML, CSS, and Bootstrap; the showcase itself runs as static HTML and browser JavaScript.

Five interface links are available on its project card:

| Interface | Demo URL |
| --- | --- |
| Public website | `/demos/bpbmc/index.html#/index` |
| Admin portal | `/demos/bpbmc/index.html#/main-admin` |
| Staff portal | `/demos/bpbmc/index.html#/main-staff` |
| Doctor portal | `/demos/bpbmc/index.html#/main-doctor` |
| Patient portal | `/demos/bpbmc/index.html#/main-patient` |

These are responsive website interfaces, with 58 UI pages accessible through the original navigation and showcase Screen selector. There is no separate native phone app in the supplied BPBMC source. All records are fictional; sample appointments, search, billing, and other local interactions demonstrate the design without real clinical documents, authentication, email, payments, or database backup/restore. Changes remain in memory and reset on reload or Reset.

Edit the independent HTML in `showcases/bpbmc/pages/`, original styles in `resources/css/`, fictional data in `demo/fixtures.js`, and local behaviors in `demo/runtime.js`. The copied fonts and browser libraries work locally; no runtime CDN dependency is required. Upstream attribution and licenses are included under `resources/vendor/`.

```powershell
npm.cmd run build:bpbmc-demo
npm.cmd run build
```

The first command validates and refreshes `public/demos/bpbmc/`; the normal portfolio build includes it in `dist/`. It needs no additional dependency install, PHP executable, MySQL service, or original `bpbmc/` folder. Keep `showcases/bpbmc/` for later edits and `public/demos/bpbmc/` for normal portfolio builds. The original reference is left untouched and ignored by the portfolio's Git settings; preserve it elsewhere if you need its backend. See `showcases/bpbmc/README.md` for extraction and editing details.
