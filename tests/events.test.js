import test from "node:test";
import assert from "node:assert/strict";
import { load } from "cheerio";
import {
  parseIcs,
  parseHtml,
  dateOnly,
  publicUrl,
} from "../scripts/events/parse.mjs";
import { dateRange, parseSeries } from "../scripts/events/series.mjs";
import { normalizeEvent, upcoming } from "../scripts/events/model.mjs";
import { refresh, fetchPublic } from "../scripts/events/refresh.mjs";
import { validateSnapshot } from "../scripts/events/validate.mjs";
import { validEvent, filterEvents } from "../public/website/js/events-data.js";

const now = new Date("2026-10-25T09:00:00Z");
const source = {
  id: "test",
  name: "Official circuit",
  scope: "south-africa",
  country: "ZA",
  province: "Gauteng",
  url: "https://circuit.example/events/",
  hosts: ["circuit.example"],
};
const raw = {
  title: "Breakfast fun run",
  startDate: "2026-11-01",
  endDate: "2026-11-01",
  venue: "Public circuit",
  url: "https://circuit.example/event/run",
};
const event = (overrides = {}) =>
  normalizeEvent({ ...raw, ...overrides }, source, now);
function schema(records) {
  return `<script type="application/ld+json">${JSON.stringify({ "@graph": records })}</script>`;
}
const record = (overrides = {}) => ({
  "@type": "SportsEvent",
  name: raw.title,
  startDate: raw.startDate,
  endDate: raw.endDate,
  url: raw.url,
  location: {
    name: raw.venue,
    address: { addressCountry: "ZA", addressRegion: "GP" },
  },
  ...overrides,
});

