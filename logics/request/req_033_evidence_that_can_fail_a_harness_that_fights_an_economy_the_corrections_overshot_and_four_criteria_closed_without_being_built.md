## req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built - Evidence that can fail: a harness that fights, an economy the corrections overshot, and four criteria closed without being built
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:38:08

# AI Context
- Summary: The correction pass on milestone 9.0: restore the combat measurement a later task deleted, make the playthrough fight the wave it reports on, bring an over-corrected economy back into range, close the military-road firepower exploit, and build the four criteria that were signed off empty.
- Keywords: evidence, can, fail, harness, fights, economy, corrections, overshot, four, criteria, closed, being, built
- Use when: Working on the balance or playthrough harness, the treasury and resource numbers, the zone and battery limits, or the criteria reported met on milestone 9.0 tasks.
- Skip when: You need the kaiju loop, the missile rendering or the construction feedback, which are delivered and working.

# Needs
- The four chains of milestone 9.0 delivered most of what they promised -- the kaiju crosses the city and retargets onto buildings placed during the attack, missiles fly as pooled projectiles with staggered launches and land where the damage is applied, construction is visible and priced, waves repeat and scale, the starving opening is fixed, the prestige web shrank to three nodes with real effects and moved off the play screen. What did not survive is the evidence, and the evidence was the point.
- The combat measurement was deleted by the next task. `a437609` wrote a genuine fight harness -- `advanceKaijuAssault`, `batteriesInRange`, missiles carrying `impactAt`, `damageWaveClock`, stepped at 0.25 s, counting salvos -- and its closeout recorded 25.5 seconds and 7.0 salvos, inside the twenty-to-forty target. `6f20382` replaced the whole file with the playthrough version, which fights nothing. `npm run balance` today reports neither combat duration nor salvo count, so the acceptance criteria that named them are false on tasks marked Done, and the retuned numbers have no reproducible evidence. This is the same shape as `e1567fa`: a later commit removing a closed request's proof. It is the shape this milestone existed to stop.
- `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision` said one harness, and that whichever request landed first would build it and the other would extend it. 'Extend' was read as 'replace'. One harness was the right rule; it needed to say that the measurements already taken are part of what is extended.
- The playthrough harness does not play a wave. `playFirstRun(seed, rules, shape)` takes the outcome as a parameter: `advanceKaijuAssault` is never called, no missile is fired, no damage is applied. The `lost` parcels are computed and never applied -- nothing is destroyed, the lifecycle is not told, the population does not move -- and `nextWaveReachable` is `!run.ended`, which was set from the shape argument. The three wave shapes are stipulated, not simulated.
- Its tests assert the parameter they passed in. `expect(playFirstRun(2, ..., "total_loss").run.ended).toBe("defeated")` is `expect(f(x)).toBe(x)`; the kaiju-spawn assertion checks a literal `0` returned by an early return. These are the branch-label pattern the ADR says to replace rather than supplement -- a check that cannot fail reporting coverage that is not there.
- There is no needs-following policy either, though the closeout says there is. Every zone is painted before the loop; the loop only logs, and its logging condition compares `short.kind` against `firstNeeds.find(need => need.kind === short.kind)?.kind` -- a value against itself, always false, so the line never fires.
- `militaryGap` subtracts hit points from damage-per-minute. The 15,765.7 average written into `balance/history.jsonl` as the evidence for the military-versus-threat criterion has no dimensional meaning.
- Meanwhile the economy was corrected past the point it was aimed at. `incomePerSecond` lost its trade term and is now population tax alone -- about $0.24 a second at the starting population -- while a building costs a flat 800 a cell, four to thirteen times the per-kind prices the money removal had deleted, and with the per-kind differentiation gone. Playing the harness's own first forty seconds ends at **minus $212,790**. Money as a reading of the city's health was the goal; a quarter of a million in deficit inside the first minute reads as nothing at all. Nothing in the balance harness reports the treasury, which is why it was not seen.
- That trade removal also silently reverts an acceptance criterion of the city-resources request, which says commerce produces services *and trade* -- the same undocumented-revert pattern as the deleted harness, one file over.
- Materials were half-removed. `materialsProduced` is zero, so an industrial parcel now produces nothing at all while still demanding six workers a cell -- the second-highest cost in the game -- which makes zoning industrial strictly harmful. But materials are still in `CityResources`, still saved, still printed by the ledger, and `starter-materials` still sells 25 of them for nine prestige. A prestige node that buys a frozen number is exactly the defect the prestige request existed to delete, reintroduced by the request that deleted it.
- Unzoned road frontage bypasses every construction limit. `parcelsForDemand` returns early for any parcel whose cells carry no zone, and that is the only path by which military parcels have ever reached the city -- a military road's frontage. The harness's own first run therefore fields eleven military parcels at population twelve. With `batteriesForParcels` still ignoring staffing, and military demanding eight workers a cell against a workforce of six, those eleven batteries fire at full damage with nobody in them. A long military road is unlimited free firepower.
- And four acceptance criteria were closed without being built: the one-line alert when a district goes dark, for which the word 'alert' appears nowhere in the repository; the performance figure at wave scale, where the recorded entry is the ordinary demo rebuild; one notion of need, where `buildingKinds.ts` was never touched so the gauges still show staffing ratios while construction is gated on population thresholds; and the prestige branches, where the web shrank to three `starting` nodes leaving `capability` and `information` declared and empty.

