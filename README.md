# city-jump

![Version](https://img.shields.io/badge/version-0.1.0-4C8BF5)
![License](https://img.shields.io/badge/license-MIT-2E8B57)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Babylon.js](https://img.shields.io/badge/Babylon.js-9-BB464B)

`city-jump` is a browser-based 3D city builder. Draw straight or curved roads across
terrain and the buildable plots, buildings, junctions, and shaped ground are derived
from that road network.

![A generated city following a curved road network](docs/media/city-jump.png)

## Product Loop

1. Shape a road network with straight or curved segments.
2. Read the buildable grid generated along each road.
3. Let buildings occupy valid, non-overlapping plots.
4. Inspect the result under different terrain and daylight conditions.

The current prototype focuses on road construction and spatial legibility. Traffic,
services, economy, progression, persistence, bridges, and tunnels are not implemented.

## Current State

- Roads snap to the 2 m world grid, existing nodes, and existing segments.
- Hovered snap nodes are highlighted before placement.
- Buildable plots extend up to five 8 m cells perpendicular to a road and never overlap.
- Curved roads regroup nearby cells into usable blocks where geometry permits.
- Rolling and rugged terrain presets exercise road shaping and ground conformance.
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

Open `http://localhost:5173`. Choose **Straight** for two clicks or **Curve** for three
clicks: start, bend, end. Right-click or `Esc` cancels.

## Validation

```bash
npm run typecheck
npm test
npm run test:architecture
npm run build
npm run test:e2e       # requires the dev server
npm run test:visual    # requires the dev server
npm run logics:validate
```

The largest checked scenario currently renders 237 roads, 126 junctions, and 1,422
buildings at the browser's 120 fps requestAnimationFrame cap on an Apple M3 Pro.

## Assets

Building GLBs live under `public/buildings/` and render as thin instances. Their
authoring contract is documented in [`docs/assets.md`](docs/assets.md).

## Project Documents

- [`CONTRIBUTING.md`](CONTRIBUTING.md) describes collaboration and validation.
- [`SECURITY.md`](SECURITY.md) describes the current local-client threat model.
- [`changelogs/`](changelogs/README.md) contains versioned release notes.
- [`LOGICS.md`](LOGICS.md) explains the repository-local product corpus.

Licensed under the [MIT License](LICENSE).
