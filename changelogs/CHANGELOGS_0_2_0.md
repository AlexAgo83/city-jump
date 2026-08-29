# city-jump 0.2.0

Static-site release baseline, prepared on 2026-08-30.

## App identity

- Added a city-jump app icon, favicon PNGs, Apple touch icon, and web manifest.
- Added the README icon header matching the MeshAnvil presentation pattern.
- Refreshed project description and repository topics around road-graph city building.

## City systems

- Added richer generated building facade assets and reflective window materials.
- Added roundabout traffic spacing so cars queue around a ring instead of colliding while
  crossing the transfer path.
- Refreshed README screenshots from the saved Demo city at 20:30 across Select, Roads,
  and Traffic views.

## Static release

- Documented the static-site build contract in `docs/static-site-blueprint.md`.
- Added `npm run release:static` as the hook-ready command that validates and builds the
  deployable `dist/` folder.
