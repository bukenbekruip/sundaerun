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


## Five-car Build Club, cabins and brand website — 2026-10-21

The approved expansion now adds **BMW M3 E46 and Volkswagen Golf Mk7 GTI**, retaining the STI, Porsche 911 GT3 RS and Toyota 86. All five use six complete rim renders, twelve paints, three tyre/suspension/body choices and the existing build-and-show loop. Each model has an Original cabin and a coordinated Sundae Club cabin, purchased/fitted per car for 1,800 fictional credits. A seventh one-time brief rewards a saved fitted Club cabin with 1,000 credits/100 XP. Cabin PNG cards show the fitted package, even when a different cabin is being previewed.

Saved version-2/3/4 exterior progress and previous Club builds/rewards are preserved. Old saves and SR1 recipes default to an Original cabin without receiving purchases; imports continue to preview only the exterior and list cabin/performance parts for separate fitting. Named snapshots include cabin identity without mutating earlier builds. Five-car native transactions saved ten Original/Club snapshots and ten one-time rewards, reloaded all cabins and retained the exact 33,320-credit final balance.

### Artwork and visual corrections

Thirty new image_gen assets comprise twelve new complete car/rim renders, eight tyre/carbon sources and ten cabin images. Original source/reference artwork was preserved. Complete new exterior PNGs remain byte-identical generated originals. `expansion-sources.json`, `EXPANSION_ART_INPUTS.json` and the publishing helper retain their provenance. Twenty compact exterior WebPs preserve every original alpha byte and native dimension; all thirty new WebPs total 7,739,364 bytes. Portable RGB encoding is lossy and was tested separately. Normal builds require no art-generation tool or FFmpeg.

Initial M3/Golf mask boundaries left blue paint around trim, arches, grille edges and roof. Corrected paths were checked against source coordinate grids and high-contrast previews. All six final M3 paint sheets and six Golf sheets were personally inspected, alongside the twelve rim sources, ten cabins, both mechanical grids, both all-rim maximum sheets and actual cabin/export/phone captures. The original three-car blue/white/black maximum-upgrade rendering matches the published renderers exactly in nine pixel comparisons.

The first new mechanical run detected alpha-1 noise from the sparse M3 kit affecting eleven rim pixels. The source PNG was retained and runtime drawing confined to authored carbon-part envelopes; the strict rim/contact assertions were retained. The corrected native matrix passed. A final Golf street-envelope correction retains the far-side canards; its final 27-case native rerun and portable mechanical coverage passed. See `qa/expansion/VISUAL_REVIEW.md`, the retained initial failed report and final reports.

### Verification

- **39 Node tests passed**, none failed/skipped, including original-art preservation, state/credit ownership and migration, cabin transactions, immutable snapshots, one-time rewards, backwards-compatible sharing, decoded PNG geometry and **9,720 exterior availability keys**. Enumeration is not browser rendering.
- Native new-car paint coverage is **144 distinct selections**: final M3 rerun plus unchanged Golf matrix. Every alpha byte and every pixel outside the authored body mask is preserved, independent glass/lamp/wheel/grille probes remain unchanged, and all twelve paints differ per rim. Initial M3 paint evidence is superseded by the final rerun; duplicates are not counted as new coverage.
- Native new-car mechanics cover **54 blue combinations** on SR-01, **24 white/black maximum builds across all twelve new wheel bases**, and the final 27-case Golf street-envelope rerun. Strict wheel-centre/contact and quote checks passed. These selected cases are not a claim of browser-testing all 9,720 combinations.
- New cabin/save/export checks: **72**; six responsive widths (320/360/390/768/1366/1920): **87**; missing-image/retry/late-load protection: **6**; final legacy pixel comparison checks: **13**. All normal flows have no unexpected page, console or HTTP errors. Deliberately aborted-image failures are labelled separately.
- Portable new-car coverage: **48 baseline paint selections, 54 blue mechanical selections, 24 white/black maximum builds**, with **3199** recorded checks. All 68 inline runtime images decode; five-car cabin transactions, persistence, rewards and native PNG downloads passed **74** checks. Every additional network request was blocked; none were made. A final brief-description clarification and removal of an unsupported footer arrow changed two UI text strings only. `portable-copy-proof.json` reconstructs the earlier tested artifact and verifies that replacing exactly those two strings makes every final portable byte identical; rendering code/assets are unchanged. The final cabin and Club suites ran against the exact final HTML SHA.
- Existing Club regression reruns: **85 native** and **31 portable** checks, including existing performance/share/import flows and three-car show-card exports. Historical full exterior matrices remain intact.
- Brand-site checks: **70**, all eight pages at 390/1440 widths, decoded images, local links, mobile navigation, website→game→website roundtrip under `/sundaerun/`, and an explicitly local demo signup.

