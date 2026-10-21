# Engine sound and navigation review — 21 October 2026

The final application is frozen by `build-provenance.json`. Source and portable hashes must still match it at packaging. `release.json` records the final ZIP, embedded HTML and passed report hashes. The previous five-car artwork matrices remain historical in `qa/expansion/`; this change does not repeat or claim a new exhaustive exterior rendering matrix.

## Visual inspection

Inspected the final desktop garage, complete phone menus at 320/390, Performance at 390, Sound at 320, and the native Club alternate-wheel → black → mint → blue screenshots. The workshop, car registration, glass/trim and wheel contact remain intact. The compact eight-row desktop menu ends above checkout panels. Phones display eight categories in a four-column/two-row grid without sideways scrolling. Interior, Performance and Sound open their named section directly. Section headings and Close stay reachable while scrolling the parts list. Sound controls precede longer recipe/explanation text on narrow phones. Performance's engine controls are expandable so the parts remain prominent; Listen opens the controls automatically.

Initial screenshots ending `initial.jpg` predate the compact Performance layout and final control order. `development/sound-results.json` records an early test-harness error: Playwright invoked the function returned by a prototype assignment, causing an illegal AudioContext invocation. The harness now wraps that assignment in an explicit arrow function. This was not an application failure; final native and portable reports include the passed pending-resume cancellation case. Earlier evidence has been retained rather than silently overwritten as a pass.

## Audio evidence and limits

`offline/offline-results.json` contains 40 real OfflineAudioContext renders of the production `createEngineVoice` graph: stock, each of six individual upgrade choices, and the complete upgraded recipe for every car. Every result has finite useful signal energy, a bounded peak, negligible DC and a unique PCM hash. Full upgrades increase high-frequency activity for every model. `offline/five-car-stock-upgraded.wav` retains a short stock/upgraded comparison per model, in STI, Porsche, Toyota 86, M3, Golf order. These numerical/render checks establish signal output and variation; they are not an expert listening review or a claim of authentic engine recordings.

The normal and portable browser suites tap the actual running production audio graph with AnalyserNode. They verify Start, rev/release/keyboard, throttle, real volume-zero silence, five running voice switches within one AudioContext, state isolation, free auditions/restoration, purchases, hiding-page silence, no autoplay after reload, and late permission cancellation. Unsupported audio browsers retain a working garage with a clear unavailable message.

The sound is authored Web Audio synthesis. No recorded manufacturer samples, external audio services, licensed recordings or measured physical engine specifications are included. Testing used headless Chromium and viewport emulation, not physical phones or a cross-browser audio certification. The portable test loads the single HTML over HTTP with all further requests blocked; direct file:// remains untested in this managed browser. The ZIP instructs users to extract and open the HTML locally.

## Existing functionality

Fresh Club and five-car cabin suites exercise credit transactions, saved builds, rewards, share/import, per-car ownership, cabin fitting, reload and PNG exports. Node tests retain original-art and geometry checks, state migrations and all 9,720 exterior availability keys. Original reference artwork, catalogue/state logic, paint/upgrade renderers and the asset registry are unchanged from the five-car release. No real retailer destinations, affiliate accounts, physical fitment or new interior accessories are claimed.
