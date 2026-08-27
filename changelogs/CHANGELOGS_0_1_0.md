# city-jump 0.1.0

Initial pre-alpha development baseline, prepared on 2026-08-27.

## Road construction

- Straight and quadratic Bezier road drawing with grid, node, and segment snapping.
- Existing-node highlighting and deterministic junction creation.
- Minimum length and maximum grade validation with visible refusal feedback.

## Buildable land

- Non-overlapping 8 m plot cells extending up to five columns from each road.
- Spatial bucketing and polygon collision checks to prevent duplicate land allocation.
- Curve-aware grouping that recovers useful plot depth on road interiors.

## Environment and validation

- Terrain-following reference grid, rolling and rugged terrain presets, and a 24-hour
  daylight control.
- Headless simulation tests plus Playwright interaction, rendering, and performance
  checks.
- Repository documentation, modularity boundaries, CI, and a Logics product corpus.
