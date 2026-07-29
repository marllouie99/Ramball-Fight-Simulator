# Doppelganger (Purple Fighter)

The Doppelganger is a deceptive and elusive melee fighter who utilizes a crystalline purple sword and the power of illusion to overwhelm opponents. Instead of relying on brute strength or heavy armor, the Doppelganger creates exact replicas of itself when taking damage, creating chaos in the arena.

## Combat Mechanics

### Crystalline Sword (Melee Attack)
* **Mechanic:** Fast, close-range sword strikes.
* **Effect:** The Doppelganger swings a jagged purple sword at nearby enemies. 
* **Impact:** Successful strikes deal standard melee damage and generate a purple slash effect.

### Illusion Summoning (Passive Defense)
* **Mechanic:** The Doppelganger's core survival and distraction mechanic.
* **Trigger:** Whenever the Doppelganger's health drops by 25% (crossing a 75%, 50%, or 25% health threshold), it immediately summons an illusion of itself.
* **Illusion Properties:**
  * **Appearance:** Illusions look exactly like the real Doppelganger (same color and size). They spawn with a "shatter" particle effect and an "ILLUSION!" text pop-up.
  * **Health:** Illusions are fragile, spawning with only 50% of the true Doppelganger's *current* health at the moment of summoning.
  * **Damage:** Illusions can swing their own swords, but deal significantly less damage than the true Doppelganger.
  * **Behavior:** Illusions automatically lock onto the nearest enemy and relentlessly pursue them, matching the movement speed of their creator.
* **Limits:** The Doppelganger can only maintain a set maximum number of illusions at once (dynamically scaled down in larger multiplayer modes or when performance/framerate drops).

### Aggressive Re-engagement (Arena Physics)
* **Mechanic:** Like the Berserker, the Doppelganger employs aggressive pathfinding when hitting arena boundaries.
* **Effect:** When bouncing off an arena wall, instead of reflecting at a physical angle, the Doppelganger's trajectory immediately snaps directly toward the opponent, ensuring continuous pressure.
