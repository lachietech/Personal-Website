# Nielsen Innovations

This repository contains the Nielsen Innovations public website and its related
web applications. React owns the browser entry points, while Express provides
page routing, authentication, APIs, and static files.

## Project structure

```text
public/                 Root HTML documents and generated React bundles
src/
  apps/                 Client Portal and HFSS React applications
    client-portal/       Fully React-rendered portal pages and features
    hfss-uniforms/       HFSS React entry and compatibility components
  components/           Public website components
  hooks/                Reusable website hooks
  api/                   Public website API helpers
  content/               Static website content and configuration
  assets/                Styles, images, fonts, and HFSS compatibility scripts
  backend/
    app.js               Express middleware and route composition
    server.js            Server process entry point
    routes/              Public website routes
    clientportal/        Portal routes, models, services, and middleware
    hfssuniformsapp/     Uniform Shop routes, models, services, and middleware
  pages/                 HTML documents for remaining non-React applications
  App.jsx                Public website component tree
  main.jsx               Public website entry point
  clientPortal.jsx       Client Portal entry point
  hfssUniforms.jsx       HFSS Uniform Shop entry point
```

The Client Portal is rendered entirely by React from a root-only HTML document.
Its client, invoice, project, billing, email, security, and bookkeeping features
communicate directly with the Express JSON APIs. The authenticated HFSS dashboard
still uses a React compatibility boundary around its established POS, reporting,
stock, and access-management controllers.

## Commands

- `npm run build` builds all three React entry points into `public/static/react`.
- `npm start` starts the Express server.
- `npm run dev` builds once, then starts the server with automatic restarts.
- `npm run dev:client` watches and rebuilds React files during development.
- `npm test` checks JavaScript syntax and runs the unit tests.

For live client and server changes, run `npm run dev:client` and
`npm run dev:server` in separate terminals.

## Security configuration

Set `TRUSTED_ORIGINS` to a comma-separated list of additional HTTPS origins
that may call browser APIs. Production always trusts
`https://nielseninnovations.com` and `https://www.nielseninnovations.com`.
Cross-origin browser requests from every other origin are rejected. Localhost
origins are included only outside production.
