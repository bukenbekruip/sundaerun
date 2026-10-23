import { button, money, filename, download } from "./ui/controls.js";
import { createInteriorPanel } from "./ui/interior-panel.js";
import { element as el } from "./ui/dom.js";
import "./club.css";
import { mountSoundControls } from "./sound-ui.js";
import { getProduct, getVehicle, selectionKinds } from "./catalogue.js";
import { getQuote, selectPreview, selectVehicle } from "./state.js";
import {
  challengesFor,
  claimChallenge,
  clubProgress,
  decodeBuild,
  deleteShowBuild,
  eligibleChallenges,
  encodeBuild,
  fitPerformance,
  getPerformancePart,
  MAX_SAVED_BUILDS,
  normaliseClub,
  performanceParts,
  performanceRatings,
  saveShowBuild,
  SHOPPING_REGIONS,
} from "./club.js";
import { createShowCard } from "./photography.js";
import { getInteriorPackage, getSteeringOption } from "./interiors.js";

export function mountClub({ getState, setState, notify, sceneReady, engine }) {
  const dialog = document.querySelector("#club-dialog"),
    content = document.querySelector("#club-content");
  let tab = "builds",
    photoRequest = 0,
    deleted = null,
    imported = null;
  let disposeSoundControls = () => {};
  const photoCache = new Map();
  const status = (text) => {
    document.querySelector("#club-status").textContent = text;
  };
  const commit = (state) => {
    setState(state);
    render();
  };

  const interiorPanel = createInteriorPanel({
    getState,
    commit,
    status,
    content,
    dialog,
    render,
    getPhotoRequest: () => photoRequest,
    startPhotoRequest: () => ++photoRequest,
  });

  function summary() {
    const s = getState(),
      p = clubProgress(s.club),
      car = getVehicle(s.vehicle);
    document.querySelector("#club-car-name").textContent = car.name;
    document.querySelector("#club-title").textContent = {
      interior: "Interior",
      performance: "Performance",
      sound: "Engine sound",
      builds: "My builds",
      briefs: "Build briefs",
      import: "Import a build",
    }[tab];
    document.querySelector("#club-wallet").textContent = money(s.balance);
    document.querySelector("#club-progress").textContent =
      `Level ${p.level} · ${p.completed} briefs completed · ${p.buildCount}/${MAX_SAVED_BUILDS} builds`;
    for (const b of dialog.querySelectorAll("[data-club-tab]"))
      b.setAttribute("aria-pressed", String(b.dataset.clubTab === tab));
  }

  function renderBuilds() {
    const s = getState(),
      club = normaliseClub(s.club);
    const intro = el("div", "club-intro");
    intro.append(
      el("h3", "", "Your cars. Your stories."),
      el(
        "p",
        "",
        "Save the fitted build, complete a brief, then share a show card or build code. Your collection stays in this browser.",
      ),
    );
    content.append(intro);
    const form = el("form", "club-save-form"),
      label = el("label", "", "Name your fitted build");
    const input = el("input");
    input.id = "club-build-name";
    input.name = "build-name";
    input.maxLength = 48;
    input.required = true;
    input.placeholder = "Sunday morning special";
    label.htmlFor = input.id;
    const submit = el("button", "primary-button", "Save build");
    submit.type = "submit";
    const fitted = getQuote({ ...s, preview: s.applied }).total === 0;
    submit.disabled = !fitted || !sceneReady();
    form.append(label, input, submit);
    if (!fitted)
      form.append(
        el(
          "p",
          "club-form-note",
          "Apply your exterior parts in the garage before saving your first build.",
        ),
      );
    else if (selectionKinds.some((k) => s.preview[k] !== s.applied[k]))
      form.append(
        el(
          "p",
          "club-form-note",
          "You have an exterior preview open. Save uses your last fitted build.",
        ),
      );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const result = saveShowBuild(getState(), input.value);
      if (["saved", "updated"].includes(result.status)) {
        commit(result.state);
        status(
          result.status === "saved"
            ? "Build saved. Open Build briefs to collect any earned rewards."
            : "That build is already in your collection. Its name has been updated.",
        );
      } else
        status(
          result.status === "garage-full"
            ? "Your collection is full. Remove a build to make room."
            : "Fit your exterior parts and enter a build name first.",
        );
    });
    content.append(form);
    if (!club.builds.length) {
      const empty = el("div", "club-empty");
      empty.append(
        el("span", "club-empty-mark", "01"),
        el("h3", "", "Your first build starts here."),
        el(
          "p",
          "",
          "Fit your favourite parts in the garage, then give the build a name. The Make it yours brief earns 1,500 credits.",
        ),
      );
      content.append(empty);
    }
    const grid = el("div", "club-build-grid");
    for (const build of [...club.builds].reverse()) {
      const card = el("article", "club-build-card");
      card.dataset.build = build.id;
      card.append(
        el("span", "eyebrow", getVehicle(build.vehicle).name),
        el("h3", "", build.name),
        el(
          "p",
          "club-build-parts",
          `${getProduct("paint", build.selection.paint).name} · ${getProduct("wheel", build.selection.wheel).name}`,
        ),
      );
      const badges = el("div", "club-build-badges");
      const eligible = eligibleChallenges(s, build.id);
      badges.append(
        el(
          "span",
          "",
          eligible.length
            ? `${eligible.length} reward${eligible.length === 1 ? "" : "s"} ready`
            : "Saved build",
        ),
      );
      card.append(badges);
      const actions = el("div", "club-card-actions");
      actions.append(
        button("Create show card", () => showPhoto(build)),
        button("Share build code", () => share(build)),
        button("Preview exterior", () => previewBuild(build)),
        button(
          "Remove",
          () => {
            if (deleted !== build.id) {
              deleted = build.id;
              render();
              status(
                "Choose Confirm removal on that build. Earned rewards are kept.",
              );
            } else {
              deleted = null;
              commit(deleteShowBuild(getState(), build.id));
              status(
                "Build removed. Your fitted car and earned rewards are kept.",
              );
            }
          },
          "club-text-button",
        ),
      );
      if (deleted === build.id) {
        actions.lastChild.textContent = "Confirm removal";
        actions.append(
          button("Keep build", () => {
            deleted = null;
            render();
          }),
        );
      }
      card.append(actions);
      grid.append(card);
    }
    content.append(grid);
  }

  function renderChallenges() {
    const s = getState(),
      club = normaliseClub(s.club),
      builds = club.builds.filter((b) => b.vehicle === s.vehicle);
    content.append(
      el(
        "div",
        "club-intro",
        "Complete a brief with a saved, fitted build. Each reward can be collected once per car. Previewing or sharing alone does not earn credits.",
      ),
    );
    const grid = el("div", "club-challenge-grid");
    for (const brief of challengesFor(s.vehicle)) {
      const done = club.completed.includes(brief.key),
        matching = builds.find((b) => brief.matches(b));
      const card = el("article", `club-challenge${done ? " completed" : ""}`);
      card.dataset.challenge = brief.key;
      card.append(
        el(
          "span",
          "eyebrow",
          done ? "COMPLETED ✓" : `${money(brief.reward)} + ${brief.xp} XP`,
        ),
        el("h3", "", brief.title),
        el("p", "", brief.description),
      );
      const claim = button(
        done
          ? "Reward collected"
          : matching
            ? `Enter “${matching.name}” · collect reward`
            : "Save a matching build to enter",
        () => {
          if (!matching) return;
          const result = claimChallenge(getState(), brief.key, matching.id);
          if (result.status === "claimed") {
            commit(result.state);
            status(
              `Brief completed! ${money(result.awarded)} added to your balance.`,
            );
            notify(`Build brief complete · +${money(result.awarded)}`);
          }
        },
        "primary-button",
      );
      claim.disabled = done || !matching;
      card.append(claim);
      grid.append(card);
    }
    content.append(grid);
  }

  function renderPerformance() {
    const s = getState(),
      car = normaliseClub(s.club).performance[s.vehicle];
    content.append(
      el(
        "div",
        "club-intro",
        "Small changes, personal character. Fit a filter, exhaust or tune using game credits. These selections count toward your saved build and build briefs.",
      ),
    );
    const soundDetails = el("details", "performance-sound-details");
    soundDetails.append(
      el("summary", "", "Engine controls · Start, rev & volume"),
    );
    content.append(soundDetails);
    disposeSoundControls = mountSoundControls(soundDetails, engine, {
      compact: true,
    });
    const ratings = el("div", "club-ratings");
    for (const [name, value] of Object.entries(
      performanceRatings(car.fitted),
    )) {
      const rating = el("div");
      rating.append(el("span", "", name), el("strong", "", `${value}/100`));
      const meter = el("meter");
      meter.min = 0;
      meter.max = 100;
      meter.value = value;
      meter.setAttribute("aria-label", `${name} game rating`);
      rating.append(meter);
      ratings.append(rating);
    }
    content.append(
      ratings,
      el(
        "p",
        "club-fineprint",
        "Game ratings are fictional, not measured gains or installation advice. Listen is a free synthesised preview; only Fit uses credits.",
      ),
    );
    const grid = el("div", "club-performance-grid");
    for (const [kind, parts] of Object.entries(performanceParts)) {
      const family = el("section", "club-performance-family");
      family.append(
        el(
          "h3",
          "",
          {
            filter: "Air filter & intake",
            exhaust: "Exhaust",
            tune: "Engine calibration",
          }[kind],
        ),
      );
      for (const part of parts) {
        const fitted = car.fitted[kind] === part.id,
          owned = part.price === 0 || car.owned.includes(`${kind}:${part.id}`),
          price = owned ? 0 : part.price;
        const card = el("article", "club-performance-part");
        card.append(
          el("strong", "", part.name),
          el(
            "small",
            "",
            `${owned ? "Included / owned" : money(price)} · Response +${part.response} · Sound +${part.sound} · Power +${part.power}`,
          ),
        );
        const fit = button(
          fitted
            ? "Fitted ✓"
            : price > s.balance
              ? "Not enough credits"
              : price
                ? `Fit · ${money(price)}`
                : "Fit owned part",
          () => {
            const result = fitPerformance(getState(), kind, part.id);
            commit(result.state);
            status(
              result.status === "insufficient-funds"
                ? "Complete a build brief to earn more credits."
                : `${part.name} fitted. ${result.charged ? money(result.charged) + " used." : "No credits used."} Save your updated build to enter a brief.`,
            );
          },
        );
        fit.dataset.performanceKind = kind;
        fit.dataset.performancePart = part.id;
        fit.disabled = fitted || price > s.balance;
        const listen = button("Listen · free", () => {
          soundDetails.open = true;
          engine.previewPart(kind, part.id);
          soundDetails.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
        listen.dataset.listenKind = kind;
        listen.dataset.listenPart = part.id;
        const actions = el("div", "club-card-actions");
        actions.append(fit, listen);
        card.append(actions);
        family.append(card);
      }
      grid.append(family);
    }
    content.append(grid);
  }

  function previewBuild(build) {
    let next = selectVehicle(getState(), build.vehicle);
    next = selectPreview(next, build.selection);
    setState(next);
    dialog.close();
    notify(
      "Exterior preview loaded. Apply to fit it. Performance parts are listed in the build code.",
    );
  }

  async function showPhoto(build) {
    const request = ++photoRequest;
    content.replaceChildren(el("p", "club-empty", "Preparing your show card…"));
    status("");
    try {
      let url = photoCache.get(build.id + encodeBuild(build));
      if (!url) {
        url = await createShowCard(build);
        photoCache.set(build.id + encodeBuild(build), url);
        while (photoCache.size > 3)
          photoCache.delete(photoCache.keys().next().value);
      }
      if (request !== photoRequest || !dialog.open) return;
      const image = el("img", "club-show-card");
      image.src = url;
      image.alt = `${build.name}: ${getVehicle(build.vehicle).name} Sundae Run show card`;
      const actions = el("div", "club-card-actions");
      actions.append(
        button(
          "Download image",
          () => download(url, `${filename(build.name)}.png`),
          "primary-button",
        ),
        button("Copy build code", () => share(build)),
        button("Back to my builds", () => {
          tab = "builds";
          render();
        }),
      );
      content.replaceChildren(image, actions);
      status(
        "Your photo uses this saved build. It does not change the car you are currently customising.",
      );
    } catch (e) {
      if (request === photoRequest) {
        render();
        status(e.message);
      }
    }
  }

  function share(build) {
    ++photoRequest;
    const code = encodeBuild(build),
      box = el("textarea", "club-share-code");
    box.value = code;
    box.readOnly = true;
    box.rows = 5;
    box.setAttribute("aria-label", "Shareable build code");
    const actions = el("div", "club-card-actions");
    actions.append(
      button(
        "Copy code",
        async () => {
          try {
            await navigator.clipboard.writeText(code);
            status(
              "Build code copied. A friend can paste it in Import a build.",
            );
          } catch {
            box.focus();
            box.select();
            status(
              "Select and copy the code above. Clipboard access is unavailable in this browser.",
            );
          }
        },
        "primary-button",
      ),
      button("Download build file", () => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify({ ...build, id: undefined }, null, 2)], {
            type: "application/json",
          }),
        );
        download(url, `${filename(build.name)}.json`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
      button("Back to my builds", () => {
        tab = "builds";
        render();
      }),
    );
    content.replaceChildren(
      el("h3", "", `Share “${build.name}”`),
      el(
        "p",
        "club-intro",
        "Send this code to a friend. It shares the car and selected parts, not your credits or purchases.",
      ),
      box,
      actions,
    );
    box.focus();
    box.select();
    status("");
  }

  function renderImport() {
    content.append(
      el("h3", "", "Bring a friend's build into your garage"),
      el(
        "p",
        "club-intro",
        "Paste an SR1 build code or choose a Sundae Run build JSON file. Importing is a free exterior preview. It does not grant parts, credits or completed briefs.",
      ),
    );
    const form = el("form", "club-import-form"),
      box = el("textarea", "club-share-code");
    box.rows = 5;
    box.required = true;
    box.maxLength = 16000;
    box.id = "club-import-code";
    box.placeholder = "SR1.…";
    box.setAttribute("aria-label", "Build code to import");
    const submit = el("button", "primary-button", "Read build code");
    submit.type = "submit";
    form.append(box, submit);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        inspectImport(decodeBuild(box.value));
      } catch (e) {
        status(e.message);
      }
    });
    const label = el("label", "club-file-label", "Or choose a build file "),
      file = el("input");
    file.type = "file";
    file.accept = ".json,application/json";
    file.setAttribute("aria-label", "Choose a build JSON file");
    file.addEventListener("change", async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        if (f.size > 16000)
          throw new Error("Build files must be smaller than 16 KB.");
        const value = JSON.parse(await f.text());
        // Use the same strict validator as a pasted code; no file content executes.
        inspectImport(decodeBuild(encodeBuild(value)));
      } catch {
        status("That file is not a supported Sundae Run build.");
      }
    });
    label.append(file);
    content.append(form, label);
  }

  function inspectImport(build) {
    imported = build;
    const parts = el("ul", "club-import-parts");
    for (const [kind, id] of Object.entries(build.selection))
      parts.append(el("li", "", getProduct(kind, id).name));
    for (const [kind, id] of Object.entries(build.spec))
      parts.append(el("li", "", getPerformancePart(kind, id).name));
    parts.append(
      el("li", "", getInteriorPackage(build.interior ?? "stock").name),
      el("li", "", getSteeringOption(build.steering ?? "stock").name),
    );
    content.replaceChildren(
      el("span", "eyebrow", getVehicle(build.vehicle).name),
      el("h3", "", build.name),
      parts,
      el(
        "p",
        "club-intro",
        "Exterior parts will be previewed for free. Fit them using your own garage credits. Performance, cabin and steering choices are listed as a build recipe; fit those separately in their sections.",
      ),
      button(
        "Preview this exterior",
        () => previewBuild(imported),
        "primary-button",
      ),
      button("Read another code", () => {
        imported = null;
        render();
      }),
    );
    status("");
  }

  function render() {
    disposeSoundControls();
    disposeSoundControls = () => {};
    ++photoRequest;
    summary();
    content.replaceChildren();
    if (tab === "builds") renderBuilds();
    else if (tab === "briefs") renderChallenges();
    else if (tab === "performance") renderPerformance();
    else if (tab === "interior") interiorPanel.render();
    else if (tab === "sound")
      disposeSoundControls = mountSoundControls(content, engine);
    else renderImport();
  }
  for (const b of dialog.querySelectorAll("[data-club-tab]"))
    b.addEventListener("click", () => {
      engine.cancelPreview();
      tab = b.dataset.clubTab;
      deleted = null;
      interiorPanel.reset();
      status("");
      render();
      dialog.scrollTop = 0;
    });
  const region = document.querySelector("#club-shopping-region");
  for (const [value, name] of SHOPPING_REGIONS) {
    const o = el("option", "", name);
    o.value = value;
    region.append(o);
  }
  region.addEventListener("change", () => {
    const s = getState(),
      club = normaliseClub(s.club);
    club.region = region.value;
    setState({ ...s, club });
    status(
      "Shopping preference saved. Retailer offers will appear once real products and destinations are configured.",
    );
  });
  dialog.addEventListener("close", () => {
    disposeSoundControls();
    engine.cancelPreview();
    ++photoRequest;
  });
  return {
    open(nextTab = "builds") {
      engine.cancelPreview();
      tab = nextTab;
      interiorPanel.reset();
      region.value = normaliseClub(getState().club).region;
      status("");
      render();
      dialog.showModal();
      dialog.scrollTop = 0;
    },
    refresh() {
      const p = clubProgress(getState().club),
        box = document.querySelector(".level-box");
      box.setAttribute(
        "aria-label",
        `Garage level ${p.level}, ${p.intoLevel} of ${p.nextLevel} experience points`,
      );
      box.querySelector("strong").textContent = `Lv. ${p.level}`;
      box.querySelector("small").textContent =
        `${p.intoLevel} / ${p.nextLevel} XP`;
      box.querySelector(".xp-track span").style.width =
        `${(p.intoLevel / p.nextLevel) * 100}%`;
      if (dialog.open) {
        summary();
        const saveButton = dialog.querySelector(
          '.club-save-form button[type="submit"]',
        );
        const s = getState();
        if (saveButton)
          saveButton.disabled =
            !sceneReady() || getQuote({ ...s, preview: s.applied }).total !== 0;
      }
    },
  };
}
