export function mountNavigation(root = document) {
  const menu = root.querySelector(".menu-button");
  const nav = root.querySelector(".nav");
  if (!menu || !nav) return;
  function setOpen(open) {
    nav.classList.toggle("open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    menu.textContent = open ? "✕" : "☰";
  }
  menu.addEventListener("click", () =>
    setOpen(!nav.classList.contains("open")),
  );
  nav
    .querySelectorAll("a")
    .forEach((a) => a.addEventListener("click", () => setOpen(false)));
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      setOpen(false);
      menu.focus();
    }
  });
  root.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !menu.contains(event.target))
      setOpen(false);
  });
  matchMedia("(max-width: 920px)").addEventListener("change", () =>
    setOpen(false),
  );
  setOpen(false);
}