test("calendar dates reject rollover and handle real leap days and local date prefixes", () => {
  assert.equal(dateOnly("2026-02-30"), null);
  assert.equal(dateOnly("2028-02-29T08:30:00+02:00"), "2028-02-29");
  assert.equal(dateOnly("20260329T090000"), "2026-03-29");
  assert.equal(dateOnly("tomorrow"), null);
  assert.equal(dateOnly("2026-11-1T07:30+2:00"), "2026-11-01");
  assert.equal(dateOnly("2026111"), null);
  for (const [text, expected] of [
    ["30 Oct - 1 Nov 2026", ["2026-10-30", "2026-11-01"]],
    ["21 – 24 January 2027", ["2027-01-21", "2027-01-24"]],
    ["From 17 to 19 April 2026", ["2026-04-17", "2026-04-19"]],
    ["30 Dec - 2 Jan 2026", ["2026-12-30", "2027-01-02"]],
  ]) {
    const range = dateRange(text);
    assert.deepEqual([range.startDate, range.endDate], expected);
  }
  assert.equal(dateRange("30 - 31 February 2026"), null);
});
test("iCalendar folding, escaped text, cancellation and exclusive all-day ends are preserved", () => {
  const records = parseIcs(
    "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:1\r\nSUMMARY:Club breakfast\\, cars and\r\n coffee\r\nDTSTART;VALUE=DATE:20261101\r\nDTEND;VALUE=DATE:20261103\r\nLOCATION:Raceway\\, Pretoria\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\nEND:VCALENDAR",
  );
  assert.equal(records[0].title, "Club breakfast, cars andcoffee");
  assert.equal(records[0].venue, "Raceway, Pretoria");
  assert.equal(records[0].endDate, "2026-11-02");
  assert.equal(records[0].status, "cancelled");
});
test("only actual schema events become listings; publication dates and malformed blocks do not", () => {
  const parsed = parseHtml(
    schema([
      { "@type": "WebPage", datePublished: "2026-11-01", name: "Article" },
      record(),
    ]) + '<script type="application/ld+json">broken</script>',
    source.url,
  );
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.events[0].province, "GP");
  assert.equal(parsed.events[0].country, "ZA");
  assert.equal(parsed.events[0].venue, raw.venue);
  const club = parseHtml(
    '<div id="event_12"></div>' +
      schema([record({ "@id": "event_12", url: undefined })]),
    source.url,
  );
  assert.equal(club.events[0].url, source.url + "#event_12");
});
test("missing locations, invalid dates, promotional year-long entries and foreign local events are withheld", () => {
  assert.equal(normalizeEvent({ ...raw, venue: "" }, source, now), null);
  assert.equal(event({ startDate: "2026-02-30" }), null);
  assert.equal(event({ endDate: "2027-12-01" }), null);
  assert.equal(event({ country: "Namibia" }), null);
  assert.equal(
    normalizeEvent(
      raw,
      { ...source, scope: "international", series: "unapproved-series" },
      now,
    ),
    null,
  );
  assert.equal(event({ province: "WC" }).province, "Western Cape");
});
test("official international adapters handle supported markup without executing page scripts", () => {
  const f1 = load(
    '<a href="/en/racing/2026/mexico"><span>ROUND 19</span><span>Mexico</span><span>30 OCT - 01 NOV</span></a><a href="/en/racing/2026/pre-season-testing-1"><span>11 - 13 FEB</span><span>Bahrain</span></a>',
  );
  assert.equal(parseSeries(f1, { ...source, adapter: "f1" }, now).length, 1);
  const wrc = load(
    '<a href="/en/events/rally"><div class="event-feed-card__title">World Rally</div><time datetime="2027-01-21">21 – 24 January 2027</time><span class="event-feed-card__location-text">Monaco</span></a>',
  );
  assert.equal(
    parseSeries(wrc, { ...source, adapter: "wrc" }, now)[0].startDate,
    "2027-01-21",
  );
  const moto = load(
    '<li class="event-promo-item"><div><h3>MALAYSIA</h3><p>30 Oct - 1 Nov 2026</p></div></li>',
  );
  assert.equal(
    parseSeries(moto, { ...source, adapter: "motogp" }, now)[0].endDate,
    "2026-11-01",
  );
  const wec = load(
    '<div class="calendar-item">ITA 8 Nov <div class="infos-full"><p>6 Hours of Monza</p><p>From 6 to 8 November 2026</p><a href="/en/race/monza">Race info</a></div></div>',
  );
  assert.equal(
    parseSeries(wec, { ...source, adapter: "wec" }, now)[0].title,
    "6 Hours of Monza",
  );
});
test("identities survive date amendments and duplicate feeds do not duplicate cards", () => {
  assert.equal(
    event().id,
    event({ startDate: "2026-11-02", endDate: "2026-11-02" }).id,
  );
  assert.equal(
    upcoming(
      [
        event(),
        event(),
        event({
          url: "https://circuit.example/event/old",
          startDate: "2026-10-24",
          endDate: "2026-10-24",
        }),
      ],
      now,
    ).length,
    1,
  );
});
test("failed source retains earlier provenance; a fresh cancellation does not remain an upcoming result", async () => {
  const old = event();
  const oldStamp = old.verifiedAt;
  const previous = {
    events: [old],
    sources: [{ id: source.id, lastSuccessAt: oldStamp }],
  };
  const result = await refresh({
    config: { sources: [source] },
    previous,
    now: new Date("2026-10-26T10:00:00Z"),
    fetcher: async () => {
      throw new Error("Offline");
    },
  });
  assert.equal(result.snapshot.events[0].verifiedAt, oldStamp);
  assert.equal(result.snapshot.sources[0].status, "unavailable");
  assert.equal(result.snapshot.sources[0].lastSuccessAt, oldStamp);
  const cancelled = await refresh({
    config: { sources: [source] },
    previous,
    now,
    fetcher: async () => ({
      url: source.url,
      text: schema([
        record({ eventStatus: "https://schema.org/EventCancelled" }),
      ]),
    }),
  });
  assert.equal(cancelled.snapshot.events[0].status, "cancelled");
  assert.equal(filterEvents(cancelled.snapshot.events, {}, now).length, 0);
  assert.throws(
    () => validateSnapshot(result.snapshot, { sources: [source] }),
    /No verified/,
  );
});
test("redirects stay within approved HTTPS hosts and unsafe targets never become event links", async () => {
  for (const value of [
    "javascript:alert(1)",
    "http://circuit.example/",
    "https://user:pass@circuit.example/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://localhost/",
    undefined,
  ])
    assert.equal(publicUrl(value, source.url), null);
  let calls = 0;
  await assert.rejects(
    fetchPublic(source.url, source.hosts, async () => {
      calls++;
      return new Response(null, {
        status: 302,
        headers: { location: "https://other.example/" },
      });
    }),
    /approved hosts/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    fetchPublic(
      source.url,
      source.hosts,
      async () => new Response("x".repeat(4 * 1024 * 1024 + 1)),
    ),
    /4 MiB/,
  );
});
test("client filters cover international, provinces, event types, date windows and ongoing events", () => {
  const local = event();
  const global = normalizeEvent(
    {
      ...raw,
      title: "World Championship",
      url: "https://series.example/race",
      country: "Italy",
    },
    { ...source, id: "wec", scope: "international", series: "wec" },
    now,
  );
  const values = [
    local,
    global,
    event({
      url: "https://circuit.example/far",
      title: "Far future",
      startDate: "2027-08-01",
      endDate: "2027-08-01",
    }),
  ];
  assert.equal(
    filterEvents(values, { scope: "international", period: 90 }, now).length,
    1,
  );
  assert.equal(
    filterEvents(
      values,
      { province: "Gauteng", category: "funrun", period: 30 },
      now,
    ).length,
    1,
  );
  assert.equal(
    filterEvents(values, { search: "world", period: 90 }, now)[0].id,
    global.id,
  );
  assert.equal(
    filterEvents(
      [event({ startDate: "2026-10-24", endDate: "2026-10-25" })],
      {},
      now,
    ).length,
    1,
  );
  assert.equal(validEvent({ ...local, url: "javascript:alert(1)" }), false);
  assert.equal(validEvent({ ...local, startDate: "2026-02-30" }), false);
  assert.equal(validEvent({ ...local, city: { unexpected: true } }), false);
});
test("publication validation rejects unapproved provenance, duplicate identities and foreign local records", () => {
  const config = { sources: [source], internationalSeries: [] };
  const data = {
    version: 1,
    refreshedAt: now.toISOString(),
    sources: [{ id: source.id, status: "ok" }],
    events: [event()],
  };
  assert.equal(validateSnapshot(data, config), true);
  assert.throws(
    () =>
      validateSnapshot({ ...data, oversized: "x".repeat(1024 * 1024) }, config),
    /size limit/,
  );
  assert.throws(
    () => validateSnapshot({ ...data, events: [event(), event()] }, config),
    /duplicate/,
  );
  assert.throws(
    () =>
      validateSnapshot(
        {
          ...data,
          events: [{ ...event(), sourceUrl: "https://evil.example/" }],
        },
        config,
      ),
    /unapproved/,
  );
  assert.throws(
    () =>
      validateSnapshot(
        { ...data, events: [{ ...event(), country: "Namibia" }] },
        config,
      ),
    /Foreign/,
  );
});

test("late overseas date-only weekends survive South African midnight without claiming a finish time", () => {
  const overseas = normalizeEvent(
    {
      ...raw,
      country: "United States",
      startDate: "2026-11-19",
      endDate: "2026-11-21",
    },
    { ...source, id: "f1", scope: "international", series: "f1" },
    now,
  );
  const afterSouthAfricanMidnight = new Date("2026-11-22T07:00:00Z");
  assert.equal(
    filterEvents([overseas], {}, afterSouthAfricanMidnight).length,
    1,
  );
  assert.equal(upcoming([overseas], afterSouthAfricanMidnight).length, 1);
  assert.equal(
    filterEvents([overseas], {}, new Date("2026-11-22T13:00:00Z")).length,
    0,
  );
  assert.equal(
    filterEvents(
      [{ ...overseas, scope: "south-africa", country: "ZA" }],
      {},
      afterSouthAfricanMidnight,
    ).length,
    0,
  );
});
