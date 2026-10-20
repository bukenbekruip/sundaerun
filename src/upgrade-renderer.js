import { createPaintMask } from "./paint-renderer.js";

/**
 * Registered 2D assembly for the existing illustrated cars. Suspension translates
 * the complete rigid body; tyre/rim geometry and floor contacts never scale.
 * All contours below are authored in the common 1672 x 941 camera coordinates.
 */
const WIDTH = 1672;
const HEIGHT = 941;
const masks = new Map();

export const suspensionOffsets = Object.freeze({
  sti: Object.freeze({ original: 0, sport: 7, track: 13 }),
  porsche: Object.freeze({ original: 0, sport: 5, track: 9 }),
  gt86: Object.freeze({ original: 0, sport: 7, track: 12 }),
});

const STI = {
  wheels: [
    "M104 550 C113 514 125 491 141 476 C153 466 165 462 178 464 C193 464 207 478 220 501 C237 530 247 568 253 607 L255 625 L250 631 L250 663 L280 686 L305 695 C298 713 267 728 222 731 C172 736 138 723 119 698 C101 674 94 632 97 588 Z",
    "M692 593 C700 545 723 508 756 495 C785 484 814 488 835 506 C852 521 864 537 875 554 L884 572 L896 581 L906 604 L902 626 L905 678 L905 716 L899 767 L946 779 C925 797 905 806 879 810 C826 831 766 822 733 794 C704 774 688 743 682 704 C679 670 684 625 692 593 Z",
  ],
  rims: [
    "M171 492 C200 488 225 522 233 572 C245 623 229 672 204 691 C181 712 148 704 130 679 C106 647 106 576 126 529 C138 505 152 496 171 492 Z",
    "M786 520 C833 514 867 551 879 604 C896 669 874 735 843 762 C807 792 768 781 743 750 C714 714 704 656 714 607 C725 556 751 526 786 520 Z",
  ],
  ground: [
    "M54 682 L109 681 L145 710 L230 710 L282 688 L656 720 L704 738 L758 780 L900 790 L988 749 L1649 729 L1672 805 L1559 844 L930 866 L661 826 L275 781 L65 741 Z",
  ],
};

const PORSCHE = {
  wheels: [
    "M96 523 C109 468 141 435 180 433 C223 432 252 471 269 522 C279 551 281 596 280 637 L278 684 L324 690 C306 710 264 730 223 729 C177 734 134 714 108 677 C83 642 81 574 96 523 Z",
    "M744 581 C752 529 777 483 823 477 C876 466 925 493 952 540 C975 579 985 640 987 700 L985 780 L990 790 L960 803 C943 810 922 814 896 814 C842 820 792 802 765 766 C738 729 724 668 730 620 Z",
  ],
  rims: [
    "M112 529 C125 482 155 457 186 456 C220 454 249 489 260 538 C274 592 271 638 249 672 C224 709 191 712 161 691 C125 663 104 613 104 572 C104 555 107 540 112 529 Z",
    "M754 589 C767 533 797 505 837 502 C882 498 918 526 936 569 C958 618 959 675 942 715 C924 758 894 782 861 784 C818 786 786 758 769 714 C748 668 744 624 754 589 Z",
  ],
  ground: [
    "M44 661 L111 658 L182 698 L272 682 L698 708 L747 741 L807 788 L932 793 L1007 754 L1637 732 L1672 813 L1543 844 L948 863 L645 813 L275 761 L49 731 Z",
  ],
};

const GT86 = {
  wheels: [
    "M87 557 C93 510 116 474 149 466 C183 457 211 478 231 518 C245 552 252 599 257 638 L248 660 L248 700 L290 706 C279 726 250 745 223 748 C177 759 129 749 103 724 C91 710 82 689 78 674 L95 663 C88 637 79 606 82 585 Z",
    "M728 604 C743 548 773 512 813 506 C855 493 899 516 925 560 C944 593 953 650 951 700 L948 720 L948 785 L973 799 L952 820 C931 830 910 834 885 835 C834 848 771 825 745 790 C731 770 720 742 716 709 C710 679 717 648 726 625 Z",
  ],
  rims: [
    "M104 549 C115 511 139 484 167 485 C201 485 224 518 235 564 C246 609 244 656 227 691 C212 721 187 732 159 719 C129 704 110 672 102 630 C96 598 97 575 104 549 Z",
    "M746 604 C756 563 781 531 815 526 C854 520 886 541 906 583 C930 629 930 687 913 732 C897 776 869 802 834 804 C797 805 767 781 752 741 C732 694 732 645 746 604 Z",
  ],
  ground: [
    "M28 691 L119 684 L193 722 L266 700 L693 730 L740 768 L804 811 L943 806 L1009 766 L1651 752 L1672 836 L1551 866 L948 886 L658 839 L276 789 L41 756 Z",
  ],
};