`npm run build:standalone` passed at **83,032,635 bytes**, 68 runtime images, within the unchanged 96 MiB budget. HTML SHA-256: `891ed9c23a865c56589d38432b25f0976a40ee93fe76b9c02d82de460f1ba190`. The download ZIP is **61,622,068 bytes**, SHA-256 `dc4a1711538844a949e98e4c14c1eb38648e2b22c4798a08bb819484940c23a1`. CRC and exact embedded HTML bytes match the tested file. Direct `file://` navigation remains untested under the managed browser policy; offline proof used HTTP with every additional request blocked. Detailed fingerprints and deduplicated coverage are in `qa/expansion/release.json`, `coverage.json` and `build-provenance.json`.

### Website integration and delivery limits

The supplied brand website is integrated at **`public/website/`**, while the established game remains at the root URL. Its Play page launches the game; Build Club links back to the brand site. Original clothing artwork and the separate intake remain unchanged. Current game/cabin images and build-and-show copy replace obsolete management-game marketing. Fonts are bundled locally with licenses, and link arrows use SVG. Clothing checkout and community signup remain previews without payment/email services.

Cabins are fixed left-hand-drive illustrations with two coordinated packages per model; independent seat/knob/mat/lighting selections, right-hand-drive art and exterior-linked cabin paint remain future work. Performance ratings are fictional. Real regional retailer/affiliate offers, verified physical fitment, online accounts/gallery/voting and clothing checkout are not configured. Browser-local progress and portable codes/images remain the current sharing model.

The existing automatic GitHub Pages workflow is retained without visibility/credential changes. A main push triggers deployment; source/download publication is distinct from verification of a completed live deployment. Public-host/API access from this environment remains restricted, so no fresh live-site browser success or independent cloud-task restoration is claimed.

### Uploaded website merge confirmation and live verification — 2026-10-21

The website ZIP supplied in this chat has SHA-256 `a1e173a836ad3d45f8d8740a2525d1df68197306eadee9d45ea0ecfa1998c7c5`, exactly matching the intake already integrated in `e1c23a1`. Fast-forwarded the local checkout to the newer main rather than overwrite the five-car game or duplicate/move the website. All 13 original website images and apparel originals match this ZIP byte-for-byte. Existing routes are retained: `/sundaerun/` for the game, `/sundaerun/website/` for the brand site, and `/sundaerun/website/shop.html` for the collection.

Confirmed Pages run https://github.com/bukenbekruip/sundaerun/actions/runs/39595381851 succeeded. Reproduced dependencies with `npm ci --cache /tmp/sundaerun-npm-cache`; all 39 tests and the production build passed. All 32 website files and game HTML/CSS/JS entry files on the public host returned HTTP 200 and matched local production SHA-256 hashes.

