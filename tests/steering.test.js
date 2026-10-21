import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { vehicles } from "../src/catalogue.js";
import {
  createInitialState,
  applyChanges,
  selectVehicle,
  serializeState,
  loadState,
} from "../src/state.js";
import {
  fitInterior,
  fitSteering,
  saveShowBuild,
  encodeBuild,
  decodeBuild,
  normaliseClub,
} from "../src/club.js";
import { steeringOptions, interiorPackages } from "../src/interiors.js";
import { ENGINE_TEXTURE_PCM } from "../src/engine-texture.js";

test("steering purchases are atomic, per-car and independent of all four cabin packages", () => {
  let s = createInitialState();
  const before = s;
  assert.equal(
    fitSteering({ ...s, balance: 899 }, "alcantara").status,
    "insufficient-funds",
  );
  assert.equal(fitSteering(before, "stock").charged, 0);
  for (const vehicle of vehicles) {
    s = selectVehicle(createInitialState(), vehicle.id);
    let balance = s.balance;
    assert.deepEqual(s.club.steering[vehicle.id], {
      owned: [],
      fitted: "stock",
    });
    for (const option of steeringOptions.filter((p) => p.price)) {
      const r = fitSteering(s, option.id);
      assert.equal(r.charged, option.price);
      s = r.state;
      balance -= option.price;
      assert.equal(s.balance, balance);
      assert.equal(fitSteering(s, option.id).charged, 0);
    }
    for (const cabin of interiorPackages) {
      s = fitInterior(s, cabin.id).state;
      assert.equal(s.club.steering[vehicle.id].fitted, "carbon");
    }
    assert.equal(fitSteering(s, "stock").charged, 0);
    assert.equal(
      fitSteering(fitSteering(s, "stock").state, "carbon").charged,
      0,
    );
  }
  assert.deepEqual(before.club.steering.sti, { owned: [], fitted: "stock" });
});

test("legacy saves retain every purchase and migrate steering to free factory defaults", () => {
  let s = applyChanges(createInitialState()).state;
  s = fitInterior(s, "club").state;
  const old = JSON.parse(serializeState(s));
  delete old.club.steering;
  const migrated = loadState(old);
  assert.equal(migrated.balance, s.balance);
  assert.deepEqual(migrated.club.interiors.sti, s.club.interiors.sti);
  for (const { id } of vehicles)
    assert.deepEqual(migrated.club.steering[id], {
      owned: [],
      fitted: "stock",
    });
  assert.deepEqual(migrated.garage.sti.purchased, s.garage.sti.purchased);
  assert.deepEqual(
    normaliseClub({
      steering: {
        rs3: { owned: ["fake", "carbon", "carbon"], fitted: "alcantara" },
      },
    }).steering.rs3,
    { owned: ["carbon"], fitted: "stock" },
  );
});

test("saved builds and sharing snapshot the steering wheel without granting ownership on import", () => {
  let s = applyChanges(selectVehicle(createInitialState(), "rs3")).state;
  const first = saveShowBuild(s, "Audi original", "a").state;
  s = fitSteering(first, "carbon").state;
  s = fitInterior(s, "heritage").state;
  const result = saveShowBuild(s, "Audi Heritage carbon", "b");
  assert.equal(result.status, "saved");
  assert.equal(result.state.club.builds[0].steering, "stock");
  assert.equal(result.build.steering, "carbon");
  assert.equal(result.build.interior, "heritage");
  const recipe = decodeBuild(encodeBuild(result.build));
  assert.equal(recipe.steering, "carbon");
  assert.equal(recipe.interior, "heritage");
  const fresh = createInitialState();
  decodeBuild(encodeBuild(result.build));
  assert.deepEqual(fresh.club.steering.rs3.owned, []);
  const legacy = { ...result.build };
  delete legacy.steering;
  assert.equal(decodeBuild(encodeBuild(legacy)).steering, "stock");
  assert.throws(
    () => encodeBuild({ ...result.build, steering: "fake" }),
    RangeError,
  );
  const restored = loadState(serializeState(result.state));
  assert.equal(restored.club.steering.rs3.fitted, "carbon");
  assert.equal(restored.balance, result.state.balance);
});

test("the embedded mechanical texture has a retained CC0 source and reproducible PCM fingerprint", () => {
  const info = JSON.parse(
    readFileSync(new URL("../docs/ENGINE_AUDIO_SOURCES.json", import.meta.url)),
  );
  const original = readFileSync(
    new URL("../reference/audio/cc0-engine.wav", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    info.original_sha256,
  );
  const pcm = Buffer.from(ENGINE_TEXTURE_PCM, "base64");
  assert.equal(pcm.length, info.pcm_samples);
  assert.equal(createHash("sha256").update(pcm).digest("hex"), info.pcm_sha256);
  assert.equal(info.license, "CC0-1.0");
  assert(
    readFileSync(
      new URL("../public/licenses/CarEngines-CC0.txt", import.meta.url),
      "utf8",
    ).startsWith("CC0 1.0 Universal"),
  );
});
