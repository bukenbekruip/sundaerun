import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { vehicles } from "../src/catalogue.js";
import {
  createInitialState,
  applyChanges,
  selectVehicle,
  loadState,
  serializeState,
} from "../src/state.js";
import {
  fitInterior,
  saveShowBuild,
  decodeBuild,
  encodeBuild,
  claimChallenge,
} from "../src/club.js";
import {
  getInteriorVariant,
  normaliseInteriors,
  interiorPackages,
} from "../src/interiors.js";

test("every model has four distinct, real, checksummed cabin assets", async () => {
  const sources = JSON.parse(
    await readFile(
      new URL("../public/assets/expansion-sources.json", import.meta.url),
      "utf8",
    ),
  );
  const hashes = new Set();
  for (const vehicle of vehicles)
    for (const id of interiorPackages.map((p) => p.id)) {
      const v = getInteriorVariant(vehicle.id, id);
      assert.equal(v.ready, true);
      const bytes = await readFile(
        new URL("../public/" + v.src, import.meta.url),
      );
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      const sha = createHash("sha256").update(bytes).digest("hex");
      assert.equal(sha, sources[`${vehicle.id}:cabin:${id}`].sha256);
      assert.ok(
        !hashes.has(sha),
        "Each cabin must have its own model/package artwork",
      );
      hashes.add(sha);
    }
  assert.equal(hashes.size, 24);
});

test("legacy three-car saves retain credits, builds and earned rewards while new cars/cabins start unowned", () => {
  let s = applyChanges(createInitialState()).state;
  s = saveShowBuild(s, "Old favourite", "legacy").state;
  s = claimChallenge(s, "sti:first-build", "legacy").state;
  const old = JSON.parse(serializeState(s));
  delete old.garage.m3;
  delete old.garage.golf;
  delete old.club.interiors;
  for (const b of old.club.builds) delete b.interior;
  const restored = loadState(old);
  assert.equal(restored.balance, s.balance);
  assert.equal(restored.club.builds[0].interior, "stock");
  assert.deepEqual(restored.club.completed, ["sti:first-build"]);
  for (const id of ["m3", "golf"]) {
    assert.deepEqual(restored.garage[id].purchased, []);
    assert.equal(restored.club.interiors[id].fitted, "stock");
    assert.deepEqual(restored.club.interiors[id].owned, []);
  }
});

test("cabin fitting is an atomic per-car purchase and owned/stock refits are free", () => {
  const initial = createInitialState(),
    first = fitInterior(initial, "club");
  assert.equal(first.charged, 1800);
  assert.equal(first.state.balance, 46520);
  assert.equal(initial.club.interiors.sti.fitted, "stock");
  assert.equal(fitInterior(first.state, "club").charged, 0);
  const stock = fitInterior(first.state, "stock");
  assert.equal(stock.charged, 0);
  assert.equal(fitInterior(stock.state, "club").charged, 0);
  const another = fitInterior(selectVehicle(first.state, "golf"), "club");
  assert.equal(another.charged, 1800);
  assert.equal(another.state.club.interiors.m3.fitted, "stock");
  const poor = { ...initial, balance: 1799 },
    denied = fitInterior(poor, "club");
  assert.equal(denied.status, "insufficient-funds");
  assert.deepEqual(denied.state, poor);
  assert.throws(() => fitInterior(initial, "imaginary"), RangeError);
});

test("saved cabins are immutable recipes, count for briefs and survive serialisation", () => {
  let s = applyChanges(createInitialState()).state;
  s = saveShowBuild(s, "Original", "factory").state;
  s = fitInterior(s, "club").state;
  const result = saveShowBuild(s, "Cherry club", "custom");
  assert.equal(result.state.club.builds.length, 2);
  assert.equal(result.state.club.builds[0].interior, "stock");
  assert.equal(result.build.interior, "club");
  const claimed = claimChallenge(result.state, "sti:inside-counts", "custom");
  assert.equal(claimed.awarded, 1000);
  assert.equal(
    claimChallenge(claimed.state, "sti:inside-counts", "custom").awarded,
    0,
  );
  assert.deepEqual(
    loadState(serializeState(claimed.state)).club,
    claimed.state.club,
  );
});

test("old SR1 recipes default to stock; new codes list a cabin without granting ownership", () => {
  const s = applyChanges(createInitialState()).state;
  const b = saveShowBuild(fitInterior(s, "club").state, "Club", "custom").build;
  const imported = decodeBuild(encodeBuild(b));
  assert.equal(imported.interior, "club");
  assert.ok(!Object.hasOwn(imported, "owned"));
  assert.ok(!Object.hasOwn(imported, "balance"));
  const legacy = { ...b };
  delete legacy.interior;
  const code =
    "SR1." + Buffer.from(JSON.stringify(legacy)).toString("base64url");
  assert.equal(decodeBuild(code).interior, "stock");
  assert.throws(
    () => encodeBuild({ ...b, interior: "not-a-cabin" }),
    RangeError,
  );
  assert.equal(
    normaliseInteriors({ sti: { fitted: "club", owned: [] } }).sti.fitted,
    "stock",
  );
});
