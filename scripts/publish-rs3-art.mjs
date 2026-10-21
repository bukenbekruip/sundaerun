// Distribution encoding only. All creative pixels come from image_gen.
// Preserve the generated originals; do not crop, resize or recolour artwork.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  publicRoot = resolve(root, "public");
const inputs = JSON.parse(
  readFileSync(
    process.argv[2] ?? resolve(root, "docs/RS3_ART_INPUTS.json"),
    "utf8",
  ),
);
const records = JSON.parse(readFileSync(resolve(publicRoot, "assets/expansion-sources.json"), "utf8"));
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
for (const [key, original] of Object.entries(inputs)) {
  const match = key.match(/^(sti|porsche|gt86|m3|golf|rs3)-(.+)$/);
  if (!match || !/^exec-[a-f0-9-]+\.png$/.test(original))
    throw new Error("Invalid art input " + key);
  const [, vehicle, option] = match;
  const source = resolve(root, "../generated_images", original);
  let assetKey, src, portableSrc;
  if (option.startsWith("cabin-")) {
    assetKey = `${vehicle}:cabin:${option.slice(6)}`;
    src = `assets/interiors/${vehicle}/${option.slice(6)}.webp`;
  } else {
    const upgrade = option.match(/^(tyre|body)-(sport|track|street)$/);
    const wheel = option === "base" ? "sr-01" : option;
    if (upgrade) {
      assetKey = `${vehicle}:${upgrade[1]}:${upgrade[2]}`;
      src = `assets/upgrades/${vehicle}/${option}.png`;
      portableSrc = `assets/portable/${vehicle}-${option}.webp`;
    } else {
      if (
        !["sr-01", "te37", "bbs-lm", "oz", "rotiform", "work"].includes(wheel)
      )
        throw new Error("Unknown rim " + wheel);
      assetKey = `${vehicle}:${wheel}`;
      src = `assets/cars/${vehicle}/${wheel}.png`;
      portableSrc = `assets/portable/${vehicle}-${wheel}.webp`;
    }
    mkdirSync(dirname(resolve(publicRoot, src)), { recursive: true });
    copyFileSync(source, resolve(publicRoot, src));
  }
  const encoded = resolve(publicRoot, portableSrc ?? src);
  mkdirSync(dirname(encoded), { recursive: true });
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    source,
    "-frames:v",
    "1",
    "-c:v",
    "libwebp",
    "-quality",
    "92",
    "-compression_level",
    "6",
    "-preset",
    "picture",
    encoded,
  ]);
  records[assetKey] = {
    sourceGeneratedOriginal: original,
    sourceSha256: hash(source),
    src,
    sha256: hash(resolve(publicRoot, src)),
    ...(portableSrc ? { portableSrc, portableSha256: hash(encoded) } : {}),
    production:
      "image_gen artwork; FFmpeg WebP distribution encoding at quality 92, no geometry or material editing",
  };
}
writeFileSync(
  resolve(publicRoot, "assets/expansion-sources.json"),
  JSON.stringify(records, null, 2) + "\n",
);
console.log(
  `Published ${Object.keys(records).length} generated assets and compact distribution copies.`,
);
