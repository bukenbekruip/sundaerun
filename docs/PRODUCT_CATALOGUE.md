# Product catalogue and affiliate links

The garage separates three things: an in-game appearance, a fictional credit price, and an optional real retailer offer. Buying an in-game upgrade never places a real order or spends real money.

## Vehicles and customisation categories

`src/catalogue.js` exports three vehicles: `sti` (Subaru WRX STI), `porsche` (Porsche 911 GT3 RS), and `gt86` (Toyota 86). `VEHICLE` remains an alias for the default STI; use `getVehicle(state.vehicle)` when describing the currently selected car.

The six wheel concepts retain stable IDs: `sr-01`, `te37`, `bbs-lm`, `oz`, `rotiform`, and `work`. The twelve paint choices are `blue`, `black`, `mint`, `white`, `silver`, `graphite`, `red`, `orange`, `purple`, `pink`, `yellow`, and `teal`. Each paint costs 1,200 fictional garage credits. Display finish labels describe the illustration, not a real paint product or verified manufacturer specification.

All three cars initially display blue paint and SR-01 wheels with `road` tyres, `original` suspension and `original` bodywork. The three baseline upgrades are included at no charge. The initial wheel and paint appearance is not an already-purchased upgrade: the first Apply still costs 3,700 credits (2,500 wheels + 1,200 paint) for that vehicle. All real merchant records remain empty until an actual product offer is supplied.

Each additional category has three stable choices:

| Category   | Included baseline                   | First upgrade                          | Second upgrade                       |
| ---------- | ----------------------------------- | -------------------------------------- | ------------------------------------ |
| Tyres      | `road`: performance road, 0 credits | `sport`: semi-slick concept, 1,600     | `track`: slick concept, 2,400        |
| Suspension | `original`: original ride height, 0 | `sport`: sport coilovers, 2,200        | `track`: track coilovers, 3,400      |
| Body       | `original`: current bodywork, 0     | `street`: carbon aero additions, 2,800 | `track`: track aero additions, 4,600 |

Tyre previews retain the original size and profile. The body choices add carbon splitters, canards and sills; they do not promise replacement bumpers or a full widebody conversion. Suspension stance and every visual upgrade remain illustrated concepts, with unverified real fitment. These products use the same separate game-price, merchant and fitment fields as wheels.

## Add a product

Catalogue records live in `src/catalogue.js`. Give each product a stable ID, category, display name, thumbnail, and game-credit price. Existing saved garages use the IDs, so keep an ID stable when editing a name or adding a merchant.

An optional merchant record contains an HTTPS product URL, a real price and currency when known, and whether the URL is an affiliate link. Leave the merchant empty until you have an actual product destination. The UI does not fabricate retailer URLs, live prices, or stock availability.

Use the affiliate URL issued by your chosen retailer or affiliate programme as the product URL. The shop link opens the retailer in a new tab, uses `sponsored`, `noopener`, and `noreferrer`, and shows a commission disclosure when marked as an affiliate link. Revenue depends on the affiliate programme and qualifying purchases; the game itself does not process payments.

## Keep physical fitment separate from artwork

A good-looking preview is not proof that a real wheel or tyre fits a car. Record the supported vehicle and verified fitment data separately. Real wheel records should eventually include diameter, width, offset, bolt pattern and centre bore; tyres need width, aspect ratio, diameter, load and speed ratings. Show unverified fitment plainly rather than inferring it from a render.

The supplied wheel names and pictures are visual references. They are not connected to a merchant or represented as validated real-product fitment.

## Enable a visual preview

Scene assets are registered separately from catalogue products. A wheel can be described without claiming that a finished garage preview exists. Enable a vehicle/wheel render only after it passes the checks in `docs/PROGRESS_AND_TEST_RESULTS.md`.

The renderer uses one complete, registered blue-car image for each vehicle/wheel pair, with a paint renderer confined to body surfaces. The registration keys are `vehicle:wheel` (for example, `porsche:bbs-lm`). `isPreviewAvailable(selection, variants, upgrades)` validates all five selected parts. In addition to a ready base image, a nonbaseline tyre or body selection requires a ready asset in the third map, keyed `vehicle:tyre:option` or `vehicle:body:option`. A nonbaseline suspension requires `suspensionReady: true` on that vehicle/wheel's base image record. A missing tyre/suspension/body field defaults to its included baseline for compatibility; unknown IDs do not enable a preview.

`getVariantKey` retains `vehicle:paint:wheel` for the baseline upgrades (for example, `porsche:red:bbs-lm`). If any upgrade differs from baseline, it appends all three choices: `porsche:red:bbs-lm:sport:sport:street`. This keeps existing baseline cache/test keys stable while distinguishing every upgraded build. An omitted vehicle defaults to `sti`.

Three cars × six wheels require 18 registered base renders. Twelve paint choices give 216 possible appearances only after each base render and its body-only paint treatment have been visually checked. A shared availability flag does not prove paint-mask quality. Preserve camera, wheelbase, tyre contacts, and canvas registration between variants; never paste a merchant's face-on product photo over the car's wheels. Unavailable base renders stay disabled.

## Garage progress and migration

`src/state.js` keeps one shared fictional credit balance and a separate fitted build and purchase list for each car. Buying a part for the STI does not purchase the same part for the Porsche or Toyota. Switching cars discards the unfinished preview and restores that car's fitted wheel, paint, tyre, suspension and body choices. Returning to an owned part or an included baseline on the same car costs no additional credits.

Saved version-4 data uses `garage[vehicleId].applied` and `garage[vehicleId].purchased` as the source of truth. A selection contains `{wheel, paint, tyre, suspension, body}`. Paid purchase keys are typed (`tyre:sport` is different from `suspension:sport`) and scoped to that car. Included baseline parts need no purchase keys. Quotes always contain five itemized lines with `included`, `owned`, and `charge` fields.

Top-level `applied` and `purchased` are derived compatibility views for the active car; they are not separately persisted. The transient `preview` is also omitted from storage, so reloading restores the last applied look rather than silently fitting an unfinished preview.

The storage key remains `sundae-run-garage-v2` intentionally. `loadState` migrates version-2 progress to version 4, retaining the valid credit balance and assigning existing fitted parts and purchases to the STI. It also migrates version-3 multi-car garages without losing any car's applied wheel, paint or purchases. Both migrations supply the free baseline tyre/suspension/body choices. Migration never debits credits. Reset clears progress for all three cars and restores the shared 48,320-credit balance.

## Expand later

The first Build Club milestone adds a separate fictional performance catalogue in `src/club.js`: filters/intakes, exhausts and tunes. Game-credit prices and game ratings do not assert real brands, horsepower gains or installed vehicle compatibility. Each vehicle has separate performance ownership and fitted choices under `club.performance`; old saves receive free stock options. Build codes carry a parts recipe only and never transfer ownership, rewards or a wallet balance. The selected international shopping region is a saved preference; no real offers have been configured for these parts yet.

The data module can later be supplied by a CMS or database without tying merchant information to the drawing code. `getProducts` and `getProduct` accept singular and plural category aliases, and `selectionKinds` defines the five state/pricing fields. Add actual products through this boundary once their fitment records, retailer offers and visual assets are available. A backend for product editing, click reporting, feeds and price refresh is a separate future feature; no such service is needed to run this screen.
