## prod_015_a_city_whose_traffic_is_the_player_s_to_dial - A city whose traffic is the player's to dial
> Date: 2026-08-30
> Status: Proposed
> Related request: `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
> Related backlog: `item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it`, `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`
> Related task: `task_020_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-30 14:37:54

# Overview
city-jump decides how busy a city is with three integer expressions nobody has revisited since they were written, and it runs that simulation whether the machine can afford it or not. This slice hands both ends of that to the player: a switch that stops the simulation outright for someone whose hardware cannot carry it, and a slider that lets someone whose hardware can turn a quiet town into rush hour. It is the largest of the three performance switches and the only one a player would also want for its own sake.

```mermaid
flowchart TB
    Seg[Each segment, at spawn time] --> Counts["cars min(4,max(1,len/80)) - peds min(8,max(2,len/22)) or min(6,len/45)"]
    Slider["Settings > World: density slider"] -->|scales, default = today| Counts
    Counts --> Movers[Mesh instances stepped every frame]
    Toggle["Settings > World: Traffic"] -->|off| None[No movers, step not entered]
    Toggle -->|off| Slider
    Movers --> HL[syncHeadlights]
    Lights["Lights setting, req_017"] --> HLC{One combined answer}
    HL --> HLC
    HLC --> Cluster[Headlight cluster]
```

# Goals
- The biggest single cost in a busy city is something the player can switch off.
- How busy the city is stops being a constant in the source and becomes a choice.
- Off means the simulation is not running, not that the cars are hidden.
- The default is exactly the city that exists today.
- A preference about display never travels inside a city.

# Non-goals
- Changing how traffic behaves -- following, lane changes, signals, transfers, roundabout slots all stay as they are.
- Trips that mean something: origins, destinations, routing, or demand deciding where cars go.
- Separate controls for cars and pedestrians, or per-road-type density.
- Traffic density as city data that a save or a share link carries.
- Automatic density that reacts to the frame rate.
- Any change to how vehicles or pedestrians are modelled or drawn.

# Scope and guardrails
- In: a traffic switch that removes the movers and the per-frame step, and a density slider scaling the three spawn-count expressions.
- In: the interaction with the headlight cluster, which the lights setting also reaches for.
- Out: traffic behaviour -- following, lane changes, signals, transfers, roundabout slots -- and routing or demand.
- Out: separate cars-and-pedestrians controls, per-road-type density, and density as city data.

# Key product decisions
- Density is a preference about display, not a fact about the city: it lives in settings and never travels in a save or a share link.
- The slider's floor is a quiet city, not an empty one -- emptiness is the toggle's job, and two controls for one state is a UI nobody can read.
- Density cannot be applied incrementally, so the slider settles before it respawns.

# Success signals
- A busy city and a quiet one are both something the player chose.
- The default reproduces today's counts exactly, and the existing suite's assertions hold unchanged.
- A drag from end to end costs a handful of rebuilds, not hundreds.

# References
- Product back-reference: `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
- Task back-reference: `task_020_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
