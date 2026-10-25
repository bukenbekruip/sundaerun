import https from "node:https";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Read-only diagnostics run from GitHub's public-network runner. Never touches DNS.
const escape = value => String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
const results = [];
const notice = (title, value) => results.push({ check: title, result: value });
for (const host of ["sundaerun.com", "www.sundaerun.com"]) {
  for (const type of ["CNAME", "A", "AAAA", "CAA"]) {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${host}&type=${type}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Resolver HTTP ${response.status}`);
      const result = await response.json();
      notice(`${host} ${type}`, JSON.stringify({ status: result.Status, answers: result.Answer ?? [] }));
    } catch (error) { notice(`${host} ${type}`, error.message); }
  }
  for (const protocol of ["http:", "https:"]) {
    await new Promise(resolve => {
      const client = protocol === "https:" ? https : http;
      const request = client.get(`${protocol}//${host}/`, { timeout: 15000 }, response => {
        notice(`${protocol}//${host}/`, JSON.stringify({ status: response.statusCode, location: response.headers.location ?? null,
          ...(protocol === "https:" ? { tlsAuthorized: response.socket.authorized, certificateExpiry: response.socket.getPeerCertificate().valid_to } : {}) }));
        response.resume();resolve();
      });
      request.on("timeout", () => request.destroy(new Error("Connection timed out")));
      request.on("error", error => { notice(`${protocol}//${host}/`, `${error.code ?? "ERROR"}: ${error.message}`);resolve(); });
    });
  }
}
// GitHub caps per-step annotations; one report retains every DNS/TLS result.
console.log(`::notice title=Public DNS and HTTPS results::${escape(JSON.stringify(results))}`);

// This verification branch is never deployed. Compare public release files
// with the already reviewed production snapshot, using GET requests only.
const expected = JSON.parse(await readFile(new URL("../qa/events/production-files.json", import.meta.url), "utf8"));
const snapshot = await readFile(new URL("../public/website/data/events.json", import.meta.url));
const dataHash = createHash("sha256").update(snapshot).digest("hex");
expected["data/events.json"] = dataHash;
expected["website/data/events.json"] = dataHash;
const paths = [
  ...["index", "culture", "garage", "community", "events", "shop", "about", "privacy", "play"].map(page => `${page}.html`),
  "website/index.html", "website/shop.html", "website/events.html", "garage/index.html",
  "data/events.json", "website/data/events.json", "css/events.css", "js/events-data.js", "js/events-view.js", "js/events-page.js", "js/events-preview.js",
  "styles.css", "site.js", "js/navigation.js", "js/signup-demo.js",
  ...Object.keys(expected).filter(path => /^garage\/assets\/index-[\w-]+\.(js|css)$/.test(path)),
  "garage/assets/approved-scene-fixed.jpg", "garage/assets/portable/rs3-sr-01.webp",
  "garage/assets/interiors/sti/heritage.webp",
];
const release = [];
for (const path of paths) {
  try {
    if (!expected[path]) throw new Error("No reviewed fingerprint for " + path);
    const url = new URL(path, "https://www.sundaerun.com/");
    url.searchParams.set("release", process.env.RELEASE_SHA ?? "events-calendar");
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "Cache-Control": "no-cache" } });
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    release.push({ path, status: response.status, bytes: bytes.length, matchesReviewedBuild: response.ok && sha256 === expected[path], sha256 });
  } catch (error) { release.push({ path, matchesReviewedBuild: false, error: error.message }); }
}
console.log(`::notice title=Deployed release fingerprints::${escape(JSON.stringify({files:release.length, matched:release.filter(item=>item.matchesReviewedBuild).length, failures:release.filter(item=>!item.matchesReviewedBuild)}))}`);
if (release.some(item => !item.matchesReviewedBuild)) process.exitCode = 1;
