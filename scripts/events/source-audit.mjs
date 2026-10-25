import { mkdir, writeFile } from "node:fs/promises";

const urls = [
  "https://www.formula1.com/en/racing/2026",
  "https://www.motogp.com/en/calendar",
  "https://www.fiawec.com/en/calendar",
  "https://www.wrc.com/en/calendar",
  "https://www.motorsport.co.za/",
  "https://www.motorsport.co.za/events/",
  "https://www.zwartkops.co.za/events/",
  "https://wpmc.co.za/events/",
  "https://www.bmwcarclub.co.za/events/",
  "https://dezziraceway.co.za/",
  "https://www.redstarraceway.co.za/",
  "https://www.bing.com/search?format=rss&q=South+Africa+car+fun+run+events",
];
await mkdir("/tmp/events-source-audit", { recursive: true });
const reports = [];
for (const [index, url] of urls.entries()) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "SundaeRunEvents/1.0 (+https://www.sundaerun.com/)" } });
    const body = await response.text();
    await writeFile(`/tmp/events-source-audit/${index}.html`, body);
    const links = [...body.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]).filter(h => /event|calendar|ical|\.ics|wp-json|\/racing\//i.test(h));
    const scripts = [...body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m => /json/i.test(m[1])).map(m => ({ attrs: m[1], content: m[2].slice(0, 5500) }));
    const text = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    reports.push({ url, final: response.url, status: response.status, bytes: body.length, links: [...new Set(links)].slice(0, 20), scripts: scripts.slice(0, 3), text: text.slice(0, 3500) });
  } catch (error) { reports.push({ url, error: error.message }); }
}
await writeFile("/tmp/events-source-audit/report.json", JSON.stringify(reports, null, 2));
const emit = (title, value) => console.log(`::notice title=${title}::${JSON.stringify(value).replaceAll("%", "%25").replaceAll("\n", "%0A").replaceAll("\r", "%0D")}`);
emit("Source overview", reports.map(r => ({ url: r.url, status: r.status, error: r.error, bytes: r.bytes, scripts: r.scripts?.map(s => s.attrs) })));
for (const [index, report] of reports.slice(0, 8).entries()) {
  emit(`Source details ${index}`, { ...report, scripts: report.scripts?.map(s => ({ attrs: s.attrs, content: s.content.slice(0, 900) })), text: report.text?.slice(0, 1000), links: report.links?.slice(0, 12) });
}
