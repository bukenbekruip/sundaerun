import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseIcs, parseHtml, publicUrl } from "./parse.mjs";
import { normalizeEvent, upcoming } from "./model.mjs";
import { parseSeries } from "./series.mjs";

const root = new URL("../../", import.meta.url);
export async function fetchPublic(url, hosts, fetcher = fetch) {
  for (let redirects = 0; redirects < 4; redirects++) {
    const safe = publicUrl(url);
    if (!safe || !hosts.includes(new URL(safe).hostname))
      throw new Error("Source redirect is outside its approved hosts");
    const response = await fetcher(safe, {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent":
          "SundaeRunEvents/1.0 (+https://www.sundaerun.com/events.html)",
        Accept: "text/calendar,application/ld+json,text/html,application/json",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      url = new URL(response.headers.get("location"), safe).href;
      continue;
    }
    if (!response.ok)
      throw new Error(`Calendar returned HTTP ${response.status}`);
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) {
        await response.body.cancel().catch(() => {});
        throw new Error("Calendar exceeds the 4 MiB limit");
      }
      chunks.push(chunk);
    }
    return { text: Buffer.concat(chunks).toString("utf8"), url: safe };
  }
  throw new Error("Too many source redirects");
}
export async function refresh({
  config,
  previous,
  now = new Date(),
  fetcher = fetchPublic,
}) {
  const events = [],
    sources = [],
    notices = [];
  for (const original of config.sources) {
    const source = {
      ...original,
      url: original.url.replaceAll("{year}", String(now.getUTCFullYear())),
    };
    const prior = previous?.sources?.find((item) => item.id === source.id);
    const urls = [
      source.url,
      ...(source.pages || []).map((url) =>
        url.replaceAll("{year}", String(now.getUTCFullYear())),
      ),
    ];
    let parsedCount = 0;
    const found = [],
      visited = new Set(),
      errors = [];
    while (urls.length && visited.size < 8) {
      const url = urls.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      try {
        const response = await fetcher(url, source.hosts);
        if (/BEGIN:VCALENDAR/.test(response.text.slice(0, 500)))
          found.push(...parseIcs(response.text));
        else {
          const parsed = parseHtml(response.text, response.url);
          found.push(...parsed.events, ...parseSeries(parsed.$, source, now));
          if (!source.adapter) {
            // Follow only explicit next/calendar-feed links on trusted source hosts.
            for (const href of parsed.links)
              if (
                source.hosts.includes(new URL(href).hostname) &&
                (/[?&]ical=1|\/events\/list\/page\/\d+/.test(href) ||
                  (!parsed.events.length && /\/event-details\//.test(href))) &&
                !visited.has(href)
              )
                urls.push(href);
          }
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
    for (const raw of found) {
      const event = normalizeEvent(raw, source, now);
      if (event) {
        parsedCount++;
        events.push(event);
      }
    }
    if (parsedCount) {
      if (errors.length)
        events.push(
          ...(previous?.events || []).filter(
            (event) =>
              event.sourceId === source.id &&
              !events.some((current) => current.id === event.id),
          ),
        );
      sources.push({
        id: source.id,
        name: source.name,
        url: source.url,
        scope: source.scope,
        series: source.series || "",
        checkedAt: now.toISOString(),
        lastSuccessAt: now.toISOString(),
        status: errors.length ? "partial" : "ok",
        parsed: parsedCount,
      });
    } else {
      sources.push({
        id: source.id,
        name: source.name,
        url: source.url,
        scope: source.scope,
        series: source.series || "",
        checkedAt: now.toISOString(),
        lastSuccessAt: prior?.lastSuccessAt || null,
        status: "unavailable",
        parsed: 0,
      });
      events.push(
        ...(previous?.events || []).filter(
          (event) => event.sourceId === source.id,
        ),
      );
      notices.push({
        source: source.id,
        reason:
          errors[0] ||
          "No usable dated event records; previous verified entries retained",
        sample: found
          .filter((event) => event.endDate >= now.toISOString().slice(0, 10))
          .slice(0, 3)
          .map((event) => ({
            title: event.title?.slice(0, 80),
            venue: event.venue?.slice(0, 100),
            province: event.province,
            country: event.country,
            startDate: event.startDate,
          })),
      });
    }
  }
  const snapshot = {
    version: 1,
    refreshedAt: now.toISOString(),
    coverage: {
      internationalSeries: config.internationalSeries,
      local: "South Africa nationwide",
      rule: "Major international series; confirmed South African motorsport, track days, meets and fun runs",
    },
    sources,
    events: upcoming(events, now),
  };
  return { snapshot, notices };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const config = JSON.parse(
    await readFile(new URL("sources.json", import.meta.url), "utf8"),
  );
  const output = new URL("public/website/data/events.json", root);
  let previous;
  try {
    previous = JSON.parse(await readFile(output, "utf8"));
  } catch {
    previous = { events: [], sources: [] };
  }
  const result = await refresh({ config, previous });
  await mkdir(new URL("public/website/data/", root), { recursive: true });
  if (
    !result.snapshot.sources.some((source) => source.status !== "unavailable")
  )
    throw new Error(
      "All calendars failed; existing published snapshot left unchanged",
    );
  await writeFile(output, JSON.stringify(result.snapshot, null, 2) + "\n");
  await mkdir("/tmp/events-refresh", { recursive: true });
  await writeFile(
    "/tmp/events-refresh/report.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  await writeFile(
    "/tmp/events-refresh/events.json",
    JSON.stringify(result.snapshot, null, 2) + "\n",
  );
  for (const source of result.snapshot.sources)
    console.log(
      `::notice title=Calendar ${source.id}::${JSON.stringify(source)}`,
    );
  console.log(
    `::notice title=Event refresh summary::${JSON.stringify({ events: result.snapshot.events.length, notices: result.notices })}`,
  );
}
