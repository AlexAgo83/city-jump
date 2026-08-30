## item_032_fail_the_build_when_the_generator_and_the_renderer_disagree - Fail the build when the generator and the renderer disagree
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Nothing compares what the Python generator and the TypeScript renderer believe about a building; the only current signal is a misplaced roof object in a screenshot.
- Keywords: fail, build, generator, renderer, disagree
- Use when: Adding the drift check to the fast gate, or deciding what ground truth it compares against.
- Skip when: The work needs Blender in CI, or is a performance or coverage gate of any other kind.

# Problem
- Nothing checks that the Python generator and the TypeScript renderer describe the same building; the only signal today is a misplaced roof object in a screenshot.
- The generator runs on a developer's machine in Blender, so it cannot be re-run in CI to compare outputs directly.

# Scope
- In:
  - Add a check that compares what the renderer believes about each shipped model against the model itself -- the mesh's own extents are the ground truth that neither side authored.
  - Run it in the existing fast gate, not only in the browser suite, so drift is caught on every push.
  - Make the failure message name the model and the disagreeing quantity.
- Out:
  - Running Blender in CI.
  - A performance threshold or any other kind of gate.

# Acceptance criteria
- AC1: A deliberate edit to either side's geometry numbers makes the check fail, verified by making it fail before restoring the correct value.
- AC2: The check runs in the fast gate and names the model and the quantity that disagreed.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A deliberate edit to either side's geometry numbers makes the check fail, verified by making it fail before restoring the correct value.
- request-AC6 -> This backlog slice. Proof: AC2: The check runs in the fast gate and names the model and the quantity that disagreed.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_006_one_source_of_truth_for_what_a_building_model_is`
- Architecture decision(s): (none yet)
- Request: `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
- Primary task(s): `task_011_implement_one_source_of_truth_for_building_model_geometry`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
