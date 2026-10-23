import { element } from "./src/ui/dom.js";
import { createImageLoader } from "./src/ui/image-loader.js";
import { createProgressStorage } from "./src/progress-storage.js";
import {
  makeControls,
  showProduct,
  partIcon,
  partCategories,
  partLabels,
  partPanels,
  partFootnotes,
} from "./src/ui/products.js";
import "@fontsource-variable/inter";
import "./src/ui.css";
import {
  getProducts,
  selectionKinds,
  getVehicle,
  getProduct,
  getVariantKey,
  isPreviewAvailable,
} from "./src/catalogue.js";
import {
  selectPreview,
  selectVehicle,
  cancelPreview,
  getQuote,
  applyChanges,
  resetState,
} from "./src/state.js";
import {
  STAGE,
  CAR_TRANSFORMS,
  variants,
  getSceneVariant,
  upgradeVariants,
  getUpgradeVariant,
  assetUrl,
} from "./src/scene.js";
import { renderCar } from "./src/paint-renderer.js";
import { renderUpgrades } from "./src/upgrade-renderer.js";
import { mountClub } from "./src/club-ui.js";
import { createEngineAudio } from "./src/engine-audio.js";

if (globalThis.__SUNDAE_INLINE_ASSETS__) {
  document.querySelector("#brand-website").href =
    "https://bukenbekruip.github.io/sundaerun/website/";
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const credits = (value) => `$ ${new Intl.NumberFormat("en-US").format(value)}`;
let state;
let clubUI;
const storage = createProgressStorage();
state = storage.load();
const engine = createEngineAudio({ getState: () => state });
engine.subscribe((s) => {
  const badge = $("[data-engine-nav-status]");
  if (badge) badge.textContent = s.running ? "On" : "Off";
});
const selectionFor = (preview = state.preview) => ({
  ...preview,
  vehicle: state.vehicle,
});
let toastTimer,
  artRequest = 0,
  artLoading = false,
  currentArt = "",
  garageReady = false;
let lastDisplayed = selectionFor();
const loadImage = createImageLoader();
const renderCache = new Map();
const paintCache = new Map();
const sameBuild = () =>
  selectionKinds.every((kind) => state.preview[kind] === state.applied[kind]);
const available = (selection) =>
  isPreviewAvailable(selection, variants, upgradeVariants);

function positionCar(vehicle) {
  const transform = CAR_TRANSFORMS[vehicle];
  for (const [key, value] of Object.entries(transform))
    $("#car-image").style.setProperty(`--car-${key}`, `${value}px`);
  $("#car-image").style.setProperty(
    "--car-left-percent",
    `${(transform.left / STAGE.width) * 100}%`,
  );
  $("#car-image").style.setProperty(
    "--car-top-percent",
    `${(transform.top / 660) * 100}%`,
  );
  $("#car-image").style.setProperty(
    "--car-width-percent",
    `${(transform.width / STAGE.width) * 100}%`,
  );
}

function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2800);
}
function save() {
  $("#storage-notice").hidden = storage.save(state);
}
function keepCategoryVisible() {
  if (!state || !matchMedia("(max-width: 1099px)").matches) return;
  const rail = $(".category-menu");
  const active = rail.querySelector("[data-category].current");
  if (active)
    rail.scrollLeft =
      active.offsetLeft - rail.clientWidth / 2 + active.offsetWidth / 2;
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
addEventListener("resize", () => {
  resize();
  keepCategoryVisible();
});
resize();

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
    const source = assetUrl(getSceneVariant(selection).src);
    const original = await loadImage(source);
    if (request !== artRequest) return;
    let rendered;
    if (renderCache.has(key)) {
      rendered = renderCache.get(key);
      renderCache.delete(key);
    } else {
      const paintKey = `${selection.vehicle}:${selection.paint}:${selection.wheel}`;
      let painted = original;
      if (selection.paint !== "blue") {
        if (paintCache.has(paintKey)) {
          painted = paintCache.get(paintKey);
          paintCache.delete(paintKey);
        } else {
          const paintedSource = await renderCar(
            original,
            selection.vehicle,
            getProduct("paint", selection.paint),
          );
          painted = await loadImage(paintedSource, false);
        }
        paintCache.set(paintKey, painted);
        while (paintCache.size > 4)
          paintCache.delete(paintCache.keys().next().value);
      }
      const [tyreImage, kitImage] = await Promise.all(
        ["tyre", "body"].map((kind) => {
          const variant = getUpgradeVariant(selection, kind);
          return variant ? loadImage(assetUrl(variant.src)) : null;
        }),
      );
      if (request !== artRequest) return;
      rendered = await renderUpgrades(painted, selection.vehicle, selection, {
        baseImage: original,
        tyreImage,
        kitImage,
      });
    }
    renderCache.set(key, rendered);
    while (renderCache.size > 8)
      renderCache.delete(renderCache.keys().next().value);
    if (rendered !== source) await loadImage(rendered, false);
    if (request !== artRequest) return;
    positionCar(selection.vehicle);
    $("#car-image").src = rendered;
    $("#car-image").alt =
      `${getProduct("paint", selection.paint).name} ${getVehicle(selection.vehicle).name} with ${getProduct("wheel", selection.wheel).name} wheels, ${getProduct("tyre", selection.tyre).name} tyres, ${getProduct("suspension", selection.suspension).name} and ${getProduct("body", selection.body).name}; concept preview`;
    $("#car-image").dataset.variant = key;
    currentArt = key;
    lastDisplayed = { ...selection };
    if (garageReady) $("#scene-notice").hidden = true;
  } catch {
    if (request !== artRequest) return;
    if (state.vehicle !== lastDisplayed.vehicle)
      state = selectVehicle(state, lastDisplayed.vehicle);
    state = selectPreview(state, lastDisplayed);
    if (currentArt)
      notify("That preview could not load. Your previous look has been kept.");
    else {
      $("#scene-error-text").textContent =
        "Your car preview could not load. Please retry.";
      $("#scene-notice").hidden = false;
    }
    updateControls();
    save();
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
function updateControls() {
  const vehicle = getVehicle(state.vehicle);
  $("#vehicle-name").textContent = vehicle.name.toUpperCase();
  $("#scene").setAttribute(
    "aria-label",
    `${vehicle.name} on the Sundae Run turntable`,
  );
  for (const button of $$("[data-vehicle]")) {
    const active = button.dataset.vehicle === state.vehicle;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("current", active);
  }
  for (const button of $$(".wheel-select")) {
    const ready = available({ ...selectionFor(), wheel: button.dataset.wheel });
    button.disabled = !ready;
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.wheel === state.preview.wheel),
    );
    button.querySelector(".availability-label").textContent = ready
      ? "Concept preview"
      : "Preview coming soon";
  }
  for (const button of $$(".paint-option")) {
    button.disabled = !available({
      ...selectionFor(),
      paint: button.dataset.paint,
    });
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.paint === state.preview.paint),
    );
  }
  for (const button of $$(".part-select")) {
    const kind = button.dataset.partKind;
    button.disabled = !available({
      ...selectionFor(),
      [kind]: button.dataset.part,
    });
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.part === state.preview[kind]),
    );
  }
  const activeKind = partCategories[state.category];
  for (const [kind, selector] of Object.entries(partPanels))
    $(selector).hidden = kind !== activeKind;
  $("#parts-title-text").textContent =
    activeKind === "wheel" ? "Wheels & tyres" : partLabels[activeKind];
  const titleIcon = $("#parts-title-icon");
  if (titleIcon.dataset.kind !== activeKind) {
    titleIcon.setAttribute(
      "viewBox",
      activeKind === "wheel" ? "0 0 28 28" : "0 0 64 64",
    );
    titleIcon.innerHTML =
      activeKind === "wheel"
        ? '<circle cx="14" cy="14" r="11"/><circle cx="14" cy="14" r="3"/><path d="M14 3v8m3 2 8-2m-9 6 4 7m-8-7-4 7m3-11-8-2"/>'
        : partIcon(activeKind).innerHTML;
    titleIcon.dataset.kind = activeKind;
  }
  $("#parts-footnote").textContent = partFootnotes[activeKind];
  for (const button of $$("[data-wheel-step]"))
    button.setAttribute(
      "aria-label",
      `${Number(button.dataset.wheelStep) < 0 ? "Previous" : "Next"} ${partLabels[activeKind].toLowerCase()}`,
    );
  for (const button of $$("[data-category]")) {
    const active = button.closest(".wheel-tabs")
      ? partCategories[button.dataset.category] === activeKind
      : button.dataset.category === state.category;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("current", active);
  }
  keepCategoryVisible();
  const paint = getProduct("paint", state.preview.paint);
  $(".finish-pill").textContent = paint.finish;
  $("#paint-name").textContent = paint.name;
  $("#paint-finish").textContent =
    `${paint.finish} concept · ${credits(paint.gamePrice)} credits`;
  $("#balance").textContent = credits(state.balance);
  $("#balance").setAttribute(
    "aria-label",
    `${state.balance.toLocaleString("en-US")} garage credits`,
  );
  const altered = !sameBuild();
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
        element("span", "", partLabels[item.kind]),
        element(
          "strong",
          "",
          item.included
            ? "Included"
            : item.owned
              ? "Owned"
              : credits(item.charge),
        ),
      );
      return row;
    }),
  );
  $("#total-price").textContent = credits(quote.total);
  const same = sameBuild();
  const button = $("#apply-button");
  const sceneReady =
    garageReady && currentArt === getVariantKey(selectionFor());
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
  clubUI?.refresh();
}
function render() {
  engine.syncState(state);
  updateControls();
  updateCheckout();
  showCar(selectionFor());
  save();
}
function preview(changes) {
  const next = selectPreview(state, changes);
  if (!available({ ...next.preview, vehicle: next.vehicle })) {
    notify("A matching car render is still being prepared for that option.");
    return;
  }
  state = next;
  render();
}

