import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogue,
  getMerchantLink,
  getProduct,
  getVehicle,
  getVariantKey,
  isPreviewAvailable,
  paints,
  vehicles,
  VEHICLE,
} from "../src/catalogue.js";
import {
  applyChanges,
  cancelPreview,
  createInitialState,
  getQuote,
  loadState,
  resetState,
  selectPreview,
  selectVehicle,
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
    garage: {
      ...base.garage,
      sti: {
        applied: { wheel: "missing", paint: "black" },
        purchased: [
          "wheel:sr-01", "wheel:sr-01", "paint:unknown", null, {}, 3, "paint:black",
        ],
      },
    },
    preview: { wheel: "te37", paint: "mint" },
    category: "<script>",
  });
  assert.deepEqual(restored.applied, { wheel: "sr-01", paint: "black" });
  assert.deepEqual(restored.preview, restored.applied);
  assert.deepEqual(restored.purchased, ["wheel:sr-01", "paint:black"]);
  assert.equal(restored.category, "wheels");
  assert.deepEqual(loadState({ ...base, garage: { sti: { purchased: {} } } }).purchased, []);
  assert.equal(loadState({ version: 3 }).vehicle, "sti");
  assert.equal(loadState({ ...base, vehicle: "constructor" }).vehicle, "sti");
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
  assert.throws(() => selectVehicle(state, "unknown"), RangeError);
  assert.throws(() => selectVehicle(state, "__proto__"), RangeError);
  assert.throws(() => selectVehicle(state, undefined), RangeError);
  assert.throws(() => selectVehicle(state, null), RangeError);
  assert.equal(getVehicle("unknown"), null);
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

test("only a registered vehicle/wheel render enables the supported paint renderer", () => {
  const selection = { wheel: "te37", paint: "black" };
  assert.equal(getVariantKey(selection), "sti:black:te37");
  assert.equal(getVariantKey({ vehicle: "porsche", wheel: "bbs-lm", paint: "red" }), "porsche:red:bbs-lm");
  assert.equal(isPreviewAvailable(selection), false);
  assert.equal(
    isPreviewAvailable(selection, {
      "sti:te37": { src: "./old-overlay.webp" },
    }),
    false,
  );
  assert.equal(
    isPreviewAvailable(selection, { "sti:te37": { src: "", ready: true } }),
    false,
  );
  assert.equal(
    isPreviewAvailable(selection, {
      "sti:te37": { src: "./verified-car.webp", ready: true },
    }),
    true,
  );
  assert.equal(
    isPreviewAvailable(
      selection,
      new Map([["sti:te37", { src: "./verified-car.webp", ready: true }]]),
    ),
    true,
  );
  assert.equal(
    isPreviewAvailable(
      { wheel: "unknown", paint: "black" },
      { "sti:unknown": { src: "./verified-car.webp", ready: true } },
    ),
    false,
  );
  const porsche = { "porsche:bbs-lm": { src: "./porsche-bbs.webp", ready: true } };
  for (const paint of paints) {
    assert.equal(isPreviewAvailable({ vehicle: "porsche", wheel: "bbs-lm", paint: paint.id }, porsche), true);
    assert.equal(isPreviewAvailable({ vehicle: "gt86", wheel: "bbs-lm", paint: paint.id }, porsche), false);
  }
  assert.equal(isPreviewAvailable({ vehicle: "missing", wheel: "bbs-lm", paint: "red" }, porsche), false);
  assert.equal(isPreviewAvailable({ vehicle: "porsche", wheel: "bbs-lm", paint: "missing" }, porsche), false);
});

