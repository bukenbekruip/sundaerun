"""Inspect the expanded collection, shirt identity and working full-size artwork links."""
import argparse
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


async def main(base, out, site_path="website/"):
    out.mkdir(parents=True, exist_ok=True)
    report = {"checks": [], "page_errors": [], "http_errors": [], "console_errors": []}

    def check(condition, description):
        if not condition:
            raise AssertionError(description)
        report["checks"].append(description)
        print("PASS " + description, flush=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = await browser.new_page(reduced_motion="reduce")
        page.on("pageerror", lambda e: report["page_errors"].append(str(e)))
        page.on("console", lambda e: report["console_errors"].append(e.text) if e.type == "error" else None)
        page.on("response", lambda r: report["http_errors"].append(r.url) if r.status >= 400 else None)
        try:
            for width in [320, 390, 768, 820, 1024, 1440]:
                await page.set_viewport_size({"width": width, "height": 900})
                await page.goto(base + site_path + "shop.html", wait_until="networkidle")
                await page.evaluate("Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode()}))")
                check(await page.locator(".product").count() == 8, f"{width}: eight collection designs")
                check(await page.locator("#girls .product").count() == 3 and await page.locator("#kids .product").count() == 3, f"{width}: six kids styles including three in the girls’ edit")
                for key in ["cherry-club", "daisy-drive", "lilac-racers", "mint-mini-crew"]:
                    await expect(page.locator(f'[data-design="{key}"]')).to_have_count(1)
                check(True, f"{width}: each new design appears once")
                check(await page.evaluate("""() => [...document.querySelectorAll('.product-art img')].every(i =>
                    i.naturalWidth >= 1300 && getComputedStyle(i).objectFit === 'contain' &&
                    i.closest('a').href === i.src && i.getBoundingClientRect().width > 200 &&
                    Math.abs(i.getBoundingClientRect().width / i.getBoundingClientRect().height - 1.5) < .02)"""), f"{width}: complete front/back artwork fits landscape cards and links to its full-size file")
                check(await page.evaluate("""() => {
                    const logo=document.querySelector('.brand img'), r=logo.getBoundingClientRect();
                    return logo.src.endsWith('/logo-shirt.webp') && logo.complete && r.height>=60 && r.width>=60;
                }"""), f"{width}: shirt identity renders legibly in header")
                check(await page.evaluate("""() => [...document.querySelectorAll('.header a,.menu-button,.product')].every(e => {
                    const r=e.getBoundingClientRect();return !r.width || (r.left>=0 && r.right<=innerWidth+1);
                }) && document.documentElement.scrollWidth<=innerWidth+1"""), f"{width}: header and product cards fit viewport")
                check(await page.locator(".coming").count() == 8 and await page.get_by_text("COLLECTION PREVIEW · NOT YET FOR SALE").is_visible(), f"{width}: collection remains a clearly labelled preview")
                await page.screenshot(path=str(out / f"shop-top-{width}.jpg"), type="jpeg", quality=88)
                for section in ["girls", "kids", "adults"]:
                    await page.evaluate("scrollTo({top:0,behavior:'instant'})")
                    await page.locator(f'.collection-jumps a[href="#{section}"]').click()
                    await expect(page).to_have_url(base + site_path + "shop.html#" + section)
                    check(await page.evaluate("""id=>document.getElementById(id).getBoundingClientRect().top >=
                        document.querySelector('.header').getBoundingClientRect().bottom-1""", section), f"{width}: {section} jump shows heading below sticky header")
                if width in [390, 1440]:
                    # Exclude the sticky header from isolated section captures;
                    # the untouched viewport screenshots above include the actual header.
                    for selector, name in [("#girls", "girls"), ("#kids", "kids"), (".footer", "footer")]:
                        await page.locator(selector).screenshot(path=str(out / f"{name}-{width}.jpg"), type="jpeg", quality=92, style=".header { visibility: hidden; }")
                    async with page.expect_popup() as popup_info:
                        await page.locator('[data-design="cherry-club"] .product-art').click()
                    popup = await popup_info.value
                    await popup.wait_for_load_state()
                    check(popup.url == base + site_path + "assets/shirt-cherry-club.webp", f"{width}: full-size design actually opens in a new tab")
                    await popup.close()
                if width == 820:
                    await page.locator(".menu-button").click()
                    await expect(page.locator(".nav")).to_be_visible()
                    await page.locator('.nav a[href="about.html"]').click()
                    await expect(page).to_have_url(base + site_path + "about.html")
                    check(True, "820: tablet navigation opens and reaches Our Story")
            await page.goto(base + site_path + "index.html", wait_until="networkidle")
            check(await page.get_by_role("link", name="Explore all eight designs").count() == 1, "Home promotes the expanded eight-design collection")
            await page.get_by_role("link", name="Explore all eight designs").click()
            await expect(page).to_have_url(base + site_path + "shop.html")
            check(not report["page_errors"] and not report["http_errors"] and not report["console_errors"], "No browser, console or HTTP errors")
            report["status"] = "passed"
        except Exception:
            report["status"] = "failed"
            await page.screenshot(path=str(out / "failure.jpg"), full_page=True, type="jpeg")
            raise
        finally:
            report["passed_checks"] = len(report["checks"])
            (out / "clothing-results.json").write_text(json.dumps(report, indent=2) + "\n")
            await browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:4184/sundaerun/")
    parser.add_argument("--output", type=Path, default=ROOT / "qa/website-kids/clothing")
    parser.add_argument("--site-path", default="website/")
    args = parser.parse_args()
    asyncio.run(main(args.base_url.rstrip("/") + "/", args.output, args.site_path))
