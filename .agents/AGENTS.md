# Repository Coding Rules & Global Development Standards

## 0. Mandatory Session Workflow, Hygiene & Response Output Standards
These rules apply to **EVERY** agent conversation and turn without exception:

### 0.1 Never Leave Scratch/Temporary Files
- Any temporary scripts, test harnesses, or debug probes created in `scripts/`, `scratch/`, or workspace root (e.g. `scripts/test*Temp.mjs`, `temp*.js`) **MUST be deleted immediately after testing is complete**.
- ONLY permanent test harnesses configured in `package.json` (`scripts/testAllFighters.mjs`, `scripts/testTagMatch.mjs`, `scripts/testInteractions.mjs`, `scripts/verifyCodebase.js`, `scripts/scaffoldFighter.mjs`) are permitted in `scripts/`.
- Temporary scratch data during debugging should be stored in the ephemeral artifacts scratch folder (`<appDataDir>/brain/<conversation-id>/scratch/`).

### 0.2 Mandatory Post-Work Verification (`npm run verify`)
- ALWAYS run `npm run verify` (which runs `verifyCodebase.js` and `testAllFighters.mjs`) before completing any task.
- Never conclude a task with failing tests or broken Canvas 2D stack depths.

### 0.3 Anti-Spaghetti & Clean Architecture
- Keep functions focused and under 50–60 lines. Extract modular helper functions early.
- Never nest conditionals more than 2–3 levels deep. Use early return guard clauses at the top of methods.
- Strict Separation of Concerns: Physics/update loops in `*Combat.js` / entity classes; Canvas 2D/WebGL drawing in `*Graphics.js` / renderer modules; Audio in `soundSystem.js`.

### 0.4 Zero Duplicate Top-Level Identifiers
- NEVER declare duplicate top-level functions, classes, `const`, `let`, or `var` variables within the same module file. This causes fatal syntax errors crashing the game loop.

### 0.5 Configuration File Preservation & Git Safety
- NEVER run `git checkout`, `git restore`, or `git reset --hard` on files under `js/configs/` or `js/core/`.
- Preserve all user custom tuning (damage, HP, speeds, cooldowns, toggles) across test executions.

### 0.6 Mandatory Core Changes Risk Assessment
Whenever modifying or refactoring any core engine or shared systems file (`js/entities/fighter.js`, `js/core/state.js`, `js/systems/projectileSystem.js`, `js/systems/physics.js`, `js/systems/renderSystem.js`, `js/graphics/hudManager.js`, `js/core/main.js`, `gameLoop.js`), the agent MUST append a **⚠️ Risk Assessment** section before the suggestions:
```markdown
---

⚠️ **Risk Assessment:**
- **Blast Radius**: [High / Medium / Low] — [List affected subsystems, game modes, or fighter classes]
- **Potential Collateral Impact**: [Identify specific regression risks, e.g., CC time-stop leaks, collision stasis, DOM reflows, WebGL texture desyncs]
- **Mitigation & Verification**: [Specific automated tests or manual test scenarios executed to guarantee zero regressions]
```

### 0.7 Mandatory Post-Change Suggestions (Why, Pros, Cons, Don't, Example Scenario)
After completing ANY code modification, update, or fix in the project, the agent MUST ALWAYS conclude the final response with a **"💡 Suggestions"** section containing 2–4 specific, actionable follow-up improvements formatted strictly as:
```markdown
---

### 💡 Suggestions

1. **[Actionable Suggestion Title]**
   - **Why**: [Clear technical, gameplay, or performance rationale explaining the core problem it solves]
   - **Pros**: [Key benefits, capabilities unlocked, developer or gameplay improvements]
   - **Cons**: [Trade-offs, limitations, added complexity, or maintenance considerations]
   - **Don't**: [Specific anti-pattern, common trap, or breaking mistake to strictly avoid when implementing this]
  - **Example Scenario**: [A concrete situation where this follow-up would help]

2. **[Another Suggestion Title]**
   - **Why**: ...
   - **Pros**: ...
   - **Cons**: ...
   - **Don't**: ...
  - **Example Scenario**: ...
```

