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
