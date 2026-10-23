import { readFile, writeFile, readdir, realpath, stat } from "node:fs/promises";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { variants, upgradeVariants } from "../src/scene.js";
import { interiorVariants } from "../src/interiors.js";

// Run after the Vite build. No original artwork or legacy demo is modified.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = await realpath(
  resolve(process.argv[2] ?? resolve(projectRoot, "dist")),
);
const output = resolve(dist, "OPEN-SUNDAE-RUN.html");
const maximumBytes = 96 * 1024 * 1024;
const mimeTypes = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};
const encodedFiles = new Map();
const assetMap = Object.create(null);
const fail = (message) => {
  throw new Error(`Standalone build: ${message}`);
};
const isWithin = (root, path) => {
  const portion = relative(root, path);
  return (
    portion !== ".." && !portion.startsWith(`..${sep}`) && !isAbsolute(portion)
  );
};
const decodeHtml = (value) =>
  value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const names = {
      "&amp;": "&",
      "&quot;": '"',
      "&apos;": "'",
      "&lt;": "<",
      "&gt;": ">",
    };
    if (names[entity.toLowerCase()]) return names[entity.toLowerCase()];
    const number =
      entity[2].toLowerCase() === "x"
        ? Number.parseInt(entity.slice(3, -1), 16)
        : Number.parseInt(entity.slice(2, -1), 10);
    return String.fromCodePoint(number);
  });
