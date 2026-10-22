# Website shirt identity and kids’ clothing — 22 October 2026

The website now uses a transparent redraw of the **small front-chest soft-serve/cherry, stacked SUNDAE RUN logo** from the original Pit Stop shirt. This replaces the different three-scoop/script identity in the header, footer, favicon and Our Story illustration across eight pages. The game’s branding and artwork are unchanged.

Four new front/back kids’ shirt concepts extend the collection to **eight designs: two adult and six kids’ styles**:

- **Cherry Club:** dusty pink, cherry/checkerboard and classic coupe.
- **Daisy Drive:** butter yellow, daisies and a lilac road-trip coupe.
- **Lilac Racers:** lilac, peach rally car, checkered flags and stars.
- **Mint Mini Crew:** mint, coastal yellow hatchback and surfboard.

The first three appear in a dedicated girls’ edit, welcoming any kid who likes the designs. Mint Mini Crew joins the two retained kids’ originals. Shop collection links jump to Girls’ edit, Kids’ crew and Adults; every shop image opens its full-size artwork in a new tab. The home page highlights the new range. The collection remains clearly marked **not yet for sale**, with no checkout, stock, size availability or manufacturing claims.

## Evidence

- **48 Node tests pass**, and the normal Vite production build succeeds.
- **65 clothing browser checks pass** at 320, 390, 768, 820, 1024 and 1440 CSS pixels: counts, new designs, complete landscape artwork, working full-size popup links, legible header logo, viewport fit, actual tablet navigation, collection anchors below the sticky header and preview labels. No console, page or HTTP errors.
- **70 website/game checks pass** under `/sundaerun/`: all eight pages at phone/desktop widths, images decode, local links resolve, no horizontal overflow, mobile menu works, the six-car game opens, switching to the M3 works and the game links back to the website. Signup remains a local demo.
- `clothing/` contains actual viewport screenshots including the sticky header. Isolated collection/footer screenshots temporarily hide only that header through Playwright’s screenshot style option so it does not float across tall section captures. Desktop/phone girls’ and kids’ sections, tablet header, footer and complete home/shop screenshots were inspected.
- `docs/WEBSITE_APPAREL_ART.json` records five image_gen originals, supplied references and distribution fingerprints. PNG originals remain untouched in `reference/website-kids-2026/` and `/workspace/generated_images/`. WebP encoding preserves native dimensions and all alpha bytes; logo encoding is lossless. All five supplied apparel/logo PNGs and four prior distributed shirt images remain byte-identical.
- `release.json` ties the final sources, production website and reports together and records the unchanged game ZIP fingerprint. This website-only update does not repackage the game or claim a new portable game audit.

The first visual review exposed a fixed 1024-pixel image height inherited from HTML dimension attributes. `height:auto` now preserves the intended 3:2 landscape cards, with a browser assertion for their actual rendered ratio. The initial clothing fixture also incorrectly required 1500-pixel originals; retained original distribution images are 1350 pixels wide, so the fixture now checks at least 1300 while asserting decoded images and complete geometry. The initial failed report/log/screenshot are retained separately. An unsupported Unicode arrow was replaced with the site’s existing SVG arrow. The tablet menu now activates at 920 pixels to keep header controls within the viewport.

Local proof uses Chromium and a production static server at `http://127.0.0.1:4184/sundaerun/`. Publication is checked separately through the GitHub Pages workflow; a successful deployment does not imply a fresh public-host browser audit.
