# city-jump 0.5.2

Prepared on 2026-09-07. A release about what the project shows and what it checks: a varied
skyline, roads and zoning that stay above the ground they sit on, a save that no longer refuses
itself over a missing field, and a front page that describes the game that actually ships.

Balance is unchanged from 0.5.1. The scenario suite reports the same outcome: 31 waves fought,
31 held, none outside the 13-85s / 4-21 salvo band, 5 of 6 runs reaching wave 6.

## A city that looks like a city

Sixty-eight authored urban models, chosen by zone, footprint and a stable function of where the
parcel sits, so the same plot always gets the same building and a district stops repeating one
silhouette. Twelve of them are towers — `_tower`, `_tower_steps`, `_tower_offset` per footprint —
covering residential 3x3 and 4x4 and commercial 3x4 and 4x3. Any parcel with a pedestrian cell on
its frontage still takes the low variant, so a footpath never ends up under a tower.

Military bases, missiles, trees and the kaiju are modelled rather than blocked out.

## Roads and zoning stay clear of the ground

Height claims protected the vertices a road stood on but not the outside vertices of the 8 m
terrain triangle around it, so pavement and zone cells sank into slopes after construction.
Zoning is now draped over the final terrain rather than a height cached before the earthworks,
the pavement extrusion is gone, and roundabout approaches join with continuous asphalt and rounded
sidewalks instead of meeting at a seam.

## A save that stops refusing itself

`parseCity` rejected an entire city when its run block omitted `ended`, while every other optional
field in the same parser defaulted on absence and the wave clock immediately below it already
tolerated an absent `active`. No save this build writes was affected — a run always records the
field — but a hand-edited save, a shortened fixture or any future writer that omits a null lost
the whole city with nothing said about why. An absent end reason now means the run never ended.

## The Demo is a city that has been played

The bundled `Demo` was a version-4 save from before zoning: 68 roads, no zoned lots and no
buildings at all, on a build whose save version is 14. The first city a visitor loaded could not
show demand, the economy, the workforce or a wave — none of which existed when it was exported.

It is now a played city: 131 roads, 8,318 zoned lots, 1,275 buildings, 13,336 residents, day 41,
seventeen waves in. It carries the camera it was exported with, which is the framing the README
captures are taken on.

## A front page that checks out

Every claim the README makes about the game was checked against the code. Six did not survive:

- Demand, an economy and progression were listed as *not there yet*, while the loop diagram lower
  down the same page described all three and the code ships them. The step it named as next —
  whether a plot fills at all — is what the demand rules already decide. What is actually missing
  is **services** and **redevelopment of a built plot**, and that is what it says now.
- Zoning was described as painting *low* or *dense*. Those survive only as values an old save may
  carry; zoning is by kind, and there are five.
- Five of the eight road types were listed, and the bulldozer none.
- Two of the five ways to view a city were listed.
- Power and water appeared nowhere in the feature list.
- A frame rate on a named laptop was quoted. Every one of the 41 runs in `perf/history.jsonl` was
  taken on a software rasteriser, so nothing in the repository supports a device frame rate. The
  city size the record does hold is quoted instead, and the absence is stated rather than filled.

The three captures now come from the bundled Demo on the framing its save carries, and are the
three views the page itself describes: everything, the zoning over the grid of lots, and the
traffic lanes with the buildings out of the way. `npm run readme-shots` retakes them and refuses
to shoot on a drifted camera, a drifted hour, an unloaded model or empty roads.

## Gates that produce what they check

- `npm run csp:sync` writes the two Content-Security-Policy digests in `render.yaml` from the
  inline blocks of `index.html`, using the same extraction the architecture test hashes. The test
  already refused a stale header; nothing produced the correct value.
- Coverage of `src/sim/` is measured and gated at just under what it reaches — 96.9% of lines —
  scoped to the simulation, where an executed line means a rule was exercised.
- `src/app/app.ts` has a line ceiling that can only be lowered. City loading left it for
  `src/app/cityLoad.ts` with a test for the order it depends on and the four rules it defaults.
- The driving rules are filed with the layer that owns them: sixteen cases moved from a test that
  booted a Babylon engine it never used into `src/sim/traffic.test.ts`. The step clamp and the
  steering rate, previously asserted nowhere, are held where they run.
- Dependabot proposes the weekly minor and patch updates and moves the SHA-pinned workflow
  actions, which nothing advanced before. Majors stay a deliberate change.

## Housekeeping

- `docs/media/README.md` indexes all 35 delivery captures with the commit and wave that produced
  each, so the fourteen that no document links to are recorded rather than mistaken for litter.
- `CONTRIBUTING.md` says where a delivery screenshot goes, at what width, and what happens to it
  when its wave closes.
- Three stale scratch copies of live modules and three regenerable screenshots are gone, and the
  one script that a leading dot had hidden from the linter is now linted.
