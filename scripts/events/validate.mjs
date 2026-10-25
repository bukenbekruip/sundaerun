import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validEvent, safeLink } from "../../public/website/js/events-data.js";

export function validateSnapshot(data, config) {
  if (Buffer.byteLength(JSON.stringify(data), "utf8") > 1024 * 1024)
    throw new Error("Snapshot exceeds its 1 MiB public size limit");
  if (
    data.version !== 1 ||
    !Array.isArray(data.events) ||
    data.events.length > 2000 ||
    !Array.isArray(data.sources)
  )
    throw new Error("Invalid events snapshot");
  if (!Number.isFinite(Date.parse(data.refreshedAt)))
    throw new Error("Snapshot must record a successful refresh");
  const sources = new Map(config.sources.map((source) => [source.id, source]));
  if (!data.sources.some((source) => ["ok", "partial"].includes(source.status)))
    throw new Error("No verified calendar sources");
  const ids = new Set();
  for (const event of data.events) {
    const source = sources.get(event.sourceId);
    if (
      !validEvent(event) ||
      !source ||
      event.scope !== source.scope ||
      !safeLink(event.sourceUrl) ||
      !source.hosts.includes(new URL(event.sourceUrl).hostname) ||
      ids.has(event.id)
    )
      throw new Error("Invalid, duplicate or unapproved event record");
    if (
      event.scope === "international" &&
      (!config.internationalSeries.includes(event.series) ||
        source.series !== event.series)
    )
      throw new Error(
        "International event is outside the approved series list",
      );
    if (
      event.scope === "south-africa" &&
      !/^(ZA|ZAF|South Africa)$/i.test(event.country)
    )
      throw new Error("Foreign event cannot be classified as South African");
    ids.add(event.id);
  }
  return true;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const config = JSON.parse(
    await readFile(new URL("sources.json", import.meta.url), "utf8"),
  );
  const data = JSON.parse(
    await readFile(
      resolve(process.argv[2] || "public/website/data/events.json"),
      "utf8",
    ),
  );
  validateSnapshot(data, config);
  console.log(
    `Validated ${data.events.length} events from ${data.sources.length} approved source calendars.`,
  );
}
