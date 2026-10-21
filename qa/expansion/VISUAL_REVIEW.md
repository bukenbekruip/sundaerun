# Five-car expansion visual review — 21 October 2026

Reviewed by the primary implementation agent in Chromium at the actual game camera. This is an illustrated concept configurator, not a manufacturer fitment or physical rendering certification.

## Reviewed material

- All twelve new complete M3/Golf rim sources in `new-wheel-bases-contact-sheet.jpg`; each has distinct front/rear wheel geometry and the original three-quarter camera.
- All ten model-specific Original/Club cabin images in `cabins-contact-sheet.jpg`. Subaru, Porsche, Toyota, BMW and Volkswagen retain distinct dashboard/console layouts. Club uses coordinated cherry upholstery, dark seat centres and mats. Porsche retains PDK controls.
- All six final M3 twelve-paint sheets in `final-m3-paint/` and all six Golf twelve-paint sheets in `paint/`. White/black and the saturated materials were examined for blue leftovers, painted glass, lamps, grille and wheel contamination.
- Both 27-combination native mechanical grids in `mechanical-corrected/`, and both twelve-case all-rim white/black maximum-upgrade sheets in `maximum/`. Both tyre contacts remain on the platform; rigid body lowering and attached carbon parts are visually coherent at the authored scale.
- All four new sparse carbon source images, actual cabin dialog captures and native Golf cabin PNG export. Desktop and 320px layout captures were examined; the narrow layout uses scrolling without horizontal clipping.
- Brand homepage desktop screenshot: original cream/pink styling and four apparel designs retained, current game/cabin imagery introduced, build-and-show copy aligned with the playable features.

## Corrections made during review

Initial authored paint exclusions left blue borders around M3 intake/arches/roof and Golf badges/bumper fins. Their new-model paths were corrected against raw coordinate-grid diagnostics before accepting final paint sheets. The initial M3 matrix is superseded by `final-m3-paint`; Golf paths did not change after its complete matrix. Original three-car paths and their artwork remain unchanged.

The first mechanical pixel check detected alpha-1 black noise from the M3 street-kit source at eleven rim pixels. The original PNG was retained. Runtime carbon-part envelopes now exclude unrelated transparent-canvas noise while drawing the registered pieces. The strict rim/contact assertions were retained and the corrected 54-case matrix passed. A final source review expanded the Golf street kit's far-side envelope to retain its two small canards; the final native Golf matrix and portable mechanical checks cover that change.

The website uses locally bundled DM Sans/Space Grotesk fonts and SVG link arrows so it does not depend on Google Fonts or missing platform arrow glyphs. The original website intake and all five apparel source PNGs remain byte-identical.

## Scope and limits

Cabins are fixed left-hand-drive illustrations with two coordinated packages per car. Individual seat/knob/mat/lighting choices, right-hand-drive art, online galleries and real retailer offers remain future work. Exterior paint does not recolour cabin images or their visible mirror housings. Minor generated reflections and small details vary between complete wheel-source renders; identical pixels outside wheels are not claimed across different source images. Portable copies use lossy RGB WebP encoding with exact dimensions and alpha. Passing metadata or browser tests alone does not establish visual correctness.

Current release fingerprints and completed browser statuses are recorded separately in `release.json` and `coverage.json`. Historical evidence folders are preserved.
