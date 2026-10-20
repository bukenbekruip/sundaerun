# Product catalogue and affiliate links

The garage separates three things: an in-game appearance, a fictional credit price, and an optional real retailer offer. Buying an in-game upgrade never places a real order or spends real money.

## Add a product

Catalogue records live in `src/catalogue.js`. Give each product a stable ID, category, display name, thumbnail, and game-credit price. Existing saved garages use the IDs, so keep an ID stable when editing a name or adding a merchant.

An optional merchant record contains an HTTPS product URL, a real price and currency when known, and whether the URL is an affiliate link. Leave the merchant empty until you have an actual product destination. The UI does not fabricate retailer URLs, live prices, or stock availability.

Use the affiliate URL issued by your chosen retailer or affiliate programme as the product URL. The shop link opens the retailer in a new tab, uses `sponsored`, `noopener`, and `noreferrer`, and shows a commission disclosure when marked as an affiliate link. Revenue depends on the affiliate programme and qualifying purchases; the game itself does not process payments.

## Keep physical fitment separate from artwork

A good-looking preview is not proof that a real wheel or tyre fits a car. Record the supported vehicle and verified fitment data separately. Real wheel records should eventually include diameter, width, offset, bolt pattern and centre bore; tyres need width, aspect ratio, diameter, load and speed ratings. Show unverified fitment plainly rather than inferring it from a render.

The supplied wheel names and pictures are visual references. They are not connected to a merchant or represented as validated real-product fitment.

## Enable a visual preview

Scene variants are registered separately from catalogue products. A wheel can be sold or described without claiming that a finished garage preview exists. Enable a preview only after its complete car render passes the checks in `docs/PROGRESS_AND_TEST_RESULTS.md`.

Every supported wheel and paint combination needs a matching-angle render with the same camera, wheelbase, tyre contacts and canvas registration. Unavailable combinations stay disabled. Do not paste a merchant's face-on product photo over the car's wheels.

## Expand later

The data module can later be supplied by a CMS or database without tying merchant information to the drawing code. Add tyre products through the same catalogue boundary once their fitment records and visual assets are available. A backend for product editing, click reporting, feeds and price refresh is a separate future feature; no such service is needed to run this screen.
