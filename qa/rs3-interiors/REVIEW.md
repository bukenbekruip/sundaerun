# Audi RS3, cabin and steering review — 21 October 2026

The user confirmed the **modern Audi RS3 8Y Sportback**, Heritage tan and Track Alcantara cabin styles. The roster now has six models. Each has four authored cabin packages and independent Factory / Alcantara sport / Carbon performance steering finishes.

## Artwork and scope

Twenty-four new image_gen originals produced six complete Audi rim variants, two registered tyre-material source cars, two sparse carbon accessory layers and fourteen cabin images. All originals remain in the execution workspace; source filenames, published hashes and portable encodings are recorded in `docs/RS3_ART_INPUTS.json` and the appended expansion source manifest. Distribution encoding changes neither native dimensions nor alpha. The previous five cars' **60 distributed artwork assets** are unchanged; `preserved-assets.json` verifies their bytes against commit `088a99c`.

Inspected all generated images, all six complete Audi rim renders, the Audi's white/black/mint previews, and six 12-tile cabin/steering contact sheets. Heritage has distinct cognac/cream leather and diamond stitching; Track has graphite/red Alcantara and carbon accents. Each retains its own dashboard and selector layout. All views remain fixed left-hand-drive illustrations, not 360-degree interiors or independently selected seats/gear knobs/mats.

Steering is a **rim retrim** on each model's own factory wheel. It changes material and centre marker within authored contours; it preserves the hub, airbag illustration, spokes, controls, camera and surrounding cabin. No flat replacement wheel, complete aftermarket shape or physical compatibility is claimed. The new close-up shows these finishes at useful scale. Cabin and steering share one preview but are bought/refitted independently; fitted cabin PNGs use the same renderer.

The first high-contrast Audi review exposed blue patches at the rear quarter, wheel arch, pillar and intake edges despite basic masks working. Those boundaries and overly broad exclusions were corrected before the final artifact was frozen. Final exterior matrices apply strict outside-mask/alpha checks and independent glass/lamp/wheel/badge probes; visual inspection remains separate from numeric checks. Existing paint and upgrade rendering for other models is guarded by nine legacy pixel identities.

## Sound revision

The old regular sine pressure pulse and continuous sine turbo whistle were replaced with faster combustion pressure/decay, finite pipe reflections, small firing-strength variation and filtered boost noise. Audi has a turbo inline-five profile. A high-frequency residual from the CC0 `buntine/CarEngines` sample adds shared mechanical texture; the original recording, full licence, processing helper and exact source/PCM fingerprints are retained. Unclear-licence VDrift and other repositories were inspected but not used.

These are **sample-assisted engine concepts**, not authenticated recordings of any of the six featured models. Signal/render tests demonstrate output and variation; they do not establish that the sound matches a real RS3 or substitute for expert listening. Authentic model-specific recording packs remain a future quality step. Start, rev, throttle, volume, upgrade auditions, hidden-page stop and no-autoplay behavior are retained.

## Verification and retained early evidence

`node-results.txt`, final native/portable reports, the frozen `build-provenance.json` and `release.json` define this release's coverage. Every final cabin/steering suite exercises all **72 combinations**, verifies changed pixels remain in the wheel region while hub/cabin/alpha stay intact, and confirms previews do not alter credit/ownership state. Actual UI transactions for all six models, free refits, immutable saved recipes, shared codes, exact credit balances, reload and fitted-image PNG export are checked. Portable tests block every additional network request and run against the exact packaged HTML hash. Browser viewport checks cover narrow phones and desktop sizes; they are not physical-device certification.

Early reports are intentionally retained. Initial catalogue/count assertions expected five cars and were updated for the newly authorized six; the first exterior matrix stopped at that stale UI count while its 27 mechanical and 12 maximum cases passed. The new steering unit fixture initially tried to buy all packages for every car from one wallet; using independent fresh per-model fixtures corrected the test without changing affordability rules. A development run was interrupted by Vite's reload while source masks were being edited. The first production suite clicked the oldest shared card while expecting the newest recipe; selecting the newest displayed card corrected that harness error. No failed report was relabelled as a pass.

The self-contained game remains inside the existing 96 MiB limit. The packaged ZIP contains the exact tested HTML, opening instructions and font/engine-texture licences. Direct file:// navigation is untested under the managed browser; offline proof loads the single file over HTTP and blocks all other traffic.
