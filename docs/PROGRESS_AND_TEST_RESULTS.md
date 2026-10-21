# Codex QA progress log

## GitHub Pages deployment preparation — 2026-10-21

Added `.github/workflows/deploy-pages.yml`: Node 24, frozen `npm ci`, existing unit tests, production build, Pages artifact upload and deployment on `main` pushes or manual dispatch. The existing relative Vite base is retained for `/sundaerun/`; game source, artwork, design and behaviour are unchanged. This deployment-only change does not rebuild the independent portable download.

Current-instance checks: `npm ci --cache /tmp/sundaerun-npm-cache`, all **27 unit tests**, and `npm run build` passed. Served `dist/` under `http://127.0.0.1:4173/sundaerun/` to reproduce the project path. All **87 production files** returned HTTP 200 with matching byte lengths. Existing browser cases for five-part purchase/persistence/reset and all three cars at desktop 1366/1920 and mobile 390/360/320 widths passed: **6 cases, 544 assertions**, no page/console/HTTP/request errors. Visually inspected STI desktop 1366 and mobile 390 screenshots. Evidence is in `/tmp/sundaerun-pages-qa/` in this instance.

Public deployment remains unverified: the running environment's proxy returns CONNECT 403 for `api.github.com` and `bukenbekruip.github.io`. Required domains and reusable installation/startup instructions were saved to the environment draft; saving does not apply or publish them. Git push works. Once network changes take effect, check/enable the repository's Pages source as GitHub Actions, inspect the deployment run, and rerun browser checks against the public URL. No successful public deployment or public-site desktop/mobile test is claimed yet.

## Handoff baseline — 2026-10-20

- Current root source extracted from `Sundae-Run-STI-Playable-V2.zip`, zip integrity verified.
- Approved screenshot and QA defect captures packaged separately.
- **Known blockers:** merged reference artwork contains rims, car paint, platform, and UI; alternate changes visibly fail.
- **No claim that wheels or paint are fixed.**
- **No new game build or browser visual validation was performed as part of this transfer**; this is a documentation/source handoff.

## First playable release — 2026-10-20

The V2 source was replaced after the user requested a working design and sizing, with a catalogue boundary for later real products and affiliate links. The first supported set is **three paints × two wheel concepts** on one STI screen. Other visual options stay unavailable.

## Gate 1: Static artwork — passed for the supported scene

`public/assets/scene/garage-plate.png` is a clean workshop/platform plate with all baked controls and the original car removed. Six transparent whole-car variants share one camera/canvas transform. Bodies and wheels never scale independently. The approved original and all reference/source-art files remain byte-identical to the handover checksums.

The blue composite was visually inspected before wiring the interface: `qa/current/gate-a-static-blue.png`. The car is fully inside the gold platform, both tyre contacts are coherent, and the native footer now clears the front platform lip. The clean-plate reconstruction is an art edit, not a claim of pixel-identical background recovery. Registration/provenance is in `docs/ART_PIPELINE.md` and `public/assets/scene/manifest.json`.

## Gate 2: Alternate rims — passed for two concept designs

The multispoke and six-spoke styles are complete-car renders, with both wheels already in their correct perspectives. No original rim is underneath a replacement disc. Root visual review covered `default-1672.jpg`, `blue-alternate-wheels.jpg`, `sr-01-front-arch-2x.jpg`, `sr-01-rear-arch-2x.jpg`, `te37-front-arch-2x.jpg`, and `te37-rear-arch-2x.jpg` in `qa/current/`.

Manual review also caught a selection tick baked into the old SR-01 product thumbnail. Both enabled products now use new clean images under `public/assets/products/`; a single DOM checkmark follows the selection. The old thumbnail is not used by those products.

## Gate 3: Paint — passed for blue, black and mint concept renders

Visually inspected `black-paint.jpg`, `mint-paint.jpg`, `black-alternate-wheels.jpg`, `mint-alternate-wheels.jpg`, and `back-to-blue.jpg`. Paint changes use the corresponding complete-car artwork; there are no rectangular recolour patches or global scene filters. Glass, lights, badges, tyres and trim remain coherent, and the garage plate is unchanged across selections.

