export const labels = Object.freeze({
  racing: "Racing",
  rally: "Rally",
  karting: "Karting",
  drifting: "Drifting",
  drag: "Drag racing",
  trackday: "Track day",
  meet: "Car meet / show",
  funrun: "Fun run / social drive",
  bikes: "Bikes",
});
export const seriesLabels = Object.freeze({
  f1: "Formula 1",
  motogp: "MotoGP",
  wrc: "WRC",
  wec: "WEC / Le Mans",
  indycar: "IndyCar",
  formulae: "Formula E",
  "major-endurance": "Major endurance",
});
export function safeLink(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function validEvent(event) {
  const validDay = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value + "T12:00:00Z").toISOString().startsWith(value);
  return Boolean(
    event &&
      typeof event.id === "string" &&
      event.id.length <= 64 &&
      ["city", "province", "country", "organizer", "series"].every(
        (key) => typeof event[key] === "string" && event[key].length <= 240,
      ) &&
      ["title", "venue", "sourceName", "sourceId"].every(
        (key) =>
          typeof event[key] === "string" &&
          event[key].length > 0 &&
          event[key].length <= 240,
      ) &&
      ["startDate", "endDate"].every((key) => validDay(event[key])) &&
      event.endDate >= event.startDate &&
      ["international", "south-africa"].includes(event.scope) &&
      Object.hasOwn(labels, event.category) &&
      (event.scope !== "international" ||
        Object.hasOwn(seriesLabels, event.series)) &&
      ["scheduled", "cancelled", "postponed"].includes(event.status) &&
      safeLink(event.url) &&
      safeLink(event.sourceUrl) &&
      Number.isFinite(Date.parse(event.verifiedAt)),
  );
}
export async function loadCalendar() {
  const response = await fetch(
    new URL("../data/events.json", import.meta.url),
    { cache: "no-cache", signal: AbortSignal.timeout(12000) },
  );
  if (!response.ok) throw new Error("Calendar unavailable");
  const text = await response.text();
  if (text.length > 1024 * 1024)
    throw new Error("Calendar exceeds its size limit");
  const data = JSON.parse(text);
  if (
    data.version !== 1 ||
    !Array.isArray(data.events) ||
    !Array.isArray(data.sources) ||
    data.events.length > 2000
  )
    throw new Error("Calendar format unavailable");
  return { ...data, events: data.events.filter(validEvent) };
}
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function expiryDay(scope, now = new Date()) {
  // Without an organiser-supplied finish time, do not expire international
  // date-only listings before that calendar day has ended everywhere (UTC-12).
  return scope === "international"
    ? new Date(now.getTime() - 12 * 3600000).toISOString().slice(0, 10)
    : today(now);
}
export function filterEvents(events, filters = {}, now = new Date()) {
  const date = today(now),
    end = new Date(
      Date.parse(date + "T12:00:00Z") +
        Number(filters.period || 366) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
  const search = (filters.search || "").trim().toLocaleLowerCase();
  return events
    .filter(
      (event) =>
        event.status === "scheduled" &&
        event.endDate >= expiryDay(event.scope, now) &&
        event.startDate <= end &&
        (!filters.scope ||
          filters.scope === "all" ||
          event.scope === filters.scope) &&
        (!filters.category ||
          filters.category === "all" ||
          event.category === filters.category) &&
        (!filters.province ||
          filters.province === "all" ||
          (event.scope === "south-africa" &&
            event.province === filters.province)) &&
        (!search ||
          [
            event.title,
            event.venue,
            event.city,
            event.province,
            event.country,
            event.organizer,
            event.sourceName,
          ].some(
            (value) =>
              typeof value === "string" &&
              value.toLocaleLowerCase().includes(search),
          )),
    )
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        a.title.localeCompare(b.title),
    );
}
export function dateLabel(value, year = true) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}
export function checkedLabel(value) {
  if (!Number.isFinite(Date.parse(value)))
    return "Check the organiser for updates";
  return (
    new Intl.DateTimeFormat("en-ZA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Johannesburg",
    }).format(new Date(value)) + " SAST"
  );
}
