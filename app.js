import "@fontsource-variable/inter";
import "./src/ui.css";
import {
  wheels,
  paints,
  VEHICLE,
  getProduct,
  getVariantKey,
  isPreviewAvailable,
  getMerchantLink,
} from "./src/catalogue.js";
import {
  STORAGE_KEY,
  createInitialState,
  selectPreview,
  cancelPreview,
  getQuote,
  applyChanges,
  resetState,
  serializeState,
  loadState,
} from "./src/state.js";
import { STAGE, CAR_TRANSFORM, variants, assetUrl } from "./src/scene.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const credits = (value) => `$ ${new Intl.NumberFormat("en-US").format(value)}`;
let state;
let storageAvailable = true;
try {
  state = loadState(localStorage.getItem(STORAGE_KEY));
} catch {
  state = createInitialState();
  storageAvailable = false;
}
if (!isPreviewAvailable(state.applied, variants))
  state = {
    ...state,
    applied: { wheel: "sr-01", paint: "blue" },
    preview: { wheel: "sr-01", paint: "blue" },
  };
let toastTimer,
  artRequest = 0,
  artLoading = false,
  currentArt = "",
  garageReady = false;
let lastDisplayed = { ...state.preview };
const imageCache = new Map();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2800);
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  $("#storage-notice").hidden = storageAvailable;
}
function resize() {
  const narrow = matchMedia("(max-width: 1099px)").matches;
  $("#stage").style.setProperty(
    "--stage-scale",
    String(
      narrow
        ? 1
        : Math.min(innerWidth / STAGE.width, innerHeight / STAGE.height),
    ),
  );
}
addEventListener("resize", resize);
resize();
function loadImage(src) {
  if (!imageCache.has(src)) {
    const task = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("Scene image could not be loaded."));
      image.src = src;
    });
    imageCache.set(src, task);
    task.catch(() => imageCache.delete(src));
  }
  return imageCache.get(src);
}
async function showCar(selection) {
  const key = getVariantKey(selection);
  if (key === currentArt) {
    if (artLoading) {
      ++artRequest;
      artLoading = false;
      $("#scene").setAttribute("aria-busy", "false");
      updateCheckout();
    }
    return;
  }
  const request = ++artRequest;
  artLoading = true;
  $("#scene").setAttribute("aria-busy", "true");
  updateCheckout();
  try {
    const source = assetUrl(variants[key].src);
    await loadImage(source);
    if (request !== artRequest) return;
    $("#car-image").src = source;
    $("#car-image").alt =
      `${getProduct("paint", selection.paint).name} ${VEHICLE.name} with ${getProduct("wheel", selection.wheel).name} concept wheels`;
    $("#car-image").dataset.variant = key;
    currentArt = key;
    lastDisplayed = { ...selection };
    if (garageReady) $("#scene-notice").hidden = true;
  } catch {
    if (request !== artRequest) return;
    state = selectPreview(state, lastDisplayed);
    if (currentArt)
      notify("That preview could not load. Your previous look has been kept.");
    else {
      $("#scene-error-text").textContent =
        "Your car preview could not load. Please retry.";
      $("#scene-notice").hidden = false;
    }
    updateControls();
  } finally {
    if (request === artRequest) {
      artLoading = false;
      $("#scene").setAttribute("aria-busy", "false");
      updateCheckout();
    }
  }
}
async function showGarage() {
  try {
    const source = assetUrl("assets/scene/garage-plate.png");
    await loadImage(source);
    $("#garage-image").src = source;
    garageReady = true;
    if (currentArt) $("#scene-notice").hidden = true;
  } catch {
    garageReady = false;
    $("#scene-error-text").textContent =
      "The garage scene could not load. Please retry.";
    $("#scene-notice").hidden = false;
  }
  updateCheckout();
}
function makeControls() {
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
    button.append(
      element("span", "paint-chip"),
      element("span", "paint-label", paint.name),
    );
    $("#paint-options").append(button);
  }
}
function updateControls() {
  for (const button of $$(".wheel-select")) {
    const available = isPreviewAvailable(
      { ...state.preview, wheel: button.dataset.wheel },
      variants,
    );
    button.disabled = !available;
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.wheel === state.preview.wheel),
    );
    button.querySelector(".availability-label").textContent = available
      ? "Concept preview"
      : "Preview coming soon";
  }
  for (const button of $$(".paint-option")) {
    button.disabled = !isPreviewAvailable(
      { ...state.preview, paint: button.dataset.paint },
      variants,
    );
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.paint === state.preview.paint),
    );
  }
  for (const button of $$("[data-category]")) {
    const active = button.dataset.category === state.category;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("current", active);
  }
  const paint = getProduct("paint", state.preview.paint);
  $("#paint-name").textContent = paint.name;
  $("#paint-finish").textContent =
    `${paint.finish} concept · ${credits(paint.gamePrice)} credits`;
  $("#balance").textContent = credits(state.balance);
  $("#balance").setAttribute(
    "aria-label",
    `${state.balance.toLocaleString("en-US")} garage credits`,
  );
  const altered =
    state.preview.wheel !== state.applied.wheel ||
    state.preview.paint !== state.applied.paint;
  $("#cancel-preview").disabled = !altered;
  $("#preview-status").textContent = altered
    ? "Preview · not applied"
    : getQuote(state).total
      ? "Preview · apply to fit"
      : "Your fitted build";
  $("#preview-status").classList.toggle("is-preview", altered);
}
function updateCheckout() {
  const quote = getQuote(state);
  $("#quote-items").replaceChildren(
    ...quote.items.map((item) => {
      const row = element("li", "quote-line");
      row.append(
        element("span", "", item.kind === "wheel" ? "Wheels" : "Paint"),
        element("strong", "", item.owned ? "Owned" : credits(item.charge)),
      );
      return row;
    }),
  );
  $("#total-price").textContent = credits(quote.total);
  const same =
    state.preview.wheel === state.applied.wheel &&
    state.preview.paint === state.applied.paint;
  const button = $("#apply-button");
  const sceneReady = garageReady && Boolean(currentArt);
  button.disabled =
    !sceneReady ||
    artLoading ||
    (quote.total === 0 && same) ||
    quote.total > state.balance;
  button.textContent = artLoading
    ? "Loading preview…"
    : !sceneReady
      ? "Preview unavailable"
      : quote.total > state.balance
        ? "Not enough credits"
        : quote.total === 0
          ? same
            ? "Fitted ✓"
            : "Fit owned parts"
          : "Apply Changes";
}
function render() {
  updateControls();
  updateCheckout();
  showCar({ ...state.preview });
  save();
}
function preview(changes) {
  const next = selectPreview(state, changes);
  if (!isPreviewAvailable(next.preview, variants)) {
    notify("A matching car render is still being prepared for that option.");
    return;
  }
  state = next;
  render();
}
function showProduct(id) {
  const product = getProduct("wheel", id);
  if (!product) return;
  const content = $("#product-content");
  content.replaceChildren();
  const title = element("h2", "", product.name);
  title.id = "product-title";
  content.append(element("p", "eyebrow", "Wheel details"), title);
  const image = element("img", "detail-wheel");
  image.src = assetUrl(product.thumbnail);
  image.alt = `${product.name} design reference`;
  content.append(
    image,
    element(
      "p",
      "detail-caption",
      "Concept appearance · fictional garage credits",
    ),
    element(
      "p",
      "",
      "This preview shows an in-game wheel design. Physical vehicle fitment has not been verified.",
    ),
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
        "Check vehicle compatibility, diameter, width, offset, and bolt pattern with the retailer.",
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

makeControls();
showGarage();
$("#brand-logo").src = assetUrl("assets/scene/garage-logo.png");
$("#brand-logo").addEventListener("error", () => {
  $("#brand-logo").hidden = true;
});
for (const [key, value] of Object.entries(CAR_TRANSFORM))
  $("#car-image").style.setProperty(`--car-${key}`, `${value}px`);
$("#wheel-products").addEventListener("click", (event) => {
  const select = event.target.closest(".wheel-select[data-wheel]");
  const details = event.target.closest(".product-details[data-product]");
  if (select && !select.disabled)
    preview({ wheel: select.dataset.wheel, category: "wheels" });
  else if (details) showProduct(details.dataset.product);
});
$("#paint-options").addEventListener("click", (event) => {
  const button = event.target.closest("[data-paint]");
  if (button && !button.disabled)
    preview({ paint: button.dataset.paint, category: "paint" });
});
for (const button of $$("[data-category]"))
  button.addEventListener("click", () => {
    if (button.disabled) return;
    state = selectPreview(state, { category: button.dataset.category });
    render();
    const target =
      button.dataset.category === "paint"
        ? $("#paint-options button:not(:disabled)")
        : $(".wheel-select:not(:disabled)");
    target?.focus({
      preventScroll: !matchMedia("(max-width: 1099px)").matches,
    });
  });
for (const button of $$("[data-wheel-step]"))
  button.addEventListener("click", () => {
    const available = wheels.filter((wheel) =>
      isPreviewAvailable({ ...state.preview, wheel: wheel.id }, variants),
    );
    const index = available.findIndex(
      (wheel) => wheel.id === state.preview.wheel,
    );
    const next =
      available[
        (index + Number(button.dataset.wheelStep) + available.length) %
          available.length
      ];
    if (next) preview({ wheel: next.id, category: "wheels" });
  });
$("#cancel-preview").addEventListener("click", () => {
  state = cancelPreview(state);
  render();
  notify("Preview cancelled. Your fitted build is restored.");
});
$("#apply-button").addEventListener("click", () => {
  if (artLoading || !garageReady || !currentArt) return;
  const result = applyChanges(state);
  state = result.state;
  render();
  notify(
    result.status === "insufficient-funds"
      ? "Not enough garage credits."
      : result.status === "already-fitted"
        ? "These parts are already fitted."
        : result.charged
          ? `Build applied · ${credits(result.charged)} garage credits used`
          : "Owned parts fitted. No credits used.",
  );
});
$("#settings-open").addEventListener("click", () => {
  $("#reset-confirmation").hidden = true;
  $("#settings-dialog").showModal();
});
for (const button of $$("[data-close-dialog]"))
  button.addEventListener("click", () => button.closest("dialog").close());
for (const dialog of $$("dialog"))
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
$("#reset-request").addEventListener("click", () => {
  $("#reset-confirmation").hidden = false;
  $("#reset-confirm").focus();
});
$("#reset-cancel").addEventListener("click", () => {
  $("#reset-confirmation").hidden = true;
  $("#reset-request").focus();
});
$("#reset-confirm").addEventListener("click", () => {
  state = resetState();
  $("#settings-dialog").close();
  render();
  notify("Garage progress reset.");
});
$("#scene-retry").addEventListener("click", () => {
  $("#scene-notice").hidden = true;
  showGarage();
  showCar({ ...state.preview });
});
render();
