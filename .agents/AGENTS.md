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

### 0.7 Mandatory Post-Change Suggestions (Why, Pros, Cons, Don't)
After completing ANY code modification, update, or fix in the project, the agent MUST ALWAYS conclude the final response with a **"💡 Suggestions"** section containing 2–4 specific, actionable follow-up improvements formatted strictly as:
```markdown
---

### 💡 Suggestions

1. **[Actionable Suggestion Title]**
   - **Why**: [Clear technical, gameplay, or performance rationale explaining the core problem it solves]
   - **Pros**: [Key benefits, capabilities unlocked, developer or gameplay improvements]
   - **Cons**: [Trade-offs, limitations, added complexity, or maintenance considerations]
   - **Don't**: [Specific anti-pattern, common trap, or breaking mistake to strictly avoid when implementing this]

2. **[Another Suggestion Title]**
   - **Why**: ...
   - **Pros**: ...
   - **Cons**: ...
   - **Don't**: ...
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

### 3.5 Authentic 2D Discrete Grid Rasterization Engine ($P = 2.0\text{px}$)
- When converting skins, weapon slashes, or VFX to pixel art style:
  1. `ctx.imageSmoothingEnabled = false;` in save/restore blocks.
  2. Fixed discrete grid unit ($P = 2.0\text{px}$) with coordinate snapping (`snap = (v) => Math.round(v / P) * P`).
  3. Iterate over a 2D integer bounding grid with continuous inside-shape testing (`ctx.fillRect(px, py, P, P)`).
  4. 4-neighbor attached boundary shell test (`!isInsideShape(gx + P, gy) ...`) to render solid dark manga ink outline (`#111114` / `#0E0F14`) with zero floating crumbs.
  5. 4-tier stepped shading hierarchy (Leading Glint Core `#FFFFFF`, Base Energy Rim, Burning Shadow, Void Ambient Occlusion).

### 3.6 Hand Layering & `drawPixelHand` Engine (Rule 20)
- Guard with `const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;`.
- **Back Hand**: Positioned on forward side at `(r * 1.05, 0)` behind body circle.
- **Body Circle**: Drawn at `(0, 0)` with upright head (`-Y`) and torso (`+Y`).
- **Front Hand**: Positioned at guard center `(0, 0)` on top of body.
- All hands render via `drawPixelHand(ctx, cx, cy, radius, color, outlineColor)` with stepped dark ink outline and volumetric glint.

### 3.7 PNG Character Model Pixel Art Pipeline
- When using PNG skins (`Assets/model/<Name>-PIXEL-SKIN.png`):
  - Pre-render into 48x48 or 64x64 pixel art with 16-bit color quantization and binary alpha cut.
  - Scale with `ctx.imageSmoothingEnabled = false;` directly to `drawR = r * 1.04`.
  - Dynamic in-memory fallback uses offscreen canvas quantization if image is missing.

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
