# Sundae Run Garage — STI Customisation Screen

**Build-ready page specification · v1.0 · 19 October 2026**

## 0. Scope and definition of done

Build **one desktop customisation page only**, matching the approved **blue STI on a branded turntable** reference (`REFERENCE.png`). No car selection, staff, expansion, garage economy, free-camera 3D, or other pages. The screenshot is the **visual acceptance target**, not a game asset to use as a background with invisible buttons.

**Target:** believable, high-quality, functioning wheel and paint previews, a selectable left menu, responsive bottom panels, checkout and persisted applied changes. **Do not claim pixel-perfect visual fidelity** until the artwork layers below have been reconstructed, because the reference image is a flattened 1672×941 RGB image with car, wheels, signage, floor and UI merged together.

## 1. Fixed reference geometry

- **Master artboard:** 1672 × 941 px (the actual uploaded reference), aspect ratio approximately 16:9; **do not use 1920×1080 as the source coordinate system**.
- Desktop development preview: 1672×941 at browser zoom 100%. Recommended functional viewport range: 1366×768 to 2560×1440, preserving the 1672×941 coordinate ratios via a scaled stage. On a differently shaped browser window, **letterbox / pillarbox, never crop the car, platform, or checkout**.
- Coordinate rule: every element uses stage-space coordinates. Scale factor `s = min(viewportWidth/1672, viewportHeight/941)`; offset `((viewportWidth - 1672*s)/2, (viewportHeight - 941*s)/2)`; no independently scaled wheel/body/background coordinates. Device-pixel-ratio handled separately for crispness.
- Main reference boxes are recorded precisely enough for initial DOM layout in `LAYOUT.json`. See `ANNOTATED-LAYOUT.jpg`; fine-adjust against `REFERENCE.png` at 1:1 before accepting.

### Key visual regions: [left, top, right, bottom], pixels

| Region | Bounds | Rule |
|---|---:|---|
| Sundae Run top-left logo | [25,0,408,163] | Actual approved logo, readable, not a substitute icon |
| XP bar | [426,15,736,64] | Lv.12 and 1,820/2,500 XP shown as reference placeholders |
| Money + clock + settings | [1109,14,1626,65] | Money $48,320; Tue 9:20 AM; settings gear |
| Left customisation menu | [25,166,271,560] | Five rows; selected functional section highlighted mint |
| Hero STI silhouette zone | [439,265,1327,612] | Blue widebody STI, fully shown, 3/4 angle |
| Platform / rim visible | [256,524,1510,626] | Entire gold-rimmed circular platform inside frame |
| Bottom wheel/tyre panel | [27,626,971,896] | Six rim cards + tabs; no overlap with car |
| Bottom paint panel | [973,626,1346,896] | Finish tabs + colour swatches |
| Bottom checkout panel | [1347,625,1625,895] | Total and Apply Changes button |

**Car placement invariant:** the visible tyre contact points must align with the platform floor plane, with believable cast shadows. The platform must remain visible on all sides of the car as it does in the reference. No floating car, no wheel arch gaps from disconnected layers, no clipped bumper/spoiler, and no UI covering the hero car.

## 2. Visual art direction

- **Environment:** warm golden-hour coastal car workshop; polished floor; two blue lifts; shelves of rims and red tool chests; plants; distant palm trees through the garage doors.
- **Brand identity:** approved Sundae Run dessert/cherry logo at top left, **large branded wall sign** above car, branding on lifts, workshop poster reading `GOOD CARS GOOD PEOPLE BRIGHTER DAYS`. Avoid replacing brand with generic palm icon.
- **Hero:** blue STI with hood scoop, aggressive bodywork, bronze/gold multi-spoke wheels; 3/4 front view facing right; front wheel larger due to perspective. Car should sit squarely on the platform.
- **UI:** dark translucent charcoal/glass panels; warm high-contrast white type; mint-green active/primary controls; rounded cards; carefully restrained shadow/glow. UI foreground must remain legible independent of lighting in underlying garage.
- **Typography:** choose one bundled/licensed web font family with bold/regular weights. Do not rely on image-generated lettering for live, changeable controls.

## 3. Asset separation — mandatory before interactive build

### 3.1 Minimum scene layers

