# city-jump 0.5.0

Prepared on 2026-09-05. This release turns the 0.4.0 run into a clearer city-building loop:
waves come from every edge, the player can choose the population bar, zoning has a fill tool, and
the terrain/road surface is less willing to fight the camera.

## Run and waves

- The kaiju can land from every coast edge, instead of always reading from the same approach.
- The next-wave population bar is configurable per run, and the UI records the rule with the save.
- Call wave, evacuation, defeat, and fresh-island transitions are covered by the browser run.
- A levelled city ends the run cleanly.
- Debug-forced waves now advance through the same small-step path as live waves.

## Zoning

- The Zones toolbar separates zone kind from tool choice.
- Fill is the default zoning tool. One click fills a contiguous run of lots; Brush remains available
  for radius painting.
- The zone brush opens at its minimum radius and keeps its size control with the zone tools.

## Terrain and roads

- Roads, sidewalks, roundabouts and surface patches now have a small visual thickness.
- Road carving includes the full paved footprint, so terrain no longer pokes through sidewalks.
- Road beds keep priority over building pads, which stops parcel terraces from bleeding back onto
  the road edge.
- Daytime shadows are stronger.

## Save and reload

- City saves now carry the visible day as well as the hour and simulation elapsed time.
- Autosave records clock progress periodically while the simulation runs, so reload resumes the
  current day and hour instead of returning to the start.
- Rubble records its creation time and clears itself after 24 hours of simulation if rebuilding did
  not already remove it.
- The save format is now version 14 and still reads older city files.

## Interface and controls

- The full-page focus outline no longer appears around the game canvas during mouse play.
- Zoning and road interaction checks now use the same scene-safe pointer path as the game.

## Release and verification

- The shared-link startup race is fixed: an incoming city link owns startup instead of being
  overwritten by the starter island.
- Release metadata, pushed commits, GitHub CI and Render deployment are tracked through the Logics
  release contract.
