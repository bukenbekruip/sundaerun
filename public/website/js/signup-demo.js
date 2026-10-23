/** A local demonstration: never submits or stores personal data. */
export function mountSignupDemo(root = document) {
  const form = root.querySelector("#signup-demo");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    root.querySelector("#signup-status").textContent =
      "Demo confirmed! The live list has not launched, so nothing was submitted.";
    form.reset();
  });
  const submit = form.querySelector("button");
  submit.type = "submit";
  submit.disabled = false;
}