Ran the existing website-browser suite against the actual HTTPS site by overriding only its BASE/OUT constants in memory. All **70 checks passed** across eight pages at 390×844 and 1440×1000: images decode, navigation targets exist, no horizontal overflow, mobile menu state, website→five-car game→website roundtrip, and demo signup without submission. No page, console or HTTP errors. Visually inspected live home/shop desktop and mobile screenshots. Evidence in this instance: `/tmp/sundaerun-merged-website-qa/website-results.json`, screenshots in that directory, and `/tmp/sundaerun-merged-live-files.json`. Chromium used the previously prepared isolated browser HOME with the supplied environment proxy CA trusted; TLS checks remained enabled. Mobile checks use viewport emulation, not physical devices.

The earlier public-host limitation is resolved in this instance. No game source, design, functionality, original artwork or portable ZIP was changed by this merge-confirmation work. Clothing checkout, CMS/CRM integration and live email signup remain outside this request and are not configured.

## Per-car engine sounds and direct modification menus — 2026-10-21

The user's request for engine sounds and easier modification navigation is implemented. STI has an uneven turbo boxer-four character, Porsche a flat-six character, Toyota 86 an even boxer-four, M3 an inline-six with more rasp, and Golf a turbo inline-four. These are authored Web Audio synthesis concepts, not authentic recordings or verified manufacturer specifications. Intake choices change induction noise, exhaust choices change filtering/harmonics, and tunes change rev response plus the game rev ceiling. All synthesis runs locally and is embedded in the portable game without external media downloads.

**Sound** opens Start/Stop, Hold to rev (pointer or keyboard), throttle and volume. Sound requires an explicit user gesture, always reloads off, releases throttle on blur and stops when the page is hidden. Only volume is remembered separately from garage progress. One AudioContext serves all five cars. Running sound follows the selected car's fitted performance recipe; exterior previews do not install or alter upgrades.

**Performance** gives every part a free four-second **Listen** audition. An audition changes no purchases, fitted state or credits, then restores the fitted sound; it stops automatically if the engine was originally off. Changing sections, closing or ending the preview cancels it, including when an audio-resume promise is pending. Only Fit spends game credits under the existing atomic per-car ownership rules. Normal running audio can continue while browsing the garage.

Interior, Performance and Sound are now direct entries beside Tyres, Wheels, Paint, Suspension and Body kit. The eight categories fit in the left desktop menu and a visible four-column/two-row phone grid. The Club dialog retains saved builds, briefs and import, uses the current section as its heading, and keeps the heading/Close available while scrolling. Performance's optional audio controls expand automatically for Listen. Sound controls precede long descriptions on small phones.

The standalone scanner initially mistook the new object property `import: "Import a build"` for a module import. It now recognizes that property syntax while continuing to reject actual static/dynamic imports, re-exports, CommonJS requires and file-relative new URL references; a regression test exercises both acceptance and rejection. The self-contained artifact gate was retained.

### Verification and evidence

All **44 Node tests pass**. The final normal and portable sound/navigation suites each pass **61 checks**, including real AnalyserNode signal output and zero-volume silence, all five live voice switches, upgrade transactions, free audition restoration, no reload autoplay, page-hidden silence, pending-resume cancellation, unsupported-browser behavior and direct navigation at 320/360/390/768/1366/1920 widths. No page, console, HTTP or additional portable network errors occurred.

The production voice graph also passed **40 OfflineAudioContext renders**: stock, six individual upgrade choices and the combined upgraded recipe for each model. Useful signal energy, bounded peaks, low DC and distinct PCM output are recorded; a stock/upgraded WAV montage is retained. This is signal/behavior verification, not a claim of an expert listening review, authentic recordings, physical-phone testing or cross-browser audio certification.

Existing Club and five-car cabin suites were rerun on the final normal and portable artifacts. See `qa/sound-navigation/` for exact report counts, screenshots, audio, frozen source hashes and release fingerprints. The inspected exterior colour/wheel loop remains visually coherent; original asset references, renderers, registry and purchase/state logic are unchanged. The earlier five-car paint/mechanical matrices remain historical rather than being counted as fresh coverage.

