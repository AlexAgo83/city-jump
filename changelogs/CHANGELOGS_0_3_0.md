# city-jump 0.3.0

Prepared on 2026-08-31. Ninety-two commits since 0.2.0, in three strands: what a city is made of,
what it looks like, and what it costs to draw.

## City systems

- Zones name a business rather than a density: a brush paints **residential** or **commercial**,
  and the military brush is gone -- barracks come from a military road, the way industry always
  came from an industrial one. Older saves migrate on load (`low` -> residential, `dense` ->
  commercial, military paint dropped).
- Unzoned street frontage is a mixed neighbourhood: mostly homes, a shop every few lots, chosen
  from the cell's own position so it survives a rebuild.
- Added **dirt** and **military** roads, and a building kind for each frontage: a dirt road grows
  farms, an industrial road works, a military road a compound.
- Roads of every kind are named for what they are -- a Way, a Trail, a Range -- and building
  addresses follow.
- Twelve new building models beside the sixteen lots: for each deep lot size a farm, an industrial
  works and a military compound, one layout per size. Farms come as a market garden, a grain
  field, an orchard and a livestock holding; works as a tank farm, a boiler house and stack, a
  warehouse with pipework; compounds as a motor pool, a hangar, ammunition silos in revetments.
- Six new vehicles: tractor and farm trailer, tanker and flatbed, APC and troop truck, each with
  its own parts and paint. A road with a business of its own mostly carries that business's
  vehicles -- but never only them.
- The city HUD carries a population count under the compass and a needs panel that stays visible
  with the settings folded away.
- Selecting a car now says what kind of vehicle it is, not just which street it is on.
- Pavement clutter around a building is halved: it read as a junk shop up close.

## Look

- One colour per business -- green residential, blue commercial, yellow industrial, orange
  agricultural, purple military -- shared by the zone overlay, the buildable grid and the
  buildings themselves.
- Added the **Look** settings: Smooth (FXAA over 4x multisampling), Glow (bloom, which follows the
  clock rather than a second switch), Depth (SSAO) and Miniature (a tilt-shift focused on whatever
  the camera is pointed at). Tone mapping, contrast and a vignette are always on.
- The engine renders at the device pixel ratio, capped at 1.5x.

## Saves

- **Export** writes the city to a `.json` file and **Import** reads one back: a share link carries
  the whole city in a URL fragment, which browsers and chat apps cut off well before a big city
  fits.

## Performance

Measured, not assumed: `npm run perf` records a city's frame rates and mesh counts to
`perf/history.jsonl`, `npm run ablate` switches one part of the scene off at a time, and
[`docs/performance.md`](../docs/performance.md) keeps the findings -- including the changes that
were tried and reverted.

- Crossings, footways and kerbs are drawn once each rather than per stripe and per side, and a
  junction is paved in one mesh. 1216 -> 841 active meshes.
- Two shadow cascades at 2048 instead of four at 1024, and the shadow map is drawn once and kept:
  nothing that casts a shadow moves on its own, so it is redrawn only when the camera, the sun or
  the city changes. With the camera still that is 2 renders in 457 frames.
- Detail stops being drawn as the camera pulls out -- street furniture and car parts beyond 420 m,
  roof clutter beyond 700, people beyond 900 -- and above 1100 m the whole city is drawn as boxes
  in the colours its models would have been.
- A frame cap in the settings (30 / **60** / 120 / Max), because the game was already running flat
  out at the display's own ceiling; an unfocused window drops to 10 fps on its own.
- The swell is recomputed at 30 Hz rather than every frame.

## Fixes

- A car entering a roundabout no longer jumps backwards: a transfer path now starts where the
  mover actually is. On a short road between two roundabouts the trim is deeper than the road, so
  a car ended it past the junction's edge and was thrown back onto it -- as were pedestrians onto
  their crossings.
- A transfer's distances are built from the path it actually drives; mismatched, they indexed past
  the end of the points and threw out of the render loop, which stopped the picture dead.
- `convertToFlatShadedMesh` quietly dropped all but the first few submeshes of a multi-material
  model -- a farm lost its walls, silo and crop rows to it.
- The FPS counter counts frames over the window it displays instead of smoothing each frame's own
  rate, which read a few frames high whenever frame times were uneven.
- The buildable grid is coloured by what stands on it, through the emissive term: an unlit
  material leaves the diffuse term at zero, so vertex colours rendered black.
