import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import {
  STAGE,
  CAR_TRANSFORMS,
  variants,
  upgradeVariants,
  getUpgradeVariant,
} from "../src/scene.js";
import {
  vehicles,
  wheels,
  paints,
  tyres,
  suspensions,
  bodykits,
  getVariantKey,
  isPreviewAvailable,
} from "../src/catalogue.js";

const root = new URL("../", import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Decode the actual PNG scanlines so a flattened/opaque image cannot pass by
// retaining an RGBA header or stale alpha statistics in its JSON manifest.
function pngAlpha(bytes) {
  assert.deepEqual(
    bytes.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8, "Artwork must use eight-bit PNG channels");
  assert.equal(bytes[25], 6, "Artwork must use transparent RGBA channels");
  assert.equal(bytes[28], 0, "Interlaced PNG requires an explicit decoder");
  const parts = [];
  for (let cursor = 8; cursor < bytes.length; ) {
    const length = bytes.readUInt32BE(cursor);
    const type = bytes.toString("ascii", cursor + 4, cursor + 8);
    if (type === "IDAT")
      parts.push(bytes.subarray(cursor + 8, cursor + 8 + length));
    cursor += length + 12;
    if (type === "IEND") break;
  }
  assert.ok(parts.length, "PNG image data is required");
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * 4;
  assert.equal(
    raw.length,
    (stride + 1) * height,
    "Unexpected PNG scanline length",
  );
  const pixels = new Uint8Array(stride * height);
  const paeth = (left, above, upperLeft) => {
    const prediction = left + above - upperLeft;
    const a = Math.abs(prediction - left);
    const b = Math.abs(prediction - above);
    const c = Math.abs(prediction - upperLeft);
    return a <= b && a <= c ? left : b <= c ? above : upperLeft;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.ok(filter <= 4, "Unknown PNG scanline filter");
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const left = x >= 4 ? pixels[index - 4] : 0;
      const above = y ? pixels[index - stride] : 0;
      const upperLeft = y && x >= 4 ? pixels[index - stride - 4] : 0;
      const prediction =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : paeth(left, above, upperLeft);
      pixels[index] = (raw[y * (stride + 1) + x + 1] + prediction) & 255;
    }
  }
  let transparentPixels = 0;
  let opaquePixelsAlpha128 = 0;
  const bounds = [width, height, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === 0) transparentPixels++;
      if (alpha >= 128) {
        opaquePixelsAlpha128++;
        bounds[0] = Math.min(bounds[0], x);
        bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x + 1);
        bounds[3] = Math.max(bounds[3], y + 1);
      }
    }
  }
  assert.ok(opaquePixelsAlpha128 > 0, "Artwork cannot be an empty alpha layer");
  return {
    width,
    height,
    opaqueBoundsAlpha128: bounds,
    alphaStatistics: {
      transparentPixels,
      opaquePixelsAlpha128,
      totalPixels: width * height,
    },
  };
}

