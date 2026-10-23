import { cpSync } from "node:fs";
import { buildWebsite } from "./scripts/website.mjs";
cpSync("assets", "dist/assets", { recursive: true });
await buildWebsite("dist/website");