test("catalogue exposes the three requested vehicles, six concepts and twelve paints", () => {
  assert.deepEqual(vehicles.map(({ id }) => id), ["sti", "porsche", "gt86"]);
  assert.deepEqual(vehicles.map(({ name }) => name), ["Subaru WRX STI", "Porsche 911 GT3 RS", "Toyota 86"]);
  assert.equal(VEHICLE, vehicles[0]);
  assert.equal(getVehicle(), VEHICLE);
  assert.equal(catalogue.wheels.length, 6);
  assert.deepEqual(paints.map(({ id }) => id), ["blue", "black", "mint", "white", "silver", "graphite", "red", "orange", "purple", "pink", "yellow", "teal"]);
  for (const paint of paints) {
    assert.equal(paint.gamePrice, 1200);
    assert.match(paint.colour, /^#[0-9a-f]{6}$/i);
    assert.ok(paint.finish.length > 0);
  }
});

test("each car remembers its own fitted build and discards unfinished previews when switching", () => {
  const initial = createInitialState();
  const before = structuredClone(initial);
  const unfinishedSti = selectPreview(initial, { wheel: "te37", paint: "black" });
  let state = selectVehicle(unfinishedSti, "porsche");
  assert.deepEqual(state.preview, { wheel: "sr-01", paint: "blue" });
  assert.deepEqual(state.garage.sti.applied, initial.applied);
  assert.equal(state.balance, STARTING_BALANCE);
  state = applyChanges(selectPreview(state, { wheel: "bbs-lm", paint: "red" })).state;
  assert.equal(state.balance, 44320);
  assert.deepEqual(state.garage.porsche.applied, { wheel: "bbs-lm", paint: "red" });
  state = selectVehicle(state, "gt86");
  state = applyChanges(selectPreview(state, { wheel: "rotiform", paint: "orange" })).state;
  assert.equal(state.balance, 40720);
  state = selectVehicle(state, "sti");
  assert.deepEqual(state.applied, { wheel: "sr-01", paint: "blue" });
  assert.equal(getQuote(state).total, 3700);
  state = selectVehicle(state, "porsche");
  assert.deepEqual(state.preview, { wheel: "bbs-lm", paint: "red" });
  assert.equal(getQuote(state).total, 0);
  const preview = selectPreview(state, { wheel: "work", paint: "yellow" });
  assert.deepEqual(cancelPreview(preview).preview, state.applied);
  assert.equal(cancelPreview(preview).balance, 40720);
  assert.deepEqual(selectVehicle(preview, "porsche").preview, state.applied);
  assert.deepEqual(initial, before);
});

test("ownership belongs to each vehicle while the credit balance is shared", () => {
  let state = applyChanges(createInitialState()).state;
  assert.equal(state.balance, 44620);
  state = selectVehicle(state, "porsche");
  assert.equal(getQuote(state).total, 3700);
  state = applyChanges(state).state;
  assert.equal(state.balance, 40920);
  state = selectVehicle(state, "gt86");
  assert.equal(getQuote(state).total, 3700);
  state = applyChanges(state).state;
  assert.equal(state.balance, 37220);
  for (const vehicle of vehicles) {
    const active = selectVehicle(state, vehicle.id);
    assert.equal(getQuote(active).total, 0);
    assert.equal(applyChanges(active).charged, 0);
    assert.equal(active.balance, 37220);
    assert.deepEqual(active.garage[vehicle.id].purchased, ["wheel:sr-01", "paint:blue"]);
  }
});

test("canonical garage persistence restores all fitted cars without saving a free preview", () => {
  let state = applyChanges(selectPreview(createInitialState(), { wheel: "work", paint: "purple" })).state;
  state = selectVehicle(state, "gt86");
  state = applyChanges(selectPreview(state, { wheel: "oz", paint: "teal" })).state;
  state = selectPreview(state, { paint: "pink" });
  const persisted = JSON.parse(serializeState(state));
  assert.equal(persisted.version, 3);
  for (const transient of ["preview", "applied", "purchased"]) assert.equal(Object.hasOwn(persisted, transient), false);
  const restored = loadState(persisted);
  assert.equal(restored.vehicle, "gt86");
  assert.equal(restored.balance, state.balance);
  assert.deepEqual(restored.preview, { wheel: "oz", paint: "teal" });
  assert.deepEqual(selectVehicle(restored, "sti").applied, { wheel: "work", paint: "purple" });
  assert.deepEqual(selectVehicle(restored, "porsche").applied, { wheel: "sr-01", paint: "blue" });
  assert.deepEqual(resetState(), createInitialState());
});

test("v2 migration keeps old credits, STI purchases and fitted parts without transferring ownership to new cars", () => {
  const old = {
    version: 2,
    balance: 40620,
    applied: { wheel: "te37", paint: "black" },
    preview: { wheel: "te37", paint: "mint" },
    purchased: ["wheel:sr-01", "paint:blue", "wheel:te37", "paint:black", "paint:black", "invalid"],
    category: "paint",
  };
  const migrated = loadState(JSON.stringify(old));
  assert.equal(migrated.version, 3);
  assert.equal(migrated.vehicle, "sti");
  assert.equal(migrated.balance, 40620);
  assert.deepEqual(migrated.preview, old.applied);
  assert.deepEqual(migrated.applied, old.applied);
  assert.deepEqual(migrated.purchased, ["wheel:sr-01", "paint:blue", "wheel:te37", "paint:black"]);
  assert.equal(getQuote(migrated).total, 0);
  assert.equal(migrated.category, "paint");
  for (const id of ["porsche", "gt86"]) {
    const other = selectVehicle(migrated, id);
    assert.equal(other.balance, 40620);
    assert.deepEqual(other.applied, { wheel: "sr-01", paint: "blue" });
    assert.deepEqual(other.purchased, []);
    assert.equal(getQuote(other).total, 3700);
  }
  assert.deepEqual(loadState(serializeState(migrated)), migrated);
  assert.equal(loadState({ ...old, balance: 0 }).balance, 0);
});

test("derived active-car aliases cannot overwrite the garage's saved source of truth", () => {
  const state = applyChanges(createInitialState()).state;
  const modifiedAliases = {
    ...state,
    applied: { wheel: "work", paint: "red" },
    purchased: ["wheel:work", "paint:red"],
  };
  const restored = loadState(serializeState(modifiedAliases));
  assert.deepEqual(restored.applied, { wheel: "sr-01", paint: "blue" });
  assert.deepEqual(restored.purchased, ["wheel:sr-01", "paint:blue"]);
  assert.equal(restored.balance, 44620);
});
