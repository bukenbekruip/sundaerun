/**
 * Catalogue data is separate from both preview artwork and game progress.
 * Add real merchant data here only when a product/affiliate destination is ready.
 * A matching illustration is not evidence that a part fits a physical vehicle.
 */
const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const vehicles = freeze([
  {
    id: "sti",
    name: "Subaru WRX STI",
    shortName: "WRX STI",
    brand: "Subaru",
    fitmentStatus: "unverified",
  },
  {
    id: "porsche",
    name: "Porsche 911 GT3 RS",
    shortName: "911 GT3 RS",
    brand: "Porsche",
    fitmentStatus: "unverified",
  },
  {
    id: "gt86",
    name: "Toyota 86",
    shortName: "Toyota 86",
    brand: "Toyota",
    fitmentStatus: "unverified",
  },
  {
    id: "m3",
    name: "BMW M3 E46",
    shortName: "M3 E46",
    brand: "BMW",
    fitmentStatus: "unverified",
  },
  {
    id: "golf",
    name: "Volkswagen Golf Mk7 GTI",
    shortName: "Golf GTI",
    brand: "Volkswagen",
    fitmentStatus: "unverified",
  },
  {
    id: "rs3",
    name: "Audi RS3 8Y Sportback",
    shortName: "RS3",
    brand: "Audi",
    fitmentStatus: "unverified",
  },
]);

// Retained for callers that need the default vehicle rather than the active one.
export const VEHICLE = vehicles[0];

export function getVehicle(id = VEHICLE.id) {
  return vehicles.find((vehicle) => vehicle.id === id) ?? null;
}

const pendingFitment = () => ({
  vehicleIds: [],
  verification: "pending",
  wheelDiameterIn: null,
  widthIn: null,
  boltPattern: null,
  offsetMm: null,
  tyreSize: null,
});

const wheel = (id, name, brand, gamePrice, image) => ({
  id,
  type: "wheel",
  name,
  brand,
  gamePrice,
  gameCurrency: "credits",
  thumbnail: `./assets/products/wheel-${id}.png`,
  productStatus: "concept-reference",
  previewVehicleIds: vehicles.map(({ id: vehicleId }) => vehicleId),
  previewReady: false,
  merchant: null,
  fitment: pendingFitment(),
});

export const wheels = freeze([
  wheel("sr-01", "Sundae Run SR-01", "Sundae Run", 2500, "sr-01"),
  wheel("te37", "Rays TE37", "Rays", 2800, "te37"),
  wheel("bbs-lm", "BBS LM", "BBS", 2800, "bbs-lm"),
  wheel("oz", "OZ Ultraleggera", "OZ", 2800, "oz"),
  wheel("rotiform", "Rotiform TUF-R", "Rotiform", 2400, "rotiform"),
  wheel("work", "Work Meister S1", "Work", 2600, "work"),
]);

export const paints = freeze(
  [
    ["blue", "Rally Blue", "#195cc8", "Metallic"],
    ["black", "Onyx Black", "#24282e", "Metallic"],
    ["mint", "Mint Coast", "#9ed7c6", "Pearl"],
    ["white", "Glacier White", "#e5e7e4", "Pearl"],
    ["silver", "Liquid Silver", "#aeb7be", "Metallic"],
    ["graphite", "Graphite Grey", "#555d66", "Metallic"],
    ["red", "Cherry Red", "#b81e32", "Gloss"],
    ["orange", "Sunset Orange", "#e27a2c", "Gloss"],
    ["purple", "Midnight Violet", "#69468c", "Metallic"],
    ["pink", "Cherry Blossom", "#d88baa", "Pearl"],
    ["yellow", "Sunbeam Yellow", "#eacb48", "Gloss"],
    ["teal", "Coastal Teal", "#298b8b", "Metallic"],
  ].map(([id, name, colour, finish]) => ({
    id,
    name,
    colour,
    finish,
    gamePrice: 1200,
    previewReady: false,
    type: "paint",
    gameCurrency: "credits",
    productStatus: "concept-reference",
    merchant: null,
  })),
);

export const selectionKinds = freeze([
  "wheel",
  "paint",
  "tyre",
  "suspension",
  "body",
]);
export const DEFAULT_UPGRADES = freeze({
  tyre: "road",
  suspension: "original",
  body: "original",
});

const upgrade = (type, id, name, gamePrice, description, attributes = {}) => ({
  id,
  type,
  name,
  brand: "Sundae Run",
  gamePrice,
  gameCurrency: "credits",
  description,
  thumbnail: null,
  included: gamePrice === 0,
  productStatus: "concept-reference",
  previewVehicleIds: vehicles.map(({ id: vehicleId }) => vehicleId),
  previewReady: false,
  merchant: null,
  fitment: pendingFitment(),
  ...attributes,
});

export const tyres = freeze([
  upgrade(
    "tyre",
    "road",
    "Performance road",
    0,
    "Original road-tyre appearance; standard size and profile.",
    { tread: "road", keepsOriginalDimensions: true },
  ),
  upgrade(
    "tyre",
    "sport",
    "Sport semi-slick",
    1600,
    "Semi-slick tread concept; the original tyre size and profile are retained.",
    { tread: "semi-slick", keepsOriginalDimensions: true },
  ),
  upgrade(
    "tyre",
    "track",
    "Track slick",
    2400,
    "Smooth track-tread concept; the original tyre size and profile are retained.",
    { tread: "slick", keepsOriginalDimensions: true },
  ),
]);