# Context
- This request is a correction pass, not new direction. Nothing here asks for a mechanic that does not exist; every item is a measurement that stopped existing, a correction that overshot, or a criterion that was signed off without being written.
- The fight harness that was deleted is recoverable: `git show a437609 -- scripts/balance.mjs` is the whole of it, and it worked. Restoring it beside the playthrough rather than in place of it is the cheapest correct answer, and it is what the ADR meant.
- The playthrough already has every module it needs imported or one import away. Making it fight is not new machinery: it is calling `advanceKaijuAssault` and the battery and missile rules the app already calls, in the loop it already has.
- Deriving the wave shape rather than passing it in is what makes the three outcomes worth asserting. A run that is destroyed because the kaiju destroyed it can be asked what the city can still do; a run that is destroyed because a string said so cannot.
- The economy has one product decision in it and this request states an answer rather than leaving it open, because leaving it open is how it drifted in the first place. Restore trade as **income**, and let population growth be driven by jobs and housing rather than by the same services number -- that satisfies 'counted once' by moving a term rather than deleting one, and it gives the treasury a reason to move. Give industry a reason to exist by having it produce money the way commerce does, and then remove materials outright -- from `CityResources`, the saves, the ledger and the prestige web -- rather than carrying a resource nothing spends. The alternative, a real sink for materials, is a second currency on every build and more machinery than this game currently earns. Either answer is defensible; carrying a frozen stock is not.
- Building prices want recalibrating with that, and the per-kind table the money removal deleted is worth restoring rather than a flat rate: a barracks and a house costing the same is a lost signal, and the old table already existed.
- The unzoned-frontage bypass is deliberate in origin -- unzoned road frontage is the 'mixed neighbourhood' rule, and it should keep building. What it should not do is put military parcels outside every limit, because the military road is the only route military has. Whether the fix is a limit on that path, a staffing gate on batteries, or both, is for the slice to settle with the numbers in front of it.
- The performance figure at wave scale still has nothing measuring it, and a kaiju that now genuinely walks the city destroying building after building is exactly the load that criterion was written for.
- Everything this request touches is already covered by an acceptance criterion on a closed task. The closeouts should say so plainly rather than quietly re-passing: a criterion that was reported met and was not is worth naming in the report that corrects it.

# Acceptance criteria
- AC1: `npm run balance` reports combat duration and salvo count again, from a fight the harness simulates rather than from a constant, and the twenty-to-forty-second target is reproducible.
- AC2: The playthrough plays its first wave -- the kaiju walks and destroys, batteries fire, missiles land, damage is applied -- and the wave's shape is derived from the simulation rather than passed in as an argument.
- AC3: The losses a wave inflicts are applied to the city, and what the city can still do afterwards is read from the city rather than from the argument that named the outcome.
- AC4: No assertion in the harness's tests passes by construction: each one fails when the behaviour it names is removed, and the assertions that cannot are replaced rather than supplemented.
- AC5: The harness reports the treasury, and the military measurement compares quantities of the same kind.
- AC6: An ordinary first minute of play does not end a quarter of a million in debt -- income, building prices and what industry produces are answered together rather than one at a time.
- AC7: Materials are spent by something, or are gone from the resources, the saves, the ledger and the prestige web; and no zoning choice is strictly harmful to make.
- AC8: Unzoned road frontage no longer places military parcels outside every construction limit, so a military road is not unlimited free firepower.
- AC9: A battery answers to staffing the way every other building does.
- AC10: The four criteria closed without being built are built: the district-going-dark alert, the performance figure at wave scale, one notion of need behind the gauges and the growth rules, and no prestige branch declared without a node in it.
- AC11: Every criterion this request closes leaves evidence that can be re-run, and no slice of this request removes another slice's evidence -- extending the harness means keeping the measurements it already takes.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_024_evidence_that_can_fail`
- Architecture decision(s): (none yet)

# References
- src/sim/playthrough.ts
- src/sim/playthrough.test.ts
- scripts/balance.mjs
- src/sim/economy.ts
- src/sim/slots.ts
- src/sim/batteries.ts
- src/sim/buildingKinds.ts
- src/sim/run.ts
- src/app/app.ts
- src/ui/ledger.ts
- balance/history.jsonl
- perf/history.jsonl
- logics/architecture/adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision.md

# Backlog
- `item_091_a_harness_that_fights_the_wave_it_reports_on`
- `item_092_an_economy_back_inside_the_range_it_was_aimed_at`
- `item_093_a_military_road_is_not_unlimited_free_firepower`
- `item_094_the_four_criteria_that_were_closed_without_being_built`
