import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let vite;
let pageCases;

before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  const [sales, pos, receipts, stock, access, account] = await Promise.all([
    vite.ssrLoadModule("/src/apps/hfss-uniforms/pages/SalesPage.jsx"),
    vite.ssrLoadModule("/src/apps/hfss-uniforms/pages/PosPage.jsx"),
    vite.ssrLoadModule("/src/apps/hfss-uniforms/pages/ReceiptsPage.jsx"),
    vite.ssrLoadModule("/src/apps/hfss-uniforms/pages/StockPage.jsx"),
    vite.ssrLoadModule("/src/apps/hfss-uniforms/pages/AccessPage.jsx"),
    vite.ssrLoadModule("/src/apps/hfss-uniforms/pages/AccountPage.jsx"),
  ]);

  const user = {
    username: "render-test",
    role: "admin",
    mustChangePassword: false,
  };
  pageCases = [
    ["Sales Records", sales.SalesPage, {}],
    ["Point of Sale", pos.PosPage, {}],
    ["Receipts", receipts.ReceiptsPage, {}],
    ["Stock Manager", stock.StockPage, { user }],
    ["Access Management", access.AccessPage, {}],
    ["My Account", account.AccountPage, { user, onUserUpdated() {} }],
  ];
});

after(async () => {
  await vite.close();
});

test("every non-dashboard HFSS page renders before its API response", () => {
  for (const [heading, Page, props] of pageCases) {
    assert.doesNotThrow(() => {
      const document = renderToStaticMarkup(createElement(Page, props));
      assert.match(document, new RegExp(heading));
    }, heading);
  }
});