The newer remote website-verification commit `97a6a9c` was fast-forwarded intact before publication. It records the prior release's successful live Pages run; this sound update has its own local production/portable evidence. A fresh request to the public host in this task still failed at the CONNECT proxy with 403, so a completed live sound deployment is not claimed. The existing Pages workflow remains intact; pushing main triggers it. Direct file:// testing is still blocked by the managed browser; portable proof uses HTTP with all further requests blocked.

Final regression counts: **85 native / 31 portable Club checks**, **73 native / 74 portable five-car cabin checks**. The final portable HTML is **83,047,965 bytes**, SHA-256 `c4c016e1ee5ffc61092dac9fa5f3cdb7c97537b0bf6649ce30a3d87e1752ce7a`; the download ZIP is **61,628,283 bytes**, SHA-256 `f2cad3629c676228e68bc80e428bc9e0bbb2243a4016b708d2c1a3ad0b9a451e`. CRC and exact embedded HTML bytes were verified. Both remain below the existing budgets, with all 68 runtime images and no external audio requests. `qa/sound-navigation/release.json` ties the reports, source and archive together.


## Audi RS3 Sportback, expanded interiors and independent steering — 2026-10-21

The user requested an Audi RS3 hatchback, more interiors and steering choices within Interior, and criticized the first sound pass. They confirmed the **modern RS3 8Y Sportback**, **Heritage tan** and **Track Alcantara** styles. The game now has six models, each retaining six rims, twelve paints and the three tyre/suspension/body choices. Four cabin packages per model are Original (included), Sundae Club (1,800 credits), Heritage tan (2,300) and Track Alcantara (2,600).

Interior has two explicit sections: **Cabin packages** and **Steering wheel**. Independent Factory (included), Alcantara sport retrim (900) and Carbon performance retrim (1,600) choices have a close-up, per-car ownership and free owned refits. Steering changes the rim material/centre marker while retaining OEM geometry, hub, controls and airbag illustration. It does not claim a fully different aftermarket wheel shape or verified physical compatibility. Cabin and steering fit independently and are included in immutable named snapshots, SR1 recipes and fitted cabin PNG cards. Old saves/recipes default to factory steering and retain existing purchases, balance, builds and rewards; the Audi starts unowned.

Twenty-four new image_gen originals supplied ten Audi exterior assets and fourteen new cabins. Source mappings/provenance and distribution hashes are committed; original generated files were left intact. Read-only audits confirm all ten Audi PNG/WebP pairs preserve native dimensions and every alpha byte. All **60 prior distributed car/upgrade/cabin assets** remain byte-identical to the preceding release. New Audi paint exclusions were refined after a white-paint review exposed blue quarter/arch/pillar/intake patches. Final six-rim paint sheets, mechanical/max sheets, all six 12-tile interior/steering sheets, phone layouts, steering close-ups and the existing STI alternate-wheel/black/mint/blue sequence were inspected. The asset registry and renderer remain camera-registered; no independent wheel scaling or fake car overlays were introduced.

### Sound revision and limits

The sound revision replaces the regular sine pressure pulse with fast combustion pressure/decay, finite pipe reflections and small firing-strength variation. Filtered boost noise replaces the continuous sine turbo whistle. An RS3 turbo inline-five profile is added. A shared high-frequency mechanical residual comes from the CC0 `buntine/CarEngines` recording; its original, licence, authoring helper, source/PCM hashes and processing record are retained. Unclear-licence sources were inspected but not used. These remain **sample-assisted engine concepts, not authenticated recordings of the six real models**. Signal tests establish output/variation and do not claim an expert listening review or exact real-engine fidelity.

### Final verification