makeControls();
showGarage();
$("#brand-logo").src = assetUrl("assets/scene/garage-logo.png");
$("#brand-logo").addEventListener("error", () => {
  $("#brand-logo").hidden = true;
});
positionCar(state.vehicle);
$("#vehicle-options").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-vehicle]");
  if (!button || button.dataset.vehicle === state.vehicle) return;
  state = selectVehicle(state, button.dataset.vehicle);
  render();
});
$("#wheel-products").addEventListener("click", (event) => {
  const select = event.target.closest(".wheel-select[data-wheel]");
  const details = event.target.closest(".product-details[data-product]");
  if (select && !select.disabled)
    preview({ wheel: select.dataset.wheel, category: "wheels" });
  else if (details) showProduct(details.dataset.product);
});
for (const kind of ["tyre", "suspension", "body"])
  $(partPanels[kind]).addEventListener("click", (event) => {
    const select = event.target.closest(".part-select[data-part]");
    const details = event.target.closest(".product-details[data-product]");
    if (select && !select.disabled)
      preview({
        [kind]: select.dataset.part,
        category: kind === "tyre" ? "tyres" : kind,
      });
    else if (details) showProduct(details.dataset.product, kind);
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
        ? $(".paint-option[aria-pressed='true']")
        : $(partPanels[partCategories[state.category]]).querySelector(
            "[aria-pressed='true']",
          );
    target?.focus({
      preventScroll: !matchMedia("(max-width: 1099px)").matches,
    });
  });
