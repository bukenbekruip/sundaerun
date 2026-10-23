import {
  wheels,
  paints,
  vehicles,
  getProducts,
  getProduct,
  getMerchantLink,
} from "../catalogue.js";
import { assetUrl } from "../scene.js";
import { element } from "./dom.js";
const $ = (selector) => document.querySelector(selector);
const credits = (value) => `$ ${new Intl.NumberFormat("en-US").format(value)}`;
export const partCategories = {
  wheels: "wheel",
  tyres: "tyre",
  suspension: "suspension",
  body: "body",
  paint: "wheel",
};
export const partLabels = {
  wheel: "Wheels",
  paint: "Paint",
  tyre: "Tyres",
  suspension: "Suspension",
  body: "Body kit",
};
export const partPanels = {
  wheel: "#wheel-products",
  tyre: "#tyre-products",
  suspension: "#suspension-products",
  body: "#body-products",
};
export const partFootnotes = {
  wheel: "Preview your look. Product details are available on each card.",
  tyre: "Choose road, semi-slick or slick rubber. Tyre size and profile stay the same.",
  suspension:
    "Lower the body while the wheels and tyre contacts stay in place.",
  body: "Carbon splitter, canard and sill additions. Each kit moves with the car body.",
};
export function makeControls() {
  for (const vehicle of vehicles) {
    const button = element(
      "button",
      "vehicle-option",
      vehicle.shortName ?? vehicle.name,
    );
    button.type = "button";
    button.dataset.vehicle = vehicle.id;
    button.setAttribute("aria-label", `Customise ${vehicle.name}`);
    $("#vehicle-options").append(button);
  }
  for (const product of wheels) {
    const card = element("article", "wheel-card");
    const select = element("button", "wheel-select");
    select.type = "button";
    select.dataset.wheel = product.id;
    select.setAttribute(
      "aria-label",
      `${product.name}, ${product.gamePrice.toLocaleString("en-US")} garage credits`,
    );
    const image = element("img", "wheel-thumbnail");
    image.src = assetUrl(product.thumbnail);
    image.alt = "";
    image.width = 96;
    image.height = 96;
    image.draggable = false;
    const check = element("span", "selection-check", "✓");
    check.setAttribute("aria-hidden", "true");
    select.append(
      check,
      image,
      element("span", "wheel-name", product.name),
      element("span", "wheel-price", credits(product.gamePrice)),
      element("span", "availability-label"),
    );
    const details = element("button", "product-details", "Product details");
    details.type = "button";
    details.dataset.product = product.id;
    details.setAttribute("aria-label", `Product details for ${product.name}`);
    card.append(select, details);
    $("#wheel-products").append(card);
  }
  for (const paint of paints) {
    const button = element("button", "paint-option");
    button.type = "button";
    button.dataset.paint = paint.id;
    button.style.setProperty("--swatch", paint.colour);
    button.setAttribute("aria-label", `${paint.name} paint`);
    button.title = paint.name;
    button.append(
      element("span", "paint-chip"),
      element("span", "paint-label", paint.name),
    );
    $("#paint-options").append(button);
  }
  for (const kind of ["tyre", "suspension", "body"]) {
    for (const product of getProducts(kind)) {
      const card = element("article", "part-card");
      const button = element("button", "part-select");
      button.type = "button";
      button.dataset.partKind = kind;
      button.dataset.part = product.id;
      button.setAttribute(
        "aria-label",
        `${product.name}, ${product.included ? "included" : product.gamePrice.toLocaleString("en-US") + " garage credits"}`,
      );
      const check = element("span", "selection-check", "✓");
      check.setAttribute("aria-hidden", "true");
      button.append(
        check,
        partIcon(kind),
        element("span", "part-name", product.name),
        element("span", "part-description", product.description),
        element(
          "span",
          "part-price",
          product.included ? "Included" : credits(product.gamePrice),
        ),
      );
      const details = element("button", "product-details", "Product details");
      details.type = "button";
      details.dataset.product = product.id;
      details.dataset.productKind = kind;
      details.setAttribute("aria-label", `Product details for ${product.name}`);
      card.append(button, details);
      $(partPanels[kind]).append(card);
    }
  }
}
export function partIcon(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "part-icon");
  svg.setAttribute("width", "64");
  svg.setAttribute("height", "64");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const paths = {
    tyre: '<ellipse cx="32" cy="32" rx="19" ry="26"/><ellipse cx="32" cy="32" rx="9" ry="19"/><path d="m17 15 7 5m-10 6 9 4m-9 10 9 3m24-28-7 5m10 6-9 4m9 10-9 3"/>',
    suspension:
      '<path d="m20 55 25-46m-8-3 14 7M13 51l14 8m0-34 17 5-11-13 16 5M21 36l17 5-11-13m-12 19 17 5-11-13"/>',
    body: '<path d="m8 40 4-13 11-9h19l10 13 4 4v13H8zM19 28h25M9 43h46M5 49h54M13 48l-4 8m42-8 4 8"/><path d="m12 34 8 3m26-3-8 3"/>',
  };
  svg.innerHTML = paths[kind];
  return svg;
}
export function showProduct(id, kind = "wheel") {
  const product = getProduct(kind, id);
  if (!product) return;
  const content = $("#product-content");
  content.replaceChildren();
  const title = element("h2", "", product.name);
  title.id = "product-title";
  content.append(element("p", "eyebrow", `${partLabels[kind]} details`), title);
  if (product.thumbnail) {
    const image = element("img", "detail-wheel");
    image.src = assetUrl(product.thumbnail);
    image.alt = `${product.name} design reference`;
    content.append(image);
  } else content.append(partIcon(kind));
  content.append(
    element(
      "p",
      "detail-caption",
      "Concept appearance · fictional garage credits",
    ),
    element(
      "p",
      "",
      product.description ??
        "This preview shows an in-game wheel design. Physical vehicle fitment has not been verified.",
    ),
  );
  if (kind !== "wheel")
    content.append(
      element("p", "muted", "Physical vehicle fitment has not been verified."),
    );
  const link = getMerchantLink(product);
  if (link) {
    if (link.price !== null && link.currency)
      content.append(
        element(
          "p",
          "retailer-price",
          `Retailer price: ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: link.currency }).format(link.price)}`,
        ),
      );
    content.append(
      element(
        "p",
        "muted",
        "Check vehicle compatibility, measurements and installation requirements with the retailer.",
      ),
    );
    const anchor = element("a", "primary-link", "View at retailer ↗");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = link.rel;
    content.append(anchor);
    if (link.disclosure)
      content.append(element("p", "affiliate-disclosure", link.disclosure));
  } else
    content.append(
      element(
        "p",
        "retailer-pending",
        "Real product and retailer details are coming later.",
      ),
    );
  $("#product-dialog").showModal();
}