- **48 Node tests passed**, including six-car ownership/migration, four actual cabin assets per model, independent steering transactions, immutable recipes/backwards sharing, CC0 source fingerprints, original artwork preservation, decoded PNG/upgrade geometry, and **11,664 exterior availability keys**. Enumeration is distinct from browser coverage.
- Cabin/steering suites: **156 native / 157 portable checks**, with all **72 combinations** exercised in each artifact. Rim-region edits preserve the hub/cabin/alpha, free previews do not mutate saves, all six real UI purchase flows/refits retain exact credits, and reload restores fitted choices. Fitted Heritage/carbon PNG pixels exactly match the fitted preview even while a different cabin is previewed. Earlier snapshots remain unchanged and share codes retain both selections.
- Sound/navigation suites: **62 native / 62 portable checks**, including actual AnalyserNode energy/silence, six live voice switches within one AudioContext, free auditions, fitting, throttle/rev/volume, hidden-page stop, no reload autoplay, late permission cancellation, unavailable-browser handling and direct menus across six widths. **48 OfflineAudioContext renders** cover stock, each individual upgrade choice and the combined recipe for every car.
- New Audi exterior coverage: **72 native baseline paints, 27 blue mechanical builds and 12 white/black maximum builds**; portable coverage uses **24 baseline paints, the same 27 mechanics and 12 maximum builds**. Strict mask/alpha, independent glass/lamp/badge/wheel/contact, quote and layout assertions passed: **2,853 native / 1,605 portable checks**. Deduplicated keys are recorded in `coverage.json`; these selected cases are not a claim that all 1,944 Audi configurations were rendered in the browser.
- Existing Club regression: **85 native / 31 portable checks**. Legacy renderer checks: **13**, including nine pixel identities for the three original models. Missing-image/retry/late-load checks: **7**. Website/game project-path checks: **70**, at phone/desktop sizes across eight brand pages. Normal flows have no page/console/HTTP failures. Intentionally blocked-image errors are labelled separately.

Earlier failing reports are retained and explained in `qa/rs3-interiors/REVIEW.md`: stale five-car count fixtures, an over-spent new unit-test fixture, a development HMR interruption and a newest/oldest shared-card selector mistake were corrected without weakening purchase/credit/mask protections. Final browser suites use the frozen production source and exact portable fingerprint. `scripts/package-playable.py` gates release on passed reports, all 72 interior combinations, prior-asset preservation and matching artifact/source hashes, then checks archive CRC and embedded bytes.

The portable artifact is **92,175,723 bytes** (92 runtime images), SHA-256 `2eaf8cda99f664e4dbebccb3aee7afa84879bd5ae2974ee36fc714a0a53f42b8`, inside the unchanged 96 MiB budget. The ZIP is **68,522,414 bytes**, SHA-256 `b2b05f6da117c1e6ed95d4162eb83e19d1753d2e8c48835f077842fa25000db3`; it contains the exact tested HTML and font/engine-texture licences. Native/portable unique new exterior keys are **110 / 62** after deduplication. Direct file:// remains untested under the managed browser; offline proof uses HTTP with every extra request blocked.

The existing Pages workflow and website routes are retained; the brand site's text now reflects six cars. Clothing checkout, online accounts/gallery, real retailer/affiliate offers/verified fitment, independent seats/knobs/mats, right-hand-drive cabins and fully different aftermarket wheel shapes remain unconfigured. Source/download publication and the resulting Pages workflow are checked separately; a workflow deployment success is not described as a fresh public-host browser audit.


## Website shirt logo and expanded kids’ collection — 2026-10-22

The user requested the website use the Sundae Run logo printed on the shirts and add more kids’ designs, especially for girls. A transparent redraw of the original front-chest soft-serve/cherry and stacked SUNDAE RUN lettering now replaces the prior three-scoop/script website identity in all eight pages’ headers, footers and favicons, plus the Our Story illustration. The game remains unchanged.

Four original image_gen mockups add **Cherry Club** (pink/cherries/checkerboard/classic coupe), **Daisy Drive** (yellow/daisies/lilac coupe), **Lilac Racers** (lilac/peach rally car/flags/stars) and **Mint Mini Crew** (mint/coastal yellow hatchback). The first three form a girls’ edit; Mint Mini Crew joins the retained kids’ originals. There are now eight apparel previews: six kids’ and two adult. Shop jump links and native full-size image links support browsing; the home page promotes the new range. Clothing remains a coming-soon preview without checkout or stock/size/manufacturing claims.