const readAttributes = (tag) => {
  const attributes = Object.create(null);
  for (const match of tag
    .replace(/^<\/?[\w:-]+/, "")
    .matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attributes[match[1].toLowerCase()] = decodeHtml(
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }
  return attributes;
};

async function localFile(reference, baseDirectory = dist) {
  const value = decodeHtml(reference).trim();
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value))
    fail(`expected a local resource, received ${value || "(empty URL)"}`);
  let decoded;
  try {
    decoded = decodeURIComponent(value.split(/[?#]/, 1)[0]).replaceAll(
      "\\",
      "/",
    );
  } catch {
    fail(`invalid URL encoding in ${value}`);
  }
  const candidate = decoded.startsWith("/")
    ? resolve(dist, `.${decoded}`)
    : resolve(baseDirectory, decoded);
  if (!isWithin(dist, candidate)) fail(`resource escapes dist/: ${value}`);
  let actual;
  try {
    actual = await realpath(candidate);
  } catch {
    fail(`resource is missing: ${value}`);
  }
  if (!isWithin(dist, actual) || !(await stat(actual)).isFile())
    fail(`resource is not a file within dist/: ${value}`);
  return actual;
}

async function dataUrl(path) {
  if (!encodedFiles.has(path)) {
    const mime = mimeTypes[extname(path).toLowerCase()];
    if (!mime)
      fail(`unsupported embedded resource type: ${relative(dist, path)}`);
    encodedFiles.set(
      path,
      `data:${mime};base64,${(await readFile(path)).toString("base64")}`,
    );
  }
  return encodedFiles.get(path);
}

async function replaceAsync(source, expression, replacement) {
  let result = "",
    cursor = 0;
  for (const match of source.matchAll(expression)) {
    result += source.slice(cursor, match.index) + (await replacement(match));
    cursor = match.index + match[0].length;
  }
  return result + source.slice(cursor);
}

async function inlineCss(path) {
  let css = await readFile(path, "utf8");
  // Vite normally resolves CSS imports; unresolved imports would need a request.
  if (/@import\b/i.test(css.replace(/\/\*[\s\S]*?\*\//g, "")))
    fail(`unresolved CSS import in ${relative(dist, path)}`);
  css = css.replace(/\/\*[#@]\s*sourceMappingURL=[\s\S]*?\*\//g, "");
  css = await replaceAsync(
    css,
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi,
    async (match) => {
      const reference = (match[1] ?? match[2] ?? match[3]).trim();
      if (/^data:/i.test(reference) || reference.startsWith("#"))
        return match[0];
      return `url("${await dataUrl(await localFile(reference, dirname(path)))}")`;
    },
  );
  return css.replace(/<\/style/gi, "<\\/style");
}

// Mask comments/literals before checking module syntax. A merchant's HTTPS URL is
// catalogue data for an outbound link, not an automatically requested asset.
// HTML/CSS resources and imports are checked here; browser QA verifies that the
// actual game makes no unexpected network requests while opening/playing offline.
function inspectJavaScript(source, label) {
  let masked = "",
    index = 0,
    previous = "";
  while (index < source.length) {
    const character = source[index];
    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index + 2);
      index = end < 0 ? source.length : end;
      masked += " ";
      continue;
    }
    if (source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) fail(`unterminated comment in ${label}`);
      index = end + 2;
      masked += " ";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      let content = "";
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          content += source.slice(index, index + 2);
          index += 2;
          continue;
        }
        if (source[index] === quote) break;
        content += source[index++];
      }
      if (index >= source.length) fail(`unterminated literal in ${label}`);
      index += 1;
      const plain = content.replace(
        /\\x([\da-f]{2})|\\u([\da-f]{4})|\\(.)/gi,
        (_, hex, unicode, escaped) =>
          hex || unicode
            ? String.fromCodePoint(Number.parseInt(hex ?? unicode, 16))
            : escaped,
      );
      if (quote === "`" && /\bimport\s*\(/.test(plain))
        fail(`dynamic import remains inside a template expression in ${label}`);
      masked += " __LITERAL__ ";
      previous = "value";
      continue;
    }
    // Skip regular-expression literals so quotation marks inside a character class
    // cannot conceal a following import. Division leaves the scanner unchanged.
    if (
      character === "/" &&
      (!previous ||
        /^(?:[=(:,;!?[{]|return|throw|case|yield|await|typeof|void|delete)$/.test(
          previous,
        ))
    ) {
      let inClass = false;
      index += 1;
      while (index < source.length) {
        const current = source[index++];
        if (current === "\\") {
          index += 1;
          continue;
        }
        if (current === "[") inClass = true;
        if (current === "]") inClass = false;
        if (current === "/" && !inClass) break;
      }
      while (/[a-z]/i.test(source[index] ?? "") && index < source.length)
        index += 1;
      masked += " __REGEXP__ ";
      previous = "value";
      continue;
    }
    if (/[a-z_$]/i.test(character)) {
      const word = source.slice(index).match(/^[\w$]+/)[0];
      masked += word;
      previous = word;
      index += word.length;
      continue;
    }
    masked += character;
    if (!/\s/.test(character)) previous = character;
    index += 1;
  }
  // A property named import (e.g. { import: "Import a build" }) is not a module load.
  if (/(?:^|[^\w$.])import(?![\w$])\s*(?!\s*[.:])/.test(masked))
    fail(
      `unresolved module import in ${label}; build a single self-contained entry first`,
    );
  if (/\bexport\s+(?:\*|\{[^}]*\})\s*from\b/.test(masked))
    fail(`unresolved re-export in ${label}`);
  if (/(?:^|[^\w$.])require\s*\(/.test(masked))
    fail(`unresolved CommonJS require in ${label}`);
  if (/\bnew\s+URL\s*\([^;]*?import\s*\.\s*meta\s*\.\s*url/.test(masked))
    fail(`file-relative URL remains in ${label}`);
}

async function collectRuntimeImages() {
  // The registry is the complete runtime car set. Historical paint renders stay
  // in the repository without adding unused data to the portable download.
  let productFiles = [];
  try {
    productFiles = await readdir(resolve(dist, "assets", "products"));
  } catch (error) {
    if (error.code !== "ENOENT")
      fail(`cannot read product thumbnails: ${error.message}`);
  }
  const paths = [
    "assets/scene/garage-plate.png",
    "assets/scene/garage-logo.png",
    ...new Set(
      Object.values(variants)
        .filter(({ ready }) => ready)
        .map(({ src }) => src),
    ),
    ...new Set(
      Object.values(upgradeVariants)
        .filter(({ ready }) => ready)
        .map(({ src }) => src),
    ),
    ...new Set(
      Object.values(interiorVariants)
        .filter(({ ready }) => ready)
        .map(({ src }) => src),
    ),
    ...productFiles
      .filter((name) => /\.(?:png|webp)$/i.test(name))
      .map((name) => `assets/products/${name}`),
  ].sort();
  if (
    !paths.includes("assets/scene/garage-plate.png") ||
    !paths.includes("assets/scene/blue-sr-01.png")
  )
    fail("the base garage plate and blue car render are required");
  const portable = new Map(
    [...Object.values(variants), ...Object.values(upgradeVariants)]
      .filter(({ portableSrc }) => portableSrc)
      .map(({ src, portableSrc }) => [src, portableSrc]),
  );
  for (const key of paths)
    assetMap[key] = await dataUrl(await localFile(portable.get(key) ?? key));
}

let html = await readFile(await localFile("index.html"), "utf8");
const fontLicense = await readFile(
  await localFile("licenses/Inter-OFL.txt"),
  "utf8",
);
html = html.replace(
  "</head>",
  `<script type="text/plain" id="inter-font-license">${fontLicense.replace(/<\/script/gi, "<\\/script")}</script>\n</head>`,
);
const audioLicense = await readFile(
  await localFile("licenses/CarEngines-CC0.txt"),
  "utf8",
);
html = html.replace(
  "</head>",
  `<script type="text/plain" id="engine-texture-license">Mechanical texture source: buntine/CarEngines (CC0); model-specific sounds are sample-assisted concepts.\n${audioLicense.replace(/<\/script/gi, "<\\/script")}</script>\n</head>`,
);
await collectRuntimeImages();
html = await replaceAsync(html, /<link\b[^>]*>/gi, async ([tag]) => {
  const attributes = readAttributes(tag);
  const relations = attributes.rel?.toLowerCase().split(/\s+/) ?? [];
  if (relations.includes("stylesheet")) {
    if (!attributes.href) fail("stylesheet has no href");
    return `<style>\n${await inlineCss(await localFile(attributes.href))}\n</style>`;
  }
  if (
    relations.some((relation) =>
      [
        "modulepreload",
        "preload",
        "prefetch",
        "preconnect",
        "dns-prefetch",
      ].includes(relation),
    )
  )
    fail(`unresolved resource hint: ${tag}`);
  if (
    relations.some((relation) =>
      ["icon", "apple-touch-icon", "mask-icon"].includes(relation),
    ) &&
    attributes.href &&
    !/^data:/i.test(attributes.href)
  ) {
    const encoded = await dataUrl(await localFile(attributes.href));
    return tag.replace(
      /\bhref\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
      `href="${encoded}"`,
    );
  }
  return tag;
});
html = await replaceAsync(
  html,
  /<(?:img|source|video|audio|iframe|object|embed)\b[^>]*>/gi,
  async ([tag]) => {
    const attributes = readAttributes(tag);
    if (attributes.srcset)
      fail(
        "srcset remains in the built HTML; use the runtime image map for portable images",
      );
    const reference = attributes.src ?? attributes.poster ?? attributes.data;
    if (reference === undefined || /^data:/i.test(reference)) return tag;
    if (!reference) return tag.replace(/\bsrc\s*=\s*(?:""|'')/i, "");
    if (!/^<img\b/i.test(tag))
      fail(`unsupported external media in HTML: ${tag}`);
    const path = await localFile(reference);
    const key = relative(dist, path).split(sep).join("/");
    if (!Object.hasOwn(assetMap, key))
      fail(`HTML image is outside the runtime scene/thumbnail map: ${key}`);
    return tag.replace(
      /\bsrc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
      // The controller loads these images through the same inline lookup map.
      // Avoid embedding the initial car, logo and garage twice in one HTML file.
      `data-inline-asset="${key}"`,
    );
  },
);

const mapSource = `globalThis.__SUNDAE_INLINE_ASSETS__=${JSON.stringify(assetMap).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029")};`;
let entryCount = 0;
html = await replaceAsync(
  html,
  /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
  async ([tag, rawAttributes, existing]) => {
    const attributes = readAttributes(`<script ${rawAttributes}>`);
    if (!attributes.src) {
      if (
        !attributes.type ||
        attributes.type === "module" ||
        /(?:java|ecma)script/i.test(attributes.type)
      )
        inspectJavaScript(existing, "inline script");
      return tag;
    }
    if (attributes.type !== "module")
      fail("the application entry must be a Vite module script");
    entryCount += 1;
    const path = await localFile(attributes.src);
    let javascript = await readFile(path, "utf8");
    javascript = javascript.replace(/\/\/[#@]\s*sourceMappingURL=[^\n]*/g, "");
    inspectJavaScript(javascript, relative(dist, path));
    javascript = javascript.replace(/<\/script/gi, "<\\/script");
    return `<script>${entryCount === 1 ? mapSource : ""}</script>\n<script type="module">\n${javascript}\n</script>`;
  },
);
if (entryCount !== 1) fail(`expected one module entry, found ${entryCount}`);
const bytes = Buffer.byteLength(html);
if (bytes >= maximumBytes)
  fail(
    `artifact is ${(bytes / 1024 / 1024).toFixed(2)} MiB; reduce unused scene/font payloads below 96 MiB`,
  );
await writeFile(output, html);
console.log(`Portable game written: ${output}`);
console.log(
  `${Object.keys(assetMap).length} runtime images, ${encodedFiles.size} embedded files, ${(bytes / 1024 / 1024).toFixed(2)} MiB; no unresolved module/CSS imports.`,
);