Generated variant canvases vary by 1–2 pixels, with silhouette differences under three stage pixels. They use one shared render box and uniform fit. Small reflection/detail differences remain between illustrations; these are **concept previews, not physically verified products or mathematically paint-only pixel edits**.

## Gate 4: Native UI and purchases — passed

All labels, checkmarks, prices and buttons are live HTML. Tests cover free preview, Cancel to applied appearance, itemised credits, default 48,320 → 44,620 purchase, no repeated charge, free refitting of owned parts, applied-state persistence, reset confirmation, and corrupted-storage recovery. Image-load races cannot overwrite a newer selection; failed initial artwork disables Apply and offers Retry. Product details open an accessible dialog. No live merchant links are configured.

## Gate 5: Browser, sizing and builds — passed within the recorded scope

- `npm ci` reproduced dependencies from the new lockfile.
- `npm test`: **13 passed, 0 failed** (catalogue, transactions, storage, artwork integrity and original-image preservation).
- `npm run build:standalone`: succeeded. The normal Vite build now includes the actual module entry; the old manual `dist/app.js` copy workaround is removed.
- `python3 tests/browser-smoke.py`: **12 cases passed, 244 recorded checks, 0 failed**. Normal runs had no uncaught exceptions, bad HTTP responses, failed requests, or console errors. Deliberately aborted-image cases are recorded separately. On narrow screens, category navigation brings the selected controls into view.
- Viewports inspected: **1672×941, 1366×768, 1920×1080**, plus a **390×844** narrow viewport. The full car stays visible; desktop controls scale together, and narrow controls use vertical flow with no document-level horizontal overflow.
- `python3 tests/portable-smoke.py`: **34 checks passed**, with every additional network request blocked. Embedded images and Inter font loaded, selection/purchase/reload worked, and there were no unexpected network, page or console errors.

`qa/current/browser-results.json` and `qa/current/portable-results.json` contain the current observations. The portable proof used HTTP delivery with all extra requests blocked; direct `file://` navigation could not be tested because managed Chromium blocks that protocol. No validation in a separately restored cloud task or published website is claimed.

The cloud onboarding UI cannot expose the internal Vite server as a user-facing preview. Both development and production servers responded successfully during diagnosis; a working internal server does not create a publicly accessible website. The portable download is provided for trying the game outside this environment.

Workspace file links did not start a download in the user's chat. The verified ZIP is therefore also retained as `downloads/Sundae-Run-Playable.zip` for delivery through the GitHub file-download route. Its archive integrity and embedded HTML hash match `qa/current/release.json`; no application changes or additional test run were needed for this delivery-only copy. Access follows the repository's existing GitHub permissions; its visibility was not changed.

## Remaining scope after the first release (historical)

Tyres, suspension and body kits are unavailable. Real retailer URLs, affiliate accounts, live prices, verified vehicle fitment, a product CMS and click reporting have not been added. The catalogue and product dialog support optional merchant information independently of game credits; see `docs/PRODUCT_CATALOGUE.md`.

## Expanded three-car release — 2026-10-20

The user requested the other cars, more paint colours and all rims, then explicitly confirmed **STI, Porsche and Toyota 86**. This supersedes the historical STI-only scope in the handover. The same customisation screen now supports **3 cars × 6 wheel concepts × 12 paints = 216 appearances**.

### Artwork and paint acceptance

Eighteen complete transparent blue-car renders provide distinct paired wheel designs without independent wheel overlays. All six products now have clean thumbnails. The Porsche and Toyota share the approved garage/camera; Toyota has one whole-car vertical offset to align its tyre contacts. Original reference and source artwork remains byte-identical.

