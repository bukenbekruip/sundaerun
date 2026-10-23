# Official-domain deployment preparation — 23 October 2026

The user authorized GitHub Pages deployment with **www.sundaerun.com** primary, an apex-to-www redirect, automatic Actions deployment and no changes to email-related DNS. The user will change GoDaddy DNS after deployment readiness is confirmed.

`npm run build:pages` assembles the existing website at `/`, its shop at `/shop.html`, and the complete game at `/garage/`. All eight legacy `/website/` routes remain functional. The normal development/portable layout is retained. The build includes an official CNAME, canonical links, sitemap, robots file and `.nojekyll`. A build gate checks **540 local references, all 92 runtime game images and 17 HTML routes**. Runtime source, original/distributed artwork, supplied website design files and the existing game ZIP are unchanged. Rebuilding production after the browser checks yielded an identical complete file/hash map.

## Local checks

- **51 Node tests pass**, including three production-assembly tests covering root/legacy routing, game resource preservation, exact www canonical URLs and rejection of wrong domains or repeated assembly.
- **70 website/game browser checks** at root routes, and **70** at legacy `/website/` routes: all eight pages at phone/desktop widths, local destinations, decoded images, menu, responsive layout, six-car launch/switch and return to website.
- **65 clothing checks** at six widths: all eight designs, full-size images, collection anchors, tablet navigation and preserved preview labels.
- **156 cabin/steering checks** at `/garage/`: all 72 model/cabin/steering combinations, actual purchase/refit/persistence, immutable snapshots, PNG export, share codes and phone/desktop controls.
- **62 sound/navigation checks** at `/garage/`: six voices, actual AudioContext signal/silence, upgrades, free audition cancellation, responsive categories, no autoplay and unsupported-browser behavior.
- All five final browser reports pass without page, console or HTTP errors. Root home, girls’ collection and phone game screenshots were inspected. Earlier art-matrix/offline-download audits are historical, not counted as fresh coverage.

See `release.json` for exact tested production/report/download fingerprints and logs for commands. The initial build gate rejected a valid root-directory canonical link; its path guard was corrected before the final build and tests. The initial log is retained. The direct repository connection could read Pages configuration but the custom-domain mutation returned HTTP 403; the Actions workflow therefore configures it through its scoped `pages: write` token. Actual saved Pages settings and workflow success must be checked separately before claiming deployment readiness.

## DNS boundary

No registrar or email records are changed. [The setup guide](../../docs/GITHUB_PAGES_DOMAIN.md) gives `www` CNAME → `bukenbekruip.github.io`, the four GitHub apex A records and optional IPv6 records. GitHub Pages supplies the apex redirect when www is the saved custom domain and both names resolve to Pages. HTTPS enforcement is enabled by the workflow once the www certificate is approved; before DNS, the public host, certificate and live apex redirects cannot be verified. A fresh public-host browser audit is not claimed from local tests or a successful Actions job.


## Publication correction

[Actions run 39932990351](https://github.com/bukenbekruip/sundaerun/actions/runs/39932990351) passed tests and the production build, then failed while setting the custom domain. The saved Pages CNAME remained null. The workflow now reports a rejected settings change as an explicit warning and publishes the verified artifact independently. A successful deployment does not prove www is saved: the administrator may need to enter www.sundaerun.com in repository Settings → Pages before changing GoDaddy DNS. The HTTPS step similarly reports when manual administrator action is required. No public website/game artifact bytes changed in this correction, so the existing browser evidence and production hashes remain applicable.
