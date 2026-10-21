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
  Object.freeze({
    id: "heritage",
    name: "Heritage tan cabin",
    price: 2300,
    description:
      "Cognac leather bolsters, cream diamond-stitched inserts and matching tan door/armrest trim.",
  }),
  Object.freeze({
    id: "track",
    name: "Track Alcantara cabin",
    price: 2600,
    description:
      "Graphite Alcantara upholstery, cherry-red centre inserts, carbon trim and tailored red-edged mats.",
  }),
]);
// Steering is bought independently and can be paired with every cabin package.
export const steeringOptions = Object.freeze([
  Object.freeze({
    id: "stock",
    name: "Factory steering wheel",
    price: 0,
    description: "The model's original wheel and finish.",
  }),
  Object.freeze({
    id: "alcantara",
    name: "Alcantara sport retrim",
    price: 900,
    description:
      "Matte graphite grips, contrast stitching and a yellow centre marker. Factory hub and controls retained.",
  }),
  Object.freeze({
    id: "carbon",
    name: "Carbon performance retrim",
    price: 1600,
    description:
      "Carbon weave on the upper and lower rim, dark grips and a cherry-red centre marker. Factory hub and controls retained.",
  }),
]);
export const getSteeringOption = (id) =>
  steeringOptions.find((p) => p.id === id) ?? null;
export function normaliseSteering(value) {
  return Object.fromEntries(
    vehicles.map(({ id }) => {
      const input = value?.[id];
      const owned = [
        ...new Set(
          Array.isArray(input?.owned)
            ? input.owned.filter((key) => getSteeringOption(key)?.price > 0)
            : [],
        ),
      ];
      const chosen = getSteeringOption(input?.fitted)?.id ?? "stock";
      return [
        id,
        {
          owned,
          fitted:
            chosen === "stock" || owned.includes(chosen) ? chosen : "stock",
        },
      ];
    }),
  );
}

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