Twelve colours use authored body-panel masks with hard exclusions for wheels, glass, lights, badges and trim, plus material transfer that retains shading and reflected workshop light. White/red diagnostic review caught leftover blue sill, wing and intake borders; the masks were refined before acceptance. Root inspected all **18 twelve-colour browser sheets** and all **three six-wheel contact proof sheets**, including the STI OZ roof variation and regenerated Toyota TE37 glass. All body/wheel combinations remain coherent and fit on the platform. These remain concept illustrations with minor source reflection/detail variation and unverified physical fitment.

### Saved builds and interface

The native vehicle selector restores each car's own applied appearance. Ownership belongs to that car and the credit balance is shared. Free previews are discarded on vehicle switch or reload. Version-2 progress migrates into the STI garage without a debit or loss of valid credits/purchases. Repeated Apply cannot charge twice. Image races, unavailable images and cross-car failure rollback keep checkout guarded. Mobile vehicle controls, twelve paint swatches and wheel navigation stay reachable with no document-level horizontal overflow.

### Verified production build

- `npm test`: **19 passed, 0 failed**.
- `npm run build:standalone`: passed; **26 runtime images**, portable HTML **58,295,674 bytes (55.60 MiB)**, within the expanded 64 MiB budget. Initial HTML images reuse the inline map rather than duplicating the car, garage and logo data.
- `python3 tests/browser-smoke.py`: **15/15 cases, 4,732 assertions passed**. All 216 appearances were selected through the real UI. **234 pixel comparisons** preserved every alpha value, every RGB pixel outside the authored paint mask, independent protected-object probes and the unchanged garage. Twelve paints and six wheel bases have distinct raster fingerprints.
- Browser cases also passed per-car purchases, switching, cancel/reload/reset, version-2 migration, product dialogs, delayed image races, image failure/retry and rollback. Normal runs had no unexpected browser/console/network/HTTP errors; deliberately aborted-image cases are separate evidence.
- Desktop **1672×941, 1366×768 and 1920×1080** and narrow **390×844** layouts passed for all three cars. Independent UI review also checked 360px and 320px widths and corrected the mobile HUD row placement.
- `python3 tests/portable-smoke.py`: **944 checks passed**, including all 216 combinations and per-car purchases/reload, with **zero additional network requests** and no unexpected console/page/HTTP errors.

Current results, screenshots and source/build hashes are in `qa/expanded/`. Root formatted the source before the tested production build; `build-provenance.json` records the final hashes. `qa/current/` remains historical first-release evidence. No tests were disabled or replaced by zero-test runs.

The rebuilt `downloads/Sundae-Run-Playable.zip` contains exactly the tested portable HTML, opening instructions and the Inter license. Its ZIP integrity and embedded HTML hash were verified; `qa/expanded/release.json` records both hashes. Portable proof used HTTP delivery with every additional request blocked. Direct `file://` opening remains untested because managed Chromium blocks that protocol. A publicly hosted site and restoration in a new cloud task are not claimed.

## Tyres, suspension and carbon-kit release — 2026-10-21

The user requested tyres, suspension and body kits for the existing three cars. All five categories now have live preview controls, itemised pricing, Apply/Cancel and per-car ownership. The new categories each have an included original option and two paid upgrades. Version-4 saves preserve valid version-2 and version-3 credits, purchases and applied builds; migration supplies included baseline upgrades without charging.

### Artwork and geometry

Twelve generated PNGs provide two rubber materials and two sparse carbon packages per car. Misregistered isolated tyre pairs and a misplaced first STI track kit were rejected. Accepted tyre PNGs contain registered full-car sources, but the compositor draws **only authored rubber annuli**, retaining the original rim, brakes and silhouette alpha. Kits add carbon splitters, canards and sill details. No replacement bumpers, widebody conversion, real tyre dimensions or suspension physics are implied.

Suspension separates the authored wheels and translucent ground shadow, then lowers the rigid body by a calibrated integer offset. Initial visual review caught detached lower tyre crescents; contour corrections were completed before the production build. The frozen upgrade-renderer SHA-256 is `8cdb92ad8bb388e9d5944f152870bf17d0e140adc781e55c58b831bf4caad690`. Independent checks covered all 18 wheel bases in white and black at maximum lowering: **36 cases, 144 wheel/contact patches, 3,600 sampled pixels, zero changed RGBA channels**. Six all-rim proof sheets and six actual-interface screenshots were inspected. Their results are retained in `qa/upgrades/suspension-summary.json` and `suspension-results.json`.