1. `garage_empty_master.webp`: **true empty** workshop background, without car, platform UI overlays or baked wheel graphics, same camera/lighting as reference. If original garage image includes the car, it must be accurately reconstructed behind it. Use the existing stylised workshop image for art reference, not as a claimed pristine background.
2. `platform_clean.webp`: transparent isolated platform, including its perspective shape and highlights; stage center fixed. Separate static floor/contact region as needed.
3. `platform_foreground.webp`: optional lip/foreground occlusion to sit over tyre contact points where the reference requires it.
4. `sti_shell_blue.webp`: transparent, high-quality STI body with **open arches** and no painted-in wheels; preserve reflections, body shape, lights, glazing and shadows. Not just a masked rectangle.
5. `sti_body_paint_mask.png` or **one pre-rendered body** per supported color: recolour paint while preserving realistic reflections and dark trim. For the first interactive version, a limited number of curated pre-rendered body colours is better than naïve CSS filters.
6. `wheel/<model>-rear.webp` and `wheel/<model>-front.webp`: **two separate perspective-correct wheel/tyre renders per design** from matching camera and lighting; include alpha and consistent scale. Do not reuse the same face-on PNG for both positions.
7. `brake_rear.webp`, `brake_front.webp`, `shadow_contact.webp`: coherent mounting and contact layers, with properly scaled brake discs exposed when wheels are removed (later interaction, not v1 acceptance).
8. `brand/logo.png`, `brand/wall-sign.png`, `ui/icons.svg`, `wheels/thumbnails/*.webp`: consistent approved branding and dedicated thumbnails.

**Important:** Existing 2D shell and circular rim images are source material, not proven final perspective-correct production layers. Simply loading PixiJS will not fix their geometry. Do a **static art composite at exactly 1672×941**, signed off visually, **before wiring UI**.

### 3.2 Wheel reference calibration

Approximate visible reference bounds: rear wheel `[458,433,551,563]`, front wheel `[785,425,922,604]` in 1672×941 stage pixels. These are *artwork registration targets*, not guaranteed mechanical axle centres. Actual tyre mask, contact bottom, and hub centres **must be measured** on each final cut-out; record both wheel transforms in one `carConfig.json` with position, x/y scale, rotation/skew (if needed), draw order, and mask. The user must be able to inspect both arches at 100% zoom.

### 3.3 Paint colours

Reference displays 12 swatches in two rows (including blue selected). The first iteration should start with **blue plus two additional fully prepared paint variants** for a real visual test. Add remaining swatches only after each has a trustworthy matching body asset. Until then, unavailable swatches should be disabled rather than recolouring windows, chrome and lights.

## 4. UI component behaviour

### Top HUD

- Brand logo: display and eventually link to garage home (out of scope for this screen).
- Level bar: display `Lv. 12`, `1,820 / 2,500 XP`, static first-pass. Do not present as earned XP.
- Balance: start `$48,320` in fictional game currency. Persist after purchase.
- Day/time: static `Tue 9:20 AM` first-pass; no fake real-time clock.
- Settings: open in-page modal for sound, graphics quality, reset demo progress, close. No unrelated navigation.

### Left section menu

Items in order: `Tyres`, `Wheels`, `Paint`, `Suspension`, `Body Kit`. Selected item has mint fill; others are charcoal. The generated reference highlights **Tyres** while the bottom panel displays **Wheels** — this is inconsistent. For the functioning screen, **Wheels must be selected when Wheels content is shown**; avoid copying this visual bug. Tyres/Paint should show their relevant lower panel; Suspension and Body Kit should show clearly labelled disabled/coming-soon content until supported by separate art and pricing.

### Bottom panels

- Wheel/tyre panel: tabs `Wheels` and `Tyres`, left/right carousel arrows, visible wheel cards, selected outline + check icon. Cards from reference:
  - Sundae Run SR-01 — $2,500
  - Rays TE37 — $2,800
  - BBS LM — $2,800
  - OZ Ultraleggera — $2,800
  - Rotiform TUF-R — $2,400
  - Work Meister S1 — $2,600
- Product names are **visual reference labels**; verify commercial/IP rights before using third-party logos/models in a released game. Thumbnail can be a labelled design placeholder while obtaining appropriate rights.
- Paint panel: tabs `Solid`, `Metallic`, `Special`; displayed 12-swatch grid. Name and item price reflect selected color. Use `WR Blue Pearl — $1,200` as the reference default, but its finish classification is a visual placeholder (avoid asserting a real-world paint specification).
- Checkout: itemized total derived from selected wheel and paint selections; reference shows `$3,700 = $2,500 wheel + $1,200 paint`. CTA says `Apply Changes`.

### Interactions and state