The final normal production build passes **48 Node tests, 65 clothing browser checks across six widths (320–1440), and 70 website/game roundtrip checks** across eight pages at phone/desktop sizes under the Pages project path. Screenshots were inspected, and no page, console or HTTP errors occurred. The tablet header uses its menu below 920 pixels. A visual review corrected fixed-height image whitespace; final browser checks assert 3:2 card geometry. SVG replaces an unavailable arrow glyph. The initial fixture failure, including its incorrect 1500-pixel minimum for retained 1350-pixel originals, is retained and explained in `qa/website-kids/REVIEW.md`.

All supplied apparel originals and previous distributed shirts are preserved byte-for-byte. Five untouched new PNG sources and distribution hashes are recorded in `docs/WEBSITE_APPAREL_ART.json`; encoding preserves their native dimensions and alpha. The website-only change does not rebuild the existing game ZIP. `qa/website-kids/release.json` records the final source/build/report and unchanged download fingerprints. Publication is verified separately through the Pages workflow.


## Official-domain GitHub Pages preparation — 2026-10-23

The user requested **www.sundaerun.com** as the primary website address, automatic GitHub Actions deployment, the existing website/shop/game preserved, apex-to-www redirection and no email DNS changes. A deployment-only `build:pages` assembly now publishes the unchanged website design at `/`, the shop at `/shop.html` and the complete game asset tree at `/garage/`. All eight existing `/website/` pages remain available; their canonical links point to the root website. Normal development and portable builds retain the prior layout, and the existing game ZIP remains unchanged.

The production artifact includes `CNAME` with www.sundaerun.com, canonical URLs, sitemap, robots and `.nojekyll`. The existing pinned Pages workflow runs Node tests and the production assembly/asset gate, then applies the custom domain through its own Pages write permission and deploys. The direct repository integration returned 403 for changing Pages settings; its read access remains available to verify the actual saved domain after Actions runs. The workflow can enforce HTTPS once the official host’s certificate is approved. Certificate approval and live redirects await DNS.

Local evidence in `qa/custom-domain/`: **51 Node tests, 70 root-route website/game checks, 70 legacy-route checks, 65 clothing checks, 156 cabin/steering checks and 62 sound/navigation checks** passed. The complete rebuilt artifact matches the browser-tested file fingerprints. The build gate verifies 540 local references, 92 runtime game images and 17 HTML routes. Production website, collection and phone game screenshots were inspected. No game logic, original/distributed art, website design source or download ZIP changed.

`docs/GITHUB_PAGES_DOMAIN.md` gives the GitHub Pages hostname **bukenbekruip.github.io**, GoDaddy www CNAME and apex A records, optional IPv6 and post-DNS/HTTPS checks. No registrar or email DNS records are modified. Local tests and an Actions deployment are distinct from successful public DNS, certificate or apex-redirect checks. Actual publication and Pages configuration are checked separately.


The first official-domain Actions run `39932990351` passed tests/build but failed while changing the Pages custom-domain setting; the saved CNAME remained null. The workflow was corrected to warn explicitly when the setting requires an administrator and still deploy the tested code. Custom-domain and HTTPS settings must be checked independently of deployment success. Repository Settings → Pages provides the manual www.sundaerun.com save step before GoDaddy DNS. The artifact is unchanged by this workflow-only correction.

## Design-preserving architecture/security refactor — 2026-10-23

The user requested a complete repository audit and maintainability/security work on a separate branch and PR, with no merge or live deployment. The audit inventoried 1,182 tracked files before application changes. Work is isolated on `refactor/production-structure`; [the audit](ARCHITECTURE_AUDIT.md), [development guide](DEVELOPMENT.md) and [review report](REFACTOR_REVIEW.md) document scope, stack selection, source ownership, results and remaining risks. Static HTML/CSS/ES modules and Vite are retained; no React/TypeScript rewrite or replacement game was introduced.

