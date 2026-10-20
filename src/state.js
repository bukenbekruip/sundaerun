import { getProduct, paints, wheels } from "./catalogue.js";

export const STORAGE_KEY = "sundae-run-garage-v2";
export const STATE_VERSION = 2;
export const STARTING_BALANCE = 48320;
const categories = new Set(["wheels", "tyres", "paint", "suspension", "body"]);
const defaultSelection = () => ({ wheel: "sr-01", paint: "blue" });
const purchaseKey = (kind, id) => `${kind}:${id}`;
const validPurchases = new Set([
  ...wheels.map(({ id }) => purchaseKey("wheel", id)),
  ...paints.map(({ id }) => purchaseKey("paint", id)),
]);
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function createInitialState() {
  return {
    version: STATE_VERSION,
    balance: STARTING_BALANCE,
    preview: defaultSelection(),
    applied: defaultSelection(),
    purchased: [],
    category: "wheels",
  };
}

function selection(value, fallback = defaultSelection()) {
  return {
    wheel: getProduct("wheel", value?.wheel) ? value.wheel : fallback.wheel,
    paint: getProduct("paint", value?.paint) ? value.paint : fallback.paint,
  };
}

function normalise(value, restoreApplied = false) {
  const input = record(value) ? value : {};
  const applied = selection(input.applied);
  return {
    version: STATE_VERSION,
    balance:
      Number.isSafeInteger(input.balance) &&
      input.balance >= 0 &&
      input.balance <= STARTING_BALANCE
        ? input.balance
        : STARTING_BALANCE,
    preview: restoreApplied
      ? { ...applied }
      : selection(input.preview, applied),
    applied,
    purchased: Array.isArray(input.purchased)
      ? [
          ...new Set(
            input.purchased.filter(
              (key) => typeof key === "string" && validPurchases.has(key),
            ),
          ),
        ]
      : [],
    category: categories.has(input.category) ? input.category : "wheels",
  };
}

/** Preview is free and does not change the last applied look or the balance. */
export function selectPreview(state, changes) {
  if (!record(changes))
    throw new TypeError("Preview changes must be an object.");
  const next = normalise(state);
  for (const kind of ["wheel", "paint"]) {
    if (Object.hasOwn(changes, kind)) {
      if (!getProduct(kind, changes[kind]))
        throw new RangeError(`Unknown ${kind}: ${String(changes[kind])}`);
      next.preview[kind] = changes[kind];
    }
  }
  if (Object.hasOwn(changes, "category")) {
    if (!categories.has(changes.category))
      throw new RangeError("Unknown customisation category.");
    next.category = changes.category;
  }
  return next;
}

export function cancelPreview(state) {
  const next = normalise(state);
  next.preview = { ...next.applied };
  return next;
}

export function getQuote(state) {
  const current = normalise(state);
  const items = ["wheel", "paint"].map((kind) => {
    const product = getProduct(kind, current.preview[kind]);
    const owned = current.purchased.includes(purchaseKey(kind, product.id));
    return {
      kind,
      id: product.id,
      name: product.name,
      gamePrice: product.gamePrice,
      owned,
      charge: owned ? 0 : product.gamePrice,
    };
  });
  return {
    currency: "credits",
    items,
    total: items.reduce((sum, item) => sum + item.charge, 0),
  };
}

/** Immutable transaction result; charging and fitting are one operation. */
export function applyChanges(state) {
  const current = normalise(state);
  const quote = getQuote(current);
  if (quote.total > current.balance)
    return { state: current, status: "insufficient-funds", charged: 0 };
  const sameSelection =
    current.applied.wheel === current.preview.wheel &&
    current.applied.paint === current.preview.paint;
  if (quote.total === 0 && sameSelection)
    return { state: current, status: "already-fitted", charged: 0 };
  return {
    state: {
      ...current,
      balance: current.balance - quote.total,
      applied: { ...current.preview },
      purchased: [
        ...new Set([
          ...current.purchased,
          ...quote.items.map(({ kind, id }) => purchaseKey(kind, id)),
        ]),
      ],
    },
    status: "applied",
    charged: quote.total,
  };
}

export function resetState() {
  return createInitialState();
}

/** Persist purchases and applied choices; an unfinished preview is never fitted by reload. */
export function serializeState(state) {
  const { preview, ...persistent } = normalise(state);
  return JSON.stringify(persistent);
}

export function loadState(raw) {
  let value;
  try {
    value = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return createInitialState();
  }
  if (!record(value) || value.version !== STATE_VERSION)
    return createInitialState();
  return normalise(value, true);
}
