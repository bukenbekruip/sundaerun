import {
  loadCalendar,
  filterEvents,
  checkedLabel,
  safeLink,
} from "./events-data.js";
import { node, eventCard } from "./events-view.js";
const root = document.querySelector("[data-events-page]");
if (root) {
  const list = root.querySelector("[data-events-list]"),
    count = root.querySelector("[data-events-count]"),
    notice = root.querySelector("[data-events-notice]");
  const filters = {
    scope: "all",
    search: "",
    category: "all",
    province: "all",
    period: "90",
  };
  try {
    const calendar = await loadCalendar();
    root.querySelector("[data-events-updated]").textContent =
      calendar.refreshedAt
        ? "Last checked " + checkedLabel(calendar.refreshedAt)
        : "Calendar verification in progress";
    root.querySelector("fieldset").disabled = false;
    root.querySelectorAll("input,select").forEach((control) => {
      control.disabled = false;
    });
    let limit = 24;
    const more = root.querySelector("[data-events-more]");
    const render = () => {
      const events = filterEvents(calendar.events, filters);
      list.replaceChildren(...events.slice(0, limit).map(eventCard));
      list.setAttribute("aria-busy", "false");
      count.textContent = `Showing ${Math.min(limit, events.length)} of ${events.length} confirmed ${events.length === 1 ? "event" : "events"}.`;
      more.hidden = events.length <= limit;
      if (!events.length)
        list.append(
          node(
            "p",
            "events-empty",
            "No confirmed events match these filters. Try all provinces, another event type or a wider date range.",
          ),
        );
    };
    more.addEventListener("click", () => {
      const firstNew = limit;
      limit += 24;
      render();
      list.children[firstNew]?.querySelector("a")?.focus();
    });
    root.querySelectorAll("[data-scope]").forEach((button) =>
      button.addEventListener("click", () => {
        filters.scope = button.dataset.scope;
        limit = 24;
        root.querySelectorAll("[data-scope]").forEach((choice) => {
          const active = choice === button;
          choice.setAttribute("aria-pressed", String(active));
          choice.classList.toggle("btn-dark", active);
          choice.classList.toggle("btn-outline", !active);
        });
        const province = root.querySelector("#event-province");
        province.disabled = filters.scope === "international";
        if (province.disabled) {
          province.value = "all";
          filters.province = "all";
        }
        render();
      }),
    );
    for (const key of ["search", "category", "province", "period"])
      root
        .querySelector(`#event-${key}`)
        .addEventListener(key === "search" ? "input" : "change", (event) => {
          filters[key] = event.target.value;
          limit = 24;
          render();
        });
    const sources = root.querySelector("[data-events-sources]");
    sources.replaceChildren();
    for (const source of calendar.sources) {
      const url = safeLink(source.url);
      if (!url || typeof source.name !== "string") continue;
      const item = node("li"),
        link = node("a", "", source.name);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(
        link,
        node(
          "span",
          "",
          source.lastSuccessAt
            ? ` · last verified ${checkedLabel(source.lastSuccessAt)}`
            : " · awaiting a verified calendar",
        ),
      );
      sources.append(item);
    }
    if (
      calendar.sources.some((source) => source.status !== "ok") ||
      !calendar.refreshedAt ||
      Date.now() - Date.parse(calendar.refreshedAt) > 2 * 86400000
    ) {
      notice.hidden = false;
      notice.textContent =
        "Some calendars are awaiting a fresh check. Previously confirmed listings remain available; always confirm details with the organiser.";
    }
    render();
  } catch {
    list.setAttribute("aria-busy", "false");
    count.textContent = "The calendar is temporarily unavailable.";
    notice.hidden = false;
    notice.textContent =
      "Please try again later, or use the official calendars below to check upcoming events.";
    root.querySelector(".events-sources").open = true;
  }
}