for (const button of $$("[data-wheel-step]"))
  button.addEventListener("click", () => {
    const kind = partCategories[state.category];
    const options = getProducts(kind).filter((product) =>
      available({ ...selectionFor(), [kind]: product.id }),
    );
    const index = options.findIndex(
      (product) => product.id === state.preview[kind],
    );
    const next =
      options[
        (index + Number(button.dataset.wheelStep) + options.length) %
          options.length
      ];
    if (next) {
      preview({
        [kind]: next.id,
        category:
          kind === "tyre" ? "tyres" : kind === "wheel" ? "wheels" : kind,
      });
      if (matchMedia("(max-width: 1099px)").matches)
        $(partPanels[kind])
          .querySelector("[aria-pressed='true']")
          ?.scrollIntoView({
            block: "nearest",
            inline: "center",
            behavior: "instant",
          });
    }
  });
$("#cancel-preview").addEventListener("click", () => {
  state = cancelPreview(state);
  render();
  notify("Preview cancelled. Your fitted build is restored.");
});
$("#apply-button").addEventListener("click", () => {
  if (
    artLoading ||
    !garageReady ||
    currentArt !== getVariantKey(selectionFor())
  )
    return;
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
  showCar(selectionFor());
});
clubUI = mountClub({
  engine,
  getState: () => state,
  setState: (next) => {
    state = next;
    render();
  },
  notify,
  sceneReady: () =>
    !artLoading && garageReady && currentArt === getVariantKey(selectionFor()),
});
$("#club-open").addEventListener("click", () => clubUI.open());
for (const button of $$("[data-garage-section]")) {
  button.addEventListener("click", () =>
    clubUI.open(button.dataset.garageSection),
  );
}
render();
