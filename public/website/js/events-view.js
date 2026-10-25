import { labels, seriesLabels, safeLink, dateLabel } from "./events-data.js";
export function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
export function eventCard(event) {
  const card = node("article", "event-card");
  card.dataset.eventId = event.id;
  const date = node("div", "event-date"),
    time = node("time", "", dateLabel(event.startDate, false));
  time.dateTime = event.startDate;
  date.append(time, node("span", "", event.startDate.slice(0, 4)));
  const content = node("div", "event-card-content");
  content.append(
    node(
      "p",
      "event-region",
      event.scope === "international"
        ? `International · ${seriesLabels[event.series] || "Major motorsport"}`
        : `South Africa${event.province ? " · " + event.province : ""}`,
    ),
  );
  content.append(node("h3", "", event.title));
  const dates =
    event.startDate === event.endDate
      ? dateLabel(event.startDate)
      : `${dateLabel(event.startDate, false)} – ${dateLabel(event.endDate)}`;
  content.append(
    node("p", "event-location", event.venue),
    node("p", "event-dates", dates),
    node("span", "event-category", labels[event.category]),
  );
  if (
    event.city &&
    !event.venue.toLowerCase().includes(event.city.toLowerCase())
  )
    content.append(node("p", "event-location", event.city));
  const source = node("p", "event-source", `Listed by ${event.sourceName}`);
  content.append(source);
  const link = node("a", "btn btn-outline", "Official event details");
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.setAttribute("viewBox", "0 0 24 24");
  arrow.setAttribute("class", "link-arrow");
  arrow.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M5 19 19 5M6 5h13v13");
  arrow.append(path);
  link.append(arrow);
  link.href = safeLink(event.url);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute(
    "aria-label",
    `Official details for ${event.title} (opens in a new tab)`,
  );
  content.append(link);
  if (Date.now() - Date.parse(event.verifiedAt) > 3 * 86400000)
    content.append(
      node(
        "p",
        "event-stale",
        "This listing needs a fresh check. Confirm with the organiser.",
      ),
    );
  card.append(date, content);
  return card;
}
