// Complete-car bases share a uniform stage transform. The upgrade renderer
// can lower the rigid body while authored wheel/contact masks remain fixed.
import { vehicles } from "./catalogue.js";
export const STAGE = Object.freeze({ width: 1672, height: 941 });
export const CAR_TRANSFORM = Object.freeze({
  left: 418.27272727272725,
  top: 169.63636363636363,
  width: 912,
  height: 941 * (6 / 11),
});
export const CAR_TRANSFORMS = Object.freeze({
  sti: CAR_TRANSFORM,
  porsche: CAR_TRANSFORM,
  gt86: Object.freeze({
    ...CAR_TRANSFORM,
    top: CAR_TRANSFORM.top - 19 * (6 / 11),
  }),
  m3: Object.freeze({
    ...CAR_TRANSFORM,
    top: CAR_TRANSFORM.top - 12 * (6 / 11),
  }),
  golf: Object.freeze({
    left: CAR_TRANSFORM.left + (CAR_TRANSFORM.width - STAGE.width * 0.54) / 2,
    top: 174.3,
    width: STAGE.width * 0.54,
    height: STAGE.height * 0.54,
  }),
});
const wheelIds = ["sr-01", "te37", "bbs-lm", "oz", "rotiform", "work"];
export const variants = Object.freeze(
  Object.fromEntries(
    vehicles
      .map(({ id }) => id)
      .flatMap((vehicle) =>
        wheelIds.map((wheel) => [
          `${vehicle}:${wheel}`,
          Object.freeze({
            src:
              vehicle === "sti" && (wheel === "sr-01" || wheel === "te37")
                ? `assets/scene/blue-${wheel}.png`
                : `assets/cars/${vehicle}/${wheel}.png`,
            ready: true,
            suspensionReady: true,
            ...(["m3", "golf"].includes(vehicle)
              ? { portableSrc: `assets/portable/${vehicle}-${wheel}.webp` }
              : {}),
          }),
        ]),
      ),
  ),
);
export const getSceneVariant = (selection) =>
  variants[`${selection.vehicle ?? "sti"}:${selection.wheel}`];
export const upgradeVariants = Object.freeze(
  Object.fromEntries(
    vehicles
      .map(({ id }) => id)
      .flatMap((vehicle) => [
        ...["sport", "track"].map((id) => [
          `${vehicle}:tyre:${id}`,
          Object.freeze({
            src: `assets/upgrades/${vehicle}/tyre-${id}.png`,
            ready: true,
            ...(["m3", "golf"].includes(vehicle)
              ? { portableSrc: `assets/portable/${vehicle}-tyre-${id}.webp` }
              : {}),
          }),
        ]),
        ...["street", "track"].map((id) => [
          `${vehicle}:body:${id}`,
          Object.freeze({
            src: `assets/upgrades/${vehicle}/body-${id}.png`,
            ready: true,
            ...(["m3", "golf"].includes(vehicle)
              ? { portableSrc: `assets/portable/${vehicle}-body-${id}.webp` }
              : {}),
          }),
        ]),
      ]),
  ),
);
export function getUpgradeVariant(selection, kind) {
  const baseline = kind === "tyre" ? "road" : "original";
  const id = selection[kind] ?? baseline;
  return id === baseline
    ? null
    : upgradeVariants[`${selection.vehicle ?? "sti"}:${kind}:${id}`];
}
export function assetUrl(path) {
  const key = path.replace(/^\.\//, "");
  return (
    globalThis.__SUNDAE_INLINE_ASSETS__?.[key] ??
    `${import.meta.env.BASE_URL}${key}`
  );
}
