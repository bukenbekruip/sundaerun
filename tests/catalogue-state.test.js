import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogue,
  getMerchantLink,
  getProduct,
  getVariantKey,
  isPreviewAvailable,
} from "../src/catalogue.js";
import {
  applyChanges,
  cancelPreview,
  createInitialState,
  getQuote,
  loadState,
  resetState,
  selectPreview,
  serializeState,
  STARTING_BALANCE,
} from "../src/state.js";

test("default quote is itemised game credits and previewing is free", () => {
  const initial = createInitialState();
  assert.equal(initial.balance, 48320);
  assert.equal(getQuote(initial).currency, "credits");
  assert.deepEqual(
    getQuote(initial).items.map(({ charge }) => charge),
    [2500, 1200],
  );
  assert.equal(getQuote(initial).total, 3700);
  const preview = selectPreview(initial, { wheel: "te37", paint: "black" });
  assert.equal(getQuote(preview).total, 4000);
  assert.equal(preview.balance, initial.balance);
  assert.deepEqual(preview.applied, initial.applied);
  assert.deepEqual(initial.preview, { wheel: "sr-01", paint: "blue" });
});

test("Apply charges the default 3700 once and repeats cannot charge again", () => {
  const initial = createInitialState();
  const first = applyChanges(initial);
  assert.equal(first.status, "applied");
  assert.equal(first.charged, 3700);
  assert.equal(first.state.balance, 44620);
  assert.deepEqual(first.state.purchased, ["wheel:sr-01", "paint:blue"]);
  assert.equal(initial.balance, 48320);
  const repeat = applyChanges(first.state);
  assert.equal(repeat.status, "already-fitted");
  assert.equal(repeat.charged, 0);
  assert.equal(repeat.state.balance, 44620);
});

test("owned parts can be fitted again for free while only new parts are charged", () => {
  const original = applyChanges(createInitialState()).state;
  const wheelOnly = selectPreview(original, { wheel: "te37" });
  assert.equal(getQuote(wheelOnly).total, 2800);
  const upgraded = applyChanges(selectPreview(wheelOnly, { paint: "mint" }));
  assert.equal(upgraded.charged, 4000);
  assert.equal(upgraded.state.balance, 40620);
  const returnToOriginal = applyChanges(
    selectPreview(upgraded.state, original.applied),
  );
  assert.equal(returnToOriginal.status, "applied");
  assert.equal(returnToOriginal.charged, 0);
  assert.equal(returnToOriginal.state.balance, 40620);
  assert.deepEqual(returnToOriginal.state.applied, original.applied);
});

test("insufficient funds leave the applied look, purchases and balance unchanged", () => {
  const state = { ...createInitialState(), balance: 0 };
  const before = structuredClone(state);
  const result = applyChanges(state);
  assert.equal(result.status, "insufficient-funds");
  assert.equal(result.charged, 0);
  assert.deepEqual(result.state, before);
  assert.deepEqual(state, before);
});

test("cancel restores applied look and reload does not fit an uncommitted preview", () => {
  const fitted = applyChanges(
    selectPreview(createInitialState(), { wheel: "te37", paint: "black" }),
  ).state;
  const preview = selectPreview(fitted, { paint: "mint" });
  assert.deepEqual(cancelPreview(preview).preview, fitted.applied);
  assert.equal(cancelPreview(preview).balance, fitted.balance);
  const serialized = serializeState(preview);
  assert.equal(Object.hasOwn(JSON.parse(serialized), "preview"), false);
  const restored = loadState(serialized);
  assert.deepEqual(restored.preview, fitted.applied);
  assert.equal(restored.balance, fitted.balance);
  assert.deepEqual(restored.purchased, fitted.purchased);
  assert.deepEqual(resetState(), createInitialState());
});