---

## 1. Fighter Update Loop & Combat Engine Standards

### 1.1 Freeze & TimeStop Early Exits
- At the top of EVERY fighter `update()` method, the freeze/time-stop guard MUST return immediately if active:
  ```javascript
  const isFrozen = this._handleTimeStop();
  if (isFrozen || this.isTargetOfAmbush) {
    this.interruptAttacks();
    return; // MANDATORY: Stop update execution so fighter is frozen!
  }
  ```
- Base `this._handleTimeStop()` universally evaluates all global CCs (time stops, Infinity freeze, domain stasis, paralyze debuffs, ambush target, Makima chains, Saitama counter, Genos flurries, Getsuga drag, Cronos stasis, Nanami ratio pause).

### 1.2 Centralized Movement & Physics Standard
- Upcoming fighters MUST NOT manually integrate position using `this.x += this.vx; this.y += this.vy;`.
- At the end of `update()`, upcoming fighters MUST either:
  1. Call `super.update(opponent, ownerIndex, arena)`, OR
  2. Call `this.applyMovementPhysics(speedMultiplier)` followed by `this.resolveWallBounce(arena, opponent)`.
- If implementing custom `resolveWallBounce(arena, opponent)`, guard against beam/stasis at the top:
  ```javascript
  if (this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama) {
    return super.resolveWallBounce(arena, opponent);
  }
  ```

### 1.3 Position & Target Aim Alignment (Teleport & Aim Pipeline)
- Whenever a fighter teleports or changes position (`this.x = targetX; this.y = targetY;`), ALWAYS update `this.aim(target)` immediately afterward so facing direction (`gunAngle`) matches the new position.
- Base `aim(opponent)` uses the Template Method Pattern: checks `canAim()` and `isValidAimTarget(target)`, calculates angle, and delegates to `applyAim(opponent, targetAngle)`.

### 1.4 Continuous 360° Skill Aiming & Committed Aim Lock
- All active skills, charged special attacks, finishing moves, beams, and projectile waves (Saitama Counter, Gojo Red/Purple, Sukuna Fuga, Ichigo Getsuga, Yuta Pure Love Beam, Genos Incineration Cannon) MUST support continuous 360° omnidirectional targeting upon initiation via trigonometry (`Math.atan2(dy, dx)`).
- Snapshot the computed angle upon cast (e.g. `this.skillCastAngle = angle`). Throughout wind-up, channeling, and active firing:
  - `aim(opponent)` and `canAim()` MUST disable auto-aim tracking.
  - `this.gunAngle` and `this.angle` MUST remain strictly clamped to the committed cast angle.
  - Spawning projectiles inherit `lockAngle`, and physical recoil pushes directly opposite (`-Math.cos(lockAngle) * recoil`).

### 1.5 Multi-Strike & Flurry Rules (Attacker vs Target Freeze)
- NEVER invoke `this.applyTimeStop(...)` on `this` (the attacker) during an active combo.
- ALWAYS apply hit-pause or time-stop exclusively to the target: `if (typeof target.applyTimeStop === 'function') target.applyTimeStop(duration);`.

### 1.6 Frontal Arc Radius AOE
- **Melee Weapon Users (Katana, Scythe, Spears, Knives)**: Implement a multi-target frontal arc cone (120°–160° arc angle based on blade reach).
- **Martial Arts Brawlers (Gojo, Sukuna, Todo, Mahoraga)**: Implement a multi-target frontal arc cone (90° arc angle, 65px punch reach).
- All valid enemy targets (fighters & illusions) within reach and angle (`Math.abs(angleDiff) <= arc / 2`) take damage, blood, hit stun, and knockback push.

