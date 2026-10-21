import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  ENGINE_PROFILES,
  ANCHOR_RPM,
  engineCharacter,
  makeEngineLoop,
  advanceRPM,
} from "../src/engine-voices.js";

test("all six voices produce distinct bounded, centred and repeatable engine loops", () => {
  for (const rpm of ANCHOR_RPM) {
    const hashes = new Set();
    for (const vehicle of Object.keys(ENGINE_PROFILES)) {
      const samples = makeEngineLoop(vehicle, rpm);
      const sum = samples.reduce((a, n) => a + n, 0);
      const rms = Math.sqrt(
        samples.reduce((a, n) => a + n * n, 0) / samples.length,
      );
      assert.equal(samples.length, 26460);
      assert(samples.every((n) => Number.isFinite(n) && Math.abs(n) <= 0.801));
      assert(
        Math.abs(sum / samples.length) < 0.00001,
        `${vehicle}: no DC bias`,
      );
      assert(rms > 0.12 && rms < 0.7, `${vehicle}: useful signal energy`);
      const hash = createHash("sha256")
        .update(Buffer.from(samples.buffer))
        .digest("hex");
      assert.equal(
        hash,
        createHash("sha256")
          .update(Buffer.from(makeEngineLoop(vehicle, rpm).buffer))
          .digest("hex"),
      );
      hashes.add(hash);
    }
    assert.equal(hashes.size, 6, `all six waveforms differ at ${rpm} RPM`);
  }
});

test("every performance recipe changes its audible parameters without changing its car voice", () => {
  for (const vehicle of Object.keys(ENGINE_PROFILES)) {
    const stock = engineCharacter(vehicle),
      keys = new Set();
    for (const filter of ["stock", "panel", "intake"])
      for (const exhaust of ["stock", "axle", "catback"])
        for (const tune of ["stock", "road", "track"]) {
          const c = engineCharacter(vehicle, { filter, exhaust, tune });
          keys.add(c.key);
          assert.equal(c.profile, stock.profile);
          if (filter !== "stock") assert(c.induction > stock.induction);
          if (exhaust !== "stock")
            assert(c.cutoff > stock.cutoff && c.grit > stock.grit);
          if (tune !== "stock")
            assert(c.limit > stock.limit && c.response > stock.response);
        }
    assert.equal(keys.size, 27);
  }
});

test("tunes change the rev envelope; RPM stays bounded and settles back to idle", () => {
  for (const vehicle of Object.keys(ENGINE_PROFILES)) {
    const stock = engineCharacter(vehicle),
      tuned = engineCharacter(vehicle, { tune: "track" });
    let a = stock.idle,
      b = tuned.idle;
    for (let i = 0; i < 60; i++) {
      a = advanceRPM(a, 1, stock, 1 / 60);
      b = advanceRPM(b, 1, tuned, 1 / 60);
    }
    assert(b > a + 300);
    for (let i = 0; i < 600; i++) b = advanceRPM(b, 0, tuned, 1 / 60);
    assert(Math.abs(b - tuned.idle) < 1);
    assert(advanceRPM(stock.idle, -5, stock, 0.1) >= stock.idle);
    assert(advanceRPM(stock.idle, 50, stock, 100) <= stock.limit);
  }
});

test("unknown sound recipes safely recover to an included voice and stock components", () => {
  assert.deepEqual(
    engineCharacter("__proto__", {
      filter: "<script>",
      exhaust: null,
      tune: "racing",
    }).spec,
    { filter: "stock", exhaust: "stock", tune: "stock" },
  );
  assert.equal(engineCharacter("unknown").vehicle, "sti");
});
