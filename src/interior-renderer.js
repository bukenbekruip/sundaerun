import { getSteeringOption } from "./interiors.js";

// Authored in the 1672 × 941 cabin camera. Only the OEM rim receives material
// changes: the actual perspective, hub, airbag, spokes, controls and cabin stay.
const rims = {
  sti: {
    cx: 459,
    cy: 391,
    outer:
      "M459 194 C577 191 668 277 668 392 C669 507 582 591 460 591 C340 591 251 507 251 393 C250 278 340 194 459 194 Z",
    inner:
      "M459 229 C559 226 633 298 634 392 C635 487 563 555 460 555 C358 555 284 485 285 393 C284 298 357 229 459 229 Z",
  },
  porsche: {
    cx: 519,
    cy: 363,
    outer:
      "M519 170 C632 170 713 252 713 364 C713 476 631 560 519 560 C407 559 324 477 324 365 C323 252 406 170 519 170 Z",
    inner:
      "M519 207 C609 207 677 274 677 364 C677 455 609 523 519 523 C429 523 360 455 360 365 C360 275 427 207 519 207 Z",
  },
  gt86: {
    cx: 476,
    cy: 365,
    outer:
      "M476 171 C588 171 670 253 670 365 C670 477 589 560 476 560 C365 560 281 478 281 366 C281 254 365 171 476 171 Z",
    inner:
      "M476 204 C569 204 637 273 637 365 C637 458 568 526 476 526 C384 526 315 457 315 366 C315 274 384 204 476 204 Z",
  },
  m3: {
    cx: 496,
    cy: 365,
    outer:
      "M496 175 C608 174 692 256 692 365 C692 476 608 552 496 552 C383 552 301 476 301 365 C301 255 384 175 496 175 Z",
    inner:
      "M496 209 C590 208 658 277 658 365 C658 455 590 518 496 518 C403 518 335 454 335 365 C335 277 403 209 496 209 Z",
  },
  golf: {
    cx: 477,
    cy: 354,
    outer:
      "M477 159 C599 158 687 241 687 355 C687 436 658 502 599 534 Q477 568 356 535 C297 503 266 437 266 355 C266 242 355 159 477 159 Z",
    inner:
      "M477 193 C579 192 652 262 652 355 C652 424 627 480 580 504 Q477 533 374 505 C327 480 301 424 301 355 C301 262 374 193 477 193 Z",
  },
  rs3: {
    cx: 486,
    cy: 353,
    outer:
      "M486 158 C609 158 698 239 698 352 C698 429 670 495 608 529 Q487 565 366 531 C303 498 273 433 273 354 C273 240 363 158 486 158 Z",
    inner:
      "M486 193 C589 192 663 262 663 353 C663 420 639 474 590 500 Q487 530 383 501 C335 476 308 420 308 354 C308 262 383 193 486 193 Z",
  },
};
export const steeringGeometry = Object.freeze(rims);
export function createSteeringMask(vehicle, width = 1672, height = 941) {
  const g = rims[vehicle];
  if (!g)
    throw new RangeError("Steering contours are unavailable for this model.");
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.scale(width / 1672, height / 941);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(g.outer));
  ctx.globalCompositeOperation = "destination-out";
  ctx.fill(new Path2D(g.inner));
  return c;
}
export function renderSteering(image, vehicle, option = "stock") {
  if (!getSteeringOption(option))
    throw new RangeError("Unknown steering wheel option.");
  const width = image.naturalWidth || image.width,
    height = image.naturalHeight || image.height;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  if (option === "stock") return c;
  const mask = createSteeringMask(vehicle, width, height)
    .getContext("2d")
    .getImageData(0, 0, width, height).data;
  const pixels = ctx.getImageData(0, 0, width, height),
    g = rims[vehicle];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4,
        m = mask[i + 3] / 255;
      if (!m) continue;
      const px = (x * 1672) / width,
        py = (y * 941) / height;
      const r = pixels.data[i],
        green = pixels.data[i + 1],
        b = pixels.data[i + 2];
      const lum = 0.2126 * r + 0.7152 * green + 0.0722 * b;
      // Retain original shading and stitching. The new surface follows the
      // photographed rim, rather than drawing a replacement circle over it.
      let shade = lum,
        color;
      if (option === "carbon" && (py < g.cy - 90 || py > g.cy + 105)) {
        const weave =
          (Math.floor((px + py) / 5) + Math.floor((px - py) / 5)) & 1 ? 8 : -6;
        shade = Math.min(205, lum * 1.1 + weave + 7);
        color = [shade * 0.93, shade, shade * 1.04];
      } else {
        const grain = ((Math.imul(x + 17, y + 31) >>> 2) % 7) - 3;
        shade = Math.min(185, lum * 0.7 + 22 + grain);
        color = [shade * 0.94, shade * 0.97, shade];
      }
      // A narrow 12-o'clock marker is confined to the authored rim itself.
      if (Math.abs(px - g.cx) < 8 && py < g.cy - 130)
        color = option === "alcantara" ? [219, 184, 76] : [166, 37, 47];
      for (let k = 0; k < 3; k++)
        pixels.data[i + k] = Math.round(
          pixels.data[i + k] * (1 - m * 0.87) + color[k] * m * 0.87,
        );
    }
  ctx.putImageData(pixels, 0, 0);
  return c;
}