### 1.7 Gojo Limitless Infinity Barrier Standards
- ALL entities (fighters, summons, illusions, clones, turrets) are affected by Gojo's Limitless Infinity barrier when striking or approaching while Infinity is active (`infinityCooldown <= 0`).
- The ONLY explicit lore exception is **Toji Fushiguro** (`characterId === 'toji'`), who wields the Inverted Spear of Heaven (ISOH) to bypass Infinity.
- **Mahoraga** is blocked initially, but after 2 exposures adapts (`gojoInfinityImmune = true`), granting total immunity thereafter.

### 1.8 Mandatory Basic Projectile Suppression (Rule 23)
- Unless the character is explicitly a vanilla generic gun/bullet shooter, ALL new fighter classes MUST override `shoot(ownerIndex)` with a blank method or dedicated melee/skill action:
  ```javascript
  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Character uses dedicated combat skills, weapons, or melee combos
  }
  ```
### 1.9 Mandatory Non-Freezing Active Visual Effects & Particle Decay Standard (Rule 25)
- Whenever a character is stopped, hit-paused, time-stopped, or immobilized by any attack or status effect (e.g. `_handleTimeStop()`, Gojo Infinity freeze, domain stasis, ambush stasis, paralyze, Makima chains, Saitama counter stasis, Nanami ratio pause, Cronos stasis, or death), all non-interactive visual effects, transient explosion rings, particle emitters, slashes, and shockwaves **MUST NEVER freeze in mid-air or get stuck on screen**.
- **Top-of-Update Decay Processing**: All visual effect array decay routines (e.g. `this._updateVisualExplosions()`, `this._updateVisualEffects()`, `this._updateParticles()`) **MUST be called at the very top of `update(opponent, ownerIndex, arena)` BEFORE the freeze guard exit**:
  ```javascript
  update(opponent, ownerIndex, arena) {
    // 0. Update visual effects & transient particle lifecycles before freeze guard
    // (Ensures active visual effects decay naturally and NEVER get stuck on screen when movement is stopped)
    this._updateVisualExplosions?.();
    this._updateVisualEffects?.();

    // 1. Mandatory Rule 1 Freeze & TimeStop Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return; // MANDATORY: Stop combat/movement execution while frozen
    }
    ...
  }
  ```
- **Why**: Base `Fighter._handleTimeStop()` universally guards against all CCs. If visual effect update routines are placed after `if (isFrozen) return;`, effect timers stop decrementing while the fighter is immobilized, causing explosion visuals and particle trails to remain frozen in mid-animation indefinitely.
- **Interruption & Death Array Cleanup**: When `interruptAttacks(forceCancelAll = true)` or death occurs, fighter-anchored visual effect arrays must either be cleared immediately (`this.activeVisualEffects.length = 0;`) or decoupled into independent world-space particles so they decay smoothly without remaining attached to an immobilized body.

---

## 2. Rendering, Performance & WebGL Standards

### 2.1 WebGL / PixiJS Hybrid Container Pattern
- High-frequency or persistent heavy visual effects (Fuga fire trail, Hollow Purple/Blue moving orbs, full-screen dim overlays) use WebGL/PixiJS to maintain 60 FPS.
- To preserve 2D canvas designs: draw onto an off-screen canvas and bind as WebGL texture to a `PIXI.Sprite` in `state.pixiLayers.projectiles` or `state.pixiLayers.environment`.
- Short-burst transient visual effects (Black Flash 30-frame impact, sparks, blood splatters) remain on Canvas 2D layer.

### 2.2 Prohibition of `shadowBlur` CPU Filters (Rule 11)
- **STRICT PROHIBITION**: NEVER use HTML5 Canvas `ctx.shadowBlur` or `ctx.shadowColor` inside any rendering methods during gameplay.
- Simulating glowing effects MUST be done by drawing slightly larger concentric shapes with transparent gradient colors or semi-transparent flat fills.

### 2.3 Prohibition of High-Frequency `PIXI.Text` Instantiation
- NEVER instantiate new `PIXI.Text` objects on a per-frame or high-frequency basis (floating damage numbers, combo counters).
- Route dynamic combat floating text directly to the 2D Canvas context (`state.ctx.fillText` / `strokeText`).

