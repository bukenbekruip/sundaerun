import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPages, websitePages } from "../scripts/build-pages.mjs";

async function fixture(fn, domain = "www.sundaerun.com") {
  const root = await mkdtemp(join(tmpdir(), "sundae-pages-"));
  try {
    for (const dir of ["assets", "licenses", "website/assets", "website/fonts"])
      await mkdir(join(root, dir), { recursive: true });
    await writeFile(join(root, "CNAME"), domain + "\n");
    await writeFile(
      join(root, "index.html"),
      '<head></head><a id="brand-website" href="./website/index.html">Website</a><script src="./assets/game.js"></script>',
    );
    await writeFile(join(root, "assets/game.js"), "unchanged-game-bundle");
    await writeFile(join(root, "licenses/audio.txt"), "unchanged-licence");
    for (const file of [
      "assets/shirt.webp",
      "fonts/site.woff2",
      "styles.css",
      "site.js",
    ])
      await writeFile(
        join(root, "website", file),
        "unchanged-website-resource",
      );
    for (const page of websitePages)
      await writeFile(
        join(root, "website", page + ".html"),
        `<head></head><h1>${page}</h1><img src="assets/shirt.webp">${page === "play" ? '<a href="../index.html">Play</a>' : ""}`,
      );
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("Pages serves the brand homepage, isolates game assets and retains legacy website routes", async () => {
  await fixture(async (root) => {
    await buildPages(root);
    assert.match(
      await readFile(join(root, "index.html"), "utf8"),
      /<h1>index<\/h1>/,
    );
    assert.match(
      await readFile(join(root, "play.html"), "utf8"),
      /href="\.\/garage\/"/,
    );
    assert.match(
      await readFile(join(root, "website/play.html"), "utf8"),
      /href="\.\.\/garage\/"/,
    );
    assert.match(
      await readFile(join(root, "garage/index.html"), "utf8"),
      /href="\.\.\/index.html"/,
    );
    assert.equal(
      await readFile(join(root, "garage/assets/game.js"), "utf8"),
      "unchanged-game-bundle",
    );
    assert.equal(
      await readFile(join(root, "garage/licenses/audio.txt"), "utf8"),
      "unchanged-licence",
    );
    assert.equal(
      await readFile(join(root, "assets/shirt.webp"), "utf8"),
      "unchanged-website-resource",
    );
    for (const page of websitePages) {
      const path = page === "index" ? "/" : `/${page}.html`;
      for (const prefix of ["", "website/"])
        assert.ok(
          (
            await readFile(join(root, prefix + page + ".html"), "utf8")
          ).includes(`href="https://www.sundaerun.com${path}"`),
        );
    }
    assert.match(
      await readFile(join(root, "garage/index.html"), "utf8"),
      /https:\/\/www.sundaerun.com\/garage\//,
    );
    assert.match(
      await readFile(join(root, "sitemap.xml"), "utf8"),
      /https:\/\/www.sundaerun.com\/shop.html/,
    );
  });
});

test("Pages assembly rejects a wrong domain before moving any game files", async () => {
  await fixture(async (root) => {
    await assert.rejects(buildPages(root), /official www host/);
    assert.equal(
      await readFile(join(root, "assets/game.js"), "utf8"),
      "unchanged-game-bundle",
    );
  }, "sundaerun.com");
});

test("Pages assembly rejects a second run without disturbing the assembled site", async () => {
  await fixture(async (root) => {
    await buildPages(root);
    const before = await readFile(join(root, "index.html"));
    await assert.rejects(buildPages(root), /unassembled game build/);
    assert.deepEqual(await readFile(join(root, "index.html")), before);
  });
});