const geometry = { sti: STI, porsche: PORSCHE, gt86: GT86 };

export const protectedWheelSamples = Object.freeze({
  sti: Object.freeze([
    { name: "rear-wheel", x: 174, y: 598 },
    { name: "front-wheel", x: 798, y: 650 },
    { name: "rear-contact", x: 207, y: 724 },
    { name: "front-contact", x: 850, y: 805 },
  ]),
  porsche: Object.freeze([
    { name: "rear-wheel", x: 180, y: 580 },
    { name: "front-wheel", x: 855, y: 640 },
    { name: "rear-contact", x: 190, y: 710 },
    { name: "front-contact", x: 860, y: 802 },
  ]),
  gt86: Object.freeze([
    { name: "rear-wheel", x: 176, y: 596 },
    { name: "front-wheel", x: 852, y: 667 },
    { name: "rear-contact", x: 185, y: 733 },
    { name: "front-contact", x: 852, y: 821 },
  ]),
});

function canvas(width, height) {
  const result = document.createElement("canvas");
  result.width = width;
  result.height = height;
  return result;
}

function registration(width, height) {
  const scale = Math.min(width / WIDTH, height / HEIGHT);
  return { scale, x: (width - WIDTH * scale) / 2, y: (height - HEIGHT * scale) / 2 };
}

function authoredMask(vehicle, family, width, height) {
  const key = `${vehicle}:${family}:${width}:${height}`;
  if (!masks.has(key)) {
    const paths = geometry[vehicle];
    if (!paths) throw new RangeError(`Upgrade contours are unavailable for ${vehicle}`);
    const result = canvas(width, height);
    const context = result.getContext("2d", { willReadFrequently: true });
    const { scale, x, y } = registration(width, height);
    context.translate(x, y);
    context.scale(scale, scale);
    context.fillStyle = "#fff";
    for (const path of paths[family === "tyres" ? "wheels" : family]) context.fill(new Path2D(path));
    if (family === "tyres") {
      context.globalCompositeOperation = "destination-out";
      context.lineWidth = 6;
      context.lineJoin = "round";
      for (const path of paths.rims) {
        const contour = new Path2D(path);
        context.fill(contour);
        // An additional three-pixel lip guard covers small wheel-render drift.
        context.stroke(contour);
      }
    }
    masks.set(key, context.getImageData(0, 0, width, height));
  }
  return masks.get(key);
}

function diagnosticMask(vehicle, family, width, height) {
  const result = canvas(width, height);
  const data = authoredMask(vehicle, family, width, height);
  result.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(data.data), width, height), 0, 0);
  return result;
}

/** Visible wheel/tyre extraction contours, distinct from paint exclusions. */
export const createWheelMask = (vehicle, width = WIDTH, height = HEIGHT) => diagnosticMask(vehicle, "wheels", width, height);
/** Rubber only: complete rim lip, spokes and brake assembly are holes. */
export const createTyreMask = (vehicle, width = WIDTH, height = HEIGHT) => diagnosticMask(vehicle, "tyres", width, height);
/** Ground envelope; actual extraction additionally requires source alpha < 230. */
export const createGroundMask = (vehicle, width = WIDTH, height = HEIGHT) => diagnosticMask(vehicle, "ground", width, height);
export const upgradeGeometry = Object.freeze({ width: WIDTH, height: HEIGHT, groundAlphaCeiling: 230 });

async function ready(image, label) {
  if (!image) throw new TypeError(`The selected ${label} artwork is missing.`);
  if (!image.complete || !image.naturalWidth) await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new TypeError(`The selected ${label} artwork is empty.`);
}

function drawRegistered(context, image, width, height, offsetY = 0) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
}

