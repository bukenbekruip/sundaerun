import { element as el } from "./dom.js";
export const button = (text, action, cls = "secondary-button") => {
  const b = el("button", cls, text);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
};
export const money = (v) => `${v.toLocaleString("en-US")} credits`;
export const filename = (name) =>
  name.replace(/[^a-z\d_-]+/gi, "-").slice(0, 55) || "sundae-run-build";
export const download = (url, name) => {
  const a = el("a");
  a.href = url;
  a.download = name;
  a.click();
};
