# Design-preserving production refactor review

This change is isolated on `refactor/production-structure`, based on `100718c`. It is for pull-request review only. The live version, existing Pages deployment workflow, official CNAME, artwork and shipped game ZIP are preservation boundaries. No merge, production deployment or registrar/email change is authorized by this refactor request.

## Problems identified

The complete initial repository inventory covered 1,182 tracked files and the archived portable game. The [audit](ARCHITECTURE_AUDIT.md) distinguishes maintainability problems from hypothetical security issues: duplicated site chrome, compressed/overridden CSS, 17 inline style attributes, large UI entry points, fragile resource copying and a JavaScript-dependent demo form safeguard. The completed game already had modular domain logic, renderers/audio, validated imports and safe user-text DOM construction; it did not require replacement.

## Changes made

- Static shared headers/footers with preserved active navigation, Play CTA and compact Play footer. Development and production use the same trusted renderer.
- Ordered CSS modules, named page styles and shared typography/colour/spacing/button tokens. Website and garage theme values remain separate. Production website CSS is bundled/minified into one stylesheet.
- Game DOM/control helpers, product UI, resilient storage, retryable image loader and a dedicated interior/steering panel. Domain transactions, catalogue data, registrations, renderer algorithms and sound behavior remain intact.
- Native website navigation/signup modules, keyboard/Escape/outside-click/viewport menu handling, skip links, no-script navigation and safe signup fallback. Images receive layout/loading hints without changing artwork.
- Production CSP and referrer policy, recursive CSS/module/resource build verification, lint/format tooling, dependency checks and a redacted current/history/archive secret-pattern scanner.
- A separate read-only PR quality workflow: builds, baseline/branch browser comparisons, functional/security/a11y tests and a fresh portable build. It cannot publish Pages.

## Stack selected

Retain Node/Vite, static HTML, CSS and JavaScript ES modules. Build-time components solve duplication without a frontend framework or hydration. A TypeScript/React migration would add risk and conversion work without a clear benefit for the current static site and native Canvas/Web Audio game. Future online commerce/accounts require a separately reviewed hosted service/backend; this PR does not invent one.

## Validation status

Final branch validation and the PR workflow are in progress. This draft report must be updated with the final report counts and actual CI conclusion before the PR is marked ready for review. Earlier passing runs are not substituted for validation of later source changes.

## Remaining production risks

- The clothing shop remains a collection preview; signup remains a local demo. There are no real checkout, stock, payments, email subscriptions, online accounts or server-authoritative credits.
- Five existing axe contrast findings appear on four website pages in both baseline and refactor. Keyboard/accessibility behavior is improved, but full WCAG conformance is not claimed and the brand colours are not silently changed.
- Pages cannot provide arbitrary security response headers. The meta CSP does not supply `frame-ancestors`, custom HSTS, a backend authorization boundary or a penetration test.
- Browser-local progress can be edited/lost and remains origin-specific. SR1 recipes do not transfer ownership or credits.
- Artwork-heavy payloads and large historical QA/release files still add transfer/checkout cost. Source references and historical evidence are retained rather than destructively cleaned up.
- Secret scanning is limited to common high-confidence patterns, with no entropy/provider validation. Dependency advisory results are time-specific. Original artwork/IP/real-product fitment limitations remain documented.
- The existing ZIP is preserved. Historical ZIP packaging gates remain tied to the earlier release; a separately published new ZIP needs current release evidence. A fresh generated portable HTML is tested for compatibility in this PR.

## GitHub Pages implications

No change is required to the domain or Pages settings. The existing deploy workflow remains byte-identical and still deploys only pushes to `main` or an explicit manual run. `npm run build:pages`, the production root/shop/garage paths, legacy `/website/` paths and `public/CNAME` are retained. After an explicitly approved merge, the normal workflow installs the lockfile and publishes the assembled static site. This PR itself does not deploy.
