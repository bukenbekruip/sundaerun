import { load } from "cheerio";

export const clean = (value) => {
  if (typeof value !== "string") return "";
  const decoded = /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(value)
    ? load(value, null, false).text()
    : value;
  return decoded.replace(/\s+/g, " ").trim().slice(0, 240);
};
export function publicUrl(value, base) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    if (/^(localhost|.*\.local|\d+\.\d+\.\d+\.\d+|\[)/i.test(url.hostname))
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function dateOnly(value) {
  if (typeof value !== "string") return null;
  const match =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T ])/u.exec(value) ||
    /^(\d{4})(\d{2})(\d{2})(?:$|[T ])/u.exec(value);
  if (!match) return null;
  const result = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const date = new Date(result + "T12:00:00Z");
  return Number.isFinite(date.getTime()) &&
    date.toISOString().startsWith(result)
    ? result
    : null;
}
const unescape = (text) =>
  text.replace(/\\[nN]/g, " ").replace(/\\([,;\\])/g, "$1");
export function parseIcs(text) {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
  const result = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const start = dateOnly(current.DTSTART),
          rawEnd = dateOnly(current.DTEND);
        let end = rawEnd ?? start;
        // iCalendar date-only DTEND is exclusive; displayed date ranges are inclusive.
        if (rawEnd && current.dateEnd && rawEnd > start)
          end = new Date(Date.parse(rawEnd + "T12:00:00Z") - 86400000)
            .toISOString()
            .slice(0, 10);
        result.push({
          uid: current.UID,
          title: current.SUMMARY,
          startDate: start,
          endDate: end,
          venue: current.LOCATION,
          url: current.URL,
          status: current.STATUS === "CANCELLED" ? "cancelled" : "scheduled",
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const property = line.slice(0, colon),
      key = property.split(";")[0];
    if (
      [
        "UID",
        "SUMMARY",
        "DTSTART",
        "DTEND",
        "LOCATION",
        "URL",
        "STATUS",
      ].includes(key)
    ) {
      current[key] = unescape(line.slice(colon + 1));
      if (key === "DTEND")
        current.dateEnd =
          /VALUE=DATE(?:;|$)/.test(property) || /^\d{8}$/.test(current[key]);
    }
  }
  return result;
}
function schemaEvents(value, output = [], depth = 0) {
  if (depth > 24) return output;
  if (Array.isArray(value))
    for (const item of value) schemaEvents(item, output, depth + 1);
  else if (value && typeof value === "object") {
    const types = Array.isArray(value["@type"])
      ? value["@type"]
      : [value["@type"]];
    if (
      types.some(
        (type) =>
          typeof type === "string" &&
          /^(SportsEvent|Event|Festival|BusinessEvent)$/.test(
            type.replace(/^https?:\/\/schema.org\//, ""),
          ),
      )
    )
      output.push(value);
    for (const item of Object.values(value))
      if (item && typeof item === "object")
        schemaEvents(item, output, depth + 1);
  }
  return output;
}
export function parseHtml(text, base) {
  const $ = load(text),
    events = [];
  const elementIds = new Set(
    $("[id]")
      .toArray()
      .map((node) => node.attribs.id),
  );
  $('script[type="application/ld+json"]').each((_, node) => {
    try {
      for (const event of schemaEvents(JSON.parse($(node).text()))) {
        const location = Array.isArray(event.location)
          ? event.location[0]
          : event.location;
        const address = location?.address;
        const organizer = Array.isArray(event.organizer)
          ? event.organizer[0]
          : event.organizer;
        events.push({
          uid: event["@id"] || event.url,
          title: event.name,
          startDate: dateOnly(event.startDate),
          endDate: dateOnly(event.endDate) || dateOnly(event.startDate),
          venue: typeof location === "string" ? location : location?.name,
          city: address?.addressLocality,
          province: address?.addressRegion,
          addressText:
            typeof address === "string"
              ? clean(address)
              : clean(
                  [
                    address?.streetAddress,
                    address?.addressLocality,
                    address?.addressRegion,
                  ]
                    .filter(Boolean)
                    .join(" "),
                ),
          country:
            typeof address?.addressCountry === "object"
              ? address.addressCountry.name
              : address?.addressCountry,
          organizer:
            typeof organizer === "string" ? organizer : organizer?.name,
          url: publicUrl(
            event.url ||
              (typeof event["@id"] === "string" &&
              /^https:\/\//.test(event["@id"])
                ? event["@id"]
                : elementIds.has(event["@id"])
                  ? new URL("#" + encodeURIComponent(event["@id"]), base).href
                  : base),
            base,
          ),
          status: /cancelled/i.test(event.eventStatus ?? "")
            ? "cancelled"
            : /postponed/i.test(event.eventStatus ?? "")
              ? "postponed"
              : "scheduled",
        });
      }
    } catch {
      /* An invalid JSON-LD block is not a verified event. */
    }
  });
  const links = [
    ...new Set(
      $("a[href],link[href]")
        .toArray()
        .map((node) => publicUrl($(node).attr("href"), base))
        .filter(Boolean),
    ),
  ];
  return { events, links, $ };
}
