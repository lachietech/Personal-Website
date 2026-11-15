# Dependency security audit — 15 November 2026

Scope: root npm lockfile and both workspaces, including production, development
and transitive dependencies. npm advisory data identifies known vulnerabilities;
this is not a source-code review of every third-party package.

The initial `npm audit --json` reported four vulnerable packages: one critical
and three high severity. Compatible updates were installed without running
dependency lifecycle scripts or forcing major-version upgrades.

| Package | Before | After | Findings |
| --- | --- | --- | --- |
| mongoose | 8.24.1 | 8.24.9 | Filter sanitization bypasses, prototype and casting issues |
| multer | 2.0.2 | 2.5.0 | Upload resource exhaustion, cleanup and field parsing issues |
| body-parser | 2.3.0 | 2.4.0 | Compressed request denial of service |
| follow-redirects | 1.16.1 | 1.16.3 | Credentials forwarded across redirects |

The patched Mongoose and Multer versions are also the minimums in the backend
manifest. The root lockfile pins patched transitive dependencies; deploy with
`npm ci` to reproduce it. Both bcrypt implementations remain in use by different
API modules and were retained.

Verification: npm reports zero known vulnerabilities after the updates. The
production frontend build and seven backend/tracker/proxy tests pass, including
Sandgate multipart uploads, session/CSRF checks, analytics account isolation,
HTTP 429 enforcement across API families, and localhost forwarding.

Repeat from the repository root:

```sh
npm audit --include=dev
npm run build
node --test backend/shared/tests/*.test.js backend/senior-citz-api/tests/*.test.js backend/visitpulse-api/tests/*.test.js
```

The tests use isolated model doubles and local HTTP servers. They do not validate
live database credentials, email delivery or weather-provider credentials.

Rate-limit counters use in-memory stores and reset on process restart. Multiple
replicas require a shared store for a deployment-wide budget. Configure
`TRUST_PROXY` for the actual ingress so spoofed client addresses cannot bypass
the limits.