The conservative rim guards retain tiny fragments of original STI sidewall lettering with the alternate rubber skins. This is a known cosmetic limit; rim lips and brake geometry take priority. The earlier illustrated paint reflections and small source-detail variations also remain. These are concept previews with unverified physical product fitment.

### Native controls and production verification

The new native cards have accessible selection state and product dialogs; five checkout lines fit the original panel. The small-screen Track-kit description initially overlapped its price; the card-height correction passed the affected phone cases. Independent UI review covered three cars and all three new categories at 1672, 1366, 1920, 390, 360 and 320 pixel widths. Evidence is retained with the `parts-ui-` prefix.

`npm test` passed **27 tests, zero failed/skipped**, including decoded PNG alpha integrity, original artwork preservation, five-part transactions/migrations and exhaustive availability/unique-key enumeration for **5,832 selections**. That enumeration is distinct from browser coverage. `npm run build:standalone` passed with **38 runtime images** and a **72,671,362-byte (69.30 MiB)** portable HTML, inside the 96 MiB budget.

The first portable harness attempt timed out during initial document navigation before executing any checks. A second attempt passed 328 checks before Playwright timed out waiting for scheduled navigation after a paint-button click had completed; no navigation, extra requests or browser errors occurred. The harness now allows 60 seconds for the larger document and the normal Playwright 30-second interaction budget. Native buttons skip the irrelevant navigation wait, while explicit variant/decode/price assertions remain required. Both initial timeout results are preserved, and the final run records per-preview timings. The final portable run passed **1,273 checks, zero failed**, covering all 216 baseline paints, 18 representative upgraded builds and five-part purchases/saves across all three cars. All 38 embedded image keys resolved with **zero additional network requests, console errors or uncaught page errors**. The artifact SHA-256 is `25a1ca01d84f4ce2f2d9b4e8be6acf52d8f3aa454c9d8ac2ee46b3509559eb53`. The initial extended browser run passed 21 of 23 cases, then recorded native-input timing timeouts in the mechanical and painted-maximum cases. Further long/parallel attempts also timed out. Their reports remain intact. The harness now foregrounds its page, polls DOM/image readiness independently of animation frames, releases diagnostic canvas buffers, reads independent DOM facts together, and uses fresh serial rim batches. Unchanged controls are not clicked redundantly. Every selection, quote, pixel, contact and distinct-render assertion remains required; no failed functional assertion was removed. No application code or image changed during these retries.

The final combined report passed **23 cases, 20,872 recorded successful checks**, including **all 216 baseline paint selections, all 486 distinct blue mechanical selections, and 18 painted maximum-upgrade builds**. Counts include successful steps from retries. Coverage keys are deduplicated and the exact complete 486-key set is asserted: the 162 fully completed STI selections and three complete Porsche rim batches were retained; the remaining nine rim batches were successfully re-executed. Partial batches were excluded from coverage and rerun in full. All 18 painted maximum builds were re-executed successfully. `browser-results.json` records the complete provenance and the initial failed reports are preserved beside it.

The functional cases also passed five-part purchases/ownership, per-car persistence, version-2/version-3 migration, cancel/reset, failure rollback/retry, stale image responses, dialogs, and desktop 1672/1366/1920 plus phone 390/360/320 layouts. Normal runs had no unexpected page, console, HTTP or network failures; deliberately aborted-image tests are separately labelled. The 5,832 possible configurations were enumerated by Node availability tests, not all rendered through the browser.

