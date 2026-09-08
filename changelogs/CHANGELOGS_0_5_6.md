# city-jump 0.5.6

Prepared on 2026-09-08. Adds the science talent web and splits the settings panel.

Banked science now buys talents on a web in the Kaiju panel. The web grows outwards
from one root: a node is for sale only next to one already owned, so the player picks
a direction rather than a basket. The first seven nodes cover starting funds, battery
damage, farm output and trade income, and they stay bought from one run to the next.
The between-runs strip points at the web instead of carrying a second, flat shop.

Settings gained switches and lost crowding. Trees have their own World switch, Lights
splits into per-source switches for cars and street lamps, and Performance and Assists
each became their own rail section. The Kaiju menu icon blinks red while a wave is on
the city.

Validation covers the local CI gate and the browser interaction suite, with new checks
for the talent web's locking, purchase and unlocking of neighbours.