### 2.4 Canvas 2D Transform Stack Integrity (`ctx.save()` / `ctx.restore()`)
- In ANY rendering function, every `ctx.save()` MUST be matched by exactly one `ctx.restore()`.
- When branching or returning early, ALWAYS restore all active saves before `return`.
- Stack depth must strictly return to `0` after every render call.

### 2.5 Manga Action Speed Lines Standard (Rule 16)
- Draw speed lines as **4-point filled needle polygons** (NEVER uniform `ctx.stroke()` lines):
  ```javascript
  ctx.moveTo(startX, startY);    // sharp trailing tip
  ctx.lineTo(topMidX, topMidY); // top edge of needle body
  ctx.lineTo(endX, endY);       // sharp leading tip
  ctx.lineTo(botMidX, botMidY);
  ctx.closePath();
  ctx.fill();
  ```
- Max thickness `1.0px – 2.5px max`. Scale perpendicular cluster width to fighter radius (`±(fighter.r * 1.4)`).
- Align speed lines strictly with aim angle (`aimAngle = fighter.gunAngle || fighter.angle || 0`) and trail **BEHIND** the fighter body (`fighter.x - cosA * (backOffset + travel)`).
- Use a 4-slot theme palette (Primary Theme, Secondary Accent, White Core, Dark Ink Line) and cache pre-seeded arrays.

### 2.6 Crescent Blade Slash & Dynamic Eraser Wipe Standard (Rule 15)
- **Double-Tapered Crescent**: Taper both tips cleanly using a smooth sinusoidal power function:
  ```javascript
  const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
  const thick = maxThick * taper;
  ```
- **Recovery Phase Eraser Wipe**: During recovery, the crescent tip stays locked in world space while the trailing tail chases the tip angle (`Math.pow(1 - recP, 1.4)`), erasing the crescent from tail to tip.

