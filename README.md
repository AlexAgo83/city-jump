# city-jump

A 3D city builder in the Cities:Skylines lineage: you draw curved roads, and the city
grows along them.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # headless simulation tests, no browser
npm run lint     # typecheck
```

## Drawing

Three clicks: **start**, **bend**, **end**. Right-click or `Esc` cancels. Roads snap to
existing nodes and split existing segments, which is the only way a junction is ever
created — you never place one. A road under 8 m long or steeper than 10% is refused with
its reason, and never enters the network.

## How it is put together

The **road graph** is the only state. Nodes and quadratic Bezier segments, each segment
carrying a cumulative-distance table so `position at d metres` is a lookup rather than a
guess. Every mesh — road surface, junctions, buildings, the ground itself — is derived
from the graph and regenerated after each edit; nothing is edited in place.

- `src/sim/` — the simulation. No Babylon import anywhere in it, so it tests headless.
  - `graph.ts` — nodes, segments, arc length, split
  - `rules.ts` — the four snapping rules and draw-time validation
  - `junction.ts` — trimming the incident roads back and closing the gap
  - `slots.ts` — building plots derived from segments
  - `heightmap.ts` — the ground, and cutting the roads into it
  - `terrain.ts` — the one function every elevation in the game comes through
- `src/render/` — Babylon. Meshes, the pointer, the camera.

## Buildings

Models are GLB, loaded from `public/buildings/` and drawn as thin instances — one matrix
per building against a shared mesh. The placeholder library is generated headless in
Blender:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py
```

Anything authoring models has to obey [`docs/assets.md`](docs/assets.md).

## Checking the rendering

The visual behaviour and the frame rate are checked by driving the running app in a real
browser rather than asserted in prose:

```bash
npm run dev
node scripts/shot.mjs http://localhost:5173 city.png city
```

Last measured: **1422 buildings over 237 roads and 126 junctions at the 120 fps
requestAnimationFrame cap**, 374 active meshes, headless Chromium on an Apple M3 Pro
(ANGLE Metal). The buildings account for four of those draw calls.

## Not built yet

Traffic, vehicles and lane directions; bridges and tunnels; zoning and growth rules;
undo/redo; saving a city. The graph accommodates all of them unchanged — bridges need one
`elevated` flag on a segment to suppress terrain flattening.
