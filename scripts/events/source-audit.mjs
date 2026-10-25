import { mkdir, writeFile } from "node:fs/promises";
import { load } from "cheerio";
import { dateRange } from "./series.mjs";

const urls = [
  "https://www.formula1.com/en/racing/2026",
  "https://www.motogp.com/en/calendar",
  "https://www.fiawec.com/en/calendar",
  "https://www.wrc.com/en/calendar",
  "https://www.fiawec.com/",
  "https://www.motorsport.co.za/events/",
  "https://www.zwartkops.co.za/events/",
  "https://wpmc.co.za/upcoming-events/",
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
    const $ = load(body);
    const samples = $("a[href]").toArray().filter(a => /\/racing\/\d{4}\/.+|\/calendar\/\d{4}\/|\/en\/events\//.test($(a).attr("href"))).slice(0, 3).map(a => ({ href: $(a).attr("href"), text: $(a).text().replace(/\s+/g, " ").slice(0, 650), leaves: $(a).find("*").toArray().filter(n => !$(n).children().length && $(n).text().trim()).slice(0, 16).map(n => ({ tag: n.tagName, class: $(n).attr("class"), text: $(n).text().trim().slice(0, 100), datetime: $(n).attr("datetime") })) }));
    const contexts = $("*").toArray().filter(n => dateRange($(n).text(), 2026)).slice(0, 2).map(n => [$(n).parent(), $(n).parent().parent(), $(n).parent().parent().parent()].map(p => ({ tag: p[0]?.tagName, class: p.attr("class"), text: p.text().replace(/\s+/g, " ").slice(0, 550), heads: p.find("h2,h3,h4").toArray().map(h => $(h).text()).slice(0, 3), links: p.find("a[href]").toArray().map(a => $(a).attr("href")).slice(0, 3) })));
    reports.push({ url, final: response.url, status: response.status, bytes: body.length, links: [...new Set(links)].slice(0, 20), scripts: scripts.slice(0, 3), samples, contexts, text: text.slice(0, 3500) });
  } catch (error) { reports.push({ url, error: error.message }); }
}
await writeFile("/tmp/events-source-audit/report.json", JSON.stringify(reports, null, 2));
const emit = (title, value) => console.log(`::notice title=${title}::${JSON.stringify(value).replaceAll("%", "%25").replaceAll("\n", "%0A").replaceAll("\r", "%0D")}`);
emit("Source overview", reports.map(r => ({ url: r.url, status: r.status, error: r.error, bytes: r.bytes, scripts: r.scripts?.map(s => s.attrs) })));
for (const [index, report] of reports.entries()) {
  if (![0, 1, 3, 4, 7, 8, 9, 11].includes(index)) continue;
  const detail = [1, 4].includes(index) ? { url: report.url, contexts: report.contexts?.slice(0, 1) } : report.samples?.length ? { url: report.url, samples: report.samples.slice(0, 2) } : { ...report, contexts: [], scripts: report.scripts?.slice(0, 1).map(s => ({ attrs: s.attrs, content: s.content.slice(0, 800) })), text: report.text?.slice(0, 1800), links: report.links?.slice(0, 10) };
  if (JSON.stringify(detail).length > 3700) detail.samples = detail.samples?.slice(0, 1);
  emit(`Source details ${index}`, detail);
}
