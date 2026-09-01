## item_085_a_military_zone_that_builds_something - A military zone that builds something
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 85%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:47:46

# AI Context
- Summary: The delivery slice for the one place the zone brush and the growth rules openly contradict each other: a painted military zone that is silently dropped at every population.
- Keywords: military, zone, builds, something
- Use when: Working on zone limits or on how military parcels reach the city.
- Skip when: You need batteries, military roads, or anything about the wave itself.

# Problem
- `parcelsForDemand` sets the military limit to zero and filters every parcel whose cells carry a zone against it, so a zoned military parcel is dropped at every population -- verified at twelve and at four hundred.
- Military parcels reach the city only through a military *road*, whose unzoned cells return before the limits are consulted.
- The zone brush was extended to all five businesses by the wave slice precisely so a military district could be put where a wave could be tested against it. Four of the five build.
- The survival brief is explicit that defence is bought by urbanism and that the military parcels growing along a military road are the towers -- so whether the brush should build them too is a product question, and the limit of zero answers it silently and by accident.

# Scope
- In:
  - Settle whether a painted military zone builds. If it should, give it a real limit like every other kind; if the road is meant to be the only route, refuse the paint visibly and say why.
  - Either way, the brush must not offer a business it silently drops.
  - Cover it with a test over the real rule, at a population where the answer is unambiguous.
- Out:
  - Changing how batteries derive from military parcels.
  - Military road behaviour.
  - New defensive buildings or placeable turrets, which the brief rules out.

# Acceptance criteria
- AC1: A painted military zone either builds at a reachable population or is refused with a stated reason.
- AC2: No zone the brush offers is silently dropped.
- AC3: The rule is covered by a test over the real filter.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: A painted military zone either builds at a reachable population or is refused with a stated reason.
- request-AC9 -> This backlog slice. Proof: AC2: No zone the brush offers is silently dropped.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_021_a_run_that_is_more_than_one_wave`
- Architecture decision(s): (none yet)
- Request: `req_030_the_loops_that_never_close_a_run_of_one_wave_a_city_that_starves_on_day_one_and_resources_nothing_consumes`
- Primary task(s): `task_032_close_the_loops_a_run_of_several_waves_a_city_that_survives_its_first_day_and_resources_that_are_spent`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
