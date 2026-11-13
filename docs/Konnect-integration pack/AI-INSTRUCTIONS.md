# AI integration instructions

Integrate the receiving application's contact form with Konnect using this folder's documented API.

1. Read README.md, API.md and the existing application's form, validation, framework, environment and CSP configuration.
2. Determine the recipient portal username and API endpoint from existing configuration or the owner. `nielseninnovations` is only for Nielsen Innovations; do not silently use it on another customer's website. Verify that the operator has created an active portal account. No origin registration or form key is required.
3. Copy konnect-client.js into the application's normal source folder. Configure public endpoint/username values through its environment conventions and add env examples. Do not introduce dependencies or expose portal/database secrets.
4. Bind submission to the existing contact form. Map exactly name, email, subject, message and optional empty website honeypot. Configure username/usernames in application code, not visitor-controlled form fields. If the existing form lacks a subject, provide an appropriate fixed subject.
5. Preserve accessible labels, field validation and status feedback. Guard concurrent submissions (in React use a ref or equivalent immediate guard in addition to UI state); disable the submit button while pending. Display messages using textContent or framework text nodes, never HTML injection. Retain input on errors; clear it only on confirmed 201 success.
6. Never send a contact message on page load, during render, or from an effect. Do not add automatic retry, no-cors, cookies, CSRF requests or Authorization headers to public intake. Handle 429 with Retry-After guidance. Treat timeouts/network failures as uncertain delivery.
7. Update CSP connect-src if necessary. Browser CORS is already handled by the public API. Do not weaken private portal origin or CSRF checks. Do not add recipient origin registration from the VisitPulse instructions: it does not apply here.
8. Do not build SMTP, outbound email, reply, attachment upload or a duplicate database. Konnect stores incoming enquiries for portal users. Private mailbox APIs are documented for reference and need existing portal login; a public username does not authorize reads.
9. Run the receiving application's appropriate checks and the pack's offline client tests. Only send a live test enquiry when authorized. Verify it in the recipient inbox and verify unrelated accounts cannot see it when test accounts are available. Clearly report what was and was not verified.
10. Deliver code, configuration instructions, modified-file summary and any remaining deployment/account setup steps. Do not claim live delivery based solely on an HTTP mock.
