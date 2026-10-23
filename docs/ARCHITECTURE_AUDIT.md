# Repository audit and refactor plan

Audit baseline: `100718c7686762d8660c2b2445c660cf675a90a6`, 23 October 2026. Work is isolated on `refactor/production-structure`; this is a pull-request change, not authorization to merge or deploy. The Pages workflow and custom domain must stay intact.

## Scope and existing stack

The initial inventory covers **1,182 tracked files**, including 244 text files, artwork, historical QA and the portable ZIP. Current text and ZIP text contents were scanned for common high-confidence secret formats; none were found. History scanning and repeatable final security results are reported separately rather than implied by that scan. Active application, build/deploy, import/storage, DOM construction, rendering/audio, and website navigation/form paths were reviewed. Historical handover documents describe the earlier broken prototype, not the completed game.

| Area | Current implementation |
| --- | --- |
| Build/runtime tooling | Node 24 in Actions, npm lockfile, Vite 8.3.4, ES modules |
| Brand website/shop | Eight static HTML pages, local DM Sans/Space Grotesk fonts, CSS and a small navigation/demo-signup script |
| Garage | Native HTML controls, modular JavaScript, Canvas 2D paint/upgrade/interior/photo renderers, Web Audio, local Inter font |
| Progress/sharing | Versioned localStorage, validated SR1/JSON build recipes; no server-side economy or user accounts |
| Hosting | GitHub Actions → Pages; website `/`, shop `/shop.html`, game `/garage/`, retained `/website/` aliases; `www.sundaerun.com` |
| Commerce/community | Collection preview and local signup demonstration; no checkout, stock, order processing, mailing service or online gallery |

## Genuine findings, ordered by practical impact

1. **Repeated site chrome:** eight headers and seven full footers repeat markup. Navigation changes can drift between pages. Use small build-time shared partials that still produce static HTML; preserve the Play page’s compact footer and different CTA.
2. **CSS maintenance:** the website stylesheet is largely compressed onto a few lines, with later responsive/brand overrides, and there are 17 inline style attributes across its pages. Extract named styles and split the stylesheet without changing cascade order. Keep website and garage theme values distinct while introducing shared primitive and semantic tokens.
3. **Large UI entry points:** `app.js` combines state coordination, scene loading/cache lifecycle, product DOM, persistence and event wiring. `club-ui.js` is also large, although domain logic, renderers and audio already have useful boundaries. Extract cohesive, independently testable helpers instead of rewriting all game logic.
4. **Fragile resource publishing:** the Pages assembler has a fixed resource-directory list; new website modules could work in development but be absent at the production root. Copy website resources generically and verify nested CSS/JS references.
5. **Accessibility gaps:** the website menu lacks Escape/outside-click/viewport-reset behavior; neither experience has a skip link. Focus treatment is inconsistent for form controls. Existing native dialogs, semantic controls and many labels should be retained. Any visual contrast or design changes require separate review rather than an unrequested rebrand.
6. **Progressive form privacy:** the demonstration signup relies on JavaScript cancelling submission. Default HTML submission must not leak entered details into a URL if scripting fails. Keep it a clearly labelled demonstration, with a safe non-submitting fallback and production form policy.
7. **Production hardening and checks:** dependencies are locked and the initial npm audit reports **zero known advisories**. DOM text from user names/imports uses `textContent`; SR1/JSON imports are size-bounded and normalized. Retailer destinations require HTTPS and reject credentials. There is no current evidence of an exploitable DOM XSS. Add repeatable checks and a compatible production content-security policy; do not claim this replaces penetration testing.
8. **Large repository/payload:** historical QA is approximately 515 MB, source/reference art approximately 44 MB, and the existing portable ZIP 68.5 MB. These increase checkout/review cost. Preserve those records and artwork in this PR; plan future artifact retention separately. The 117.6 MB public tree is art-heavy, not caused by React. Add image loading/layout hints where they preserve rendering; do not replace completed art.
9. **Release coupling:** some historical packaging scripts pin old report counts/hashes. Preserve the shipped ZIP, verify a fresh portable build independently, and document the existing packaging gate limitation rather than relabelling historical reports as new evidence.

## Selected production stack

Retain **static HTML, modern JavaScript ES modules, CSS and Vite**, with Node build-time partial rendering and small shared modules. This has no additional client framework runtime, preserves SEO/direct routes and works with Pages and the offline game. React would add hydration/state migration work without solving the present duplication; TypeScript conversion of the renderer/UI is not justified for this preservation refactor. Use clear module APIs, JSDoc where useful, linting and existing domain tests first. A future typed catalogue/backend boundary can be introduced when actual online services exist.

For a real shop, select a hosted commerce checkout/store service with server-validated prices, stock, payments and tax/shipping support. For accounts/gallery/affiliate offers, introduce a separately reviewed service with authorization, data retention and fitment provenance. GitHub Pages alone cannot provide those guarantees. This PR must not simulate them or move secrets into browser configuration.

## Planned implementation and acceptance

- Shared static header/footer partials with production and development rendering.
- Named website CSS modules and shared design tokens, maintaining theme values and rule order.
- Native site navigation/signup modules; cohesive game DOM/storage/image-loading helpers where behavior can be preserved.
- Skip links, keyboard menu behavior, safe demo form fallback, image dimensions/loading hints and a compatible production security policy.
- Repeatable lint/structural/security checks and PR-only CI without deployment permissions.
- Fresh baseline-versus-branch browser screenshots, production and portable builds, existing game/website suites and dependency/secret checks.

The final review report must state actual results, intentional accessibility differences, remaining risks and any deployment implications. Nothing is merged or deployed by this task. Existing car registrations, paint/upgrade masks, renderers, sounds, catalogue, save key/schema, artwork, public routes, domain and downloadable ZIP are preservation boundaries.
