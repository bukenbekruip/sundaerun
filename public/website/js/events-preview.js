import { loadCalendar, filterEvents } from "./events-data.js";
import { eventCard } from "./events-view.js";
const preview = document.querySelector("[data-events-preview-list]");
if (preview) {
  try {
    const data = await loadCalendar();
    preview.replaceChildren(
      ...filterEvents(data.events, { period: 90 }).slice(0, 3).map(eventCard),
    );
  } catch {
    /* The permanent Explore events link remains usable without the preview. */
  }
}
