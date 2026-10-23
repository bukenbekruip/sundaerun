import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "lightningcss";

const root = fileURLToPath(new URL("../", import.meta.url));
export const sitePages = [
  "index",
  "culture",
  "garage",
  "community",
  "shop",
  "about",
  "privacy",
  "play",
];
const components = new Set(["header", "footer", "footer-compact"]);

/** Only repository-owned partials are supported; no template evaluation or user HTML. */
export async function renderWebsitePage(page) {
  if (!sitePages.includes(page)) throw new RangeError("Unknown website page");
  let html = await readFile(
    resolve(root, "public/website", `${page}.html`),
    "utf8",
  );
  for (const match of [...html.matchAll(/<!-- component:([\w-]+) -->/g)]) {
    if (!components.has(match[1])) throw new Error("Unknown website component");
    let partial = await readFile(
      resolve(root, "website/components", `${match[1]}.html`),
      "utf8",
    );
    partial = partial.replace(/\{\{nav:(\w+)\}\}/g, (_, active) =>
      active === page ? ' class="active" aria-current="page"' : "",
    );
    partial = partial
      .replaceAll(
        "{{actionHref}}",
        page === "play" ? "garage.html" : "play.html",
      )
      .replaceAll(
        "{{actionText}}",
        page === "play" ? "Garage overview" : "Play the Garage",
      );
    html = html.replace(match[0], partial);
  }
  if (/\{\{|<!-- component:/.test(html))
    throw new Error("Unresolved website template");
  return html;
}

export async function buildWebsite(output) {
  await mkdir(resolve(output, "css"), { recursive: true });
  for (const page of sitePages)
    await writeFile(
      resolve(output, `${page}.html`),
      await renderWebsitePage(page),
    );
  await writeFile(
    resolve(output, "css/tokens.css"),
    await readFile(resolve(root, "src/styles/tokens.css")),
  );
  // Keep modular authoring and publish one cached/minified stylesheet.
  const entry = await readFile(
    resolve(root, "public/website/styles.css"),
    "utf8",
  );
  const sheets = [];
  for (const match of entry.matchAll(
    /@import url\("\.\/css\/([\w-]+\.css)"\);/g,
  )) {
    const css = await readFile(resolve(output, "css", match[1]), "utf8");
    sheets.push(css.replaceAll("../fonts/", "./fonts/"));
  }
  const bundled = transform({
    filename: "styles.css",
    code: Buffer.from(sheets.join("\n")),
    minify: true,
  });
  await writeFile(resolve(output, "styles.css"), bundled.code);
}

export function websitePlugin() {
  return {
    name: "sundae-static-website",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = new URL(request.url, "http://localhost").pathname;
        const match = /^\/website\/(?:([\w-]+)\.html)?$/.exec(path);
        try {
          if (path === "/website/css/tokens.css") {
            response.setHeader("Content-Type", "text/css");
            response.end(
              await readFile(resolve(root, "src/styles/tokens.css")),
            );
          } else if (match && sitePages.includes(match[1] ?? "index")) {
            response.setHeader("Content-Type", "text/html");
            response.end(await renderWebsitePage(match[1] ?? "index"));
          } else next();
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