Root inspected all three six-car painted maximum-upgrade sheets, the final desktop/phone track-kit screenshots and representative mechanical grids. Independent review also covered all six STI mechanical overviews and the six white/black all-rim lowering sheets. Small documented lettering/illustration limits remain. The download contains the exact independently passed portable artifact; archive CRC and its embedded HTML SHA-256 match the tested file. The ZIP is 53,825,039 bytes, SHA-256 `6809b71e02b3baad0ff656444bf64e74a72004b215cf722468e726e1460a5755`. Direct file-protocol navigation remains untested under the managed browser policy.

### Pages enablement diagnosis

GitHub API access now works, but the Pages site endpoint returns 404. Creating it through the integration returns 403 Resource not accessible by integration. Official configure-pages input documentation confirms auto-enablement needs a separate token with administration/write and Pages/write; the built-in GITHUB_TOKEN cannot enable it. Repository owner must select GitHub Actions in Settings → Pages. Updated workflow actions to their current release versions to address Node 20 runner deprecation warnings; this does not resolve missing site enablement. No successful public deployment is claimed.

### Public GitHub Pages deployment verified — 2026-10-21

After the owner selected GitHub Actions in Pages settings, the API confirmed `build_type: workflow` and a public site. Manually dispatched run https://github.com/bukenbekruip/sundaerun/actions/runs/39581517877 succeeded (build and deploy) for commit `28de666`. Playable public URL: https://bukenbekruip.github.io/sundaerun/ . All 87 deployed files returned HTTP 200 and matched the local production build SHA-256 hashes.

Live-site Chromium verification passed all six selected cases and 544 assertions: five-part purchase/persistence/reset plus all three cars at desktop 1366/1920 and mobile viewport widths 390/360/320. No console errors, page errors, failed requests or bad HTTP responses occurred. Screenshots of STI desktop 1366, Porsche desktop 1920 and STI mobile 390 were independently inspected. These are automated mobile viewport checks, not physical-device testing. Evidence: `/tmp/sundaerun-public-qa/` and `/tmp/sundaerun-public-assets.json` in this instance.

The first live browser attempt failed before checks because Chromium did not trust the environment HTTPS proxy CA. Imported the supplied CA into an isolated NSS database under `/tmp/sundaerun-browser-home/.pki/nssdb` and reran with that browser HOME. TLS verification remained enabled; the rerun passed. No game source, assets, design or functionality changed. Earlier missing-site and network blockers are resolved for this instance.

## Build Club: first build-and-show milestone — 2026-10-21

The user clarified that the game belongs inside the Sundae Run website and should focus on building and showing cars, with at least five models, model-specific interiors, performance upgrades and international affiliate shopping. The user confirmed **BMW M3 E46 and VW Golf Mk7 GTI** as the next two models, and asked to start finishing the game before connecting it to the supplied website. The delivery order and remaining scope are recorded in `docs/BUILD_AND_SHOW_PLAN.md`.

### Implemented loop

The existing exterior screen now opens **Build Club** from the header, including on small screens. Players save up to 24 named snapshots of actually fitted exterior/performance choices, complete six themed briefs per current car, earn one-time credits and real XP, and export a show card or share an SR1 code/JSON recipe. The old decorative level/time display is replaced by earned progression and a functional Club entry point. Included/owned performance parts refit for free; filters/intakes, exhausts and tunes have separate per-car ownership. Ratings are explicitly fictional indices, not horsepower, measured gains or audio previews.

An optional `club` field extends the existing version-4 save. Older v2/v3/v4 saves keep valid exterior purchases and balance and receive stock performance plus an empty collection. Reward claims, completion receipts, performance purchases and the wallet use the same saved document. The balance upper bound permits only the original starting allowance plus known completed-brief rewards. Each brief pays once per vehicle; deleting or renaming a build does not reset its reward. Free/unfitted previews cannot be saved as paid fitted builds. Snapshots retain earlier valid recipes even after a car is changed. Build codes omit the wallet, purchases and completed briefs, strictly validate product/vehicle IDs and Unicode, and import an exterior preview without granting ownership. Performance recipes are listed for separate fitting rather than silently purchased.

### Validation and delivery

