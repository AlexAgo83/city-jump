## item_079_missiles_that_fly_and_explode_where_the_damage_lands - Missiles that fly, and explode where the damage lands
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:26:11

# AI Context
- Summary: The delivery slice for the military answer: real projectiles that climb, travel and dive, staggered launches, and an explosion drawn where the damage is already applied.
- Keywords: missiles, fly, explode, damage, lands
- Use when: Working on missile rendering, impact effects, or salvo timing.
- Skip when: You need the damage rule itself, which is already correct, or the battery numbers.

# Problem
- `src/render/missiles.ts` draws a straight `LineSystem` from battery to kaiju the instant the salvo fires, and disposes and rebuilds the whole mesh every frame.
- Each trail's `to` is frozen at the kaiju's launch-time position, so at impact the line points at ground the monster has already left -- the picture contradicts the arithmetic.
- One shared `nextSalvoAt` fires every battery on the same frame, so a defended city produces one synchronised flash instead of several launches.
- The damage timing itself is already right: `updateWave` holds each missile until `impactAt` before subtracting. This slice must not disturb that -- only make the rendering tell the same story.

# Scope
- In:
  - Replace the line with a projectile that exists for its flight: a strong climb over roughly the first quarter, travel at altitude through the middle, a fast dive over the last third, positioned from the progress between launch and `impactAt`.
  - A trail behind the missile, a flash and short explosion at impact, and a small reaction on the kaiju when it is hit.
  - Track the kaiju's live position so the dive and the explosion land on the monster as it is, not as it was.
  - A small per-battery offset on the salvo so launches stagger.
  - Stop rebuilding the whole mesh every frame -- move the missiles that exist rather than recreating them, the treatment `rebuildLights` already applies to the streetlights.
  - Keep the damage applied at `impactAt` exactly as it is now, and make the health bar drop on the frame the explosion is drawn.
- Out:
  - Ballistics, guidance, misses, or interception -- the missile always hits, as the original attack slice decided.
  - Changing battery range, damage or reload, which belong to the balance slice.
  - Smoke that persists after the explosion, or damage decals.

# Acceptance criteria
- AC1: Missiles are visible objects that climb, travel and dive over their flight time rather than a line drawn at launch.
- AC2: The impact is drawn at the kaiju's position at impact, and the health bar drops on the same frame.
- AC3: Several batteries stagger their launches instead of firing as one frame's salvo.
- AC4: The renderer no longer disposes and recreates its whole mesh every frame, and the frame budget is respected.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Missiles are visible objects that climb, travel and dive over their flight time rather than a line drawn at launch.
- request-AC5 -> This backlog slice. Proof: AC2: The impact is drawn at the kaiju's position at impact, and the health bar drops on the same frame.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_020_a_wave_the_player_can_actually_watch`
- Architecture decision(s): (none yet)
- Request: `req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`
- Primary task(s): `task_031_make_the_wave_readable_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