export const suspensions = freeze([
  upgrade(
    "suspension",
    "original",
    "Original suspension",
    0,
    "The car's original illustrated ride height.",
    { rideHeight: "original" },
  ),
  upgrade(
    "suspension",
    "sport",
    "Sport coilovers",
    2200,
    "A composed, lowered sport-stance concept.",
    { rideHeight: "sport" },
  ),
  upgrade(
    "suspension",
    "track",
    "Track coilovers",
    3400,
    "A lower track-stance concept.",
    { rideHeight: "track" },
  ),
]);

export const bodykits = freeze([
  upgrade(
    "body",
    "original",
    "Original bodywork",
    0,
    "The current bodywork without additional carbon aero.",
    { components: [] },
  ),
  upgrade(
    "body",
    "street",
    "Street carbon kit",
    2800,
    "Carbon splitter, canard and sill additions; original panels and bumpers retained.",
    { components: ["splitter", "canards", "sills"] },
  ),
  upgrade(
    "body",
    "track",
    "Track aero kit",
    4600,
    "A more assertive carbon splitter, canard and sill package; no replacement bumpers or widebody conversion.",
    { components: ["track-splitter", "track-canards", "track-sills"] },
  ),
]);

export const catalogue = freeze({
  vehicle: VEHICLE,
  vehicles,
  wheels,
  paints,
  tyres,
  suspensions,
  bodykits,
});

export function getProducts(kind) {
  const collections = {
    wheel: wheels,
    wheels,
    paint: paints,
    paints,
    tyre: tyres,
    tyres,
    suspension: suspensions,
    suspensions,
    body: bodykits,
    bodies: bodykits,
    bodykit: bodykits,
    bodykits,
  };
  const collection = Object.hasOwn(collections, kind) ? collections[kind] : [];
  return collection;
}

export function getProduct(kind, id) {
  return getProducts(kind).find((product) => product.id === id) ?? null;
}

export function getVariantKey(selection) {
  const base = `${selection?.vehicle ?? VEHICLE.id}:${selection?.paint}:${selection?.wheel}`;
  const choices = Object.fromEntries(
    Object.entries(DEFAULT_UPGRADES).map(([kind, baseline]) => [
      kind,
      selection?.[kind] === undefined ? baseline : selection[kind],
    ]),
  );
  return Object.entries(DEFAULT_UPGRADES).every(
    ([kind, baseline]) => choices[kind] === baseline,
  )
    ? base
    : `${base}:${choices.tyre}:${choices.suspension}:${choices.body}`;
}

const lookup = (entries, key) =>
  entries instanceof Map ? entries.get(key) : entries?.[key];
const readyAsset = (entry) =>
  entry?.ready === true &&
  typeof entry.src === "string" &&
  entry.src.trim().length > 0;

/** Every nonbaseline addition requires its own verified preview capability. */
export function isPreviewAvailable(selection, variants = {}, upgrades = {}) {
  const vehicle = selection?.vehicle ?? VEHICLE.id;
  if (
    !getVehicle(vehicle) ||
    !getProduct("wheel", selection?.wheel) ||
    !getProduct("paint", selection?.paint)
  )
    return false;
  const choices = Object.fromEntries(
    Object.entries(DEFAULT_UPGRADES).map(([kind, baseline]) => [
      kind,
      selection?.[kind] === undefined ? baseline : selection[kind],
    ]),
  );
  if (Object.entries(choices).some(([kind, id]) => !getProduct(kind, id)))
    return false;
  const key = `${vehicle}:${selection.wheel}`;
  const variant = lookup(variants, key);
  if (!readyAsset(variant)) return false;
  if (
    choices.suspension !== DEFAULT_UPGRADES.suspension &&
    variant.suspensionReady !== true
  )
    return false;
  for (const kind of ["tyre", "body"]) {
    if (
      choices[kind] !== DEFAULT_UPGRADES[kind] &&
      !readyAsset(lookup(upgrades, `${vehicle}:${kind}:${choices[kind]}`))
    )
      return false;
  }
  return true;
}

/**
 * Return no shopping CTA until a real HTTPS destination has been configured.
 * Merchant prices are real-world display data; game pricing never reads them.
 */
export function getMerchantLink(product) {
  const merchant = product?.merchant;
  if (!merchant || typeof merchant.url !== "string") return null;
  let url;
  try {
    url = new URL(merchant.url);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password
  )
    return null;
  const affiliate = merchant.affiliate === true;
  const currency =
    typeof merchant.currency === "string" &&
    /^[A-Z]{3}$/.test(merchant.currency.toUpperCase())
      ? merchant.currency.toUpperCase()
      : null;
  const price =
    typeof merchant.price === "number" &&
    Number.isFinite(merchant.price) &&
    merchant.price >= 0
      ? merchant.price
      : null;
  return {
    url: url.href,
    price,
    currency,
    affiliate,
    rel: affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer",
    disclosure: affiliate
      ? "Affiliate link — Sundae Run may earn a commission if you buy."
      : null,
  };
}