/**
 * paintedImage is the loaded paint-renderer result. Optional skins are matching
 * camera PNGs, not product photographs. The application owns its bounded cache.
 */
export async function renderUpgrades(paintedImage, vehicleId, selection, { baseImage, tyreImage, kitImage } = {}) {
  const tyre = selection.tyre ?? "road";
  const suspension = selection.suspension ?? "original";
  const body = selection.body ?? "original";
  if (tyre === "road" && suspension === "original" && body === "original") return paintedImage.currentSrc || paintedImage.src;
  await ready(paintedImage, "car");
  const drop = suspensionOffsets[vehicleId]?.[suspension];
  if (drop === undefined) throw new RangeError(`Unsupported suspension: ${vehicleId}/${suspension}`);
  if (!["road", "sport", "track"].includes(tyre) || !["original", "street", "track"].includes(body)) throw new RangeError("Unsupported tyre or body upgrade.");
  if (tyre !== "road") await ready(tyreImage, "tyre");
  if (body !== "original") await ready(kitImage, "body kit");
  const width = paintedImage.naturalWidth;
  const height = paintedImage.naturalHeight;
  const result = canvas(width, height);
  const context = result.getContext("2d", { willReadFrequently: true });
  context.drawImage(paintedImage, 0, 0);
  let source = context.getImageData(0, 0, width, height);
  let bodyPaint;
  if (baseImage) {
    await ready(baseImage, "original car");
    const original = canvas(width, height);
    const originalContext = original.getContext("2d", { willReadFrequently: true });
    drawRegistered(originalContext, baseImage, width, height);
    const originalPixels = originalContext.getImageData(0, 0, width, height).data;
    const paint = createPaintMask(vehicleId, width, height).getContext("2d").getImageData(0, 0, width, height).data;
    bodyPaint = new Uint8Array(width * height);
    for (let i = 0; i < originalPixels.length; i += 4) {
      // This guard only refines the authored contour at painted arch edges.
      // It uses the original blue artwork, independent of the selected paint.
      if (paint[i + 3] >= 128 && originalPixels[i + 2] > originalPixels[i] + 35 && originalPixels[i + 2] > originalPixels[i + 1] + 20) bodyPaint[i / 4] = 1;
    }
  }
  if (tyre !== "road") {
    const skin = canvas(width, height);
    const skinContext = skin.getContext("2d", { willReadFrequently: true });
    drawRegistered(skinContext, tyreImage, width, height);
    const pixels = skinContext.getImageData(0, 0, width, height).data;
    const rubber = authoredMask(vehicleId, "tyres", width, height).data;
    for (let i = 0; i < source.data.length; i += 4) {
      if (!source.data[i + 3] || !rubber[i + 3] || !pixels[i + 3] || bodyPaint?.[i / 4]) continue;
      const blend = rubber[i + 3] / 255 * pixels[i + 3] / 255;
      for (let c = 0; c < 3; c += 1) source.data[i + c] = Math.round(source.data[i + c] * (1 - blend) + pixels[i + c] * blend);
      // Keep the original tyre silhouette and every source alpha byte.
    }
  }
  if (drop === 0) context.putImageData(source, 0, 0);
  else {
    const wheels = authoredMask(vehicleId, "wheels", width, height).data;
    const ground = authoredMask(vehicleId, "ground", width, height).data;
    const fixed = new ImageData(width, height);
    const moving = new ImageData(width, height);
    for (let i = 0; i < source.data.length; i += 4) {
      const isFixed = (wheels[i + 3] >= 128 && !bodyPaint?.[i / 4]) || (ground[i + 3] >= 128 && source.data[i + 3] < upgradeGeometry.groundAlphaCeiling);
      const target = isFixed ? fixed.data : moving.data;
      for (let c = 0; c < 4; c += 1) target[i + c] = source.data[i + c];
    }
    context.putImageData(fixed, 0, 0);
    const rigidBody = canvas(width, height);
    rigidBody.getContext("2d").putImageData(moving, 0, 0);
    // Integer pixel translation preserves body detail instead of resampling it.
    const offsetY = Math.round(drop * registration(width, height).scale);
    context.drawImage(rigidBody, 0, offsetY);
  }
  if (body !== "original") drawRegistered(context, kitImage, width, height, Math.round(drop * registration(width, height).scale));
  return result.toDataURL("image/png");
}
