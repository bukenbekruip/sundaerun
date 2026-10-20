# Codex QA progress log

## Handoff baseline — 2026-10-20

- Current root source extracted from `Sundae-Run-STI-Playable-V2.zip`, zip integrity verified.
- Approved screenshot and QA defect captures packaged separately.
- **Known blockers:** merged reference artwork contains rims, car paint, platform, and UI; alternate changes visibly fail.
- **No claim that wheels or paint are fixed.**
- **No new game build or browser visual validation was performed as part of this transfer**; this is a documentation/source handoff.

## Current implementation — 2026-10-20

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

## Remaining scope

Tyres, suspension, body kits and four further wheel previews are unavailable. Real retailer URLs, affiliate accounts, live prices, verified vehicle fitment, a product CMS and click reporting have not been added. The catalogue and product dialog support optional merchant information independently of game credits; see `docs/PRODUCT_CATALOGUE.md`.
