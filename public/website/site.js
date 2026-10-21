(() => {
  const menu = document.querySelector(".menu-button");
  const nav = document.querySelector(".nav");
  if (menu && nav) {
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
      menu.textContent = open ? "✕" : "☰";
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
        menu.textContent = "☰";
      }),
    );
  }
  const form = document.getElementById("signup-demo");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = document.getElementById("signup-status");
      status.textContent =
        "Demo confirmed! The live list has not launched, so nothing was submitted.";
      form.reset();
    });
  }
})();
