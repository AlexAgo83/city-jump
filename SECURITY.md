# Security Policy

## Supported Versions

Security fixes target the current development line.

| Version | Supported |
| --- | --- |
| 0.2.x | Yes |
| < 0.2 | No |

## Reporting

Do not publish suspected vulnerabilities in a public issue. Contact the maintainer
privately through the repository host and include the affected version, browser and OS,
reproduction steps, expected impact, and the smallest safe proof of concept.

Do not include credentials, private data, or unrelated local files in a report.

## Current Security Model

`city-jump` is a static client application deployed as files on Render's static hosting.
The production site is `index.html`, hashed assets, and GLB files served from `dist`.
It has no backend, account system, server-side storage, telemetry, multiplayer, or remote
asset upload. Player cities stay in the browser's `localStorage`; the browser receives no
project secrets.

The main current surfaces are:

- dependencies installed from npm and GLB assets loaded from `public/`;
- the Render static site described by `render.yaml`;
- local browser storage, which is editable by the player and must be treated as untrusted;
- the `window.cityjump` debug API used by browser tests;
- shared city links, whose review is recorded in
  [`docs/shared-link-threat-model.md`](docs/shared-link-threat-model.md).

Do not expose the development server to an untrusted network. The debug API is not an
authorization boundary and must not become a privileged remote control surface. Any backend,
cloud save, mod support, multiplayer, or user-generated asset work requires a new
threat-model review before release.
