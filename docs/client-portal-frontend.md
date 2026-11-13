# Client portal frontend

The portal carries the homepage's dark navy canvas, fine grid, rounded panels
and offset drawing frames into the workspaces. Theme colours are defined in the
[application theme](application-theme.md). Portal layout styles live in
`frontend/src/assets/clientportal/css/styles.css`.

`--portal-page-background` provides the continuous 72px grid and blue glow;
`--portal-grid` and `--portal-frame` control decorative line contrast. Main panels
use a 16px radius inside authenticated workspaces, with larger corners on sign-in
panels. Applications fill the viewport without an enclosing card. Konnect uses
the same canvas through its own `konnect.css` stylesheet.

Keep grid illustrations in the sign-in introduction and selected
application cards. Form fields, invoice tables and mailbox messages use solid
surfaces for readability. Decorative pseudo-elements sit behind content and
ignore pointer input; the print stylesheet removes the canvas for invoices.
Application colours distinguish billing/analytics (blue), projects (violet)
and Konnect (green), alongside visible names and icons.

## Pages and components

- `frontend/src/apps/client-portal/pages` contains sign-in, applications, account,
  administrator and client views. The billing entry point selects the appropriate
  administrator or client view.
- `PortalLayout` provides navigation, the page heading and a keyboard skip link.
- `frontend/src/components/AppTopbar.jsx` provides the shared 60px desktop bar
  for the portal, Konnect, Uniform Shop and Meander Suite. Its styles live in
  `frontend/src/assets/shared/app-topbar.css`, loaded by the shared theme so they
  are included on both development and statically hosted pages. Keep navigation
  styles here instead of adding separate header designs for each application.
- `ClientList` provides a searchable desktop sidebar and a collapsible client
  picker below 980px. Selecting a client closes the mobile picker.
- `ClientHub` groups the selected client's details, invoices and notifications.
- `InvoiceForm` contains the invoice editor; `InvoiceDetail` renders its preview
  and printable document.
- `BillingNotifications` groups email controls and invoice updates in one panel.
- Account changes use the shared `/clientportal/account` page.

## Responsive behaviour

The top bar sits outside the scrollable workspace. Each app fills `100dvh`, so
long forms and dashboards scroll beneath navigation without moving the bar.
Uniform Shop section links scroll horizontally on narrow screens; changing its
section resets the workspace scroll position. Konnect retains independent message
list and reader scrolling. Print layouts remove navigation and viewport limits.

Workspace columns stack below 980px. Navigation wraps below 680px; form controls
use 16px text to avoid automatic input zoom on mobile browsers. Invoice editor rows
adapt to the space inside their form using a 600px container query. Wide invoice
tables scroll inside labelled, keyboard-accessible regions and expand for print.
The mobile sign-in page places the form before the introductory content.

Keep visible labels on fields, text on status badges, and focus indicators on
interactive controls. New content should wrap within its panel; do not hide page
overflow to conceal layout problems. Use the existing spacing, colour and radius
variables before adding another visual treatment.

## Checking changes

Run `npm run dev` and review the portal at 320px, 390px, 768px, 1024px and 1440px,
plus a short landscape viewport. Check that the shared bar stays visible and the
last controls in each workspace remain reachable by scrolling.
Include expanded payment/client settings, invoice line items and hours, long
business names, empty lists, loading failures, keyboard navigation and printing.
Check save feedback with mock data or a designated development account. Run
`npm run build` before deployment. Keep installed dependencies and local dev
servers available when cleaning up temporary verification files.
