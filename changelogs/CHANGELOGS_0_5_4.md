# city-jump 0.5.4

Prepared on 2026-09-08. This release reorganizes the game controls and gives the kaiju
distinct movement and combat animations.

## Controls and city statistics

- Actions, Settings, Stats and Kaiju use matching collapsible panels; opening one closes
  the others. The Actions button displays the selected tool's icon.
- Stats groups its ledger into City, Resources and Economy tabs, including unfilled jobs
  and the housing gap. Opening or switching tabs refreshes the figures even while paused.
- The Kaiju panel gathers the wave number, science, Call wave, Evacuate and wave messages.
- Select, Roads and Zones use regular button grids and clearer option groups. Settings
  sections have icon labels, and the panels fit smaller windows.
- The compass is compact and centered at the top. The optional FPS display is plain text
  at the top-right corner.

## Kaiju movement and missile impacts

- The kaiju runs at twice its walking speed during its approach and slows to a walk
  within 160 m of a living building.
- Attacks animate the arms, head and jaw over the attack duration. At rest, the feet
  stay still while the upper body and tail move gently. Pausing freezes the animation.
- Missiles target different points on the model's surface. Each target follows the
  kaiju's position, heading and animated body part; the explosion occurs at that point.

## Included since the last published release

Version 0.5.3 was prepared but not published. Its changes are included here: automatic
building detail at distant camera heights, the Extra AA setting, cached workforce
allocations and improvements to the performance measurement tools. The detailed
measurements and decisions are in [the 0.5.3 changelog](CHANGELOGS_0_5_3.md).

## Validation

The release is gated by `npm run ci`, `npm run test:e2e` and GitHub Actions CI on the
tagged commit. Publication and production deployment evidence is recorded in
`logics/release/evidence.jsonl`.
