## item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen - Take a position on the visitors arriving with a touchscreen
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:05:05

# AI Context
- Summary: The build loop needs a hover preview and a right-click to cancel, and tests `event.button === 0`; the README links a public demo that phone visitors cannot build anything in, with nothing telling them why.
- Keywords: take, position, visitors, arriving, touchscreen
- Use when: Deciding or implementing the touch position: making the build loop usable without hover and right-click, or stating the game is desktop-only where a visitor sees it.
- Skip when: The work is a responsive layout, a mobile UI, a separate build, or changes the desktop input model.

# Problem
- Drawing depends on a hover preview a finger cannot produce, cancelling depends on a right-click a touchscreen does not have, and the pointer handling tests `event.button === 0`.
- The README links a public demo, so visitors arrive on phones and get a scene they cannot build anything in, with nothing telling them why.

# Scope
- In:
  - The decision is taken: **the game is desktop-only for now**, and says so. Making the build loop touch-usable is not an adaptation but a redesign of the input model -- the hover preview *is* the snap feedback before placement, the right-click cancel has no obvious gesture equivalent, and drag is already taken by the camera orbit, so a touch drag would be ambiguous between drawing and turning. The honest alternative costs a few lines.
  - Implement it as a coarse-pointer notice: detect `matchMedia('(pointer: coarse)')` and show one line -- the build tools need a mouse because they use hover and right-click. Leave the visitor able to look at the city and move the camera; they simply learn why they cannot build.
  - Say the same thing in the README, so it is known before the demo is even opened.
  - Revisit touch support the day it becomes a goal, not as a repair. Nothing here forecloses it.
  - Leave the existing ARIA markup on the toolbar intact.
- Out:
  - A responsive layout, a mobile-specific UI, or a separate build.
  - A full accessibility audit or a conformance claim.
  - Changing the desktop input model that works today.

# Acceptance criteria
- AC1: The project has a written position on touch devices, and a visitor on one encounters it before they try to build.
- AC2: A visitor on a coarse pointer sees the notice in the app and can still look at the city and move the camera; the README states the same thing.
- AC3: The toolbar's existing roles and labels are unchanged.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The project has a written position on touch devices, and a visitor on one encounters it before they try to build.
- request-AC5 -> This backlog slice. Proof: AC2: If touch support was chosen, a road can be placed and cancelled on a touchscreen; if desktop-only was chosen, that is stated where a visitor sees it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_010_a_published_game_whose_documents_tell_the_truth`
- Architecture decision(s): (none yet)
- Request: `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`
- Primary task(s): `task_015_make_the_project_s_documents_and_input_model_match_the_public_deployment`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
