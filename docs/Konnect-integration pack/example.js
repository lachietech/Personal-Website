import { createKonnectClient } from "./konnect-client.js";

const konnect = createKonnectClient({
  endpoint: "https://personal-website-53mf.onrender.com/clientportal/api/konnect/contact",
  username: "nielseninnovations", // Replace with the intended active portal account.
});
const form = document.querySelector("#contact-form");
const button = form.querySelector('[type="submit"]');
const status = document.querySelector("#contact-status");
let sending = false;
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sending || !form.reportValidity()) return;
  sending = true;
  button.disabled = true;
  form.setAttribute("aria-busy", "true");
  status.textContent = "Sending...";
  const fields = new FormData(form);
  try {
    const result = await konnect.submit({
      name: fields.get("name"), email: fields.get("email"),
      subject: fields.get("subject"), message: fields.get("message"),
      website: fields.get("website") || "",
    });
    status.textContent = result.message;
    form.reset();
  } catch (error) {
    status.textContent = error.message + (error.retryAfter !== null && error.retryAfter !== undefined
      ? ` Please wait ${error.retryAfter} seconds before submitting again.` : "");
  } finally {
    sending = false;
    button.disabled = false;
    form.removeAttribute("aria-busy");
  }
});
