# Instructions for Codex — Sundae Run Garage

The user has approved **one specific desktop STI customisation screen**. Read `CODEX_HANDOFF.md`, `docs/FULL_SCREEN_SPECIFICATION.md`, `docs/KNOWN_DEFECTS_AND_ASSETS.md`, and examine `reference/APPROVED_BLUE_STI_SCREEN.png` **before editing**.

## Non-negotiable rules

- **One screen only:** STI customisation. Do not work on the larger Sundae Run website, garage management, the Porsche, the Toyota 86, staff, jobs or expansion.
- Preserve the approved warm branded workshop, circular gold-rimmed platform, blue STI, 3/4 front camera, top HUD, left menu, and bottom wheel/paint/checkout panels. The reference image is the visual truth for the *default appearance*, not an acceptable final flattened-background implementation.
- The current V2 source is **BROKEN for actual customisations** even though it can display the approved default image. Do not claim it is fixed merely because scripts run or visual overlays appear.
- **Do not fake art corrections** with circles, CSS distortions, oversized face-on rims, rectangles of tinted pixels, independently scaling the body and wheels, or low-poly 3D primitives.
- Changes to paint must be confined to the STI's painted body panels while maintaining metallic light/reflections, glass, badges, trim and the unchanged garage. Changes to wheels must fit BOTH arches in physically plausible scale and perspective without double rims or floating original details.
- Be transparent about unavailable assets. High-resolution production-quality static scene layers or coherent variant renders are a real prerequisite. If you cannot create them faithfully, report the blocker and deliver a concrete art-asset pipeline—not another unverified game.
- Keep an audit trail in `docs/PROGRESS_AND_TEST_RESULTS.md`. Require visual browser evidence (reference baseline, alternate wheel, black paint, mint paint, back to blue) before claiming success.
- Never ask the user to be your repeated visual QA. Inspect screenshots yourself and reject visible errors before providing a build.
- Prefer actual HTML/CSS for interactive UI, Vite for local development, and use PixiJS/GSAP only if beneficial. No custom fake 3D renderer.
- Do not change original reference artwork; preserve it in `reference/`.
- No fabricated claims of 'pixel perfect', 'fixed', 'production ready', or 'tested' without evidence.

## Proposed staged milestones

1. Audit current V2 and inventory usable art. Write an asset plan and acknowledge the flattened reference blocker.
2. Produce static, layer-separated, matching-angle **blue STI on the turntable** with perfect wheel alignment. Capture proof at 1672×941. Stop and correct until clean.
3. Prepare **two complete wheel sets**, each with rear/front perspective-correct geometry and masks. Capture before/after wheel screenshots at same reference coordinates.
4. Prepare **blue, black and mint** paint variants or reliable masks. Capture before/after screenshots proving only body paint changed.
5. Implement real UI selection/checkmarks, pricing, Apply Changes, persistence. Fix baked-in static UI artifacts by separating native UI rather than covering old content.
6. Test at 1672×941, 1366×768, 1920×1080. Verify console, 404s, visual diff, contact with platform, checkout and reload. Expand wheel/paint choices only as their art is actually ready.

## Running the baseline (for diagnostic use only)

```
npm install
npm run dev
```

Open Vite's local URL. `OPEN-THIS-GAME.html` is the current broken offline legacy demo, not the approved final build. `npm run build` exists but build success does not imply visual correctness.
