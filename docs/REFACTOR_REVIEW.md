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

## Test results

Local validation of the final application source passed. Machine-readable reports and artifact/source fingerprints are in [qa/refactor](../qa/refactor/README.md). The production rebuild is byte-identical to the tested 267-file snapshot.

| Check | Result |
| --- | --- |
| Lint, targeted formatting, Node domain/build tests | Passed; **54 tests**, none skipped |
| Pages production build | Passed; **594 local references, 92 runtime game images, 17 HTML routes** |
| Website root and retained legacy routes | **70 + 70** browser checks passed |
| Clothing previews and responsive layout | **65** browser checks passed, 320–1440 px |
| Native interior/steering, sound/navigation, Club | **156 + 62 + 85** checks passed; all 72 cabin/steering combinations |
| Missing-image/retry/late-load handling | **7** checks passed; deliberate image failure recorded separately |
| Fresh self-contained portable HTML | Build passed; **157 interior + 62 sound** checks, with additional network requests blocked |
| Keyboard, no-script privacy, CSP and safe name handling | **12** checks passed; axe compared nine routes on both baseline and branch |
| Visual regression | **51 frames**: all **24 website frames have zero changed pixels**; 27 game frames within the explicit rendering allowance |
| Dependencies | npm: **zero reported advisories**; pinned Python browser dependencies: **zero reported advisories** after upgrading Pillow |
| Secrets | Common high-confidence patterns: no findings in tracked text, ZIP text and reachable history; exact scan scope in `secrets.json` |
| Development middleware | Shared page rendering, tokens/modules, navigation and six-car garage checked separately |

The final visual pass uses Pillow 13 and permits no website difference. Game frames differ by at most **28 pixels** and **10 intensity levels per channel**; the configured ceiling is 128 pixels/32 levels. An unchanged-baseline repeat also shows slight glass/shadow-edge rasterization variation. Raw counts are retained rather than describing the result as pixel-perfect. Default STI, alternate wheels, black/mint/blue paints, six exteriors, cabins, performance dialogs and phone/desktop layouts were reviewed. The preceding pass with Pillow 12 is retained as additional evidence, not substituted for the final comparison.

The browser suites found no page/console/HTTP errors in normal flows. Expected CSP rejection and deliberately failed-image requests are separately labelled. Automation uses Chromium, not a cross-browser or physical-device certification. Portable evidence uses HTTP with all extra requests blocked; direct `file://` is not claimed.

The first PR workflow failed before application checks because Python caching did not identify the nonstandard requirements filename; an explicit cache path fixes it. A separate Python dependency audit then identified 35 advisories in Pillow 12.3, used only for QA image processing. The requirement is now pinned to patched **13.0.0**, audited successfully, and the visual comparison rerun. Neither version ships to visitors. The current PR workflow conclusion is recorded in the pull request before readiness is announced; local results do not imply CI success.

## Performance and preservation

Production website CSS remains one request and is now assembled from readable modules. It grows from 18,748 to 20,203 bytes with tokens, accessibility and named styles. The game JavaScript changes from 146.53 to 146.72 kB and CSS from 49.53 to 50.85 kB before compression. This is an organisation/hardening change, not a claim of a smaller total art payload. Image dimensions, priority and deferred loading improve layout/loading behavior without re-encoding artwork.

The original/distributed artwork, local fonts, renderer/audio algorithms, save key/schema and existing ZIP are preserved. The ZIP remains **68,522,414 bytes**, SHA-256 `b2b05f6da117c1e6ed95d4162eb83e19d1753d2e8c48835f077842fa25000db3`. A fresh portable HTML is independently tested, **92,177,315 bytes**, SHA-256 `fde40669737060daba7e715b1661701981c269d8a4b8925ee494dea288cf5aef`; it does not overwrite the download.

## Remaining production risks

- The clothing shop remains a collection preview; signup remains a local demo. There are no real checkout, stock, payments, email subscriptions, online accounts or server-authoritative credits.
- Five existing axe contrast findings appear on four website pages in both baseline and refactor. Keyboard/accessibility behavior is improved, but full WCAG conformance is not claimed and the brand colours are not silently changed.
- Pages cannot provide arbitrary security response headers. The meta CSP does not supply `frame-ancestors`, custom HSTS, a backend authorization boundary or a penetration test.
- A read-only Pages API check still reports `https_enforced: false`, the correct `www.sundaerun.com` CNAME, and no certificate details. HTTPS enforcement therefore remains an existing production follow-up. The managed network cannot complete a public-host browser/TLS audit; the API response alone is not proof of a valid or invalid public certificate. Verify GitHub's certificate status and enable Enforce HTTPS once available, separately from this PR.
- Browser-local progress can be edited/lost and remains origin-specific. SR1 recipes do not transfer ownership or credits.
- Artwork-heavy payloads and large historical QA/release files still add transfer/checkout cost. Source references and historical evidence are retained rather than destructively cleaned up.
- Secret scanning is limited to common high-confidence patterns, with no entropy/provider validation. Dependency advisory results are time-specific. Original artwork/IP/real-product fitment limitations remain documented.
- The existing ZIP is preserved. Historical ZIP packaging gates remain tied to the earlier release; a separately published new ZIP needs current release evidence. A fresh generated portable HTML is tested for compatibility in this PR.

## GitHub Pages implications

No refactor-specific change is required to the domain or Pages settings. The existing deploy workflow remains byte-identical and still deploys only pushes to `main` or an explicit manual run. `npm run build:pages`, the production root/shop/garage paths, legacy `/website/` paths and `public/CNAME` are retained. After an explicitly approved merge, the normal workflow installs the lockfile and publishes the assembled static site. This PR itself does not deploy. The existing HTTPS-enforcement issue above must be verified separately; it is not described as resolved by a local build or a successful CI run. Registrar/email DNS is untouched.
