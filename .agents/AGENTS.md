# Repository Coding Rules & Regression Prevention Standards

## 1. Fighter Update Loop Early Exits (TimeStop & Freeze Guards)
- At the top of EVERY fighter `update()` method, the freeze/time-stop guard MUST return immediately if active:
  ```javascript
  const isFrozen = this._handleTimeStop();
  if (isFrozen || this.isTargetOfAmbush) {
    // Cancel active skill channeling audio/timers
    this.interruptAttacks();
    return; // MANDATORY: Stop update execution so fighter is frozen!
  }
  ```
- NEVER allow movement, AI steering, or melee combat logic (`_updateMeleeCombat`) to execute after a freeze/stun check evaluates to true.

## 2. Animation & Visual State Separation
- **Melee Punches (`punchAnimTimer`)**: Used ONLY for close-quarters 2-handed martial arts punches. Keep both hands visible (`hideFrontHand = false`, `hideBackHand = false`).
- **Slash Swing Chops (`slashSwingTimer`)**: Used ONLY for ranged blade swipes & Cleave finishers (`rapidSlashHitsLeft > 0` or ranged `shoot()`).
- Never allow a timer condition from one state to silently override or block another state's animation without checking explicit state priority.

## 3. Position & Target Aim Alignment
- Whenever a fighter teleports or changes position (e.g., `this.x = targetX; this.y = targetY;`), ALWAYS update `this.aim(target)` immediately afterward so facing direction (`gunAngle`) matches the new position relative to the target.

## 4. Visual Particle Cleanliness
- Avoid spawning dense persistent particles (`hitFlameWisps`, heavy radial glows, dense afterimages) on high-frequency recurring events like basic punches. Keep punch visuals clean and sharp.

## 5. Multi-Strike & Flurry Ability Rules (Attacker vs Target Freeze)
- **NEVER** invoke `this.applyTimeStop(...)` on `this` (the attacker) during an active multi-strike or flurry combo. Calling `applyTimeStop` on the attacker sets `this.timeStopTimer > 0`, causing `this._handleTimeStop()` to return `true` and freeze the attacker's own `update()` loop.
- **ALWAYS** apply hit-pause or time-stop exclusively to the target: `if (typeof target.applyTimeStop === 'function') target.applyTimeStop(duration);`.

## 6. Unified Target Queries (Fighters & Illusions)
- When querying targets for skill attacks, AOE hits, or flurries, **ALWAYS** check both `state.fighters` AND `state.illusions` (excluding teammates, self, and invulnerable entities).

## 7. Frontal Arc Radius AOE for Melee Weapon Users
- **ALWAYS** implement a multi-target frontal arc cone (e.g. 120°–160° arc angle based on weapon blade length reach) for all melee weapon fighters (Katana, Scythe, Spears, Knives).
- Melee swings MUST NOT single-target just one enemy when multiple enemies or illusions stand in front of the blade arc. All valid enemy targets (fighters & illusions) within the blade reach distance and frontal arc angle (`Math.abs(angleDiff) <= arc / 2`) MUST take hit damage, blood impact, hit stun, and physical knockback push.

## 8. Frontal Arc Radius AOE for Martial Arts & Brawler Punch Users
- **ALWAYS** implement a multi-target frontal arc cone (e.g. 90° arc angle, 65px punch reach) for martial arts brawler punches (Gojo, Sukuna, Todo, Mahoraga).
## 9. Gojo Limitless Infinity Barrier & Target Freeze Standards
- ALL existing and future fighters, summoned minions, illusions, Doppelganger clones, turrets, and entities MUST be affected by Gojo's **Limitless Infinity barrier** when striking or approaching Gojo while Infinity is active (`infinityCooldown <= 0`).
- The ONLY explicit lore exception is **Toji Fushiguro** (`characterId === 'toji'` or `type === 'toji'`), who wields the Inverted Spear of Heaven (ISOH) to bypass Limitless Infinity.
- **Mahoraga** is blocked and frozen initially, but after 2 Infinity freeze exposures, Mahoraga's Eight-Handled Sword Wheel clicks to adapt (`gojoInfinityImmune = true` & `adapted.melee = true`), granting total immunity to Infinity freeze thereafter.
- Whenever an entity (fighter or illusion) has `timeStopTimer > 0` or `isFrozenByInfinity = true`, `draw.js` MUST render a deep electric cyan blue fill overlay (`rgba(0, 229, 255, 0.65)`) over the entity's body (matching frozen projectile visuals).




