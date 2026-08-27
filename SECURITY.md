# Security Policy

## Supported Versions

Security fixes target the current development line.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| < 0.1 | No |

## Reporting

Do not publish suspected vulnerabilities in a public issue. Contact the maintainer
privately through the repository host and include the affected version, browser and OS,
reproduction steps, expected impact, and the smallest safe proof of concept.

Do not include credentials, private data, or unrelated local files in a report.

## Current Security Model

`city-jump` is currently a static client application served by Vite during development.
It has no backend, account system, persistence, telemetry, multiplayer, or remote asset
upload. The browser receives no secrets.

The main current surfaces are:

- dependencies installed from npm and GLB assets loaded from `public/`;
- the local Vite development server, which should remain bound to a trusted machine;
- the `window.cityjump` debug API used by local browser tests;
- future file import or save features, which must validate untrusted input before use.

Do not expose the development server to an untrusted network. The debug API is not an
authorization boundary and must not be shipped as a privileged remote control surface.
Any backend, cloud save, mod support, multiplayer, or user-generated asset work requires
a new threat-model review before release.
