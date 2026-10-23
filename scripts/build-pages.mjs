import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withSecurityPolicy } from "./security-policy.mjs";
import { sitePages } from "./website.mjs";

export const websitePages = sitePages;
export const officialDomain = "www.sundaerun.com";

function canonical(html, path) {
  return withSecurityPolicy(html).replace(
    "</head>",
    `    <link rel="canonical" href="https://${officialDomain}${path}" />\n  </head>`,
  );
}

// Deploy-only assembly: normal development and portable-game builds keep their
// existing root-game layout. Move the entire game asset tree together so its
// relative URLs and lazy-loaded car/cabin artwork remain valid.
export async function buildPages(dist) {
  const game = await readFile(resolve(dist, "index.html"), "utf8");
  const domain = (await readFile(resolve(dist, "CNAME"), "utf8")).trim();
  if (domain !== officialDomain)
    throw new Error("CNAME must use the official www host");
  if (
    !game.includes('id="brand-website"') ||
    !game.includes('href="./website/index.html"')
  ) {
    throw new Error("Expected an unassembled game build with its website link");
  }
  const entries = await readdir(dist);
  if (entries.includes("garage"))
    throw new Error("Run a fresh Vite build before Pages assembly");
  await mkdir(resolve(dist, "garage"));
  for (const entry of entries) {
    if (!["website", "CNAME"].includes(entry)) {
      await rename(resolve(dist, entry), resolve(dist, "garage", entry));
    }
  }
  await writeFile(
    resolve(dist, "garage/index.html"),
    canonical(
      game.replace('href="./website/index.html"', 'href="../index.html"'),
      "/garage/",
    ),
  );
  for (const page of websitePages) {
    let html = await readFile(resolve(dist, "website", `${page}.html`), "utf8");
    const path = page === "index" ? "/" : `/${page}.html`;
    const rootHtml = canonical(
      html.replace('href="../index.html"', 'href="./garage/"'),
      path,
    );
    const legacyHtml = canonical(
      html.replace('href="../index.html"', 'href="../garage/"'),
      path,
    );
    await writeFile(resolve(dist, `${page}.html`), rootHtml);
    await writeFile(resolve(dist, "website", `${page}.html`), legacyHtml);
  }
  for (const entry of await readdir(resolve(dist, "website"))) {
    if (entry.endsWith(".html")) continue;
    await cp(resolve(dist, "website", entry), resolve(dist, entry), {
      recursive: true,
    });
  }
  await writeFile(resolve(dist, ".nojekyll"), "");
  await writeFile(
    resolve(dist, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: https://${officialDomain}/sitemap.xml\n`,
  );
  const paths = websitePages
    .map((page) => (page === "index" ? "/" : `/${page}.html`))
    .concat("/garage/");
  await writeFile(
    resolve(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>https://${officialDomain}${path}</loc></url>`).join("\n")}\n</urlset>\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await buildPages(resolve("dist"));
  console.log(
    `Pages: https://${officialDomain}/ website, /shop.html shop, /garage/ game; /website/ links retained.`,
  );
}
