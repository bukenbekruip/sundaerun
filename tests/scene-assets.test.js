import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { STAGE, CAR_TRANSFORMS, variants } from "../src/scene.js";
import {
  vehicles,
  wheels,
  paints,
  isPreviewAvailable,
} from "../src/catalogue.js";

const root = new URL("../", import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("enabled car variants resolve to the reviewed transparent artwork", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("public/assets/cars/manifest.json", root), "utf8"),
  );
  assert.equal(Object.keys(variants).length, 18);
  assert.equal(
    new Set(Object.values(manifest.assets).map(({ sha256 }) => sha256)).size,
    18,
    "Each vehicle/wheel combination needs its own artwork",
  );
  for (const [key, variant] of Object.entries(variants)) {
    if (!variant.ready) continue;
    const bytes = await readFile(new URL("public/" + variant.src, root));
    const entry = manifest.assets[key];
    assert.ok(entry, "Missing artwork provenance for " + key);
    assert.equal(
      digest(bytes),
      entry.sha256,
      "Artwork differs from reviewed file: " + key,
    );
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), entry.width);
    assert.equal(bytes.readUInt32BE(20), entry.height);
    assert.equal(
      bytes[25],
      6,
      "A complete transparent RGBA car is required: " + key,
    );
    assert.ok(Math.abs(entry.width - STAGE.width) <= 3);
    assert.ok(Math.abs(entry.height - STAGE.height) <= 2);
    const transform = CAR_TRANSFORMS[key.split(":")[0]];
    const [left, top, right, bottom] = entry.opaqueBoundsAlpha128;
    const scale = transform.width / STAGE.width;
    assert.ok(transform.left + left * scale >= 420, key + " left edge");
    assert.ok(transform.left + right * scale <= 1350, key + " right edge");
    assert.ok(transform.top + top * scale >= 245, key + " roof clearance");
    assert.ok(
      transform.top + bottom * scale <= 625,
      key + " platform clearance",
    );
  }
});

test("each complete car has one uniform transform and all 216 combinations have artwork", () => {
  for (const vehicle of vehicles) {
    const transform = CAR_TRANSFORMS[vehicle.id];
    assert.equal(
      transform.width / STAGE.width,
      transform.height / STAGE.height,
    );
    assert.ok(transform.left >= 0 && transform.top >= 0);
    assert.ok(transform.left + transform.width < STAGE.width);
    assert.ok(transform.top + transform.height < STAGE.height);
    for (const wheel of wheels)
      for (const paint of paints)
        assert.ok(
          isPreviewAvailable(
            { vehicle: vehicle.id, wheel: wheel.id, paint: paint.id },
            variants,
          ),
          `${vehicle.id}/${wheel.id}/${paint.id}`,
        );
  }
});

test("original reference and source artwork remains byte-identical to the handover", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("FILE_MANIFEST.json", root), "utf8"),
  );
  for (const entry of manifest.files.filter(({ file }) =>
    /^(reference|source-art)\//.test(file),
  )) {
    const bytes = await readFile(new URL(entry.file, root));
    assert.equal(bytes.length, entry.bytes, entry.file);
    assert.equal(digest(bytes), entry.sha256, entry.file);
  }
});
