# Events feature review — 25 October 2026

PR #2 adds a dedicated Events page for major international motorsport and South African events nationwide. The user selected **official calendars first**. The implementation keeps the current static HTML/CSS/ES-module/Vite stack and the Sundae Run branding; it does not replace the game or introduce a frontend framework, paid search API or LLM dependency.

## Delivered behavior

- Events navigation/footer link, plus three upcoming listings on Home and Community.
- International/South Africa selection, province/category/date/search controls and 24-card pagination. Each card supplies source, date/location and an HTTPS organiser link; age/outage notices and native official-calendar fallback remain available.
- Official F1, MotoGP, WRC, WEC, Motorsport South Africa, Zwartkops and BMW Clubs Africa adapters. The initial reviewed snapshot contains **72 records: 32 international and 40 South African**, checked at **11:16 SAST on 25 October**. It includes track days, fun runs and club gatherings, not just large races.
- Configured daily refresh at **06:15 SAST**, with validated data-only commits and explicit dispatch of the existing Pages workflow on approved `main` updates. PR collection is read-only; preview publication changes only the review branch. The privileged publisher uses the pure Node validator without installing ingestion/npm dependencies.

The [operations guide](../../docs/EVENTS_CALENDAR.md) records the editorial policy, source ownership, bounded fetching, geographic rules, stale/cancelled/expired handling and deployment process. Source HTML is not executed; no copied source images/articles or private contact database is published. DOM construction uses text nodes rather than inserting event HTML.

## Evidence and validation

| Check | Local result |
| --- | --- |
| Lint, formatting, domain/build/parser tests | Passed; **65 Node tests** |
| Events browser suite | **53 checks passed**; six widths, real source snapshot, filters, paging, stale states, unsafe input, external links, no-script access and scoped axe (**zero findings**) |
| Preserved website content | **18 main-content frames exactly match the pre-feature production baseline** |
| Preserved garage | **27 frames pass**, including STI default/alternate-wheel/black/mint/blue, six models/cabins/performance and responsive layouts; actual maxima **28 changed pixels / 20 levels per channel**, within the existing explicit 128/32 rasterization allowance |
| Website root and legacy routes | **78 + 78 checks passed**, including Events and the six-car game roundtrip |
| Existing clothing experience | **65 checks passed** |
| Production build | **694 local references, 92 runtime game images, 19 HTML routes**; official CNAME/canonicals retained |
| Advisory/pattern checks | npm: **zero known advisories**; current/history/ZIP common-secret-pattern scan: no findings, with scope/limitations retained |
| Source refresh and preview publication | GitHub run **40179936807** passed collect/validate/publish, and correctly **skipped deployment** |
| Privileged-job validator isolation | Validated all 72 records in a minimal directory with no `node_modules` |

`release.json` ties the source/dataset, preserved boundaries, existing ZIP and tested production fingerprints together. The JSON/text reports are actual local results. The two JPEGs are review crops of final browser captures; unaltered full comparison PNGs are CI artifacts, not cropped test inputs. The final-head CI conclusion, including the existing native/portable game regressions and Python advisory gate, is recorded separately in PR #2 before readiness is announced.

Navigation, Home and Community intentionally gain the requested Events feature. The 18 preserved website comparisons cover the six other pages, with the changed header hidden through CSSOM on both sides. The original all-page preservation mode is retained; the feature CI explicitly compares the unchanged game and uses the additional Events/preserved-content suite rather than quietly replacing baselines.

The first draft browser failure came from a test selecting both the header and page `<noscript>` blocks; Playwright also intentionally skips the parent noscript element’s text. The final check targets and verifies the visible fallback paragraph and opens the native official-calendar details. No scripting/CSP bypass was added. Live ingestion also exposed non-padded EventON dates, encoded venue text and flag labels; adapters now normalize those real source formats. Unsupported Dezzi records are held as a candidate, not fabricated or advertised as monitored.

## Preservation and remaining limits

Game source/state/renderers/audio, original/distributed art/fonts, reference/source art, the existing deployment workflow, `public/CNAME` and the shipped ZIP are unchanged. The ZIP remains **68,522,414 bytes**, SHA-256 `b2b05f6da117c1e6ed95d4162eb83e19d1753d2e8c48835f077842fa25000db3`.

This is initial official-source coverage, not every private/social-media event or every world series. Unknown/unsupported facts are withheld; differently named cross-organiser duplicates may need editorial consolidation. Date-only global entries use a conservative UTC−12 expiry allowance, rather than invented finish times. Source markup/availability and GitHub scheduling can change; source provenance, stale notices and Actions results expose those limits. Tickets, session times and entry/membership requirements remain the organiser’s responsibility.

No registrar/email/Pages setting change is required. The new feature is **not deployed by this review**. An approved merge activates the schedule and uses the existing Pages deployment; the bot’s subsequent commits are restricted to the verified JSON file. Full WCAG, physical-device, cross-browser and penetration-test certification are not claimed; existing brand contrast findings remain documented in the earlier refactor report.