### 2.7 Domain Expansions & High-Frequency Hazard Hit-Stun (Rule 17)
- **Closed Barriers (Time-Stop/Stasis)**: Explicitly apply `timeStopTimer` (e.g. Gojo's Unlimited Void).
- **Open Barriers (Damaging Slashes)**: Deal AOE damage and push, but MUST NOT freeze enemy update loops or trap entities in time-stop stasis.
- Recurring environmental/domain hazards that tick rapidly (e.g. slashes every 8 frames) MUST NOT invoke `applyHitStun(duration)` to prevent unintended perma-freeze.
- Companion entities (Rika, clones, summons) evaluate status effects independently of their owner's transient `hitStunTimer`.

### 2.8 UI, DOM Caching & HUD Palette Consistency
- NEVER query DOM (`document.getElementById`) inside per-frame update loops. Cache references at file level.
- All HUD skill progress bars for a fighter MUST use the **exact same consistent color theme** (`themeColor = f.color || ...`).
- Floating Heal Text: Unified format `+<amount>` in neon emerald green (`#00FF66`) with `this._healthBarHealTimer = 16` for top health card pulse.

### 2.9 Mandatory In-Game Overlay HP & Status Drawing (Rule 21)
- **Mandatory Overhead HP Layer**: Whenever creating, scaffolding, or overriding a fighter's `draw(ctx, opponent)` rendering pipeline:
  - If the fighter class defines or overrides `draw(ctx, opponent)`, it **MUST ALWAYS** explicitly call `this.drawHealth(ctx);` and `this.drawFreezeTimer(ctx);` at the very end of `draw()` on the top layer.
  - The fighter class MUST define `drawBody(ctx)` (e.g. `drawBody(ctx) { draw[Name]Skin(ctx, this); }`) so standard engine render passes and preview hooks function properly.
  - Never omit `this.drawHealth(ctx)` in custom draw methods, as doing so removes the in-game floating HP number underneath/above the fighter during combat.

### 2.10 Non-Freezing Particle & Visual Effect Lifecycles (Rule 25)
- All transient visual effects (explosions, slashes, particle bursts, shockwave rings, smoke) rendered by a fighter class MUST decay continuously even if the character is immobilized, hit-paused, or time-stopped.
- Place all effect update and cleanup functions (`_updateVisualExplosions()`, `_updateVisualEffects()`, etc.) at the beginning of the `update()` loop before the `_handleTimeStop()` freeze check.
- Clear lingering visual effect arrays on `interruptAttacks(forceCancelAll = true)` or fighter defeat.

### 2.11 Mandatory Clean Concentric Shockwave Standard — Anti-Cobweb & Anti-Mesh Rule (Rule 26)
- **Sequential Water-Ripple Wavefront Staggering ("Dipping Fingers in Steady Water")**:
  - Shockwave rings MUST ALWAYS animate with sequential, staggered wave propagation where concentric compression rings pop out 1-by-1 from the detonation center with progressive time offsets ($t_0 = 0.00, t_1 = 0.12, t_2 = 0.24, \dots$) and extend outward smoothly along a decelerating power curve ($R_k = R_{\max} \cdot \text{lp}_k^{\text{speedPow}}$).
  - NEVER spawn all concentric rings at full radius simultaneously with fixed static multiplier fractions.
- **Expanding Translucent Interior Wash**:
  - The interior of expanding shockwaves must be filled with semi-transparent warm color washes (e.g. `rgba(255, 107, 26, 0.18 * waveAlpha)`) that expand dynamically with each active wave disc.
- **Wavefront Opacity & Dissipation**:
  - Each individual ring starts at $R = 0$, blooms in rapidly as it pops out ($\text{popIn} \le 0.10$), maintains crisp line weight during travel, and smoothly dissipates as it disperses at the perimeter ($\text{fadeOut} = (1 - \text{lp})^{1.25}$).
- **Clean Circular & Crescent Compression Bands**:
  - Shockwaves MUST ALWAYS be drawn as continuous, smooth, concentric expanding rings or crescents with sharp line weights (e.g. supersonic white leading core, fiery orange outer stroke, violet ionization rim).
- **STRICT PROHIBITION of Radial Spoke Meshes & Cobwebbing**:
  - NEVER draw radial connecting lines, spoke rays, needle grids, starburst rays, or intersecting spokes bridging across concentric shockwave rings. Doing so creates an unintended spiderweb/cobweb/net pattern ("AI slop" aesthetic) that destroys visual punch and clarity.
- **Prohibition of Spinning Line Ticks**:
  - NEVER draw rotating straight line ticks or radial line segments attached to or spinning around shockwave perimeters. Particles, embers, and debris MUST be drawn as standalone discrete point dots, small squares, or detached shapes without any radial connecting lines.

### 2.12 Mandatory Lifesteal Healthbar-Only Feedback Standard — Prohibition of Arena Floating Text (Rule 27)
- **Strict Prohibition of In-Arena Floating Text**: NEVER spawn floating combat text (`spawnFloatingText`) in the arena for lifesteal recovery procs. High-frequency combat lifesteal during rapid combos causes excessive visual clutter that obscures arena action.
- **Healthbar-Only Feedback Mechanism**: All lifesteal healing MUST be displayed exclusively through the healthbar systems:
  1. **Direct HP Replenishment**: `this.hp = Math.min(this.maxHp, this.hp + healAmount);`
  2. **Top HUD Healthbar Card Pulse**: `this._lastHealAmount = (this._lastHealAmount || 0) + healAmount; this._healthBarHealTimer = 16;`
  3. **In-Game Overhead Healthbar & Number**: Rendered automatically above/below the fighter via `this.drawHealth(ctx)`.
- **Distinction from Ultimate Full-Heals**: One-off major ultimate activations or dramatic revival transformations (e.g. `FULL REGENERATION!`) may show singular floating text, but continuous combat lifesteal procs MUST NEVER spawn floating text in the arena.

---

## 3. Upright Faceless Pixel Art & Character Model Standards

### 3.1 Upright Front POV Orientation (Rule 19)
- Fighter body models, heads, hair, and uniforms MUST ALWAYS be drawn oriented upright facing directly towards the player/camera (Front POV):
  - `-Y` (Top): Hair, bangs, crest, headwear.
  - `Y ~ 0` (Center): Eyewear, iconic scars/stitches/markings.
  - `+Y` (Bottom): Collar, torso, belt, pants, boots.
  - `-X` / `+X` (Left / Right): Symmetrical side locks, shoulders, arms.
- Standard coordinate transform and vertical scale mirroring:
  ```javascript
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1); // Hair stays on -Y and boots on +Y when facing left!
  }
  ```

### 3.2 Facial Features Prohibition: Faceless Minimalist Aesthetic
- **STRICT PROHIBITION**: NEVER draw eyes, pupils, sclera, irises, eyelashes, mouths, lips, or nose bridges on fighter skins.
- Identity is conveyed exclusively through distinctive hair silhouettes, headgear/eyewear (blindfolds, goggles), thematic markings/scars, beard shadows, and tailored clothing.

### 3.3 Vertical Proportion Bands
- `-r * 1.15` to `-r * 0.35`: Crown Spikes & Outer Hair Volume (crown spikes extend to `-r * 1.05` to `-r * 1.15`).
- `-r * 0.35` to `-r * 0.18`: Bang Tips & Hairline Termination. Bangs never extend past `y = -r * 0.12`.
- `-r * 0.18` to `+r * 0.15`: Face / Forehead Zone (reserved for skin, eyewear, markings).
- `+r * 0.15` to `+r * 0.60`: Collar, Neck, Upper Chest.
- `+r * 0.60` to `+r * 1.00`: Lower Torso, Belt, Pants/Hakama.

### 3.4 Discrete Lock Arrays for Hair (No Sine Waves)
- **PROHIBITION**: NEVER generate hair using continuous trigonometric sine waves (`Math.sin(nx * freq)`).
- Procedural hair must be defined as discrete lock coordinate arrays with staggered strand lengths and sharp triangular tips.
- Hair uses a 4-tier palette: Tier 1 Undercut/Root, Tier 2 Base Tone, Tier 3 Mid-Lock Shadow, Tier 4 Specular Crown Glint.

### 3.5 Authentic 2D Discrete Grid Rasterization Engine ($P = 2.0\text{px}$) & Offscreen Canvas Cache
- **MANDATORY OFFSCREEN CACHE (CRITICAL)**: NEVER execute per-pixel `ctx.fillRect(px, py, P, P)` loops directly inside rotated gameplay render loops (`ctx.rotate(angle)`). Rotated sub-pixel quads cause anti-aliasing seams (the "crisscross white grid lines" artifact) and severe FPS drops.
- **The Gojo / Yuji / Sukuna Pattern**:
  1. Rasterize the discrete pixel art model ONCE into an axis-aligned in-memory canvas (`_cachedFighterCanvas`) using `_render[Fighter]PixelBodyToCanvas(destCtx, r)`.
  2. In the gameplay render loop, blit the cached canvas using a single `ctx.drawImage(_cachedFighterCanvas, -width / 2, -height / 2)` with `ctx.imageSmoothingEnabled = false;`.
  3. Invalidate/re-render the cache ONLY when `_cachedFighterR !== fighter.r`.
- **Discrete Rasterization Rules (Inside Offscreen Buffer)**:
  1. Fixed discrete grid unit ($P = 2.0\text{px}$) with integer coordinate snapping (`px = rx - P / 2`, `py = ry - P / 2`).
  2. 4-neighbor attached boundary shell test (`!isInsideShape((gx + 1) * P, gy * P) ...`) to render solid dark manga ink outline (`#0E0F14`) with zero floating crumbs.
  3. Clean solid stepped color bands (NO modulo dither noise like `(gx + gy) % 4` which resembles grid noise).
  4. 4-tier stepped shading hierarchy (Leading Glint Core `#FFFFFF`, Base Energy Rim, Burning Shadow, Void Ambient Occlusion).

### 3.6 Hand Layering & `drawPixelHand` Engine (Rule 20)
- Guard with `const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;`.
- **Canonical Default Hand Positioning**: In local coordinate space (`(0, 0)` body center, radius `r`):
  - **Left Hand**: Symmetrically positioned at lower-left flank `(x: -r * 0.82, y: +r * 0.38)` with radius `r * 0.30`.
  - **Right Hand**: Symmetrically positioned at lower-right flank `(x: +r * 0.82, y: +r * 0.38)` with radius `r * 0.30`.
  - **Front Layer Overlap**: Both hands MUST be drawn on the **front layer** (after the body circle), overlapping the lower perimeter boundary of the body circle with roughly half of each hand circle overlapping the body and half extending outward.
  - **Weapon Anchor**: Main-hand weapon hilt anchors at `(+r * 0.82, +r * 0.38)` during idle/rest, with the right hand drawn over the grip.
- All hands render via `drawPixelHand(ctx, cx, cy, radius, color, outlineColor)` with stepped dark ink outline and volumetric glint.


### 3.7 PNG Character Model Pixel Art Pipeline
- When using PNG skins (`Assets/model/<Name>-PIXEL-SKIN.png`):
  - Pre-render into 48x48 or 64x64 pixel art with 16-bit color quantization and binary alpha cut.
  - Scale with `ctx.imageSmoothingEnabled = false;` directly to `drawR = r * 1.04`.
  - Dynamic in-memory fallback uses offscreen canvas quantization if image is missing.

### 3.8 Mandatory Hair & Head Asset Model Import (Rule 22)
- When creating, scaffolding, or implementing new character skins, the agent **MUST ALWAYS** import and load the character's dedicated hair asset model:
  - **Module-Level Image Cache**: Define `let _[name]HairImage = null;` and an exportable `_get[Name]HairImage()` loader function with proactive eager initialization (`if (typeof window !== 'undefined' && typeof Image !== 'undefined') _get[Name]HairImage();`).
  - **Hair Renderer Function**: Define `_draw[Name]Hair(ctx, r, facingLeft)` supporting `state.skinCustomizations?.[characterId]` (scale, offsets, rotation, flipping) with nearest-neighbor pixel fidelity (`ctx.imageSmoothingEnabled = false;`).
  - **Bounding Box Calibration**: Calibrate hair scale and draw offsets so the crown spikes frame the upper body circle seamlessly at `-1.15r` to `-1.30r`.
  - **Directory Structure & Config Reference**: Store all character hair PNGs in `Assets/model/<characterId>/<Name>-hair.png` and register the path under `assets.hair` in `js/configs/characters/<name>Config.js`.

### 3.9 Mandatory Universal Character Body Model & Scale Standard (Rule 24 — Toji Reference Standard)
- **Primary Reference Standard (`tojiSkin.js`)**: When creating, scaffolding, or implementing new characters, agents **MUST ALWAYS use Toji's body model (`js/graphics/fighters/tojiSkin.js`) as the primary reference and baseline standard** for all character body models, geometry, outer stroke, and vertical proportional zoning.
- **Universal Baseline Body Radius**: All standard humanoid fighters MUST declare `r: 25, radius: 25` in their config (`js/configs/characters/<name>Config.js`) and fighter constructor. Only designated giant bosses/tanks (Mahoraga, Escanor, PEKKA, Nameless Deity) may use custom oversized radii.
- **1:1 Offscreen Canvas Buffer Architecture (Toji Standard)**:
  ```javascript
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;
  ```
  - Destination context MUST translate to `(destCtx.canvas.width / 2, destCtx.canvas.height / 2)` with `destCtx.imageSmoothingEnabled = false;`.
  - Main render loop blits via `ctx.drawImage(_cachedCanvas, -size / 2, -size / 2)` with `ctx.imageSmoothingEnabled = false;`.
- **Universal Vertical Proportion Zones (Toji Baseline)**:
  - **Zone 1: Pure Face & Cheeks Dome (`ry < r * 0.28` to `r * 0.32`)**: Clean tan/fair skin base tone (`#E8BD9B` / `#FFF0DE`) with side cheek contour (`#D4A373`). Scars, eyepatches, or markings MUST stay contained inside this dome. Zero hair may be baked into the body circle.
  - **Zone 2: Collar & Upper Torso / Shirt / Vest (`r * 0.28 <= ry < r * 0.64` to `0.68`)**: Full-width upper outfit covering `-r` to `+r` with high-collar rim, center placket/zipper, and chest highlights. NEVER draw bare skin at the outer flanks that pinches the torso.
  - **Zone 3: Waistband / Belt / Sash (`r * 0.64 <= ry < r * 0.78`)**: Belt band with distinct center knot, ribbon split, or buckle frame.
  - **Zone 4: Lower Trousers / Hakama / Skirt (`ry >= r * 0.78`)**: Lower garment with center fly seam, pleat creases, and luminance $Y \ge 24$.
- **Outer Ink Outline & Luminance Separation**:
  - Always use the Toji 4-neighbor boundary test (`Math.hypot((gx + 1) * P, gy * P) > r || Math.hypot((gx - 1) * P, gy * P) > r || Math.hypot(gx * P, (gy + 1) * P) > r || Math.hypot(gx * P, (gy - 1) * P) > r`) filled strictly with `#0E0F14`.
  - Interior clothing fabrics MUST maintain clear luminance separation ($Y \ge 24$, e.g. `#242A36` or brighter) so dark clothes NEVER merge into the black border and destroy the 1-pixel circular stroke.
- **Layer 2 Hair & Crown Volume Calibration**:
  - All character hair MUST be drawn on Layer 2 (`_draw[Name]Hair(ctx, r, facingLeft)`) after blitting the Toji-standard body circle.
  - Scale character hair to `targetHairWidth = r * 2.80 - r * 3.10` and `targetHairHeight = r * 2.10 - r * 2.30`.
  - Set crown apex anchor to `drawY = -r * 1.30` to `-r * 1.45` so the hair frames the head seamlessly with full anime volume matching Toji, Gojo, and Makima.

---

## 4. Systems Architecture (Weapon Studio, Tactical Force, Configs)

### 4.1 Config-Driven Architecture (No Magic Numbers)
- ALL character attributes, stats, cooldowns, channeling timers, damage multipliers, hit-stun frames, reach limits, knockback impulses, projectile velocities, and minion stats derive from `js/configs/characters/<name>Config.js` (`CONFIG.<characterId>`).
- Fallback expressions MUST exactly match the default constant in the character config.

### 4.2 Weapon Studio System
- State lives in `state.weaponCustomizations` and persists via `localStorage('ramball_weaponCustomizations')`.
- Weapons support `offsetX`, `offsetY`, `scale` (`0.30x – 3.00x`), and `angleOffset`. Mahito claws support per-finger knuckle/tip positions, fan angles, arch curves, `drawOrder`, and global `weaponScale`.

### 4.3 Tactical Force Engineering
- All firearms follow the Unified Neon Cyberpunk Theme (Deep obsidian receiver `#0b0f19`, glowing neon contours `1.2px – 1.4px`, dynamic character theme colors: M4A1 Cyan, SPAS-12 Mint, Desert Eagle Amber, AWP Plasma Blue).
- Obstacle physics resolves perimeter and interior overlaps with 0.85–0.90 restitution.
- Tactical AI evaluates line-of-sight raycasting (`hasLineOfSight`) before shooting, avoids locking aim through solid walls, and holds fire on blocked sightlines.
