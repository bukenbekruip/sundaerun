import { createHash } from "node:crypto";
import { clean, dateOnly, publicUrl } from "./parse.mjs";
import { provinces, provinceFor, isForeignLocation } from "./geography.mjs";

export const categories = [
  "racing",
  "rally",
  "karting",
  "drifting",
  "drag",
  "trackday",
  "meet",
  "funrun",
  "bikes",
];
export function categoryFor(title, fallback = "racing") {
  for (const [pattern, category] of [
    [/breakfast|fun run|convoy|social drive|brunch cruise/i, "funrun"],
    [/cars.{0,5}coffee|car meet|car show|show.{0,3}shine|japan drive/i, "meet"],
    [/track.?day|open track/i, "trackday"],
    [/drift/i, "drifting"],
    [/drag/i, "drag"],
    [/kart/i, "karting"],
    [/rally|rallycross/i, "rally"],
    [/motorcycle|motogp|superbike|bike|motocross|enduro|flat.?track/i, "bikes"],
  ])
    if (pattern.test(title)) return category;
  return categories.includes(fallback) ? fallback : "racing";
}
export function normalizeEvent(raw, source, now) {
  const title = clean(raw.title),
    venue = clean(raw.venue || source.venue),
    startDate = dateOnly(raw.startDate),
    endDate = dateOnly(raw.endDate || raw.startDate);
  const url = publicUrl(raw.url || source.url, source.url);
  if (
    !title ||
    !venue ||
    /^(TBA|TBC|to be (?:advised|announced|confirmed)|venue (?:TBA|TBC|to be))/i.test(
      venue,
    ) ||
    !startDate ||
    !endDate ||
    endDate < startDate ||
    !url ||
    Date.parse(endDate) - Date.parse(startDate) > 31 * 86400000
  )
    return null;
  if (
    source.scope === "international" &&
    ![
      "f1",
      "motogp",
      "wrc",
      "wec",
      "indycar",
      "formulae",
      "major-endurance",
    ].includes(source.series)
  )
    return null;
  const province = provinceFor(
    clean(raw.province || source.province),
    `${venue} ${clean(raw.city)}`,
  );
  const country = clean(
    raw.country ||
      source.country ||
      (Object.values(provinces).includes(province) ? "ZA" : ""),
  );
  if (
    source.scope === "south-africa" &&
    (!/^(ZA|ZAF|RSA|South\s*Africa)$/i.test(country) ||
      isForeignLocation(`${venue} ${clean(raw.province)} ${country}`))
  )
    return null;
  const uid =
    url !== source.url
      ? url
      : clean(raw.uid) || `${title}|${startDate}|${venue}`;
  return {
    id: createHash("sha256")
      .update(`${source.id}|${uid}`)
      .digest("hex")
      .slice(0, 24),
    title,
    startDate,
    endDate,
    venue,
    city: clean(raw.city || source.city),
    province,
    country: source.scope === "south-africa" ? "ZA" : country,
    organizer: clean(raw.organizer),
    category: categoryFor(title, source.category),
    scope: source.scope,
    series: source.series || "",
    status: ["cancelled", "postponed"].includes(raw.status)
      ? raw.status
      : "scheduled",
    url,
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    verifiedAt: now.toISOString(),
  };
}
export function upcoming(events, now) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const limit = new Date(now.getTime() + 366 * 86400000)
    .toISOString()
    .slice(0, 10);
  const seen = new Set(),
    seenIds = new Set();
  return events
    .filter((event) => event.endDate >= today && event.startDate <= limit)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        a.title.localeCompare(b.title),
    )
    .filter((event) => {
      const key = `${event.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")}|${event.startDate}|${event.venue.toLowerCase()}`;
      if (seen.has(key) || seenIds.has(event.id)) return false;
      seen.add(key);
      seenIds.add(event.id);
      return true;
    });
}
