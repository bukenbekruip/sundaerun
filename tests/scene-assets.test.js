import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { STAGE, CAR_TRANSFORM, variants } from "../src/scene.js";

const root = new URL("../", import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("enabled car variants resolve to the reviewed transparent artwork", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("public/assets/scene/manifest.json", root), "utf8"),
  );
  for (const [key, variant] of Object.entries(variants)) {
    if (!variant.ready) continue;
    const bytes = await readFile(new URL("public/" + variant.src, root));
    const entry = manifest.assets[key.replace(":", "-")];
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
    assert.ok(Math.abs(entry.width - STAGE.width) <= 2);
    assert.ok(Math.abs(entry.height - STAGE.height) <= 1);
    const [left, top, right, bottom] = entry.opaqueBoundsAlpha128;
    const scale = CAR_TRANSFORM.width / STAGE.width;
    assert.ok(CAR_TRANSFORM.left + left * scale >= 430);
    assert.ok(CAR_TRANSFORM.left + right * scale <= 1340);
    assert.ok(CAR_TRANSFORM.top + top * scale >= 260);
    assert.ok(CAR_TRANSFORM.top + bottom * scale <= 618);
  }
});

test("one uniform car canvas fits within the stage without clipping", () => {
  assert.equal(
    CAR_TRANSFORM.width / STAGE.width,
    CAR_TRANSFORM.height / STAGE.height,
  );
  assert.ok(CAR_TRANSFORM.left >= 0 && CAR_TRANSFORM.top >= 0);
  assert.ok(CAR_TRANSFORM.left + CAR_TRANSFORM.width < STAGE.width);
  assert.ok(CAR_TRANSFORM.top + CAR_TRANSFORM.height < STAGE.height);
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
