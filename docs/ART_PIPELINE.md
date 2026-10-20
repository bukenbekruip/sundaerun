# Sundae Run artwork production

Created with `image_gen` edits from the approved screenshot. The approved original remains unchanged at `reference/APPROVED_BLUE_STI_SCREEN.png`. All generated originals remain under `/workspace/generated_images`; published copies are byte-for-byte copies, with no Python image editing.

## Three-car expansion

The user explicitly expanded the first STI screen to include the Porsche 911 GT3 RS, Toyota 86, all six rim concepts and more paints. These cars share the existing branded garage and camera; there is no new garage-management screen.

The current live art registry is `src/scene.js`. It names **18 complete blue-car renders**, one for each vehicle/wheel pair. The original two blue STI renders remain in `public/assets/scene/`; four additional STI renders and six each for Porsche and Toyota are under `public/assets/cars/{vehicle}/`. Wheels are part of each complete render, so there are no independently scaled wheel overlays or underlying stock spokes.

`public/assets/cars/manifest.json` records all live paths, native dimensions, SHA-256 values, alpha bounds and vehicle transforms. Per-car Porsche/Toyota manifests also retain generated-source provenance. `python3 scripts/audit-scene-assets.py` refreshes metadata without modifying image pixels; it requires Pillow and does not supply visual acceptance.

## Twelve paints

`src/paint-renderer.js` draws the original transparent car to an off-screen browser canvas, then transfers the selected material colour only inside hand-authored body-panel paths. Separate exclusion paths protect complete wheel assemblies, glass, lamps, grilles, carbon trim and badges. A secondary material guard retains warm and neutral reflected light. There is no filter on the garage or on the complete image element.

Blue uses the original source directly. The other eleven finishes keep the source geometry and alpha. The application retains a bounded eight-entry render cache; the renderer does not keep an image for all 216 combinations. No generated paint PNGs need shipping: three cars × six wheel renders × twelve supported materials supplies the combinations at runtime.

These are illustrated material transfers, not measured paint samples or physically based manufacturer simulations. A passing colour-change event does not prove that a panel boundary is right. High-contrast white/red previews must be inspected for remaining blue paint edges, and separate protected-object probes must check that glass, lights and wheels stay unchanged.

## Original first-release assets

`public/assets/scene/` contains:

- `garage-plate.png`: 1672×941 RGB clean branded workshop and circular gold platform, with car and all baked interface removed.
- `blue-sr-01.png`, `black-sr-01.png`, `mint-sr-01.png`: coherent complete-car transparent cutouts with the original bronze multispoke wheel concept.
- `blue-te37.png`, `black-te37.png`, `mint-te37.png`: coherent complete-car transparent cutouts with paired bronze six-spoke wheel concept.
- `garage-logo.png`: 2048×768 transparent horizontal sundae/cherry, white Sundae Run Garage wordmark and red underline.
- `manifest.json`: native dimensions, SHA-256, alpha bounding boxes, provenance and shared registration.

## Registration

All cars use one logical 1672×941 source canvas. The STI and Porsche use the same uniform transformation into the 1672×941 approved stage:

```
scale = 6/11
left = 418.2727272727
top = 169.6363636364
rendered canvas width = 912
rendered canvas height = 513.2727272727
```

The blue original-wheel opaque source bounds at alpha ≥128 are `(38,177,1666,811)`, mapped to approximately `(439,266.18,1327,612)`. This fits the approved car silhouette zone and preserves both complete tyre contacts on the platform. Parent visually inspected the static composite at `qa/current/gate-a-static-blue.png` and confirmed viable registration.

Toyota uses the same scale and horizontal position, with its **entire car** shifted up by `19 × 6/11` stage pixels because its generated tyre contacts were lower on the native canvas. Body, tyres and wheels always move together. Narrow layouts derive positions from the same whole-car transform.

The image tool introduces minor native-dimension and illustration variance: widths 1670–1672 and heights 941–942. Most opaque edges vary by a few source pixels; the STI OZ roof differs by eight source pixels (about four stage pixels). Never crop-to-content or independently fit body/wheels per variant. Browser screenshots must confirm stable switching and each paint mask must cover the variant's actual panels.

## Visual checks and limits

Inspected all generated results. Both visible six-spoke wheels are coherent, perspective-correct relative to their arches, and clearly distinct from the multispoke set. Black and mint variants preserve the overall vehicle geometry, glass, lights, badges and bronze wheels without rectangular paint overlays. The static background cannot be tinted by a car change because it is a separate unchanged image.

These are matched whole-car concept illustrations, not licensed manufacturer product renders or a real-world fitment guarantee. Generated wheel edits can introduce minor reflection/detail changes; do not describe different wheel-source renders as mathematically identical outside wheel pixels. Within a single wheel render, paint tests compare alpha, excluded-object pixels and the separate garage image.

Any future real product preview needs a licensed matched-camera pair of wheel renders or coherent full-car variants, calibrated against the same camera and contact anchors. Affiliate links and merchant metadata do not themselves provide verified physical fitment or matching product artwork.

Current visual review and browser evidence are recorded in `docs/PROGRESS_AND_TEST_RESULTS.md` and `qa/expanded/`. The first release's evidence remains in `qa/current/` as history. Future artwork changes must repeat visual inspection before being enabled.

## Product thumbnails

All six wheel concepts use clean transparent product images in `public/assets/products/`. Their source renders were inspected on the live charcoal cards. The old selected SR-01 thumbnail included a baked green check and frame; none of the current products uses that image. Only the DOM supplies the active checkmark.