Shared static chrome, ordered CSS modules/tokens, cohesive garage UI/storage/image helpers, safer no-script demo forms, keyboard navigation and a production CSP improve the existing code. A separate read-only PR workflow builds both base and branch and cannot deploy. The existing Pages deployment workflow, CNAME, artwork, fonts, renderer/audio algorithms, save schema/key and shipped ZIP remain intact.

Final local evidence in [qa/refactor](../qa/refactor/README.md): **54 Node tests; 70 root + 70 legacy website checks; 65 clothing; 156 native + 157 portable interior/steering; 62 native + 62 portable sound; 85 Club; 7 intentional image-failure/retry checks; 12 keyboard/privacy/security checks; six development smoke checks**. The Pages gate verifies 594 local references, 92 game images and 17 HTML routes. A rebuild reproduces all 267 tested production files byte-for-byte. Fresh portable HTML is 92,177,315 bytes, SHA-256 `fde40669737060daba7e715b1661701981c269d8a4b8925ee494dea288cf5aef`; it does not replace the existing ZIP.

The final 51-frame comparison preserves all 24 website frames exactly. Twenty-seven game frames remain within the explicit rasterization tolerance (actual maxima 28 changed pixels and 10 levels per channel); unchanged-baseline repetition demonstrates slight edge-rendering variation. Default STI, alternate wheel, black/mint/blue, six cars, cabins and responsive layouts were inspected. Five existing axe contrast findings remain unchanged on four pages and are disclosed rather than silently altering brand colours. Normal browser flows have no page/console/HTTP errors; deliberate CSP/image rejection is labelled separately.

Npm advisory and current/history/archive common-secret-pattern checks passed. Auditing the Python QA tools found 35 Pillow 12.3 advisories; the pin was upgraded to patched 13.0.0, the dependency audit passed and visual comparisons were rerun with it. The initial PR CI cache-path failure was corrected; actual CI status is verified separately in the PR. A read-only hosting check confirms the www CNAME but still reports HTTPS enforcement disabled; the review flags that existing production follow-up without changing settings or claiming a public TLS audit. These results are scoped Chromium/local checks, not full WCAG, penetration, physical-device or cross-browser certification. No registrar/email changes, merge or refactor production deployment were performed.

## International and South African Events calendar — 2026-10-25

The user requested automatically updated major international motorsport and South African events nationwide, including small club events and fun runs, then selected **official calendars first**. PR #2 adds the Events page, shared navigation and Home/Community previews while retaining the brand and six-car game. Native modules implement safe cards, filters, paging, provenance and stale/fallback states. The Node updater reads approved public calendars, validates actual dates/locations, restricts international sources to the editorial allowlist, excludes foreign local/placeholder records and retains earlier source verification timestamps through outages. No web-wide search/LLM API is configured or needed for this first release.

The reviewed preview has **72 listings (32 international / 40 South African)** from seven working calendars. Manual source refresh run `40179936807` successfully committed only the review-branch JSON and skipped deployment. The new main-only publication/deployment path is configured for 06:15 SAST daily; a separate approval/merge is required before the new feature becomes live. See [the operations guide](EVENTS_CALENDAR.md) and [qa/events/REVIEW.md](../qa/events/REVIEW.md).

Final local evidence: **65 Node tests, 53 Events browser checks, 78 root + 78 legacy website checks, 65 clothing checks**, lint/format/build/data gates, zero npm advisories and no common-secret-pattern findings. Eighteen unchanged website main-content frames match exactly; 27 game frames remain within the documented rendering allowance (actual maxima 28 pixels / 20 channel levels). Source/advisory/secret limits and intentional navigation/preview changes are disclosed. The existing game/artwork/fonts/save/audio/ZIP, Pages deploy workflow and www CNAME remain unchanged. Final GitHub CI status is checked in the PR, separately from these local results. No Events merge, live deployment or DNS/email change was performed.
