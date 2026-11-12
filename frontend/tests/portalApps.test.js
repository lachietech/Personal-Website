import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  portalDestination,
  portalApps,
} from "../src/apps/client-portal/utils/appRoutes.js";
let vite, MailboxView, ApplicationsPage, BillingNotifications;
before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ MailboxView } = await vite.ssrLoadModule(
    "/src/apps/konnect-mailbox/MailboxView.jsx",
  ));
  ({ ApplicationsPage } = await vite.ssrLoadModule(
    "/src/apps/client-portal/pages/ApplicationsPage.jsx",
  ));
  ({ BillingNotifications } = await vite.ssrLoadModule(
    "/src/apps/client-portal/components/BillingNotifications.jsx",
  ));
});
after(async () => {
  await vite?.close();
});
test("application launcher uses three distinct destinations and safe login redirects", () => {
  const html = renderToStaticMarkup(
    createElement(ApplicationsPage, { user: { username: "admin" } }),
  );
  for (const app of portalApps) {
    assert.ok(html.includes(`href="${app.href}"`));
    assert.equal(portalDestination(app.href), app.href);
  }
  assert.equal(portalDestination("https://evil.example"), "/clientportal");
  assert.equal(portalDestination("//evil.example"), "/clientportal");
});
test("mailbox renders received messages as text with no compose or reply controls", () => {
  const message = {
    id: "message",
    sender: { name: "Alex Morgan", email: "alex@example.com" },
    subject: "Website enquiry",
    body: '<img src=x onerror="alert(1)">\nHello',
    preview: "Hello",
    source: { name: "Client website" },
    createdAt: "2026-11-12T01:00:00.000Z",
    read: true,
    starred: false,
    archived: false,
  };
  const html = renderToStaticMarkup(
    createElement(MailboxView, {
      user: { username: "admin", role: "admin" },
      folder: "inbox",
      search: "",
      result: { messages: [message], total: 1, pageSize: 25, counts: {} },
      selectedId: message.id,
      message,
      page: 1,
    }),
  );
  assert.match(html, /Website enquiry/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|mailto:|>Reply<|>Compose<|Contact forms/);
  assert.match(html, /Mark unread/);
  assert.match(html, /Archive/);
});
test("billing retains account and invoice email actions", () => {
  const html = renderToStaticMarkup(
    createElement(BillingNotifications, {
      client: {
        id: "client",
        business: "Client",
        email: "client@example.com",
        invoices: [],
      },
      isAdmin: true,
    }),
  );
  assert.match(html, /Send account email/);
  assert.match(html, /Send invoice/);
  assert.match(html, /Send reminder/);
  assert.match(html, /Send receipt/);
});
