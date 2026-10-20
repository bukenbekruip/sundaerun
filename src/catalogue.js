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

// Tyres can use the same product/merchant/fitment shape when verified assets exist.
export const tyres = freeze([]);
export const catalogue = freeze({
  vehicle: VEHICLE,
  vehicles,
  wheels,
  paints,
  tyres,
});

export function getProduct(kind, id) {
  const collections = {
    wheel: wheels,
    wheels,
    paint: paints,
    paints,
    tyre: tyres,
    tyres,
  };
  const collection = Object.hasOwn(collections, kind)
    ? collections[kind]
    : null;
  return collection?.find((product) => product.id === id) ?? null;
}

export function getVariantKey(selection) {
  return `${selection?.vehicle ?? VEHICLE.id}:${selection?.paint}:${selection?.wheel}`;
}

/** A registered vehicle/wheel render supports the catalogue's paint renderer. */
export function isPreviewAvailable(selection, variants = {}) {
  const vehicle = selection?.vehicle ?? VEHICLE.id;
  if (
    !getVehicle(vehicle) ||
    !getProduct("wheel", selection?.wheel) ||
    !getProduct("paint", selection?.paint)
  )
    return false;
  const key = `${vehicle}:${selection.wheel}`;
  const variant = variants instanceof Map ? variants.get(key) : variants?.[key];
  return (
    variant?.ready === true &&
    typeof variant.src === "string" &&
    variant.src.trim().length > 0
  );
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
