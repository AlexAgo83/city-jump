<img src="docs/img/icon.png" alt="city-jump icon" width="64" align="left" />

# city-jump

<br clear="left"/>

![Version](https://img.shields.io/badge/version-0.2.0-4C8BF5)
![License](https://img.shields.io/badge/license-MIT-2E8B57)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Babylon.js](https://img.shields.io/badge/Babylon.js-9-BB464B)

[Live demo](https://city-jump.onrender.com/)

`city-jump` is a browser-based 3D city builder. Draw roads, roundabouts, paths, and
tunnels across terrain; buildable plots, buildings, junctions, traffic, and shaped
ground are derived from that road network.

![The saved Demo city in Select mode, framed on a roundabout](docs/media/city-jump.png)

![The saved Demo city in Roads mode, framed on the same roundabout](docs/media/city-jump-curves.png)

![The saved Demo city in Traffic view, framed on the same roundabout](docs/media/city-jump-traffic.png)

## Product Loop

1. Shape a road network with straight, curved, and roundabout tools.
2. Read the buildable grid generated along each road.
3. Let buildings occupy valid, non-overlapping plots.
4. Inspect zones, traffic, terrain, saves, and daylight from the same city.

The current prototype focuses on road construction, spatial legibility, terrain shaping,
traffic, persistence, pedestrian paths, roundabouts, and tunnel rendering. Services,
economy, progression, zoning demand, and bridges are not implemented.

## Current State

- Roads snap to the 2 m world grid, existing nodes, and existing segments.
- Hovered snap nodes are highlighted before placement.
- Roads can be straight, curved, one-way, two-lane, highway, pedestrian, or tunnel.
- Roundabouts sit on existing junction nodes, carry lane overlays, and survive saves.
- Buildable plots extend up to five 8 m cells perpendicular to a road and never overlap.
- Curved roads regroup nearby cells into usable blocks where geometry permits.
- Select mode switches between all buildings, zone/buildable-grid reading, and traffic overlays.
- Rolling and rugged terrain presets exercise road shaping and ground conformance.
- Tunnels pass under surface roads and render portals without growing buildings or traffic.
- Named saves and autosave persist the graph, plantings, terrain, camera, and sun state.
- New browsers get a bundled `Demo` save in the load menu by default.
- A 24-hour sun control changes light direction, intensity, ambient light, and sky.
- A browser debug surface drives deterministic visual and interaction checks.

## Architecture

```mermaid
flowchart LR
    UI[UI and pointer input] --> APP[Application composition]
    APP --> SIM[Pure road simulation]
    APP --> RENDER[Babylon rendering]
    SIM --> GRAPH[(Road graph)]
    GRAPH --> RENDER
    RENDER --> VIEW[Terrain, roads, plots, buildings]
```

The road graph is the source of truth. Babylon meshes are derived views and are rebuilt
after an edit. Simulation modules contain no Babylon or DOM imports, so geometry and
rules run headless in Vitest.

| Path | Responsibility |
| --- | --- |
| `src/app/` | Composition and rebuild lifecycle. |
| `src/ui/` | Toolbar, HUD, and browser feedback. |
| `src/sim/` | Deterministic graph, road rules, terrain, and plot generation. |
| `src/render/` | Babylon scene, meshes, picking, and visual debug API. |
| `scripts/` | Browser interaction and visual checks. |
| `logics/` | Product, roadmap, decisions, specifications, and delivery corpus. |

## Quick Start

Requires Node.js 22.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. **Straight** roads take two clicks; **Curve** roads take
start, bend, and end; **Roundabout** toggles an existing junction. Right-click or `Esc`
cancels.

## Validation

```bash
npm run typecheck
npm test
npm run test:architecture
npm run build
npm run test:e2e
npm run test:visual
npm run logics:validate
npm run ci
```

`ci` is the fast push gate. `test:e2e` and `test:visual` start or reuse the local Vite
server. GitHub Actions runs the browser interaction suite in the separate
`Browser Interaction` workflow, manually with `workflow_dispatch` or on its weekly
schedule. On 2026-08-29,
`node scripts/with-dev-server.mjs scripts/shot.mjs /tmp/city-jump-city.png city` rendered
237 roads, 126 junctions, 1,688 buildings, 237 cars, and 474 pedestrians at 50 fps on an
Apple M3 Pro using ANGLE Metal.

## Static Release

`npm run release:static` validates the project and writes the static app to `dist/`.
The output is plain files from Vite: `index.html`, hashed assets, the app icons, the
manifest, and the building GLBs copied from `public/`. Tag releases as `v0.2.0` for this
baseline.

## Assets

Building GLBs live under `public/buildings/` and render as thin instances. Their
authoring contract is documented in [`docs/assets.md`](docs/assets.md).

## Project Documents

- [`CONTRIBUTING.md`](CONTRIBUTING.md) describes collaboration and validation.
- [`SECURITY.md`](SECURITY.md) describes the current local-client threat model.
- [`changelogs/`](changelogs/README.md) contains versioned release notes.
- [`LOGICS.md`](LOGICS.md) explains the repository-local product corpus.

Licensed under the [MIT License](LICENSE).
