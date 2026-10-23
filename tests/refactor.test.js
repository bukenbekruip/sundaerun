import test from "node:test";
import assert from "node:assert/strict";
import { createProgressStorage } from "../src/progress-storage.js";
import {
  createInitialState,
  applyChanges,
  selectPreview,
} from "../src/state.js";
import { renderWebsitePage, sitePages } from "../scripts/website.mjs";
import { withSecurityPolicy } from "../scripts/security-policy.mjs";

test("unavailable or full progress storage leaves the game playable and recovers when writable", () => {
  let writable = false,
    saved;
  const storage = createProgressStorage(() => ({
    getItem() {
      throw new Error("Storage disabled");
    },
    setItem(key, value) {
      if (!writable) throw new Error("Quota exceeded");
      saved = { key, value };
    },
  }));
  const initial = storage.load();
  assert.equal(storage.available, false);
  const fitted = applyChanges(selectPreview(initial, { paint: "mint" })).state;
  assert.equal(storage.save(fitted), false);
  writable = true;
  assert.equal(storage.save(fitted), true);
  assert.equal(saved.key, "sundae-run-garage-v2");
  const restored = createProgressStorage(() => ({
    getItem: () => saved.value,
  })).load();
  assert.equal(restored.balance, fitted.balance);
  assert.equal(restored.applied.paint, "mint");
  assert.deepEqual(restored.club, fitted.club);
});

test("shared static components retain page-specific active links, Play CTA and compact footer", async () => {
  for (const page of sitePages) {
    const html = await renderWebsitePage(page);
    assert.ok(!html.includes("{{") && !html.includes("<!-- component:"));
    assert.match(html, /Skip to main content/);
    const active = [...html.matchAll(/aria-current="page"/g)];
    assert.equal(active.length, ["privacy", "play"].includes(page) ? 0 : 1);
    if (active.length)
      assert.match(
        html,
        new RegExp(
          `href="${page}\\.html"\\s+class="active"\\s+aria-current="page"`,
        ),
      );
    assert.equal(html.includes("Garage overview"), page === "play");
    assert.equal(html.includes('class="footer-grid"'), page !== "play");
  }
  await assert.rejects(renderWebsitePage("../index"), /Unknown website page/);
});

test("production policy blocks script injection, object embeds and form submission without unsafe-inline", () => {
  const html = withSecurityPolicy('<head><meta charset="utf-8"></head>');
  for (const rule of [
    "script-src 'self'",
    "style-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ])
    assert.ok(html.includes(rule));
  assert.ok(!html.includes("unsafe-inline") && !html.includes("unsafe-eval"));
  assert.match(html, /strict-origin-when-cross-origin/);
  assert.equal(createInitialState().version, 4);
});
