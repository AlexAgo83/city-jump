# Contributing

## Collaboration

- Keep changes focused and use one logical commit per delivery wave.
- Start from the road graph: simulation state belongs in `src/sim/`; Babylon views
  belong in `src/render/`; browser controls belong in `src/ui/`.
- Do not make rendered meshes a second source of truth.
- Add the narrowest test that proves changed simulation behavior.
- Use `logics-manager flow ...` for workflow lifecycle changes. Do not hand-edit
  Logics status, progress, ownership, or lineage indicators.
- Record product decisions in the relevant ADR or specification when behavior changes.

## Development

```bash
npm ci
npm run dev
```

Node.js 22 is the development baseline. Building assets requires Blender separately;
normal application development does not.

## Validation

Run the narrowest useful check while working, then the full local gate before a pull
request:

```bash
npm run ci
```

Browser checks run locally through the shared dev-server wrapper:

```bash
npm run test:e2e
npm run test:visual
```

Rendering work that is meant to be faster has to show it. `npm run perf` measures a
city and records the numbers; [`docs/performance.md`](docs/performance.md) says how to
read them and what is already known to cost:

```bash
npm run perf -- --city perf/cities/ma-ville.json --label ma-ville
```

Browser coverage is local, and deliberately so. GitHub's runners have no GPU: Chromium
falls back to a software rasteriser and the app draws about a frame a second, while
every wait in the interaction test polls once per frame. Run there, the suite stops
testing the app and starts testing the runner -- and the only way to keep it green is to
loosen the very assertions that make it worth having. Run `npm run test:e2e` before
pushing anything that touches rendering, browser controls, persistence or road drawing.

`npm run ci` is what GitHub runs: unit tests, architecture tests, the build and the
Logics gates -- everything whose answer does not depend on a frame arriving.

## Pull Requests

- Explain the behavior changed and why.
- List the validation commands that passed.
- Include a screenshot when rendering or controls change.
- State known limits and follow-up work explicitly.
- Update the versioned changelog when preparing a release.

## Conduct

Be respectful, precise, and constructive in issues, reviews, and project documents.