test("enabled car variants resolve to the reviewed transparent artwork", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("public/assets/cars/manifest.json", root), "utf8"),
  );
  assert.equal(Object.keys(variants).length, 30);
  assert.equal(
    new Set(Object.values(manifest.assets).map(({ sha256 }) => sha256)).size,
    30,
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

test("each complete car has one uniform transform and all 360 baseline appearances have artwork", () => {
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

test("all twenty upgrades retain reviewed bytes, actual transparency and registered camera bounds", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("public/assets/upgrades/manifest.json", root),
      "utf8",
    ),
  );
  const cars = JSON.parse(
    await readFile(new URL("public/assets/cars/manifest.json", root), "utf8"),
  );
  assert.deepEqual(manifest.logicalCanvas, STAGE);
  assert.deepEqual(manifest.vehicleTransforms, CAR_TRANSFORMS);
  assert.equal(Object.keys(upgradeVariants).length, 20);
  assert.equal(Object.keys(manifest.assets).length, 20);
  assert.equal(
    new Set(Object.values(manifest.assets).map(({ sha256 }) => sha256)).size,
    20,
  );
  for (const [key, variant] of Object.entries(upgradeVariants)) {
    assert.equal(
      variant.ready,
      true,
      "Upgrade registry must declare readiness explicitly",
    );
    const [vehicle, family] = key.split(":");
    const entry = manifest.assets[key];
    assert.ok(entry, "Missing upgrade provenance: " + key);
    assert.equal(entry.src, variant.src);
    assert.equal(entry.sourceCar, variants[`${vehicle}:sr-01`].src);
    assert.match(entry.sourceGeneratedOriginal, /^exec-[\da-f-]+\.png$/);
    assert.ok(entry.generationMethod.includes("image_gen"));
    const bytes = await readFile(new URL("public/" + variant.src, root));
    assert.equal(bytes.length, entry.bytes, key);
    assert.equal(
      digest(bytes),
      entry.sha256,
      "Upgrade differs from reviewed file: " + key,
    );
    const actual = pngAlpha(bytes);
    assert.equal(actual.width, entry.width, key);
    assert.equal(actual.height, entry.height, key);
    assert.deepEqual(
      actual.opaqueBoundsAlpha128,
      entry.opaqueBoundsAlpha128,
      key,
    );
    assert.deepEqual(actual.alphaStatistics, entry.alphaStatistics, key);
    assert.ok(Math.abs(actual.width - STAGE.width) <= 3, key + " canvas width");
    assert.ok(
      Math.abs(actual.height - STAGE.height) <= 2,
      key + " canvas height",
    );
    const { transparentPixels, opaquePixelsAlpha128, totalPixels } =
      actual.alphaStatistics;
    const [left, top, right, bottom] = actual.opaqueBoundsAlpha128;
    if (family === "body") {
      assert.equal(entry.rendering, "sparse_registered_additive_carbon_layer");
      assert.ok(
        transparentPixels / totalPixels > 0.85,
        key + " must contain sparse accessories, not a car",
      );
      assert.ok(
        opaquePixelsAlpha128 / totalPixels < 0.12,
        key + " accessory alpha coverage",
      );
      assert.ok(
        top >= 475,
        key + " must exclude original roof, glazing and wing",
      );
      assert.ok(left >= 20 && right <= STAGE.width, key + " accessory framing");
    } else {
      assert.equal(family, "tyre");
      assert.equal(entry.rendering, "fullcar_source_clipped_to_rubber");
      assert.ok(
        transparentPixels / totalPixels > 0.35,
        key + " must retain a transparent outer canvas",
      );
      assert.ok(
        opaquePixelsAlpha128 / totalPixels > 0.3,
        key + " is a registered source, not recentered isolated tyres",
      );
      const referenceBounds =
        cars.assets[`${vehicle}:sr-01`].opaqueBoundsAlpha128;
      actual.opaqueBoundsAlpha128.forEach((coordinate, index) => {
        assert.ok(
          Math.abs(coordinate - referenceBounds[index]) <= 24,
          key + " camera/contact registration",
        );
      });
    }
    const transform = CAR_TRANSFORMS[vehicle];
    const scale = transform.width / STAGE.width;
    assert.ok(
      transform.top + bottom * scale < 635,
      key + " platform/footer clearance",
    );
  }
});

test("all 9,720 five-car exterior configurations have explicit preview support", () => {
  const keys = new Set();
  let count = 0;
  for (const vehicle of vehicles)
    for (const wheel of wheels)
      for (const paint of paints)
        for (const tyre of tyres)
          for (const suspension of suspensions)
            for (const body of bodykits) {
              const selection = {
                vehicle: vehicle.id,
                wheel: wheel.id,
                paint: paint.id,
                tyre: tyre.id,
                suspension: suspension.id,
                body: body.id,
              };
              const key = getVariantKey(selection);
              assert.ok(
                isPreviewAvailable(selection, variants, upgradeVariants),
                key,
              );
              assert.ok(
                !keys.has(key),
                "Distinct configurations cannot share a render-cache key: " +
                  key,
              );
              keys.add(key);
              for (const kind of ["tyre", "body"]) {
                const baseline = kind === "tyre" ? "road" : "original";
                const asset = getUpgradeVariant(selection, kind);
                if (selection[kind] === baseline) assert.equal(asset, null);
                else
                  assert.strictEqual(
                    asset,
                    upgradeVariants[`${vehicle.id}:${kind}:${selection[kind]}`],
                  );
              }
              count++;
            }
  assert.equal(count, 9720);
  assert.equal(keys.size, 9720);
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
