# Isla Sakay mobile frontend showcase

This standalone copy preserves the original Expo / React Native passenger and boat-operator screens and assets. The portfolio serves its web export as an interactive mobile preview, including at desktop sizes. The administration website is a separate showcase in `../isla-sakay`.

All accounts, schedules, bookings, payment records, receipts, notifications, and weather in this copy are fictional samples. Changes stay in memory and reset when the page reloads. The copy does not need the original `Isla-Sakay/` directory, a database, a backend, Google sign-in, or device notification permissions. Image attachments stay in the browser; the sample receipt uses the browser's Print / Save as PDF options.

From this directory:

```powershell
npm.cmd install
npm.cmd run typecheck
```

From the portfolio root, rebuild and package the preview:

```powershell
npm.cmd run build:isla-mobile-demo
npm.cmd run dev
```

Open these paths on the portfolio's local server:

- `/demos/isla-sakay-mobile/index.html?role=passenger`
- `/demos/isla-sakay-mobile/index.html?role=operator`

The exported app runs inside a same-origin frame so those entry URLs stay reloadable while Expo Router navigates between screens. The demo toolbar provides role switching, a full sample-data reset, and a return to the portfolio.

Edit screens in `app/`, the session preview in `contexts/AuthContext.tsx`, and local fixtures and service behavior in `demo/` and `services/`. Use the root packaging command after changes; `public/demos/isla-sakay-mobile/` is generated output.
