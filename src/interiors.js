import { getVehicle, vehicles } from "./catalogue.js";

// Complete authored model-specific views. Physical-product fitment is separate.
export const interiorPackages = Object.freeze([
  Object.freeze({
    id: "stock",
    name: "Original cabin",
    price: 0,
    description:
      "Original model-specific dashboard, seats, steering wheel and console.",
  }),
  Object.freeze({
    id: "club",
    name: "Sundae Club cabin",
    price: 1800,
    description:
      "A coordinated cabin concept with cherry accents, retrimmed seats, custom mats and interior details. The original dashboard layout is retained.",
  }),
]);
export const getInteriorPackage = (id) =>
  interiorPackages.find((p) => p.id === id) ?? null;
export const interiorVariants = Object.freeze(
  Object.fromEntries(
    vehicles.flatMap(({ id }) =>
      interiorPackages.map((p) => [
        `${id}:${p.id}`,
        Object.freeze({
          src: `assets/interiors/${id}/${p.id}.webp`,
          ready: true,
        }),
      ]),
    ),
  ),
);
export function getInteriorVariant(vehicle, packageId = "stock") {
  return getVehicle(vehicle) && getInteriorPackage(packageId)
    ? interiorVariants[`${vehicle}:${packageId}`]
    : null;
}
export function normaliseInteriors(value) {
  return Object.fromEntries(
    vehicles.map(({ id }) => {
      const input = value?.[id];
      const owned = [
        ...new Set(
          Array.isArray(input?.owned)
            ? input.owned.filter((key) => getInteriorPackage(key)?.price > 0)
            : [],
        ),
      ];
      const selected = getInteriorPackage(input?.fitted)?.id ?? "stock";
      return [
        id,
        {
          owned,
          fitted:
            selected === "stock" || owned.includes(selected)
              ? selected
              : "stock",
        },
      ];
    }),
  );
}
