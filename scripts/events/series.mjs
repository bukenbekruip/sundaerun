import { clean, dateOnly, publicUrl } from "./parse.mjs";

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export function dateRange(text, fallbackYear) {
  const normalized = clean(text).replace(/^from\s+/i, "").replace(/\s+to\s+/i, " - ");
  const match = /^(\d{1,2})(?:\s+([a-z]+))?\s*[-–−]\s*(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/i.exec(normalized);
  if (!match) return null;
  const startMonth = months.indexOf((match[2] || match[4]).slice(0, 3).toLowerCase()) + 1;
  const endMonth = months.indexOf(match[4].slice(0, 3).toLowerCase()) + 1;
  const year = Number(match[5] || fallbackYear);
  if (!startMonth || !endMonth || !year) return null;
  const day = (y, m, d) => dateOnly(`${y}-${String(m).padStart(2, "0")}-${d.padStart(2, "0")}`);
  const startDate = day(year, startMonth, match[1]), endDate = day(year + (endMonth < startMonth ? 1 : 0), endMonth, match[3]);
  return startDate && endDate && endDate >= startDate ? { startDate, endDate } : null;
}
export function parseSeries($, source, now) {
  const result = [];
  if (source.adapter === "f1") {
    const byUrl = new Map();
    $("a[href]").each((_, node) => {
      const href = $(node).attr("href"), match = /\/en\/racing\/(\d{4})\/([^/?#]+)$/.exec(href || "");
      if (!match || /testing/.test(match[2])) return;
      const leaves = $(node).find("*").toArray().filter(n => !$(n).children().length).map(n => clean($(n).text())).filter(Boolean);
      const range = leaves.map(t => dateRange(t, match[1])).find(Boolean);
      if (!range) return;
      const title = leaves.find(t => /^FORMULA 1\b/.test(t)) || `Formula 1 — ${leaves.find(t => !/^ROUND\b/.test(t) && !dateRange(t, match[1]))}`;
      const venue = leaves.find(t => !/^ROUND\b|^FORMULA 1\b/.test(t) && !dateRange(t, match[1]));
      if (!venue) return;
      const url = publicUrl(href, source.url), previous = byUrl.get(url);
      if (!previous || title.length > previous.title.length) byUrl.set(url, { ...range, uid: url, title, venue, country: venue, url, organizer: "Formula 1" });
    });
    result.push(...byUrl.values());
  } else if (source.adapter === "wrc") {
    $("a[href*='/en/events/']").each((_, node) => {
      const title = clean($(node).find(".event-feed-card__title").text()), venue = clean($(node).find(".event-feed-card__location-text").text());
      const date = $(node).find("time").first(), range = dateRange(date.text(), date.attr("datetime")?.slice(0, 4));
      if (title && venue && range) result.push({ ...range, uid: $(node).attr("href"), title, venue, country: venue, url: publicUrl($(node).attr("href"), source.url), organizer: "World Rally Championship" });
    });
  }
  void now;
  return result;
}
