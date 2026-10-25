# Events calendar: sources, publishing and operations

The Events page covers **major international motorsport** and **South African events nationwide**, including regional racing, track days, karting, drifting, drag racing, club meets and fun runs. The user selected **official calendars first**, rather than web-wide discovery. No search API, LLM service or visitor-location permission is required for this release.

The page, header/footer link and homepage/Community previews extend the existing brand. The six-car garage, its assets/save format/audio and the shipped download ZIP are unchanged. Work is isolated in PR #2; adding a scheduled workflow on this branch does not activate a production schedule or authorize deployment.

## Editorial policy and current sources

International publication requires a configured series identifier from an explicit allowlist. The initial active sources are **Formula 1, MotoGP, WRC and FIA WEC**, including Le Mans. Eligibility for future IndyCar, Formula E and major-endurance sources is represented in the policy, but those calendars are not advertised as currently monitored. The bot never promotes an arbitrary international event just because its title contains “Grand Prix”.

Local sources are **Motorsport South Africa**, **Zwartkops Raceway** and **BMW Clubs Africa**, with non-South-African club records withheld. A public national/club calendar is not evidence that every record takes place in South Africa: country/address data and a small explicit South African place/province reference are used to classify locations. Unknown provinces remain unassigned; unknown countries are withheld. This is growing source coverage, not an exhaustive list of every private club/social-media/WhatsApp event in the country.

Source configuration lives in `scripts/events/sources.json`. Only approved HTTPS source hosts may be fetched, including redirects. Dezzi was investigated but produced no usable dated records with the supported adapters; it remains a candidate rather than appearing as a working source or receiving invented dates. New organisers and adapters require an ordinary reviewed source-config/code change. No external search results or scraped news publication dates become confirmed events.

## Data rules

- Collect only event facts: title, calendar date/range, place, available organiser name, category, source and official link. No copied articles/images or public contact-email/phone database.
- Accept actual JSON-LD events, iCalendar records and explicit official-series calendar markup. Web-page publication dates are not event dates. Scripts from source pages are never executed.
- Normalize real provider formats, including EventON’s unpadded dates and iCalendar’s exclusive all-day `DTEND`. Do not invent session times. International cards sometimes identify the host country rather than a detailed circuit address; the organiser link supplies the rest.
- Withhold missing/impossible dates, missing/TBA venues, unapproved international series, foreign “local” records, promotional year-long entries and administrative/marketing placeholders.
- Stable source identities and normalized event keys remove duplicate representations. Similar but differently named listings from separate organisers can still require editorial consolidation; unrelated events sharing a venue/date must not be silently merged.
- Ended events leave the upcoming feed; cancellations/postponements are retained in data but excluded from upcoming cards. A successful source refresh replaces that source’s earlier records. A failed/partial source retains earlier confirmed entries with their original verification timestamps. If every source fails, the published file is left unchanged.
- Date-only South African entries expire by the South African calendar day. International entries remain until that date has ended everywhere (UTC−12), so late overseas weekends are not removed at South African midnight. This conservative allowance can retain an already-finished international entry for part of the following South African day; exact finish times are not invented.
- Public cards warn when an individual confirmation is more than three days old; the page warns about delayed source updates or a snapshot older than two days. Visitors are asked to confirm tickets, times, eligibility and changes with the organiser.

`public/website/data/events.json` is the only generated repository file the updater commits. The frontend reads this same-origin JSON and constructs event cards using DOM text nodes; source text cannot become executable markup. Source/category/date/schema/URL validation also gates publication. Browsing/searching does not create accounts, submit personal information, store visitor searches or contact third-party calendars from the visitor’s browser.

## Daily workflow and permissions

`.github/workflows/events.yml` schedules collection at **06:15 South African time** (04:15 UTC). GitHub schedules are best effort. PR collection/testing has read-only repository permissions and does not publish or deploy. The manual default also only collects unless `publish=true` is explicitly selected.

The separate publish job has `contents: write` and stages only the validated calendar JSON. Its validator uses Node built-ins and the shared pure data contract, so this privileged job does not install ingestion/npm dependencies. It revalidates after rebasing and never force-pushes. Publishing is restricted to `main` and this feature’s preview branch; the preview branch cannot deploy. Branch protections are respected, not bypassed.

For scheduled/publish runs on `main`, a final job with `actions: write` dispatches the **unchanged existing Pages deployment workflow** after the data commit. This is necessary because pushes made with `GITHUB_TOKEN` do not themselves trigger the normal push workflow. No Pages/OIDC write permission or registrar credentials are given to the collector. A refresh failure is visible in Actions; it is not relabelled as a successful data update.

After an approved merge, the owner can trigger the first production refresh with:

```sh
gh workflow run events.yml --ref main -f publish=true
```

For read-only collection, omit `publish=true`. A preview refresh on `feature/events-calendar` only updates that review branch. The existing GitHub Pages domain, HTTPS and email DNS settings require no change for Events.

## Source ownership and local checks

| Location | Responsibility |
| --- | --- |
| `public/website/events.html` / `css/events.css` | Branded page and responsive layout |
| `public/website/js/events-*.js` | Safe data loading, filtering, pagination, cards and previews |
| `website/components/events-preview.html` | Shared homepage/Community teaser |
| `scripts/events/parse.mjs` / `series.mjs` | Explicit source formats and official-series adapters |
| `scripts/events/model.mjs` / `geography.mjs` | Normalization, editorial/geographic rules, identity and expiry |
| `scripts/events/refresh.mjs` / `validate.mjs` | Bounded public fetching, resilient snapshots and publish gate |
| `tests/events.test.js` / `tests/events-browser.py` | Date/parser/state/security cases, real snapshot/UI, accessible fallback and preservation comparisons |

```sh
npm run events:refresh
npm run events:validate
npm test
npm run lint
npm run format:check
npm run build:pages
```

Collection needs public-network access. This workspace’s proxy blocks the official calendar sites even after network permission is granted, so live ingestion is tested in the intended GitHub runner. Its generated preview data is committed only to the review branch and then verified locally. No access challenges are bypassed; a source that refuses or lacks usable public data is held/unavailable.

The existing preservation screenshot suite can still compare the complete original refactor with `--scope all`. The Events feature intentionally changes navigation, homepage and Community, so PR CI uses its explicit `--scope game` mode for the unchanged 27 game frames. The Events browser suite separately compares all 18 main-content frames for the six unchanged website pages and inspects the new page/previews across phone/tablet/desktop sizes. A baseline is not regenerated to conceal a design regression.

## Review status

Final snapshot counts, source-refresh evidence, screenshots, browser/build/security results and actual CI conclusion are recorded in PR #2 and `qa/events/`. The feature is not described as live before a separate deployment approval. Official-source coverage can grow without changing the game or introducing a client framework.
