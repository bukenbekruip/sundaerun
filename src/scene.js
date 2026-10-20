// Full-car renders share a canvas and transform; bodies and wheels never scale separately.
export const STAGE = Object.freeze({ width: 1672, height: 941 });
export const CAR_TRANSFORM = Object.freeze({
  left: 418.27272727272725,
  top: 169.63636363636363,
  width: 912,
  height: 941 * (6 / 11),
});
export const variants = Object.freeze({
  "blue:sr-01": { src: "assets/scene/blue-sr-01.png", ready: true },
  "black:sr-01": { src: "assets/scene/black-sr-01.png", ready: true },
  "mint:sr-01": { src: "assets/scene/mint-sr-01.png", ready: true },
  "blue:te37": { src: "assets/scene/blue-te37.png", ready: true },
  "black:te37": { src: "assets/scene/black-te37.png", ready: true },
  "mint:te37": { src: "assets/scene/mint-te37.png", ready: true },
});
export function assetUrl(path) {
  const key = path.replace(/^\.\//, "");
  return (
    globalThis.__SUNDAE_INLINE_ASSETS__?.[key] ??
    `${import.meta.env.BASE_URL}${key}`
  );
}
