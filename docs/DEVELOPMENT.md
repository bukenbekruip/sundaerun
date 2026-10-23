# Working on Sundae Run

Use Node 24 (the Pages/PR CI version) and `npm ci`. Node 22.12+ is supported by the package. Use Python 3.12 and `pip install -r requirements-browser.txt` for browser checks. Tests expect Chromium at `/usr/bin/chromium`; PR CI installs the pinned Playwright browser and links that path.

## Source ownership

| Location | Responsibility |
| --- | --- |
| `public/website/*.html` | Page-specific static content; shared component markers are expanded during development/build |
| `website/components/` | Shared header, full footer and Play footer; header active-link/CTA parameters are controlled by the build |
| `public/website/css/` | Readable website CSS in explicit cascade order; `styles.css` is its import manifest |
| `src/styles/tokens.css` | Shared typography/spacing/radius primitives and separate website/garage theme values |
| `src/styles/garage/` | Garage CSS split in the original cascade order; `src/ui.css` is the import manifest |
| `public/website/js/` | Small native navigation and local signup-demo modules |
| `app.js`, `src/ui/` | Garage orchestration, safe DOM creation, product controls/dialog and retryable image loader |
| `src/state.js`, `src/club.js`, `src/progress-storage.js` | Validated immutable game state/progression and resilient local persistence |
| `src/*renderer.js`, `src/engine-*.js`, `src/photography.js` | Registered artwork rendering, audio and fitted/saved build exports |
| `scripts/website.mjs` | Trusted static partial rendering, development middleware and production stylesheet bundling |
| `scripts/build-pages.mjs` | Pages route assembly; `scripts/verify-pages-build.mjs` checks HTML/CSS/module/resource paths and policy |
| `reference/`, `source-art/`, `qa/`, `downloads/` | Preserved artwork, historical evidence and the existing shipped offline ZIP |

The historical root `style.css`, `OPEN-THIS-GAME.html` and handoff documents describe the old diagnostic build. Do not edit those to change the current UI. Do not edit generated `dist/` files or the generated website token copy. Keep public reference artwork unchanged; the authored car/mask coordinate system is not a generic CSS layout to rescale.

`npm run dev` opens the garage at `/` and the brand site at `/website/`. The middleware renders the same static header/footer used by production. The website’s small native ES modules require no hydration or client framework. Its CSS is bundled/minified to one production stylesheet; source modules and the no-script fallback remain available. Artwork loading hints reserve image space without replacing art.

## Commands and review

```sh
npm run lint
npm run format:check
npm test
npm run security:secrets
npm audit
npm run build:pages
npm run build:standalone
```

Pages production serves `/`, `/shop.html`, `/garage/` and the retained `/website/` aliases. The current Pages workflow, official CNAME and publish commands are unchanged. A source change that introduces a CSS import or JavaScript module must ship at both website paths; the recursive build gate checks those resources.

The separate PR quality workflow has read-only repository permissions and does not deploy. It builds the PR base and branch, compares website/game screenshots, runs actual game transactions/audio/import tests and checks a fresh portable artifact. Keep baseline screenshots from the unmodified base. Website frames require zero changed pixels; game frames permit an explicit tiny glass/shadow rasterization allowance, with raw differences retained. Never update a baseline simply to hide a design change.

Existing packaging tooling and `downloads/Sundae-Run-Playable.zip` are tied to the prior reviewed release. `build:standalone` verifies a fresh self-contained HTML game; publishing a replacement ZIP requires its own current release evidence and packaging review. This refactor preserves the shipped ZIP rather than silently overwriting it.

## Security and production boundaries

Treat localStorage and imported build codes as untrusted. Keep the save key/version and migration contract. Use normalized catalogue identifiers, bounded imports and `textContent` for user names; never insert them as HTML. Browser-local credits are not a secure online economy, and recipe imports do not grant purchases. Retailer links must pass the HTTPS/credential validator and disclose affiliates.

The signup is deliberately a non-submitting local demo, including with JavaScript unavailable. Production CSP restricts script/style sources and blocks form submissions, plugins and unwanted frames; the browser test checks actual script rejection. Pages cannot set arbitrary HTTP headers such as `frame-ancestors` or a custom HSTS policy, so the meta policy is not a substitute for server/edge hardening or penetration testing.

No secrets belong in public configuration, Vite variables, browser bundles or repository history. The included secret scanner checks common high-confidence patterns, including ZIP text and reachable history, and reports values redacted. It does not perform entropy scanning or provider-side credential validation. Review dependency advisories and licenses when changing the lockfile.

Real payments, stock, subscriptions, accounts or public galleries require a separately reviewed backend/hosted service. Keep the current collection and community flow labelled as previews until those services exist. Do not change email DNS as part of code maintenance.
