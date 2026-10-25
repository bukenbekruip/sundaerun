"""Capture the same static website/game states before and after a preservation refactor."""
import argparse
import asyncio
import json
from pathlib import Path
from PIL import Image, ImageChops
from playwright.async_api import async_playwright


async def run(args):
    args.output.mkdir(parents=True, exist_ok=True)
    report = {"base_url": args.base_url, "screenshots": [], "errors": [], "max_changed_pixels": args.max_changed_pixels, "max_channel_delta": args.max_channel_delta}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        context = await browser.new_context(reduced_motion="reduce", viewport={"width": 1672, "height": 941})
        await context.add_init_script("localStorage.clear()")
        page = await context.new_page()
        page.on("pageerror", lambda e: report["errors"].append(str(e)))

        async def capture(name):
            await page.evaluate("document.fonts.ready")
            await page.mouse.move(0, 0)
            await page.wait_for_timeout(80)
            path = args.output / (name + ".png")
            await page.screenshot(path=str(path), full_page=True, animations="disabled")
            item = {"name": name}
            if args.compare:
                old = Image.open(args.compare / path.name).convert("RGB")
                new = Image.open(path).convert("RGB")
                item["same_dimensions"] = old.size == new.size
                if old.size == new.size:
                    delta = ImageChops.difference(old, new)
                    channels = delta.split()
                    mask = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
                    item["changed_pixels"] = old.width * old.height - mask.histogram()[0]
                    item["max_channel_delta"] = max(high for low, high in delta.getextrema())
                    item["total_pixels"] = old.width * old.height
                    if item["changed_pixels"]:
                        delta.save(args.output / (name + "-diff.png"))
            report["screenshots"].append(item)
            print(name + " " + str(item.get("changed_pixels", "captured")), flush=True)

        async def ready():
            await page.wait_for_function("() => (document.querySelector('#scene').getAttribute('aria-busy')==='false')")
            await page.evaluate("Promise.all(['car-image','garage-image'].map(id=>document.getElementById(id).decode()))")

        try:
            for width in ([] if args.scope == 'game' else [390, 820, 1440]):
                await page.set_viewport_size({"width": width, "height": 900})
                for name in ["index", "culture", "garage", "community", "shop", "about", "privacy", "play"]:
                    await page.goto(args.base_url + name + ".html", wait_until="networkidle")
                    await page.evaluate("Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode()}))")
                    await capture(f"website-{name}-{width}")
            await page.set_viewport_size({"width": 1672, "height": 941})
            await page.goto(args.base_url + "garage/", wait_until="networkidle")
            await ready()
            await capture("game-sti-default-1672")
            await page.locator('[data-wheel="te37"]').click()
            await ready()
            await capture("game-sti-te37-1672")
            for color in ["black", "mint", "blue"]:
                await page.locator(f'[data-paint="{color}"]').click()
                await ready()
                await capture("game-sti-te37-" + color)
            for car in ["sti", "porsche", "gt86", "m3", "golf", "rs3"]:
                await page.locator(f'[data-vehicle="{car}"]').click()
                await ready()
                await capture("game-" + car + "-exterior")
                await page.locator('[data-garage-section="interior"]').click()
                await page.locator('[data-interior="heritage"]').click()
                await page.wait_for_function("() => (document.querySelector('.interior-preview img')?.complete && document.querySelector('.interior-loading')?.hidden)")
                await capture("game-" + car + "-heritage")
                await page.locator('#club-dialog [data-close-dialog]').click()
                await page.locator('[data-garage-section="performance"]').click()
                await capture("game-" + car + "-performance")
                await page.locator('#club-dialog [data-close-dialog]').click()
            for width, height in [(320, 740), (390, 844), (1366, 768), (1920, 1080)]:
                await page.set_viewport_size({"width": width, "height": height})
                await capture("game-responsive-" + str(width))
            def acceptable(item):
                # Website pages must be exact. Tiny bounded glass/shadow edge
                # noise is permitted only by an explicit CLI tolerance.
                limit = 0 if item['name'].startswith('website-') else args.max_changed_pixels
                delta = 0 if item['name'].startswith('website-') else args.max_channel_delta
                return item.get('same_dimensions', True) and item.get('changed_pixels', 0) <= limit and item.get('max_channel_delta', 0) <= delta
            report["status"] = "passed" if not report["errors"] and all(acceptable(x) for x in report['screenshots']) else "failed"
        finally:
            (args.output / "visual-results.json").write_text(json.dumps(report, indent=2) + "\n")
            await browser.close()
    if report.get("status") != "passed":
        raise AssertionError("Visual comparison failed; inspect its report and diff images")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--compare", type=Path)
    parser.add_argument("--max-changed-pixels", type=int, default=0)
    parser.add_argument("--max-channel-delta", type=int, default=0)
    parser.add_argument("--scope", choices=['all', 'game'], default='all')
    args = parser.parse_args()
    args.base_url = args.base_url.rstrip("/") + "/"
    asyncio.run(run(args))
