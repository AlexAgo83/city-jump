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

GitHub Actions keeps browser coverage out of the push gate. Use the `Browser
Interaction` workflow's manual trigger when a pull request touches rendering, browser
controls, persistence, or road drawing; it also runs on its weekly schedule.

## Pull Requests

- Explain the behavior changed and why.
- List the validation commands that passed.
- Include a screenshot when rendering or controls change.
- State known limits and follow-up work explicitly.
- Update the versioned changelog when preparing a release.

## Conduct

Be respectful, precise, and constructive in issues, reviews, and project documents.
