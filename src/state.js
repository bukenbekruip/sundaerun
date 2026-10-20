import { getProduct, getVehicle, paints, vehicles, VEHICLE, wheels } from "./catalogue.js";

// Keep the storage key so an existing two-wheel/three-paint garage is migrated.
export const STORAGE_KEY = "sundae-run-garage-v2";
export const STATE_VERSION = 3;
export const STARTING_BALANCE = 48320;
const categories = new Set(["wheels", "tyres", "paint", "suspension", "body"]);
const defaultSelection = () => ({ wheel: "sr-01", paint: "blue" });
const purchaseKey = (kind, id) => kind + ":" + id;
const validPurchases = new Set([
  ...wheels.map(({ id }) => purchaseKey("wheel", id)),
  ...paints.map(({ id }) => purchaseKey("paint", id)),
]);
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function selection(value, fallback = defaultSelection()) {
  return {
    wheel: getProduct("wheel", value?.wheel) ? value.wheel : fallback.wheel,
    paint: getProduct("paint", value?.paint) ? value.paint : fallback.paint,
  };
}

function purchases(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((key) => typeof key === "string" && validPurchases.has(key)))]
    : [];
}

function build(value) {
  return {
    applied: selection(value?.applied),
    purchased: purchases(value?.purchased),
  };
}

// garage is the source of truth. The top-level views retain the original UI API.
function activeViews(state) {
  const active = state.garage[state.vehicle];
  return {
    ...state,
    applied: { ...active.applied },
    purchased: [...active.purchased],
  };
}

export function createInitialState() {
  return activeViews({
    version: STATE_VERSION,
    balance: STARTING_BALANCE,
    vehicle: VEHICLE.id,
    garage: Object.fromEntries(vehicles.map(({ id }) => [id, build()])),
    preview: defaultSelection(),
    category: "wheels",
  });
}

function normalise(value, restoreApplied = false) {
  const input = record(value) ? value : {};
  const legacy = input.version === 2;
  const garageInput = record(input.garage) ? input.garage : {};
  const garage = Object.fromEntries(vehicles.map(({ id }) => {
    const source = legacy
      ? (id === VEHICLE.id ? input : null)
      : (Object.hasOwn(garageInput, id) && record(garageInput[id]) ? garageInput[id] : null);
    return [id, build(source)];
  }));
  const vehicle = !legacy && typeof input.vehicle === "string" && getVehicle(input.vehicle)
    ? input.vehicle
    : VEHICLE.id;
  const applied = garage[vehicle].applied;
  return activeViews({
    version: STATE_VERSION,
    balance:
      Number.isSafeInteger(input.balance) &&
      input.balance >= 0 &&
      input.balance <= STARTING_BALANCE
        ? input.balance
        : STARTING_BALANCE,
    vehicle,
    garage,
    preview: restoreApplied ? { ...applied } : selection(input.preview, applied),
    category: categories.has(input.category) ? input.category : "wheels",
  });
}

/** Preview is free and does not change a vehicle's applied build or the balance. */
export function selectPreview(state, changes) {
  if (!record(changes))
    throw new TypeError("Preview changes must be an object.");
  const next = normalise(state);
  for (const kind of ["wheel", "paint"]) {
    if (Object.hasOwn(changes, kind)) {
      if (!getProduct(kind, changes[kind]))
        throw new RangeError("Unknown " + kind + ": " + String(changes[kind]));
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

/** Switching cars discards free previews and restores that car's fitted build. */
export function selectVehicle(state, id) {
  if (typeof id !== "string" || !getVehicle(id))
    throw new RangeError("Unknown vehicle: " + String(id));
  const next = normalise(state);
  return activeViews({
    ...next,
    vehicle: id,
    preview: { ...next.garage[id].applied },
  });
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
    vehicle: current.vehicle,
    currency: "credits",
    items,
    total: items.reduce((sum, item) => sum + item.charge, 0),
  };
}

/** Charge a vehicle's new parts and fit them in one immutable transaction. */
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
  const fitted = {
    applied: { ...current.preview },
    purchased: [
      ...new Set([
        ...current.purchased,
        ...quote.items.map(({ kind, id }) => purchaseKey(kind, id)),
      ]),
    ],
  };
  return {
    state: activeViews({
      ...current,
      balance: current.balance - quote.total,
      garage: { ...current.garage, [current.vehicle]: fitted },
    }),
    status: "applied",
    charged: quote.total,
  };
}

export function resetState() {
  return createInitialState();
}

/** Only canonical garage data is saved; transient/derived views are rebuilt. */
export function serializeState(state) {
  const { preview, applied, purchased, ...persistent } = normalise(state);
  return JSON.stringify(persistent);
}

export function loadState(raw) {
  let value;
  try {
    value = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return createInitialState();
  }
  if (!record(value) || ![2, STATE_VERSION].includes(value.version))
    return createInitialState();
  return normalise(value, true);
}
