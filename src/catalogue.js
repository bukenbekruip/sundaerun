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

export const VEHICLE = freeze({
  id: "subaru-wrx-sti-demo",
  name: "Subaru WRX STI",
  fitmentStatus: "unverified",
});

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
  thumbnail:
    id === "sr-01" || id === "te37"
      ? `./assets/products/wheel-${id}.png`
      : `./assets/wheel-card-${image}.webp`,
  productStatus: "concept-reference",
  previewVehicleId: VEHICLE.id,
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
    {
      id: "blue",
      name: "WR Blue Pearl",
      colour: "#195cc8",
      gamePrice: 1200,
      finish: "Metallic",
      previewReady: false,
    },
    {
      id: "black",
      name: "Onyx Black",
      colour: "#24282e",
      gamePrice: 1200,
      finish: "Metallic",
      previewReady: false,
    },
    {
      id: "mint",
      name: "Mint Coast",
      colour: "#9ed7c6",
      gamePrice: 1200,
      finish: "Metallic",
      previewReady: false,
    },
  ].map((paint) => ({
    ...paint,
    type: "paint",
    gameCurrency: "credits",
    productStatus: "concept-reference",
    merchant: null,
  })),
);

// Tyres can use the same product/merchant/fitment shape when verified assets exist.
export const tyres = freeze([]);
export const catalogue = freeze({ vehicle: VEHICLE, wheels, paints, tyres });

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
  return `${selection?.paint}:${selection?.wheel}`;
}

/** Only a deliberately verified whole-car variant makes a combination available. */
export function isPreviewAvailable(selection, variants = {}) {
  if (
    !getProduct("wheel", selection?.wheel) ||
    !getProduct("paint", selection?.paint)
  )
    return false;
  const key = getVariantKey(selection);
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
