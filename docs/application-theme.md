# Application theme

All frontend applications share the dark palette from the homepage hero. The
source of truth is `frontend/src/assets/shared/theme.css`, loaded before each
application's stylesheet in every HTML entry point, including error pages.

| Token                                                  | Use                                          |
| ------------------------------------------------------ | -------------------------------------------- |
| `--theme-background`                                   | Deep navy page background (`#07111f`)        |
| `--theme-panel`                                        | Cards, navigation and workspaces (`#0c1a2d`) |
| `--theme-raised`, `--theme-input`                      | Raised surfaces and input fields             |
| `--theme-text`, `--theme-muted`                        | Primary and secondary text                   |
| `--theme-line`, `--theme-line-hover`                   | Borders and hover outlines                   |
| `--theme-accent`, `--theme-accent-soft`                | Links, focus rings and selections            |
| `--theme-action`, `--theme-on-action`                  | Filled blue buttons and their labels         |
| `--theme-success`, `--theme-warning`, `--theme-danger` | Semantic status text                         |

Use the corresponding `*-soft` colours behind status text. Destructive buttons
use `--theme-danger-action`. Accent text and filled buttons have separate colours
to keep both readable. Status labels retain their text as well as colour.

Inter is the shared body font; Space Grotesk is used for headings. Both have local
system-font fallbacks. Native fields use `color-scheme: dark`, and browser chrome
uses the matching `theme-color` metadata. The Meander Suite navigation uses its
existing white logo asset.

Application styles retain their layout rules and may alias existing variables to
the shared tokens. Avoid introducing a separate light palette or hardcoded white
panel when adding a new application. Include the shared stylesheet and use these
tokens for default, selected, hover, disabled and error states.

Print media switches the shared tokens to dark text on white paper. Keep invoice
and receipt styles tied to these variables so screen themes do not consume ink
or make printed documents unreadable.

The homepage uses a single `.site-canvas` in `main/css/index.css`: its navy
background, 72px grid and broad ambient gradients continue through every section
and the footer. `--canvas-width` centers the content at 80% of the desktop width,
with smaller gutters on tablets and phones. Sections have no divider lines or
outer guide rails. `--canvas-grid` and `--canvas-surface` control the grid and
translucent panels. Keep section backgrounds transparent so the
grid never restarts. The page follows introduction, About me (including services),
included products (VisitPulse and Konnect), pricing, selected work, then contact. Navigation
links follow the order of their corresponding sections.

Three portrait-frame echoes accent the services grid, first project card and
contact form: visible 32px grids, rotated rounded outlines and a soft blue glow.
The services and contact frames extend beyond their panels; the first project
uses an arched grid within its card. These pseudo-elements ignore pointer input and stay behind
content. Keep them limited to these focal points rather than repeating on every
card; their offsets shrink on mobile.

Project and pricing cards use the shared 24px corner radius; the services group
and contact form use 34px corners. Services have individually rounded panels
with space between them. Keep the offset grid frames visible outside these
surfaces and use relaxed line spacing for headings and supporting copy.

`IncludedProducts.jsx` describes the included VisitPulse Analytics and Konnect
Mailbox access in two separate sections. Its decorative product illustrations
contain no live customer data. Both sections carry a Coming soon badge and describe
access at launch; their calls to action lead to the contact form. The contact
form carries a floating Powered by Konnect badge using the hero badge treatment,
with space reserved above its fields. Konnect copy describes incoming enquiries and
mailbox organisation, not outbound email. VisitPulse currently renders its
analytics dashboard for administrators only; client analytics access still
requires implementation separately from this homepage presentation.

Homepage service and hosting content lives in `components/content/siteContent.js`.
Hosting has two monthly packages: static websites at $40 and server-backed
websites from $60. Website creation directs visitors to request a tailored quote;
there are no fixed build prices or old assisted-hosting tiers.

Verify the homepage, authenticated workspaces, sign-in forms and error pages at
phone, tablet and desktop widths. Include open disclosures, native selects, table
scrolling, status labels and invoice print preview. Browser previews can use mock
API responses to avoid changing live data.
