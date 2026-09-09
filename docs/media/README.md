# Delivery evidence captures

Every screenshot this repository keeps, what it was taken for, and the wave it belongs to.

A capture here is **evidence**, not decoration: it is what a delivery wave produced to show a
rendering or controls change actually landed, as `CONTRIBUTING.md` asks for. Once its wave closed
nothing linked to it again, so this index is the link -- without it an unreferenced file looks
like litter to the next person to audit the directory, and gets deleted along with the proof.

The directory holds 33 files, 21.4 MB. It grows once per delivery wave, which makes it the
largest single driver of repository weight. Read `CONTRIBUTING.md` before adding to it.

The weight is not oversized images: every capture here is between 390 px and 1440 px wide,
measured, which is right for content displayed at 800-900 px and for the four deliberate mobile
captures at 390 px. It is PNG encoding of dense 3D renders, which is inherent to what they show.
So there is nothing to win by shrinking what is already here -- and rewriting these files could
not shrink the repository anyway, only add a second copy of each to history. What caps the weight
is the rule in `CONTRIBUTING.md` about the next one.

## Shown in the documents

Displayed by `README.md` or a document under `docs/`. Changing or removing one of these changes
what a visitor sees.

| Image | Added | Wave it evidenced | Size |
|---|---|---|---|
| [`vehicles-emergency.png`](vehicles-emergency.png) | 2026-09-09 | Rare fire engines and police cars with animated blue lightbars; see `docs/vehicles.md` | 900 px wide |
| [`vehicles-fleet.png`](vehicles-fleet.png) | 2026-09-09 | Replace all ten traffic silhouettes with Kenney-derived and project GLBs; see `docs/vehicles.md` | 900 px wide |
| [`pedestrians-catalogue.png`](pedestrians-catalogue.png) | 2026-09-09 | Six articulated profiles and four palettes; see [pedestrian models](../pedestrians.md) | 900 px wide |
| [`buildings-facades.png`](buildings-facades.png) | 2026-09-09 | Distinguish residential and commercial facades; see [asset convention](../assets.md) | 900 px wide |
| [`buildings-farm-3x4.png`](buildings-farm-3x4.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 167 KB |
| [`buildings-farm-4x4.png`](buildings-farm-4x4.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 154 KB |
| [`buildings-industrial-1x1-a.png`](buildings-industrial-1x1-a.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 132 KB |
| [`buildings-industrial-1x1-b.png`](buildings-industrial-1x1-b.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 137 KB |
| [`buildings-industrial-1x1-c.png`](buildings-industrial-1x1-c.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 133 KB |
| [`buildings-industrial-4x4.png`](buildings-industrial-4x4.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 161 KB |
| [`buildings-lot-2x2.png`](buildings-lot-2x2.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 150 KB |
| [`buildings-residential-twins.png`](buildings-residential-twins.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 227 KB |
| [`buildings-towers-distant.png`](buildings-towers-distant.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 1799 KB |
| [`buildings-towers-district.png`](buildings-towers-district.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 1984 KB |
| [`buildings-towers-mobile.png`](buildings-towers-mobile.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 496 KB |
| [`buildings-urban-distant.png`](buildings-urban-distant.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 1795 KB |
| [`buildings-urban-district.png`](buildings-urban-district.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 1973 KB |
| [`buildings-urban-mobile.png`](buildings-urban-mobile.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 490 KB |
| [`city-jump-curves.png`](city-jump-curves.png) | `272f1e0` 2026-08-27 | Add curved-road README capture; now the Zones view, name kept | 1016 KB |
| [`city-jump-traffic.png`](city-jump-traffic.png) | `101eea3` 2026-08-29 | Refresh README screenshots | 848 KB |
| [`city-jump.png`](city-jump.png) | `d0b1c4f` 2026-08-27 | Establish repository documentation | 1105 KB |
| [`kaiju-refined-profile.png`](kaiju-refined-profile.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 281 KB |
| [`terrain-clearance-day.png`](terrain-clearance-day.png) | `a4c1d2d` 2026-09-07 | Fix terrain clearance and smooth roundabout road connections | 1311 KB |
| [`terrain-clearance-night.png`](terrain-clearance-night.png) | `a4c1d2d` 2026-09-07 | Fix terrain clearance and smooth roundabout road connections | 1200 KB |
| [`terrain-clearance-zones.png`](terrain-clearance-zones.png) | `a4c1d2d` 2026-09-07 | Fix terrain clearance and smooth roundabout road connections | 1139 KB |

## Kept as evidence only

Referenced by no document in the repository. Some are cited from published GitHub release notes,
which is a reference this repository cannot see -- **do not delete one because nothing here links
to it.** They are retained deliberately, and this table is why.

| Image | Added | Wave it evidenced | Size |
|---|---|---|---|
| [`building-window-check.png`](building-window-check.png) | `5a06e37` 2026-08-30 | Remove duplicate building window panes | 97 KB |
| [`buildings-commercial_3x4_tower_steps.png`](buildings-commercial_3x4_tower_steps.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 170 KB |
| [`buildings-commercial_4x3_tower_offset.png`](buildings-commercial_4x3_tower_offset.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 156 KB |
| [`buildings-residential_3x3_tower_steps.png`](buildings-residential_3x3_tower_steps.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 184 KB |
| [`buildings-residential_4x4_tower_offset.png`](buildings-residential_4x4_tower_offset.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 180 KB |
| [`city-jump-rugged.png`](city-jump-rugged.png) | `1871f1c` 2026-08-28 | Add road styling and test traffic | 468 KB |
| [`kaiju-refined-mobile.png`](kaiju-refined-mobile.png) | `1c4c485` 2026-09-07 | Diversify city buildings and towers and refine the kaiju model | 104 KB |
| [`kaiju.png`](kaiju.png) | `6509b38` 2026-09-06 | feat: replace kaiju placeholder with detailed articulated model | 1568 KB |
| [`military.png`](military.png) | `bf663ed` 2026-09-06 | feat: detail military bases, missiles and tree models | 1736 KB |
| [`missile.png`](missile.png) | `bf663ed` 2026-09-06 | feat: detail military bases, missiles and tree models | 39 KB |
| [`roundabout-junctions-day.png`](roundabout-junctions-day.png) | `a4c1d2d` 2026-09-07 | Fix terrain clearance and smooth roundabout road connections | 506 KB |
| [`trees-ingame.png`](trees-ingame.png) | `bf663ed` 2026-09-06 | feat: detail military bases, missiles and tree models | 481 KB |
| [`trees-mobile.png`](trees-mobile.png) | `bf663ed` 2026-09-06 | feat: detail military bases, missiles and tree models | 27 KB |
| [`trees.png`](trees.png) | `bf663ed` 2026-09-06 | feat: detail military bases, missiles and tree models | 112 KB |