1. Click rim card -> card highlights, both visible wheels change *together* using paired wheel art; price updates; no charge yet.
2. Click a supported paint swatch -> selected swatch highlights, **only paintwork** changes; price updates; no charge yet. Unsupported swatches are visibly disabled until art is ready.
3. Clicking category/tabs changes which controls are shown, not the position of the car or stage.
4. `Apply Changes`: if sufficient fictional balance, confirm selected modifications, subtract exact total once, persist selection + balance in `localStorage`, display a compact success message. On repeated click with no new changes, do **not** charge again. On insufficient funds, block purchase and show clear feedback.
5. `Cancel/Reset Preview`: restore last purchased look without spending balance (can be a small action in the bottom panel).
6. `Settings > Reset Demo`: restore reference default appearance and balance after a confirmation dialog.
7. Keyboard/focus: visible focus rings, tabs and cards keyboard-selectable, buttons have accessible names.

**Do not implement non-working options as if they work.** In particular, tyre profiles, suspension heights and body kits must not be faked using arbitrary scale or CSS distortion of the wheel/body.

## 5. Technical architecture

- **Vite** (already installed on user laptop) serves/builds the page.
- **HTML/CSS** for all crisp readable menu text, panels, inputs, HUD and focus states; visually positioned on the 1672×941 stage.
- **PixiJS 8** for the **centre scene only** when multiple alpha-masked layers or transitions materially help; plain HTML image layering is acceptable if it looks better and is easier to test. Do not use PixiJS as a reason to regenerate the car.
- **GSAP** for controlled 150–350 ms UI transitions (wheel/paint swaps, button feedback), only after static alignment approved.
- **Browser-native localStorage** for purchases. No backend or live economy.
- Assets loaded from `public/assets` with manifest in `src/assets.js`; no paths outside app root. Actual first-run background/art must render without requiring a hidden external API.
- Stage uses strict aspect preservation and a single coordinate transform for **background, platform, car, wheels and overlay anchors**, avoiding the exact mismatch seen in earlier versions.

Suggested project structure:

```text
sundae-run-sti-customize/
  index.html
  package.json
  src/
    main.js
    stage.js
    state.js
    pricing.js
    ui.css
    carConfig.json
    assets.js
  public/assets/
    garage_empty_master.webp
    platform_clean.webp
    platform_foreground.webp
    sti_shell_blue.webp
    wheel/<style>-front.webp
    wheel/<style>-rear.webp
    brand/logo.png
    ...
```

## 6. Build gates — no skipping

**Gate A — Art readiness:** all required files listed, genuinely isolated, aligned with common camera and lighting. Capture screenshot of **unmodified blue STI on platform with NO interactive overlays**. Compare to reference. Fix static composition before progressing.

**Gate B — Layout readiness:** all UI regions placed within ±5 stage pixels of blueprint at 1672×941, typography/icons manually adjusted against reference, all branding visible; entire platform and front bumper remain inside image. Check at 1366×768 and 1920×1080 without clipping.

**Gate C — Wheel proof:** change between two contrasting real wheel sets; both rear and front match angle and size, don't float, don't leave black holes or double rims. Visually inspect at 100% and 200% zoom. Reject if the rear arch or front hub alignment is visibly wrong.

**Gate D — Paint proof:** switch blue → other prepared colour → blue. Body paint changes while windows, headlights, tyres, black trim and garage retain unchanged colours. Reject if the whole image takes on a colour tint.

**Gate E — Checkout:** selected wheel $2,500 + paint $1,200 = $3,700; $48,320 less $3,700 = **$44,620**. Double-click/no-op must not double-charge. Reload must restore applied choices and saved balance; preview-only choices should not debit.

**Gate F — Browser:** no console errors, no 404 assets, no blank stage, no horizontal scrolling, controls respond in Chrome and Edge. Build `npm run build` passes. Record browser screenshots for all states. **Do not hand off on syntax check alone.**

## 7. Explicit out-of-scope for v1

No free 3D orbit camera, no full physics, no staff, no garage expansion, no multi-car selection, no multiplayer, no real-world payment, no online save, no mobile redesign. These can be added after this one scene is approved.

## 8. Actual blocker and decision

**The art compositing is the blocker — not plugin installation.** The source reference is flattened. Extracting wheel-free blue STI, clean garage and platform with seamless occlusions requires deliberate graphics work. We can create an initial frozen, exact-looking stage by displaying `REFERENCE.png`, but **that is not an interactive game**; clickable transparent overlays will not satisfy the requirement for visibly working wheel/paint swaps. Do not present a frozen screenshot as a functioning design.

**Next production action:** deliver a **layer-separated, visually aligned static blue-STI scene** and compare its screenshot side by side with the approved reference. Only after it passes Gate A should we author the menu interactions.