- `npm test`: **34 passed, zero failed/skipped**. This includes the previous 27 tests and seven new Club tests for paid versus preview snapshots, immutability/duplicate saves, one-time rewards and balance caps, per-car performance purchases/refits, challenge eligibility, strict sharing and malformed/legacy saves.
- `npm run build:standalone`: passed with **38 embedded runtime images** and the existing 96 MiB budget. `qa/club/release.json` records the final HTML/archive sizes, hashes and application/test fingerprints.
- `python3 tests/club-browser.py`: **85 native checks passed**. This covers the actual first-save/reward flow, XP, exact performance prices/free refits, persistence, Unicode/markup names, share/import isolation, shopping preference, the baseline blue/alternate-wheel/black/mint/back-to-blue visual loop, and native PNG export of STI plus white maximum-upgrade Porsche and black upgraded Toyota builds. Native dialog/garage layout checks cover 1672, 1920, 1366, 768, 390, 360 and 320 widths.
- `python3 tests/club-browser.py --portable --output qa/club/portable`: **31 checks passed**, including all three PNG exports, saved builds, purchases/reward/reload, import isolation and **zero additional resource requests**. No page, console or HTTP errors occurred in the main normal/portable feature flows. The final run uses the final pre-boot XP/reset wording and the exact packaged artifact.
- Nine selected existing exterior regression cases passed **450 checks**: all-five-part purchases/reset, per-car persistence, v2/v3 migration, tyre/body failure rollback, out-of-order wheel/vehicle requests and cancel-during-load. The production JavaScript, state logic, renderers and CSS are the same as the final build; only initial fallback XP and explanatory reset copy were subsequently clarified and exercised again by the complete final Club suites.

Root inspected desktop collection/performance captures, the approved exterior colour-loop outputs, phone layouts at 390/320 and native exported show-card PNGs for all three current models. Photo generation renders a saved snapshot independently of the active car, preserving the same authored scene registration. The original artwork, all current exterior assets, paint renderer, upgrade renderer and registry remain byte-identical to the prior release. The supplied website was extracted separately and did not replace game source. Previous full exterior matrix evidence remains historical in `qa/upgrades/`; the 5,832 availability keys still pass Node enumeration, but this milestone does not claim a fresh browser rendering of every appearance. Earlier successful Club runs are retained where useful; no failed assertion was removed.

`scripts/package-playable.py` requires passed normal/portable Club results and an exact portable SHA match, then verifies ZIP integrity and its embedded HTML. The GitHub download contains that tested HTML, updated opening instructions and the Inter license. Portable proof uses HTTP delivery with every extra request blocked; managed Chromium still prevents a direct `file://` test. Source/build/asset integrity and visual review are recorded under `qa/club/`.

### Still pending

This is a complete first gameplay loop, **not completion of the full five-car/interior roadmap**. M3 E46/Golf Mk7 GTI artwork and preview support, model-specific interior artwork/customisation, real regional retailer offers and verified fitment, online profiles/gallery/voting, and connection to the supplied Sundae Run website remain pending. No new car or interior artwork was generated or accepted here. The current website's management-game marketing is untouched until integration; store checkout and community signup remain demonstrations. No live affiliate revenue or independent fresh-task restoration is claimed. The previously established Pages workflow is retained; public delivery of this milestone is checked separately.

### Existing deployment workflow preserved

Before publication, origin/main contained four additional commits establishing and documenting GitHub Pages. They changed only the workflow, README and this progress log. Those commits were merged intact; the append-only log conflict retained both deployment history and the new Club history. No tested application, stylesheet, asset or portable artifact changed in that merge. The game update was pushed normally to main with the existing automatic Pages workflow preserved.

Verification of the latest live deployment is **unconfirmed from this environment**: `gh api` returned Forbidden and the public Pages request failed at the HTTP CONNECT proxy with 403 before reaching the site. This is a verification/network blocker, not evidence that the Pages build failed. The existing historical live-site report is retained above. Current Club functional proof is the passed local production/portable suites and exact packaged fingerprints; the source and download are available in GitHub. No credentials were extracted, and no repository visibility or existing deployment configuration was changed.
