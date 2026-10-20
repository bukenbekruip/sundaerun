# Instructions for Codex — Sundae Run Garage

The user approved the original STI customisation screen and then explicitly requested **the STI, Porsche 911 GT3 RS and Toyota 86, more paint colours and all six rims**. That request supersedes the historical STI-only scope. Read the current `README.md` and `docs/PROGRESS_AND_TEST_RESULTS.md`, then the historical `CODEX_HANDOFF.md`, `docs/FULL_SCREEN_SPECIFICATION.md`, `docs/KNOWN_DEFECTS_AND_ASSETS.md`, and examine `reference/APPROVED_BLUE_STI_SCREEN.png` **before editing**.

The current source uses the clean branded garage plate, registered complete-car wheel renders, authored body-panel paint masks and native HTML controls. Each vehicle keeps its own applied build and owned parts, with a shared credit balance. `OPEN-THIS-GAME.html` and the handover describe the old V2 diagnostic build; `npm run build:standalone` produces the current portable `dist/OPEN-SUNDAE-RUN.html`. The GitHub download copy is `downloads/Sundae-Run-Playable.zip`; update it with the verified build and release hashes when delivering a change. The catalogue supports optional retailer/affiliate information, but no live merchants or verified physical fitment are configured.

## Non-negotiable rules

- **One customisation screen:** support the three requested cars using its vehicle selector. Do not work on the larger Sundae Run website, garage management, staff, jobs or other expansion without a new request.
- Preserve the approved warm branded workshop, circular gold-rimmed platform, blue STI, 3/4 front camera, top HUD, left menu, and bottom wheel/paint/checkout panels. The reference image is the visual truth for the *default appearance*, not an acceptable final flattened-background implementation.
- The original V2 baseline was **BROKEN for actual customisations** even though it could display the approved default image. Keep its defect evidence separate from current results. Scripts running alone do not demonstrate visual correctness.
- **Do not fake art corrections** with circles, CSS distortions, oversized face-on rims, rectangles of tinted pixels, independently scaling the body and wheels, or low-poly 3D primitives.
- Changes to paint must be confined to each car's painted body panels while maintaining metallic light/reflections, glass, badges, trim and the unchanged garage. Changes to wheels must fit BOTH arches in physically plausible scale and perspective without double rims or floating original details. Preserve the authored exclusions and verify pixels outside each paint mask remain unchanged.
- Be transparent about unavailable assets. High-resolution production-quality static scene layers or coherent variant renders are a real prerequisite. If you cannot create them faithfully, report the blocker and deliver a concrete art-asset pipeline—not another unverified game.
- Keep an audit trail in `docs/PROGRESS_AND_TEST_RESULTS.md`. Require visual browser evidence (reference baseline, alternate wheel, black paint, mint paint, back to blue) before claiming success.
- Never ask the user to be your repeated visual QA. Inspect screenshots yourself and reject visible errors before providing a build.
- Prefer actual HTML/CSS for interactive UI, Vite for local development, and use PixiJS/GSAP only if beneficial. No custom fake 3D renderer.
- Do not change original reference artwork; preserve it in `reference/`.
- No fabricated claims of 'pixel perfect', 'fixed', 'production ready', or 'tested' without evidence.

## Historical first-screen milestones

1. Audit current V2 and inventory usable art. Write an asset plan and acknowledge the flattened reference blocker.
2. Produce static, layer-separated, matching-angle **blue STI on the turntable** with perfect wheel alignment. Capture proof at 1672×941. Stop and correct until clean.
3. Prepare **two complete wheel sets**, each with rear/front perspective-correct geometry and masks. Capture before/after wheel screenshots at same reference coordinates.
4. Prepare **blue, black and mint** paint variants or reliable masks. Capture before/after screenshots proving only body paint changed.
5. Implement real UI selection/checkmarks, pricing, Apply Changes, persistence. Fix baked-in static UI artifacts by separating native UI rather than covering old content.
6. Test at 1672×941, 1366×768, 1920×1080. Verify console, 404s, visual diff, contact with platform, checkout and reload. Expand wheel/paint choices only as their art is actually ready.

## Running and checking the current source

```
npm ci
npm test
npm run build:standalone
npm run dev
```

Open Vite's local URL. `OPEN-THIS-GAME.html` is the old offline legacy demo. Browser checks are in `tests/browser-smoke.py` and `tests/portable-smoke.py`; they require Python Playwright, Chromium and a running production preview. Inspect current screenshots as well as test outcomes. Build success does not imply visual correctness.
