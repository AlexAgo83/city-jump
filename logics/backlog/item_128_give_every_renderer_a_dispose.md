## item_128_give_every_renderer_a_dispose - Give every renderer a dispose
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 15%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:03:12

# AI Context
- Summary: Latent in a single page, but it is what makes the app untestable in-process and what will leak a whole scene at the first reset or Vite HMR. glassReflectionTexture is bound to the first scene for ever.
- Keywords: dispose contract, listener removal, observer removal, prototype meshes, module-scope texture
- Use when: adding a teardown path, or trying to test a renderer in-process.
- Skip when: adding a scene-reset feature to the product, or changing what a renderer draws.

# Problem
- No renderer returns a teardown. Listeners are never removed at src/render/scene.ts:169, :172, :189, :224-226, src/render/drawTool.ts:738 and :743, src/app/app.ts:1089 and :1098, and src/ui/controls.ts:89. Observers are never removed at src/render/scene.ts:131, :229, :284, ground.ts:371, signals.ts:179, traffic.ts:1483 and drawTool.ts:710.
- Roughly 50 prototype meshes and materials at src/render/traffic.ts:513-853 and buildings.ts:614-916 are never disposed.
- glassReflectionTexture at src/render/buildings.ts:42 is a module-level singleton bound to the first scene, never disposed and never recreated, so a second scene would get a texture owned by a disposed engine.
- Latent in a single page, but it is what makes the app untestable in-process and what will leak a scene at the first reset or Vite HMR.

# Scope
- In:
  - Each create* returns an object carrying dispose; startApp composes them.
  - Move glassReflectionTexture onto the renderer closure.
  - A test that creating and disposing the scene twice leaves no listener and no undisposed material.
- Out:
  - Adding a scene-reset feature to the product.
  - Changing what any renderer draws.

# Acceptance criteria
- AC1: Every renderer exposes a dispose that removes what it added.
- AC2: A create-dispose-create cycle leaks no listener, observer, mesh or material.
- AC3: No render module holds scene-bound state at module scope.
- AC4: Behaviour is unchanged in the running app.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Every renderer exposes a dispose that removes what it added.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
