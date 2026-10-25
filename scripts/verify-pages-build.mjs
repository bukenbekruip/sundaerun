import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { websitePages, officialDomain } from "./build-pages.mjs";
import { variants, upgradeVariants } from "../src/scene.js";
import { interiorVariants } from "../src/interiors.js";
import { wheels } from "../src/catalogue.js";

const root = resolve("dist");
const origin = new URL(`https://${officialDomain}`);
let checked = 0;
const visited = new Set();
async function exists(path) {
  const file = resolve(root, `.${path}`);
  if (file !== root && !file.startsWith(root + "/"))
    throw new Error(`Resource outside build: ${path}`);
  const info = await stat(file);
  if (info.isDirectory()) await stat(resolve(file, "index.html"));
  checked++;
  if (visited.has(path) || info.isDirectory()) return;
  visited.add(path);
  if (/\.css$/.test(path)) {
    const css = await readFile(file, "utf8");
    for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
      const resource = new URL(match[1], new URL(path, origin));
      if (resource.origin === origin.origin) await exists(resource.pathname);
    }
  }
  if (/\.js$/.test(path)) {
    const js = await readFile(file, "utf8");
    for (const match of js.matchAll(/\bfrom\s+["'](\.\.?\/[^"']+)["']/g)) {
      await exists(new URL(match[1], new URL(path, origin)).pathname);
    }
  }
}
if ((await readFile(resolve(root, "CNAME"), "utf8")).trim() !== officialDomain)
  throw new Error("Invalid CNAME");
for (const page of [
  ...websitePages.map((p) => `/${p}.html`),
  ...websitePages.map((p) => `/website/${p}.html`),
  "/garage/index.html",
]) {
  const html = await readFile(resolve(root, `.${page}`), "utf8");
  if (/\bstyle\s*=|<style\b|<script\b[^>]*>\s*[^<\s]/i.test(html))
    throw new Error(`Embedded style/script in ${page}`);
  if (html.includes("<!-- component:") || html.includes("{{nav:"))
    throw new Error(`Unresolved template in ${page}`);
  if (!html.includes('http-equiv="Content-Security-Policy"'))
    throw new Error(`Missing security policy in ${page}`);
  if (!html.includes(`rel="canonical" href="https://${officialDomain}/`))
    throw new Error(`Missing canonical: ${page}`);
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = new URL(
      match[1].replaceAll("&amp;", "&"),
      new URL(page, origin),
    );
    if (url.origin === origin.origin)
      await exists(decodeURIComponent(url.pathname));
  }
}
const images = new Set([
  "assets/scene/garage-plate.png",
  "assets/scene/garage-logo.png",
  ...Object.values(variants)
    .filter((v) => v.ready)
    .map((v) => v.src),
  ...Object.values(upgradeVariants)
    .filter((v) => v.ready)
    .map((v) => v.src),
  ...Object.values(interiorVariants)
    .filter((v) => v.ready)
    .map((v) => v.src),
  ...wheels.map((wheel) => wheel.thumbnail.replace(/^\.\//, "")),
]);
for (const image of images) await exists(`/garage/${image}`);
console.log(
  `Pages build verified: ${checked} local references, ${images.size} runtime game images, ${websitePages.length * 2 + 1} HTML routes, official www CNAME and canonicals.`,
);
