import { element as el } from "./dom.js";
import { button, money, download } from "./controls.js";
import { getVehicle } from "../catalogue.js";
import { normaliseClub, fitInterior, fitSteering } from "../club.js";
import {
  getInteriorPackage,
  getInteriorVariant,
  interiorPackages,
  steeringOptions,
  getSteeringOption,
} from "../interiors.js";
import { assetUrl } from "../scene.js";
import { renderSteering, steeringGeometry } from "../interior-renderer.js";
import { createInteriorCard } from "../photography.js";

/** Cabin/steering UI owns free preview state; purchases stay in domain transactions. */
export function createInteriorPanel({
  getState,
  commit,
  status,
  content,
  dialog,
  render,
  getPhotoRequest,
  startPhotoRequest,
}) {
  let interiorPreview = null,
    steeringPreview = null,
    interiorSection = "cabin";
  function renderInterior() {
    const state = getState(),
      cabin = normaliseClub(state.club).interiors[state.vehicle],
      steering = normaliseClub(state.club).steering[state.vehicle];
    const selected = getInteriorPackage(interiorPreview)
      ? interiorPreview
      : cabin.fitted;
    interiorPreview = selected;
    const wheel = getSteeringOption(steeringPreview)?.id ?? steering.fitted;
    steeringPreview = wheel;
    content.append(
      el(
        "div",
        "club-intro",
        "Choose a cabin package and a steering wheel finish independently. Previews are free; Fit uses garage credits. Each model keeps its own purchases.",
      ),
    );
    const sectionNav = el("nav", "interior-section-nav");
    sectionNav.setAttribute("aria-label", "Interior modification types");
    for (const [id, label] of [
      ["cabin", "Cabin packages"],
      ["steering", "Steering wheel"],
    ]) {
      const choice = button(label, () => {
        interiorSection = id;
        render();
        dialog.scrollTop = 0;
        dialog
          .querySelector(`[data-interior-section="${id}"]`)
          .focus({ preventScroll: true });
      });
      choice.dataset.interiorSection = id;
      choice.setAttribute("aria-pressed", String(interiorSection === id));
      sectionNav.append(choice);
    }
    content.append(sectionNav);
    const preview = el("div", "interior-preview"),
      image = el("img");
    const baseImage = new Image();
    const request = getPhotoRequest();
    baseImage.addEventListener("load", () => {
      if (request !== getPhotoRequest() || !dialog.open) return;
      try {
        image.src =
          wheel === "stock"
            ? baseImage.src
            : renderSteering(baseImage, state.vehicle, wheel).toDataURL(
                "image/png",
              );
      } catch {
        image.dispatchEvent(new Event("error"));
      }
    });
    baseImage.addEventListener("error", () =>
      image.dispatchEvent(new Event("error")),
    );
    baseImage.src = assetUrl(getInteriorVariant(state.vehicle, selected).src);
    image.alt = `${getVehicle(state.vehicle).name} — ${getInteriorPackage(selected).name}, left-hand-drive cabin concept, ${getSteeringOption(wheel).name}`;
    const notice = el("p", "interior-loading", "Loading cabin…");
    let ready = false;
    const controls = el("div", "interior-options");
    const fit = button(
      "Loading cabin…",
      () => {
        if (!ready) return;
        const result = fitInterior(getState(), selected);
        commit(result.state);
        status(
          result.status === "insufficient-funds"
            ? "Complete a build brief to earn more credits."
            : `${getInteriorPackage(selected).name} fitted. ${result.charged ? money(result.charged) + " used." : "No credits used."} Save a new build to keep this cabin in its recipe.`,
        );
      },
      "primary-button",
    );
    const own = selected === "stock" || cabin.owned.includes(selected),
      charge = own ? 0 : getInteriorPackage(selected).price;
    const refreshFit = () => {
      fit.disabled =
        !ready || selected === cabin.fitted || charge > state.balance;
      fit.textContent = !ready
        ? "Cabin unavailable"
        : selected === cabin.fitted
          ? "Fitted ✓"
          : charge > state.balance
            ? "Not enough credits"
            : charge
              ? `Fit cabin · ${money(charge)}`
              : "Fit owned cabin";
    };
    fit.disabled = true;
    fit.dataset.fitInterior = selected;
    image.addEventListener("load", () => {
      ready = image.naturalWidth > 0;
      notice.hidden = ready;
      refreshFit();
    });
    image.addEventListener("error", () => {
      ready = false;
      notice.textContent =
        "This cabin could not load. No credits have been used.";
      notice.hidden = false;
      refreshFit();
      const retry = button("Retry cabin", () => render());
      notice.append(retry);
    });
    for (const product of interiorPackages) {
      const choice = button(product.name, () => {
        interiorPreview = product.id;
        render();
      });
      choice.dataset.interior = product.id;
      choice.setAttribute("aria-pressed", String(product.id === selected));
      controls.append(choice);
    }
    const wheelSection = el("section", "steering-options");
    wheelSection.setAttribute("aria-label", "Steering wheel options");
    wheelSection.append(
      el("h3", "", "Steering wheel"),
      el(
        "p",
        "club-fineprint",
        "Choose a separate rim retrim. The original hub, controls and airbag illustration are retained.",
      ),
    );
    const closeup = el("div", "steering-closeup"),
      closeImage = el("img");
    closeImage.alt = `${getVehicle(state.vehicle).name} — ${getSteeringOption(wheel).name}, detail`;
    const centre = steeringGeometry[state.vehicle];
    closeImage.style.left = `${(-(centre.cx - 240) / 480) * 100}%`;
    closeImage.style.top = `${(-(centre.cy - 240) / 480) * 100}%`;
    image.addEventListener("load", () => {
      closeImage.src = image.src;
    });
    closeup.append(closeImage);
    wheelSection.append(closeup);
    const wheelChoices = el("div", "interior-options");
    for (const option of steeringOptions) {
      const choice = button(option.name, () => {
        steeringPreview = option.id;
        render();
      });
      choice.dataset.steering = option.id;
      choice.setAttribute("aria-pressed", String(wheel === option.id));
      wheelChoices.append(choice);
    }
    const wheelProduct = getSteeringOption(wheel),
      wheelOwned = wheel === "stock" || steering.owned.includes(wheel),
      wheelCharge = wheelOwned ? 0 : wheelProduct.price;
    const fitWheel = button(
      wheel === steering.fitted
        ? "Fitted ✓"
        : wheelCharge > state.balance
          ? "Not enough credits"
          : wheelCharge
            ? `Fit steering · ${money(wheelCharge)}`
            : "Fit owned steering",
      () => {
        if (!ready) return;
        const result = fitSteering(getState(), wheel);
        commit(result.state);
        status(
          `${wheelProduct.name} fitted. ${result.charged ? money(result.charged) + " used." : "No credits used."}`,
        );
      },
      "primary-button",
    );
    fitWheel.dataset.fitSteering = wheel;
    fitWheel.disabled = true;
    image.addEventListener("load", () => {
      fitWheel.disabled =
        !ready || wheel === steering.fitted || wheelCharge > state.balance;
    });
    image.addEventListener("error", () => {
      fitWheel.disabled = true;
    });
    wheelSection.append(
      wheelChoices,
      el("p", "", wheelProduct.description),
      fitWheel,
    );
    preview.append(image, notice);
    const details = el("div", "interior-details");
    details.append(
      el("h3", "", getInteriorPackage(selected).name),
      el("p", "", getInteriorPackage(selected).description),
      el(
        "p",
        "club-fineprint",
        "Left-hand-drive illustrated cabin. Interior packages are coordinated concepts; exterior paint and individual physical accessory fitment are separate.",
      ),
    );
    const actions = el("div", "club-card-actions");
    actions.append(
      fit,
      button("Restore fitted preview", () => {
        interiorPreview = cabin.fitted;
        steeringPreview = steering.fitted;
        render();
      }),
      button("Create cabin show card", async () => {
        const request = startPhotoRequest();
        status("Preparing your fitted cabin card…");
        try {
          const result = await createInteriorCard({
            vehicle: state.vehicle,
            name: getVehicle(state.vehicle).shortName + " / my cabin",
            interior: cabin.fitted,
            steering: steering.fitted,
          });
          if (request !== getPhotoRequest() || !dialog.open) return;
          const img = el("img", "club-show-card");
          img.src = result;
          img.alt = `${getVehicle(state.vehicle).name} fitted cabin show card`;
          content.replaceChildren(
            img,
            button(
              "Download cabin image",
              () => download(result, `${state.vehicle}-sundae-cabin.png`),
              "primary-button",
            ),
            button("Back to interior", () => render()),
          );
          status(
            "This card shows your fitted cabin, including when a different package was being previewed.",
          );
        } catch (e) {
          status(e.message);
        }
      }),
    );
    content.append(preview);
    if (interiorSection === "cabin") content.append(controls, details, actions);
    else {
      fit.remove();
      content.append(wheelSection, actions);
    }
  }

  return {
    render: renderInterior,
    reset() {
      interiorPreview = null;
      steeringPreview = null;
      interiorSection = "cabin";
    },
  };
}
