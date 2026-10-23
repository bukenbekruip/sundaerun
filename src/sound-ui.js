import { element as el } from "./ui/dom.js";
import "./sound.css";
import { getVehicle } from "./catalogue.js";
import { getPerformancePart } from "./club.js";

export function mountSoundControls(parent, engine, { compact = false } = {}) {
  const panel = el(
    "section",
    `engine-panel${compact ? " engine-compact" : ""}`,
  );
  panel.setAttribute("aria-label", "Engine sound controls");
  const heading = el("div", "engine-heading"),
    title = el("h3", "", "Hear your build"),
    name = el("p", "engine-character");
  heading.append(title, name);
  const notice = el(
    "p",
    "engine-note",
    "Sample-assisted engine concepts with per-car firing patterns. These are not authenticated recordings of the real models. Intake and exhaust change the tone; tunes change rev response.",
  );
  const status = el("p", "engine-status");
  status.setAttribute("role", "status");
  const spec = el("p", "engine-spec");
  const actions = el("div", "engine-actions");
  const start = el("button", "primary-button", "Start engine");
  start.type = "button";
  start.dataset.engineToggle = "";
  const rev = el("button", "secondary-button engine-rev", "Hold to rev");
  rev.type = "button";
  rev.dataset.engineRev = "";
  rev.setAttribute("aria-pressed", "false");
  const cancel = el("button", "secondary-button", "End preview");
  cancel.type = "button";
  cancel.dataset.engineCancel = "";
  cancel.hidden = true;
  const rpm = el("output", "engine-rpm", "Engine off");
  rpm.setAttribute("aria-label", "Engine RPM");
  actions.append(start, rev, cancel, rpm);
  const sliders = el("div", "engine-sliders");
  function slider(label, data, initial, action) {
    const wrap = el("label", "engine-slider"),
      text = el("span", "", label),
      input = el("input"),
      value = el("span", "engine-slider-value");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = initial;
    input.setAttribute("aria-label", label);
    input.dataset[data] = "";
    input.addEventListener("input", () => action(input.value));
    wrap.append(text, input, value);
    sliders.append(wrap);
    return { input, value };
  }
  const throttle = slider("Throttle", "engineThrottle", "0", (value) =>
    engine.setThrottle(value),
  );
  const volume = slider("Volume", "engineVolume", "25", (value) =>
    engine.setVolume(value),
  );
  const release = () => engine.rev(false);
  start.addEventListener("click", () => {
    if (engine.snapshot().running || engine.snapshot().pending) engine.stop();
    else {
      engine.cancelPreview();
      engine.start();
    }
  });
  rev.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || rev.disabled) return;
    rev.setPointerCapture(event.pointerId);
    engine.rev(true);
  });
  for (const type of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "blur",
  ])
    rev.addEventListener(type, release);
  rev.addEventListener("keydown", (event) => {
    if ([" ", "Enter"].includes(event.key)) {
      event.preventDefault();
      if (!event.repeat) engine.rev(true);
    }
  });
  rev.addEventListener("keyup", (event) => {
    if ([" ", "Enter"].includes(event.key)) {
      event.preventDefault();
      release();
    }
  });
  cancel.addEventListener("click", () => engine.cancelPreview());
  panel.append(heading, actions, sliders, status, spec, notice);
  parent.append(panel);
  let lastStatus = "";
  const unsubscribe = engine.subscribe((s) => {
    name.textContent = `${getVehicle(s.character.vehicle).name} · ${s.character.profile.name}`;
    spec.textContent =
      (s.preview ? "Preview recipe: " : "Fitted recipe: ") +
      Object.entries(s.character.spec)
        .map(([kind, id]) => getPerformancePart(kind, id).name)
        .join(" · ");
    start.textContent = s.pending
      ? "Cancel start"
      : s.running
        ? "Stop engine"
        : "Start engine";
    start.disabled = !s.supported;
    start.setAttribute("aria-pressed", String(s.running));
    rev.disabled = !s.running || Boolean(s.preview);
    rev.setAttribute("aria-pressed", String(s.held));
    throttle.input.disabled = !s.running || Boolean(s.preview);
    if (Number(throttle.input.value) !== s.throttle)
      throttle.input.value = s.throttle;
    throttle.value.textContent = `${s.throttle}%`;
    volume.input.value = s.volume;
    volume.value.textContent = `${s.volume}%`;
    rpm.textContent = s.running
      ? `${s.rpm.toLocaleString("en-US")} RPM`
      : "Engine off";
    panel.dataset.engineVehicle = s.character.vehicle;
    panel.dataset.engineKey = s.character.key;
    panel.dataset.engineRunning = String(s.running);
    cancel.hidden = !s.preview;
    const message =
      s.error ||
      (!s.supported
        ? "Engine audio is unavailable in this browser. Try a current Chrome, Edge, Firefox or Safari."
        : s.preview
          ? `Free sound preview · ${s.preview}. Not fitted. Returning to your fitted sound after the rev.`
          : s.running
            ? "Playing your fitted build. Sound stops when this page is hidden."
            : "Sound is off. Use Start engine or Listen on a performance part.");
    if (message !== lastStatus) {
      status.textContent = message;
      lastStatus = message;
    }
  });
  return () => {
    unsubscribe();
    release();
  };
}
