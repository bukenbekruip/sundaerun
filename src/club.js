import {
  getProduct,
  getVehicle,
  selectionKinds,
  vehicles,
} from "./catalogue.js";
import { getInteriorPackage, normaliseInteriors } from "./interiors.js";

export const MAX_SAVED_BUILDS = 24;
export const STOCK_SPEC = Object.freeze({
  filter: "stock",
  exhaust: "stock",
  tune: "stock",
});
export const performanceParts = Object.freeze({
  filter: Object.freeze([
    {
      id: "stock",
      name: "Original air filter",
      price: 0,
      response: 0,
      sound: 0,
      power: 0,
    },
    {
      id: "panel",
      name: "Performance panel filter",
      price: 450,
      response: 3,
      sound: 1,
      power: 1,
    },
    {
      id: "intake",
      name: "Cold-air intake concept",
      price: 1400,
      response: 5,
      sound: 7,
      power: 3,
    },
  ]),
  exhaust: Object.freeze([
    {
      id: "stock",
      name: "Original exhaust",
      price: 0,
      response: 0,
      sound: 0,
      power: 0,
    },
    {
      id: "axle",
      name: "Axle-back exhaust",
      price: 1800,
      response: 1,
      sound: 12,
      power: 2,
    },
    {
      id: "catback",
      name: "Cat-back exhaust",
      price: 2900,
      response: 3,
      sound: 18,
      power: 5,
    },
  ]),
  tune: Object.freeze([
    {
      id: "stock",
      name: "Original calibration",
      price: 0,
      response: 0,
      sound: 0,
      power: 0,
    },
    {
      id: "road",
      name: "Road tune concept",
      price: 1700,
      response: 8,
      sound: 0,
      power: 8,
    },
    {
      id: "track",
      name: "Track tune concept",
      price: 2700,
      response: 12,
      sound: 1,
      power: 12,
    },
  ]),
});
export const SHOPPING_REGIONS = Object.freeze([
  ["global", "International"],
  ["US", "United States"],
  ["ZA", "South Africa"],
  ["GB", "United Kingdom"],
  ["EU", "Europe"],
  ["AU", "Australia"],
]);
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const getPerformancePart = (kind, id) =>
  Object.hasOwn(performanceParts, kind)
    ? (performanceParts[kind].find((p) => p.id === id) ?? null)
    : null;
const cleanName = (v) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 48)
    : "";
const cleanSpec = (v) =>
  Object.fromEntries(
    Object.keys(STOCK_SPEC).map((k) => [
      k,
      getPerformancePart(k, v?.[k]) ? v[k] : "stock",
    ]),
  );
const cleanSelection = (v) => {
  if (!record(v) || selectionKinds.some((kind) => !getProduct(kind, v[kind])))
    return null;
  return Object.fromEntries(selectionKinds.map((kind) => [kind, v[kind]]));
};

export function validateSharedBuild(value) {
  if (
    !record(value) ||
    value.format !== "sundae-run-build" ||
    value.version !== 1 ||
    !getVehicle(value.vehicle) ||
    !cleanName(value.name) ||
    !cleanSelection(value.selection) ||
    !record(value.spec) ||
    Object.keys(STOCK_SPEC).some(
      (k) => !getPerformancePart(k, value.spec[k]),
    ) ||
    (value.interior !== undefined && !getInteriorPackage(value.interior))
  ) {
    throw new RangeError("This is not a supported Sundae Run build.");
  }
  return {
    format: "sundae-run-build",
    version: 1,
    name: cleanName(value.name),
    vehicle: value.vehicle,
    selection: cleanSelection(value.selection),
    spec: cleanSpec(value.spec),
    interior: value.interior ?? "stock",
  };
}

