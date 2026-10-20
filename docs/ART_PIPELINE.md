# Sundae Run artwork production

Created with `image_gen` edits from the approved screenshot. The approved original remains unchanged at `reference/APPROVED_BLUE_STI_SCREEN.png`. All generated originals remain under `/workspace/generated_images`; published copies are byte-for-byte copies, with no Python image editing.

## Assets

`public/assets/scene/` contains:

- `garage-plate.png`: 1672×941 RGB clean branded workshop and circular gold platform, with car and all baked interface removed.
- `blue-sr-01.png`, `black-sr-01.png`, `mint-sr-01.png`: coherent complete-car transparent cutouts with the original bronze multispoke wheel concept.
- `blue-te37.png`, `black-te37.png`, `mint-te37.png`: coherent complete-car transparent cutouts with paired bronze six-spoke wheel concept.
- `garage-logo.png`: 2048×768 transparent horizontal sundae/cherry, white Sundae Run Garage wordmark and red underline.
- `manifest.json`: native dimensions, SHA-256, alpha bounding boxes, provenance and shared registration.

## Registration

All car images use one logical 1672×941 source canvas, then ONE shared uniform transformation into the 1672×941 approved stage:

```
scale = 6/11
left = 418.2727272727
top = 169.6363636364
rendered canvas width = 912
rendered canvas height = 513.2727272727
```

The blue original-wheel opaque source bounds at alpha ≥128 are `(38,177,1666,811)`, mapped to approximately `(439,266.18,1327,612)`. This fits the approved car silhouette zone and preserves both complete tyre contacts on the platform. Parent visually inspected the static composite at `qa/current/gate-a-static-blue.png` and confirmed viable registration.

The image tool introduces minor native-dimension variance: widths 1670–1672, and mint/six-spoke height 942 instead of 941. Opaque edges vary by up to five source pixels (under three stage pixels at this scale). Render through a common logical canvas and shared transform; never crop-to-content or independently fit body/wheels per variant. Browser screenshots must confirm stable switching.

## Visual checks and limits

Inspected all generated results. Both visible six-spoke wheels are coherent, perspective-correct relative to their arches, and clearly distinct from the multispoke set. Black and mint variants preserve the overall vehicle geometry, glass, lights, badges and bronze wheels without rectangular paint overlays. The static background cannot be tinted by a car change because it is a separate unchanged image.

These are matched whole-car concept illustrations, not licensed manufacturer product renders or a real-world fitment guarantee. Image edits can introduce minor reflection/detail changes; do not describe them as mathematically identical outside paint/wheel pixels. No arbitrary recoloring, fake circular rim overlays or independently scaled wheel/body layers were used.

Any future real product preview needs a licensed matched-camera pair of wheel renders or coherent full-car variants, calibrated against the same camera and contact anchors. Affiliate links and merchant metadata do not themselves provide verified physical fitment or matching product artwork.

Current visual review and browser evidence are recorded in `docs/PROGRESS_AND_TEST_RESULTS.md` and `qa/current/`. Future artwork changes must repeat that inspection before being enabled.

## Product thumbnails

The two enabled wheel concepts use fresh transparent product images in `public/assets/products/`. Their source renders were inspected on the live charcoal cards. The old selected SR-01 thumbnail included a baked green check and frame; it is not used for either enabled product. Only the DOM supplies the active checkmark.
