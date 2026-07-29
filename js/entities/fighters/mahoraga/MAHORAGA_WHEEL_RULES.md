# Mahoraga — Eight-Handled Sword Wheel Adaptation System

## 1. Core Wheel Click Mechanism (Rolling Damage Accumulation)
- Mahoraga's Eight-Handled Sword Wheel tracks ALL incoming damage through a **rolling shared damage accumulator** (`totalAccumDamage`).
- ALL damage types (melee, ranged, skill) feed into a **single shared pool** within a 5-second rolling window (`fatalAdaptWindowFrames: 300`).
- When accumulated damage within the window crosses **20% of Mahoraga's maxHp** (`fatalDamageThresholdPct: 0.20`), the wheel clicks and Mahoraga adapts to the **type of the last hit that pushed him over the threshold** (melee, ranged, or skill).
- After a wheel click, the shared damage pool resets to 0 and a cooldown of 5 seconds (`fatalAdaptCooldownFrames: 300`) prevents rapid re-triggering.
- Damage type classification:
  - `melee` → `opts.isMelee === true`
  - `skill` → `opts.isSkill || opts.isUltimate || opts.isTrueDamage || opts.isExplosion`
  - `ranged` → everything else (default)

## 2. Adaptation Stages & Damage Reduction
- Each wheel click increments `adaptationStage[type]` by 1 (e.g., `adaptationStage.melee`, `adaptationStage.ranged`, `adaptationStage.skill`).
- Each stage grants **12% damage reduction** (`adaptationReductionPerStage: 0.12`) for that damage type, stacking multiplicatively up to **96% max reduction** (8 stages).
- Example: Stage 1 = 12% reduction, Stage 2 = 24%, Stage 3 = 36%, ... Stage 8 = 96%.

## 3. Wheel Click Visual & Cinematic Pause
- On every wheel click (before Level 8):
  1. The wheel rotates **45 degrees** (π/4 radians) with a smooth animated click.
  2. A **cinematic pause** of 40 frames (~0.66s) freezes all enemies on screen (`mahoragaAdaptationFreezeTimer`).
  3. A golden floating text announces the damage reduction percentage.
  4. Metallic wheel click + sword swing sound effects play.
  5. A **Divine Shield Badge** icon pops out temporarily (`shieldIconTimer = 90`).
- At Level 8 (total stages ≥ 8): The wheel spins **continuously** with no discrete click pauses.

## 4. Reverse Cursed Technique (RCT) Healing on Wheel Click
- On every wheel click, Mahoraga heals **8% of maxHp** (`rctHealPerClickPercent: 0.08`) via Reverse Cursed Technique.
- Green floating text `✨ RCT HEAL! +{amount}` and healing particle effects are spawned.

## 5. Level 2 Adaptation (Total Stages ≥ 2)
- At 2+ total wheel clicks, Mahoraga gains access to **teleportation and speed-blitz** combat patterns.
- Floating text: `⚡ ADAPTED TO TELEPORTATION & SPEED-BLITZ!`

## 6. Level 8 Max Adaptation — Infinity Blitz (Total Stages ≥ 8)
- When total adaptation stages across all types reaches **8**, Mahoraga enters **Level 8 Max Adaptation: SPEED-BLITZ** mode (`isInfinityBlitz = true`).
- During Speed-Blitz:
  - Wheel spins continuously at high speed.
  - Mahoraga teleports rapidly around the enemy, delivering devastating sword strikes.
  - Purple arcane sparks emanate from Mahoraga's body.
- Speed-Blitz lasts for **600 frames** (~10 seconds) (`infinityBlitzDurationFrames: 600`).
- After Speed-Blitz ends:
  - **ALL adaptations fully reset** (all stages, all damage reductions, all Gojo-specific adaptations).
  - Wheel rotation resets to 0.
  - A cooldown of **600 frames** before Speed-Blitz can trigger again.

## 7. Gojo-Specific Skill Adaptation (Last Hit Priority)
- When the wheel clicks from Gojo's attacks, Mahoraga **additionally** adapts specifically to the Gojo attack type that last hit him (`_lastGojoHitType`).
- **Purple** (`isGojoPurple`): Sets `gojoPurpleDodgeReady = true`. Next time Gojo fires Hollow Purple, Mahoraga teleports perpendicular to the orb trajectory to dodge it cleanly. Wheel glow: `#8A2BE2`.
- **Red** (`isRed`): Sets `gojoRedDodgeReady = true`. Next time Gojo charges Reversal Red, Mahoraga teleport-dodges away. Wheel glow: `#FF1144`.
- **Blue** (`isGojoBlue`): Sets `gojoBlueDragImmune = true`. Mahoraga becomes immune to Cursed Technique Lapse: Blue's gravitational drag pull (still takes projectile damage). Wheel glow: `#00FFFF`.
- **Infinity** (frozen by Limitless): After **2 Infinity freeze exposures** (`infinityAdaptFreezeCount >= 2`), sets `gojoInfinityImmune = true` and `adapted.melee = true`. Mahoraga completely bypasses Gojo's Limitless Infinity barrier from that point forward. Wheel glow: `#A0C8FF`.
- Each Gojo adaptation color is permanently tracked in `gojoAdaptColorHistory[]` for the wheel sphere visuals (no duplicates, max 4: blue, red, purple, infinity).

## 8. Counter-Attack After Wheel Click
- After every wheel click, the attacker who triggered the adaptation is saved as `_pendingCounterTarget`.
- Mahoraga performs a divine flash-dash counter-attack toward the saved target after the cinematic pause ends.

## 9. Mandatory Rules for All Fighters & Future Fighters
- **ALL fighters and future fighters** MUST pass `this` (the attacker) as the second argument in `target.takeDamage(damage, this, opts)` calls so Mahoraga's adaptation system can correctly identify the attacker.
- **ALL fighters and future fighters** MUST pass accurate `opts` flags (`isMelee`, `isSkill`, etc.) so Mahoraga's damage type classification works correctly.
- **NEVER** modify or reset Mahoraga's `adaptationStage`, `adapted`, `hitsTaken`, or `gojoAdapted` from outside `MahoragaFighter.js` except during a full game reset.