const briefs = Object.freeze([
  {
    id: "inside-counts",
    title: "Inside counts too",
    reward: 1000,
    xp: 100,
    description: "Fit the Sundae Club cabin and save it in a named build.",
    matches: (build) => build.interior === "club",
  },
  {
    id: "first-build",
    title: "Make it yours",
    reward: 1500,
    xp: 100,
    description: "Fit your parts and save your first named build.",
    matches: () => true,
  },
  {
    id: "clean-daily",
    title: "The everyday favourite",
    reward: 1800,
    xp: 125,
    description:
      "Road tyres, original bodywork, sport suspension and a panel filter.",
    matches: (b) =>
      b.selection.tyre === "road" &&
      b.selection.body === "original" &&
      b.selection.suspension === "sport" &&
      b.spec.filter === "panel",
  },
  {
    id: "mint-club",
    title: "Mint condition",
    reward: 1800,
    xp: 125,
    description: "Mint paint with a street carbon kit.",
    matches: (b) =>
      b.selection.paint === "mint" && b.selection.body === "street",
  },
  {
    id: "night-run",
    title: "After hours",
    reward: 1800,
    xp: 125,
    description:
      "Black or graphite paint, sport tyres and an axle-back or cat-back exhaust.",
    matches: (b) =>
      ["black", "graphite"].includes(b.selection.paint) &&
      b.selection.tyre === "sport" &&
      b.spec.exhaust !== "stock",
  },
  {
    id: "bright-side",
    title: "Park on the bright side",
    reward: 1400,
    xp: 100,
    description:
      "Red, orange or yellow paint with BBS LM or Work Meister wheels.",
    matches: (b) =>
      ["red", "orange", "yellow"].includes(b.selection.paint) &&
      ["bbs-lm", "work"].includes(b.selection.wheel),
  },
  {
    id: "track-day",
    title: "Sunday at the circuit",
    reward: 3000,
    xp: 200,
    description:
      "Track tyres, suspension and aero, with a cat-back exhaust and track tune.",
    matches: (b) =>
      b.selection.tyre === "track" &&
      b.selection.suspension === "track" &&
      b.selection.body === "track" &&
      b.spec.exhaust === "catback" &&
      b.spec.tune === "track",
  },
]);

export function challengesFor(vehicle) {
  if (!getVehicle(vehicle)) return [];
  return briefs.map((b) => ({ ...b, key: `${vehicle}:${b.id}`, vehicle }));
}
const challengeMap = () =>
  new Map(
    vehicles.flatMap(({ id }) => challengesFor(id)).map((b) => [b.key, b]),
  );

export function normaliseClub(input) {
  const v = record(input) ? input : {};
  const ids = new Set();
  const builds = (Array.isArray(v.builds) ? v.builds : [])
    .slice(0, MAX_SAVED_BUILDS)
    .flatMap((candidate) => {
      try {
        const b = validateSharedBuild(candidate);
        if (
          typeof candidate.id !== "string" ||
          !/^[\w-]{1,80}$/.test(candidate.id) ||
          ids.has(candidate.id)
        )
          return [];
        ids.add(candidate.id);
        return [{ ...b, id: candidate.id }];
      } catch {
        return [];
      }
    });
  const valid = challengeMap();
  return {
    builds,
    interiors: normaliseInteriors(v.interiors),
    completed: [
      ...new Set(
        Array.isArray(v.completed)
          ? v.completed.filter((k) => valid.has(k))
          : [],
      ),
    ],
    performance: Object.fromEntries(
      vehicles.map(({ id }) => {
        const p = record(v.performance?.[id]) ? v.performance[id] : {};
        const owned = [
          ...new Set(
            Array.isArray(p.owned)
              ? p.owned.filter((key) => {
                  if (typeof key !== "string") return false;
                  const [kind, part, extra] = key.split(":");
                  return !extra && getPerformancePart(kind, part)?.price > 0;
                })
              : [],
          ),
        ];
        const fitted = cleanSpec(p.fitted);
        for (const [kind, part] of Object.entries(fitted))
          if (part !== "stock" && !owned.includes(`${kind}:${part}`))
            fitted[kind] = "stock";
        return [id, { fitted, owned }];
      }),
    ),
    region: SHOPPING_REGIONS.some(([id]) => id === v.region)
      ? v.region
      : "global",
  };
}

export function earnedCredits(club) {
  const valid = challengeMap();
  return normaliseClub(club).completed.reduce(
    (sum, key) => sum + valid.get(key).reward,
    0,
  );
}

export function clubProgress(club) {
  const current = normaliseClub(club),
    all = challengeMap();
  const xp = current.completed.reduce((sum, key) => sum + all.get(key).xp, 0);
  return {
    xp,
    level: 1 + Math.floor(xp / 500),
    intoLevel: xp % 500,
    nextLevel: 500,
    completed: current.completed.length,
    buildCount: current.builds.length,
  };
}

export function performanceRatings(spec) {
  const totals = { power: 50, response: 50, sound: 30 };
  for (const [kind, id] of Object.entries(cleanSpec(spec))) {
    const part = getPerformancePart(kind, id);
    for (const key of Object.keys(totals)) totals[key] += part[key];
  }
  return totals;
}

