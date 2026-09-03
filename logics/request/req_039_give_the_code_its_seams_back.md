## req_039_give_the_code_its_seams_back - Give the code its seams back
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The highest-churn file in the repo is a 1200-line function with no test, and the terrain coupling is invisible to every architecture rule that exists.
- Keywords: startApp split, traffic seam, terrain global, drawTool controller, dispose contract, save migration hook, linter coverage
- Use when: reconsidering a module boundary, after reqs 035 to 038 are done.
- Skip when: any of reqs 035 to 038 is still open: app.ts carries 143 commits and refactoring it early turns their fixes into conflicts. Do not skip the traffic split for want of a decision -- adr_006 settled it conditionally.

# Needs
- The file that changes most often is not the one nobody can test.
- A dependency that no test can see is either injected or asserted against.
- A save format has somewhere to put a migration.
- The conventions the code already follows are written down.

# Context
- This request is deliberately last and deliberately Low priority. Refactoring src/app/app.ts before req_035 through req_038 land would turn every one of their fixes into a merge conflict: app.ts has 143 commits, the most in the repo. Do not start this chain until A, B, C and D are done.
- src/app/app.ts is one function. startApp spans :56 to past :970 with about 60 closures over 40 mutable locals. It is simultaneously the largest file, the highest-churn file and one of the few with no test -- that combination, not its size alone, is the structural risk.
- A missing module leaves fingerprints. The same 200-character parcelsForDemand(...).filter(...) expression appears at src/app/app.ts:140 and again at :213.
- src/app/app.ts:1152 monkey-patches window.cityjump with a second Object.assign after installDebugApi has already run at :1108. Passing the extra surface in is strictly simpler.
- The seam in src/render/traffic.ts is already proven: the eight pure functions exported and unit-tested at :155-259 are the evidence that the driving logic wants to live in sim. :268-853 is a vehicle catalogue and mesh assembly with no knowledge of driving; :855-1568 is graph and geometry logic that touches Babylon only to write mesh.position.
- src/sim/terrain.ts:11 is a module-level mutable global read implicitly by graph.addNode, buildSamples, rules.resolveSnap and slots.cellsForBlock, and by four render modules through terrainHeight. tests/architecture.mjs enforces import direction only, so this state coupling passes underneath it. If setTerrain is ever missed the whole city renders at sea level, silently. The cheap half of the fix -- an assertion that only app/ may call it -- is three lines and stops the spread today.
- src/render/drawTool.ts is an application controller living in render/: it mutates the graph at :516, :523 and :537, spends money at :566 and drives the undo history at :491. req_035 item_106 touches exactly those lines, so this must follow it.
- src/sim/save.ts:170 accepts v from 1 to 13 and unconditionally stamps SAVE_VERSION on the way out, with no migration hook. Every field added since v1 must stay independently optional for ever, and there is nowhere to put a transform; zones.ts:159 is the only migration and it is ad hoc.
- Zones.toJSON writes back key x KEY_STEP, so the first save of a freshly painted city moves each lot's recorded centre by up to 2 m. save.test.ts:61 passes because it re-quantises to the same key, not because nothing was lost.
- tests/building-assets.mjs:46 uses deepEqual, so it actively forbids a manifest entry for tower.glb, block.glb, house.glb and shop.glb. Declaring a roof for a tower would break the test, and those four ship unvalidated.
- No renderer returns a dispose. About 18 listeners and observers are never removed and roughly 50 prototype meshes and materials are never disposed. Latent in a single page, but it is what makes the app untestable in-process and what will leak a whole scene at the first reset or Vite HMR.
- lint is an alias for typecheck, and tsconfig.json:11 includes only src. scripts/interact.mjs is 2121 lines -- the e2e suite -- with no static analysis of any kind.
- 42 ponytail: comments mark deliberate simplifications with their revision condition. It is a good practice and it is documented nowhere: not CONTRIBUTING.md, not README.md, not docs/.

# Acceptance criteria
- AC1: No module in src/ exceeds roughly 700 lines without a recorded reason.
- AC2: The driving logic is testable without a browser.
- AC3: Only the app layer installs the terrain, and a test enforces it.
- AC4: Road drawing no longer mutates simulation state from the render layer.
- AC5: Each renderer can be disposed, and a scene reset leaks nothing.
- AC6: The save format has a migration hook, and the zone quantisation loss is either removed or recorded.
- AC7: A manifest entry for a hand-authored model does not break the asset test.
- AC8: lint means lint, over src, scripts and tests.
- AC9: The ponytail convention is documented where a contributor will meet it.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)

# References
- src/app/app.ts
- src/render/traffic.ts
- src/render/buildings.ts
- src/render/roadMesh.ts
- src/render/drawTool.ts
- src/sim/terrain.ts
- src/sim/save.ts
- src/sim/transfers.ts
- tests/architecture.mjs
- tests/building-assets.mjs
- tsconfig.json
- CONTRIBUTING.md

# Backlog
- `item_124_take_the_isolated_pieces_out_of_startapp`
- `item_125_move_the_driving_logic_where_a_test_can_reach_it`
- `item_126_make_the_terrain_dependency_visible`
- `item_127_move_road_drawing_into_the_layer_that_owns_the_city`
- `item_128_give_every_renderer_a_dispose`
- `item_129_give_the_save_format_somewhere_to_migrate`
- `item_130_make_lint_mean_lint_and_cover_the_scripts`
- `item_131_write_down_the_conventions_the_code_already_follows`
