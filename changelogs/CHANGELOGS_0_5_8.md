# city-jump 0.5.8

Prepared on 2026-09-11. Warmer city lighting, more distinct districts and stronger
visual feedback for kaiju attacks and destruction.

Softer shadows, tinted ambient light and gentler streetlight falloff improve city
readability. Night windows mix warm apartments, cooler offices and unlit rooms
and floors, respecting construction and utility states.

Districts favour different existing facade and roof families, with subtle local
colour palettes. Gardens, terraces, short paths and roundabout trees enrich the
spaces between buildings. Roads and paving gain detail that fades with distance;
contact shadows fit building footprints and follow vehicles and street furniture.

Broader beach transitions, coastal rocks, animated foam, thinning shoreline
vegetation and distant mist connect the city to its landscape. Trees sway,
commercial signs glow and working rooftop chimneys release light smoke.

Kaiju crests brighten before attacks and footsteps raise dust. Explosions combine
a brief flash, expanding fireball, dust ring and lingering smoke, remaining visible
from distant cameras. Animated flames have yellow cores and orange edges; one
reused local light illuminates nearby surfaces. Ruins retain footprint walls,
fallen slabs and scorched ground, with parcel orientation and zoning tint when
available. Smoke and lighting disappear when their effects are cleared.

The three README captures are refreshed from the bundled demo. Validation covers
417 unit tests, architecture and asset checks, scenarios, the production build,
Logics gates, browser interactions and day/night/coast/attack visual checks.
No new dependency is introduced. Smoke counts and destruction lighting remain
capped to limit rendering cost.
