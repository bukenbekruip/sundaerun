# Technical defects, asset audit and fix boundaries

## Confirmed source state

1. `reference/APPROVED_BLUE_STI_SCREEN.png`: 1672×941 RGB approved artwork, no alpha. It embeds car + original bronze rims + platform + workshop + static UI, all in one image.
2. `assets/approved-scene-fixed.jpg`: JPEG derivative of approved state. Embeds same layout plus image-generated labels, checkmarks and wheel appearance.
3. `index.html` uses `#paint-layer` / `#wheel-layer` images over entire approved screen image and invisible interactive hotspots.
4. `app.js` chooses `assets/paint-{color}.webp` and `assets/wheels-{model}.webp` as overlays. Even if placed in the correct region, paint and wheel source information is still visible underneath.
5. `style.css` includes dynamic resets and image layer styling that hide rather than remove baked-in content. This approach is not sufficient for true wheel replacement and clean recolour.
6. The original white 2D STI shell and face-on wheel images in `source-art/` are DIFFERENT view/projection from approved blue STI. They are not 3D models and aren't drop-in art assets.

## Primary defects with expected Codex fix

### Wheels

- Existing bronze rims baked in reference remain visible and conflict with replacement rims.
- Wheel replacements have incorrect front/rear geometric projection and scale.
- Need clean rim-free plate + consistent wheel sprites (rear/front renders separately) with localized arches/occlusion, or matched full car renders for each supported wheel state. Need *no ghost original wheel*.

### Paint

- Overlay generated from approximate blue pixel regions visibly separates from body or affects unwanted regions.
- Need properly masked isolated body surface or artist/renderer-produced complete color variations with correct specular highlights and no light/trim recolouring.

### Selection UI

- Baked-in selected green check marks and outline from reference still exist. Dynamic indicators may leave original checks behind or appear doubled.
- Need replace entire UI controls with live HTML/CSS (likely recreate UI outside car/garage image) OR produce a static clean UI plate without selected badges and lay selections on top. No hybrid ghost markers.

### Platform / perspective

- Approved main car default fits, but previous alternate car shells did not share pose and platform alignment. Do not switch base image to the old white STI unless all scene parts are reconciled.

### Pricing logic

- Verify once-only purchase, back/forward preview, 48,320 -> 44,620 expected for 3,700. Separate 'preview' from 'owned' state. Repeated apply must not charge twice.

## Scope of the prior source

- Latest extracted V2 is included **exactly as received from its verified ZIP** at this repository root, not reimplemented.
- `OPEN-THIS-GAME.html` includes inline assets; **debug the editable source** instead.
- Additional screenshots demonstrate broken art, not acceptance proof.
- Caution: `assets/paint-turquoise.webp` is present despite paint palette specifying mint; inspect actual mapping and naming.

## Artwork-source quality hierarchy

1. Original approved screen is the fixed art-direction reference.
2. Newly made, same-perspective *separated scene layers* if genuine and visually aligned.
3. High-quality matched *whole-car variant images* for limited combinations.
4. Old unaligned transparent standalone assets — for study, not final.
5. Procedural low-poly/flat generated shapes — prohibited as a supposed visual replacement.

## Test evidence required before marking fixed

1. Unaltered reference default vs final default (full-stage screenshot), manual alignment review.
2. Selected TE37 / alternate rims both axes: close crops of front and rear wheels at 2× size; no original spokes remain.
3. Black paint: front/side body highlights preserved; non-painted objects unchanged.
4. Mint paint: same conditions, no floating object or coloured rectangular patch.
5. Switch from modified black/TE37 back to blue/original cleanly.
6. Selected visual indicator correctly follows current card/swatch; no lingering checkmarks.
7. Platform contact is believable; car not stretched/cropped.
8. Automated browser console/network/price/reload tests.

If Gate 2 or Gate 3 fails, **do not ship**.
