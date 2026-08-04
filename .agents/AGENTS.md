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

## 10. WebGL / PixiJS Rendering & Performance Guidelines (Hybrid Rendering)
- High-frequency or persistent heavy visual effects (such as Sukuna's Fuga fire arrow trail, Gojo's Hollow Purple/Lapse Blue moving orbs, and full-screen dim overlays) MUST be migrated to WebGL/PixiJS to maintain 60 FPS performance (especially during screen recording).
- To preserve complex Canvas 2D designs exactly as originally drawn (preventing visual regressions), implement the **Hybrid Container Pattern**:
  - Draw the effect onto an off-screen canvas.
  - Bind that canvas as a WebGL texture to a `PIXI.Sprite` in the `state.pixiLayers.projectiles` or `state.pixiLayers.environment` container.
  - **For relative/floating effects** (like Toji's ultimate or projectiles): Scale or position the sprite in WebGL coordinates (adjusting for camera offsets) rather than resizing the off-screen canvas.
  - **For absolute/full-screen coordinate effects** (like Domain Expansions that rely on exact `state.canvas` coordinates like `fighter.x` / `fighter.y`): You MUST use a strict 1:1 pixel mapping. The off-screen canvas MUST dynamically sync its width/height to exactly match `state.canvas.width/height`. Do NOT scale the PixiJS Sprite, as scaling will desync the visual positions from the game's coordinate system. When resizing the offscreen canvas, call `texture.update()` to refresh the GPU mapping.
- Set correct WebGL blend modes dynamically: `window.PIXI.BLEND_MODES.ADD` for glowing elements (like Fuga flames) and `window.PIXI.BLEND_MODES.NORMAL` for elements with dark outlines or cores (like Gojo's Blue and Purple orbs).
- Short-burst, transient visual effects (such as the 30-frame Black Flash impact, sparks, and blood splatters) SHOULD remain on the Canvas 2D layer. Re-rendering transient bursts in 2D maintains exact artistic pixel fidelity without requiring complex WebGL pooling or incurring GPU texture-upload bottlenecks.

## 11. Prohibition of shadowBlur CPU Filters (Performance Preservation)
- **NEVER** use HTML5 Canvas `ctx.shadowBlur` or `ctx.shadowColor` inside any rendering or drawing methods (such as projectiles, weapons, or fighter visuals) during gameplay.
- Using `shadowBlur` forces the browser to calculate CPU-intensive Gaussian blurs, causing severe FPS drops during match gameplay.
- **ALWAYS** simulate glowing effects by drawing slightly larger concentric shapes with transparent gradient colors or semi-transparent flat fills instead.

## 12. Prohibition of High-Frequency PIXI.Text Instantiation (VRAM/GC Optimization)
- **NEVER** instantiate new `PIXI.Text` objects on a per-frame or high-frequency basis (such as for floating damage numbers or combo counters).
- Each `PIXI.Text` internally allocates a hidden 2D canvas, renders text to it, uploads the result to a GPU texture, and forces garbage collection. This causes massive FPS drops and GC stuttering during rapid combat events.
- **ALWAYS** route high-frequency dynamic texts to draw directly on the main 2D Canvas context (`state.ctx.fillText` / `strokeText`).

## 13. UI & DOM Query Caching Requirement
- **NEVER** query the DOM using `document.getElementById` or `document.querySelector` inside per-frame or frequent update loops (e.g., `updateHealthHud`).
- **ALWAYS** cache these DOM references at the file level (e.g., `let _cachedTopLeft = null;`) and reuse the references to avoid extreme layout reflow lags and CPU stalling.

## 14. Global Dim Effects & Screen Letterboxing Constraint
- **NEVER** apply global dim effects (such as Hollow Purple or Domain Expansions) by modifying the `document.body.style.backgroundColor`.
- All dim overlays, flashes, and visual effects MUST be drawn exclusively on the canvas or within a strict `div.game-box` overlay so they remain physically clipped to the game container boundaries.
- The outer HTML `body` background MUST remain completely untouched and hardcoded (e.g., `#000000`) so that letterbox margins during screen recording are never affected by in-game combat effects.

## 15. Toji Fighter Weapon Swing & Slash Rendering Standards
- **Chop-Down Animation (Basic Attack — Inverted Spear of Heaven):**
  - **Motion Path:** The weapon must swing in a single, fluid downward arc with no back-swing or pre-swing. It snaps to the upper-right (`-1.15` rad / ~11 o'clock), sweeps downward through horizontal (`0`) to lower-right (`+1.05` rad / ~5 o'clock), then recovers back to the idle guard angle (`+0.42` rad).
  - **Thrust Behavior:** Keep the weapon extension distance (`thrustDistance`) steady. Avoid any mid-swing in-and-out pulsing thrust curves during a rotational swing, as they distort the motion.
- **Dynamic Trail Eraser Transformation:**
  - **Suspended Crescent:** During the active swing, the crescent grows dynamically and remains fully drawn in the air.
  - **Recovery Phase Wipe:** During the recovery phase (after the active swing), the crescent tip must remain locked in world space at the final swing offset angle (`+1.05` or `+1.25`), and the trailing tail edge must chase the tip angle (trail length decays to `0` using a power curve like `Math.pow(1 - recP, 1.4)`), erasing the crescent from start to finish.
  - **Orientation-Specific Mirroring:** The Inverted Spear basic attack always sweeps clockwise in coordinate space, so its slash visual must **never** undergo Y-scale mirroring when facing left. The Split Soul Katana's basic attack and ambush slash *do* mirror sweep directions and *must* apply Y-scale mirroring (`ctx.scale(1, -1)`) when facing left.
- **Sharp Needle-Thin Tapering:**
  - Never use an offset power less than `1.0` (like `t^0.75`) to taper thickness, as it creates blunt or cut-off ends due to an infinite derivative at the boundaries.
  - Always taper both tips of the crescent slash cleanly to zero using a smooth double-tapering function:
    ```javascript
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
    const thick = maxThick * taper;
    ```
- **Ultimate Final Blow (360 Spin Dive):**
  - **Locked Orientation during Charge:** To prevent the weapon from snappily flipping sides as the target moves during `CRATER_FADEIN` and `CRATER` charge phases, snapshot the initial facing angle and flip sign once at transition start (`_ultimateChargeAngle` and `_ultimateChargeFlipSign`) and hold them locked. Clear active weapon slash timers (`katanaSlashTimer = 0`) on transition to prevent leftover charging-phase purple outlines.
  - **Clockwise Spin & Cutting Edge Alignment:** Always rotate Toji clockwise (`+ Math.PI * 2 * spinProgress`) so he spins downwards/rightwards towards the target. Disable vertical scale flipping for both Toji's body and weapon during the dive (`isSpinning = true`, `baseAngle = 0`, `_katanaFlipSign = 1`) to let the Katana draw in its default orientation, ensuring the cutting edge naturally leads the clockwise rotation.
  - **Stretched Trail:** Set the crescent slash radius to match the weapon tip (`outerR = this.r + thrustDistance + 146`) and let the trail trailing-stretch counter-clockwise behind the clockwise spin up to a grand `3.8` radians, fading out in the final 30% of the dive.
