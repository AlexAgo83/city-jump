# Agent Context

This file defines the working context for agents in this repository.

## Project

`city-jump` is a 3D city-building game/simulation.

- **Engine**: Babylon.js (WebGPU-capable, thin instances, glTF loader, built-in GUI).
- **Assets**: GLB models produced by the sibling `meshanvil` pipeline (headless Blender).
- **Core**: an organic road network in the Cities:Skylines lineage — the road graph is
  the single source of truth from which zoning, buildings and later traffic all derive.

## Workflow

Use the canonical `logics-manager` CLI to create, promote, start, and finish Logics docs:

- `logics-manager flow new request --title "..."`
- `logics-manager flow promote request-to-backlog logics/request/req_NNN_*.md`
- `logics-manager flow progress task logics/tasks/task_NNN_*.md --progress <n>%`
- `logics-manager flow finish task logics/tasks/task_NNN_*.md`
- `logics-manager lint --require-status`
- `logics-manager audit --group-by-doc`

Do not edit indicator lines, owner assignments, or workflow links by hand.

When grooming or creating backlog items, set a deliberate `# Priority` tier (`High`,
`Medium`, or `Low`) with a one-line rationale instead of leaving the default unreviewed.

Operational runbooks live in `logics/runbook/`. Before repeating an investigation,
check for a matching one with `logics-manager sync search-docs --kind runbook "<symptom>"`.

When `rtk` is available, prefer it for noisy commands.