test("malformed or unsupported stored data recovers to a usable initial state", () => {
  for (const bad of [
    null,
    undefined,
    "{broken",
    "[]",
    "42",
    '{"version":1}',
    [],
  ]) {
    assert.deepEqual(loadState(bad), createInitialState());
  }
  const base = createInitialState();
  for (const badBalance of [
    NaN,
    Infinity,
    -Infinity,
    -1,
    1.5,
    "48320",
    STARTING_BALANCE + 1,
  ]) {
    assert.equal(
      loadState({ ...base, balance: badBalance }).balance,
      STARTING_BALANCE,
    );
  }
  assert.equal(loadState({ ...base, balance: 0 }).balance, 0);
  const restored = loadState({
    ...base,
    applied: { wheel: "missing", paint: "black" },
    preview: { wheel: "te37", paint: "mint" },
    category: "<script>",
    purchased: [
      "wheel:sr-01",
      "wheel:sr-01",
      "paint:unknown",
      null,
      {},
      3,
      "paint:black",
    ],
  });
  assert.deepEqual(restored.applied, { wheel: "sr-01", paint: "black" });
  assert.deepEqual(restored.preview, restored.applied);
  assert.deepEqual(restored.purchased, ["wheel:sr-01", "paint:black"]);
  assert.equal(restored.category, "wheels");
  assert.deepEqual(loadState({ ...base, purchased: {} }).purchased, []);
});

test("unknown product IDs and categories cannot enter preview state", () => {
  const state = createInitialState();
  assert.throws(() => selectPreview(state, { wheel: "unknown" }), RangeError);
  assert.throws(() => selectPreview(state, { paint: "unknown" }), RangeError);
  assert.throws(
    () => selectPreview(state, { category: "unknown" }),
    RangeError,
  );
  assert.throws(() => selectPreview(state, null), TypeError);
  assert.equal(getProduct("wheel", "unknown"), null);
  assert.equal(getProduct("unknown", "sr-01"), null);
  assert.equal(getProduct("__proto__", "sr-01"), null);
  assert.equal(getProduct("toString", "sr-01"), null);
});

test("concept products have no fabricated merchant destinations or fitment claims", () => {
  for (const product of [...catalogue.wheels, ...catalogue.paints]) {
    assert.equal(product.merchant, null);
    assert.equal(getMerchantLink(product), null);
    assert.equal(product.previewReady, false);
  }
  for (const wheel of catalogue.wheels) {
    assert.equal(wheel.fitment.verification, "pending");
    assert.deepEqual(wheel.fitment.vehicleIds, []);
  }
  assert.deepEqual(catalogue.tyres, []);
});

test("merchant links require HTTPS, expose sponsorship, and keep real prices separate", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "http://shop.example/item",
    "/local",
    "https://user:pass@shop.example/item",
    "invalid",
  ]) {
    assert.equal(getMerchantLink({ merchant: { url } }), null);
  }
  const link = getMerchantLink({
    merchant: {
      url: "https://shop.example/item?affiliate=sundae",
      price: 1250.99,
      currency: "zar",
      affiliate: true,
    },
  });
  assert.equal(link.url, "https://shop.example/item?affiliate=sundae");
  assert.equal(link.price, 1250.99);
  assert.equal(link.currency, "ZAR");
  assert.equal(link.affiliate, true);
  assert.match(link.rel, /sponsored/);
  assert.match(link.disclosure, /commission/);
  const ordinary = getMerchantLink({
    merchant: {
      url: "https://shop.example/",
      price: Infinity,
      currency: "bad-code",
    },
  });
  assert.equal(ordinary.price, null);
  assert.equal(ordinary.currency, null);
  assert.equal(ordinary.disclosure, null);
  assert.equal(getQuote(createInitialState()).total, 3700);
});

test("only an explicit verified whole-car artwork variant enables a preview", () => {
  const selection = { wheel: "te37", paint: "black" };
  assert.equal(getVariantKey(selection), "black:te37");
  assert.equal(isPreviewAvailable(selection), false);
  assert.equal(
    isPreviewAvailable(selection, {
      "black:te37": { src: "./old-overlay.webp" },
    }),
    false,
  );
  assert.equal(
    isPreviewAvailable(selection, { "black:te37": { src: "", ready: true } }),
    false,
  );
  assert.equal(
    isPreviewAvailable(selection, {
      "black:te37": { src: "./verified-car.webp", ready: true },
    }),
    true,
  );
  assert.equal(
    isPreviewAvailable(
      selection,
      new Map([["black:te37", { src: "./verified-car.webp", ready: true }]]),
    ),
    true,
  );
  assert.equal(
    isPreviewAvailable(
      { wheel: "unknown", paint: "black" },
      { "black:unknown": { src: "./verified-car.webp", ready: true } },
    ),
    false,
  );
});
