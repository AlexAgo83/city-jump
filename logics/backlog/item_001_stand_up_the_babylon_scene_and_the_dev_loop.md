## item_001_stand_up_the_babylon_scene_and_the_dev_loop - Stand up the Babylon scene and the dev loop
> From version: 1.0.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 95%
> Complexity: Low
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:33:17

# AI Context
- Summary: Creates the ground the rest of the request stands on: a build, a single dev command, a Babylon scene with a movable camera, and the split between simulation logic (tested headless) and rendering (looked at).
- Keywords: Babylon.js, dev server, build setup, camera, render loop, project layout, no wrapper
- Use when: setting up or changing the build, the dev command, the scene bootstrap or the camera; or deciding where a new module belongs on the simulation/rendering split.
- Skip when: the work is about roads, buildings or terrain -- those are the later items; the scene bootstrap has no opinion about them.

# Problem
- The repository is empty: there is no build, no dev command, no scene, and therefore nowhere for any of the following work to be seen.

# Scope
- In:
  - A build and dev-server setup, and a single documented command that opens the running app in a browser.
  - A Babylon.js scene with a camera the player can move over the map, a ground plane, and a render loop.
  - The project layout that separates pure simulation logic from rendering, since the former is tested and the latter is looked at.
- Out:
  - Any wrapper, facade or abstraction layer of the project's own over Babylon.
  - Asset loading, UI chrome, and anything to do with roads.

# Acceptance criteria
- AC1: One documented command builds and serves the app, and it opens in a browser showing a Babylon scene.
- AC2: The camera can be moved and zoomed over the ground plane.
- AC3: Simulation logic and rendering live in separate places, and the simulation side imports nothing from Babylon.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: One documented command builds and serves the app, and it opens in a browser showing a Babylon scene.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)
- Request: `req_000_draw_a_road_network_the_city_grows_from`
- Primary task(s): `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
