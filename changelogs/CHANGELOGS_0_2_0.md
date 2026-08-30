# city-jump 0.2.0

Static-site release baseline, prepared on 2026-08-30.

## App identity

- Added a city-jump app icon, favicon PNGs, Apple touch icon, and web manifest.
- Added the README icon header matching the MeshAnvil presentation pattern.
- Refreshed project description and repository topics around road-graph city building.

## City systems

- Added authored zoning: a brush paints land low or dense, the zone constrains which parcel
  footprints a block may use, and zones persist in the save (`SAVE_VERSION` 6).
- Added street identity: segments that continue each other share a street id and name, buildings
  get numbered addresses along their frontage, and the detail panel opens on roads, buildings,
  cars, trees and roundabouts.
- Added three camera target policies -- free, orbit and follow -- with any pan or arrow key
  handing control back to free.
- Added static share links: a city gzips into a URL fragment and imports back with no server,
  guarded by a fragment size cap and a decompression cap.
- Added a building manifest as the single source of a model's roof geometry, replacing the
  facts that were previously written twice in TypeScript and Python.
- Added richer generated building facade assets and reflective window materials.
- Added roundabout traffic spacing so cars queue around a ring instead of colliding while
  crossing the transfer path.
- Refreshed README screenshots from the saved Demo city at 20:30 across Select, Roads,
  and Traffic views.

## Performance and reliability

- Rebuilds are now bounded to the region an edit touched: the heightmap, ground, road meshes and
  traffic all accept a dirty box instead of rebuilding the whole world on every road placed.
- Building models load after startup rather than blocking it, and only the glTF 2 loader ships.
- Traffic lane queues persist across frames instead of being rebuilt and re-sorted every frame.
- A failed city load now changes nothing: the save is replayed into throwaway state first, and
  only applied once that succeeded.
- The autosave reports a refused write instead of failing silently when browser storage is full
  or disabled.

## Static release

- Documented the static-site build contract in `docs/static-site-blueprint.md`.
- Added `npm run release:static` as the hook-ready command that validates and builds the
  deployable `dist/` folder.
