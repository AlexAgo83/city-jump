## item_126_make_the_terrain_dependency_visible - Make the terrain dependency visible
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Import-direction rules cannot see state coupling, which is why this survived. The three-line architecture assertion lands first because it stops the spread today, before the injection work starts.
- Keywords: setTerrain, module global, architecture assertion, heightmap injection, sea level failure
- Use when: touching terrain access from any layer, or adding an architecture rule.
- Skip when: a DI framework, or changing terrain sampling or the heightmap itself.

# Problem
- src/sim/terrain.ts:11 is a mutable module global read implicitly by graph.addNode, buildSamples, rules.resolveSnap and slots.cellsForBlock, and by src/render/traffic.ts:1452, roadMesh.ts:1049, buildings.ts:317 and drawTool.ts:234 through terrainHeight.
- tests/architecture.mjs enforces import direction only, so this state coupling passes underneath it.
- Two cities cannot coexist, every test must remember setTerrain(flatTerrain) by hand, playRun mutates it as a side effect at src/sim/playthrough.ts:98, and a missed setTerrain renders the whole city at sea level with no signal.

# Scope
- In:
  - First, the cheap half: an assertion in tests/architecture.mjs that only app/ calls setTerrain. Three lines, and it stops the spread immediately.
  - Then inject the heightmap the way createGround(scene, heightmap) already does, one consumer at a time.
  - An ADR recording the decision, since this is exactly the kind of coupling LOGICS.md says needs one.
- Out:
  - A dependency-injection framework.
  - Changing terrain sampling or the heightmap itself.

# Acceptance criteria
- AC1: A call to setTerrain outside app/ fails the architecture test.
- AC2: Terrain reaches its consumers as a parameter, not a global.
- AC3: Two cities can exist in one process.
- AC4: No test needs to remember to install a terrain.
- AC5: An ADR records the decision.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A call to setTerrain outside app/ fails the architecture test.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