export function fitPerformance(state, kind, id) {
  const part = getPerformancePart(kind, id);
  if (!part) throw new RangeError("Unknown performance part.");
  const club = normaliseClub(state.club),
    car = club.performance[state.vehicle];
  if (!car) throw new RangeError("Unknown vehicle.");
  const key = `${kind}:${id}`,
    charge = car.owned.includes(key) ? 0 : part.price;
  if (charge > state.balance)
    return { state, status: "insufficient-funds", charged: 0 };
  if (car.fitted[kind] === id)
    return { state, status: "already-fitted", charged: 0 };
  car.fitted[kind] = id;
  if (part.price && !car.owned.includes(key)) car.owned.push(key);
  return {
    state: { ...state, balance: state.balance - charge, club },
    status: "applied",
    charged: charge,
  };
}

/** Cabin purchase and fitting share the same wallet/save transaction. */
export function fitInterior(state, packageId) {
  const product = getInteriorPackage(packageId);
  if (!product) throw new RangeError("Unknown interior package.");
  const club = normaliseClub(state.club),
    car = club.interiors[state.vehicle];
  if (!car) throw new RangeError("Unknown vehicle.");
  if (car.fitted === packageId)
    return { state, status: "already-fitted", charged: 0 };
  const charge = car.owned.includes(packageId) ? 0 : product.price;
  if (charge > state.balance)
    return { state, status: "insufficient-funds", charged: 0 };
  car.fitted = packageId;
  if (product.price && !car.owned.includes(packageId))
    car.owned.push(packageId);
  return {
    state: { ...state, balance: state.balance - charge, club },
    status: "applied",
    charged: charge,
  };
}

export function saveShowBuild(state, name, id = crypto.randomUUID()) {
  const club = normaliseClub(state.club);
  const car = state.garage[state.vehicle];
  if (!car || !cleanName(name)) return { state, status: "name-required" };
  if (
    selectionKinds.some((kind) => {
      const p = getProduct(kind, car.applied[kind]);
      return (
        !p || (p.gamePrice > 0 && !car.purchased.includes(`${kind}:${p.id}`))
      );
    })
  )
    return { state, status: "fit-first" };
  const snapshot = validateSharedBuild({
    format: "sundae-run-build",
    version: 1,
    name,
    vehicle: state.vehicle,
    selection: car.applied,
    spec: club.performance[state.vehicle].fitted,
    interior: club.interiors[state.vehicle].fitted,
  });
  const fingerprint = (b) =>
    JSON.stringify([b.vehicle, b.selection, b.spec, b.interior]);
  const existing = club.builds.find(
    (b) => fingerprint(b) === fingerprint(snapshot),
  );
  if (existing) {
    existing.name = snapshot.name;
    return { state: { ...state, club }, status: "updated", build: existing };
  }
  if (club.builds.length >= MAX_SAVED_BUILDS)
    return { state, status: "garage-full" };
  if (
    typeof id !== "string" ||
    !/^[\w-]{1,80}$/.test(id) ||
    club.builds.some((b) => b.id === id)
  )
    throw new RangeError("Invalid build identifier.");
  const build = { ...snapshot, id };
  club.builds.push(build);
  return { state: { ...state, club }, status: "saved", build };
}

export function deleteShowBuild(state, id) {
  const club = normaliseClub(state.club);
  club.builds = club.builds.filter((b) => b.id !== id);
  return { ...state, club };
}

export function eligibleChallenges(state, buildId) {
  const club = normaliseClub(state.club),
    b = club.builds.find((b) => b.id === buildId);
  return b
    ? challengesFor(b.vehicle).filter(
        (brief) => brief.matches(b) && !club.completed.includes(brief.key),
      )
    : [];
}

export function claimChallenge(state, key, buildId) {
  const brief = eligibleChallenges(state, buildId).find((b) => b.key === key);
  if (!brief) return { state, status: "not-eligible", awarded: 0 };
  const club = normaliseClub(state.club);
  club.completed.push(brief.key);
  return {
    state: { ...state, balance: state.balance + brief.reward, club },
    status: "claimed",
    awarded: brief.reward,
  };
}

export function encodeBuild(build) {
  const clean = validateSharedBuild(build);
  const bytes = new TextEncoder().encode(JSON.stringify(clean));
  return (
    "SR1." +
    btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "")
  );
}

export function decodeBuild(code) {
  if (
    typeof code !== "string" ||
    code.length > 16000 ||
    !/^SR1\.[\w-]+$/.test(code.trim())
  )
    throw new RangeError("Paste a valid SR1 build code.");
  try {
    const encoded = code
      .trim()
      .slice(4)
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    return validateSharedBuild(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } catch {
    throw new RangeError("This build code could not be read.");
  }
}
