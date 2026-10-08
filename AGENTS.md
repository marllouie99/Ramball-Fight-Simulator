# AI Coding Agent Instructions

## Canonical Default Model Hand Positioning (Rule 20)

When creating or rendering new characters and model skins, ALWAYS use the approved default hand positioning standard:
- **Symmetrical Lower-Flank Placement**: Both hands are circular elements (`drawPixelHand`) positioned symmetrically at the lower-left and lower-right flanks of the central body circle in local coordinate space:
  - **Left Hand**: `(x: -r * 0.82, y: +r * 0.38)`
  - **Right Hand**: `(x: +r * 0.82, y: +r * 0.38)`
- **Hand Radius**: `handRadius = r * 0.30` (or `getHandSize(r * 0.30)`).
- **Layering & Overlap**: Both hands MUST be rendered on the **front layer** (after rendering the central body circle), overlapping the lower perimeter of the body circle so approximately half of each hand circle overlaps the body edge and half protrudes outward as a distinct side fist.
- **Weapon Wielding**: For weapon users, the main-hand weapon hilt/grip anchors directly at `(x: +r * 0.82, y: +r * 0.38)` during idle/rest, with the hand drawn over the grip.

## Mandatory In-Game Overlay HP & Status Drawing (Rule 21)

Whenever creating, scaffolding, or overriding a fighter's rendering pipeline:
- **Custom `draw(ctx, opponent)` Override**: If the fighter class defines or overrides `draw(ctx, opponent)`, it **MUST ALWAYS** explicitly call `this.drawHealth(ctx);` and `this.drawFreezeTimer(ctx);` at the very end of `draw()` on the top layer.
- **`drawBody(ctx)` Implementation**: The fighter class MUST define `drawBody(ctx)` (e.g. `drawBody(ctx) { draw[Name]Skin(ctx, this); }`) so standard engine render passes and preview hooks function properly.
- **Never Omit `this.drawHealth(ctx)`**: Omitting `this.drawHealth(ctx)` removes the in-game floating HP number underneath/above the fighter during combat. Always ensure overhead HP is rendered.

## Mandatory Hair & Head Asset Model Import (Rule 22)

When creating, scaffolding, or implementing new characters and model skins, the agent **MUST ALWAYS** import and load the character's dedicated hair asset model (`Assets/model/<characterId>/<Name>-hair.png`):
- **Module-Level Image Cache**: Define `let _[name]HairImage = null;` and an exportable `_get[Name]HairImage()` loader function with proactive eager initialization (`if (typeof window !== 'undefined' && typeof Image !== 'undefined') _get[Name]HairImage();`).
- **Hair Renderer Function**: Define `_draw[Name]Hair(ctx, r, facingLeft)` supporting `state.skinCustomizations?.[characterId]` (scale, offsets, rotation, flipping) with nearest-neighbor pixel fidelity (`ctx.imageSmoothingEnabled = false;`).
- **Bounding Box Calibration**: Calibrate hair scale and draw offsets so the crown spikes frame the upper body circle seamlessly at `-1.15r` to `-1.30r`.
- **Directory Structure & Config Reference**: Store all character hair PNGs in `Assets/model/<characterId>/<Name>-hair.png` and register the path under `assets.hair` in `js/configs/characters/<name>Config.js`.

## Mandatory Basic Projectile Suppression (Rule 23)

When creating, scaffolding, or implementing new characters:
- **Suppress Base Projectile Shooting (`shoot(ownerIndex)`)**: Unless the character is explicitly designed as a vanilla generic gun/bullet shooter, the fighter class **MUST ALWAYS** override `shoot(ownerIndex)` with a blank method or dedicated melee/skill action:
  ```javascript
  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Character uses dedicated combat skills, weapons, or melee combos
  }
  ```
- **Why**: Base `Fighter.update()` in `fighter.js` automatically invokes `this.shoot(ownerIndex)` whenever `shootCooldown <= 0`, which spawns unwanted generic bullet/orb projectiles unless explicitly overridden.

## Mandatory Universal Character Body Model & Scale Standard (Rule 24 — Toji Reference Standard)

When creating, scaffolding, or implementing new characters, agents **MUST ALWAYS use Toji's body model (`js/graphics/fighters/tojiSkin.js`) as the primary reference and baseline standard** for all character body models, geometry, outer stroke, and vertical proportional zoning:
- **Canonical Baseline Reference (`tojiSkin.js`)**: Always inspect and clone the rasterization architecture from `js/graphics/fighters/tojiSkin.js`. Toji's body model defines the gold standard for perfectly circular 4-neighbor manga ink outlines, clean facial domes without baked hair, and crisp multi-zone clothing layers.
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



## Mandatory Non-Freezing Active Visual Effects & Particle Decay Standard (Rule 25)

Whenever a character is stopped, hit-paused, time-stopped, or immobilized by any attack or status effect (e.g. `_handleTimeStop()`, Gojo Infinity freeze, domain stasis, ambush stasis, paralyze, Makima chains, Saitama counter stasis, Nanami ratio pause, Cronos stasis, or death), all non-interactive visual effects, transient explosion rings, particle emitters, slashes, and shockwaves **MUST NEVER freeze in mid-air or get stuck on screen**:
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

## Mandatory Clean Concentric Shockwave Standard — Anti-Cobweb & Anti-Mesh Rule (Rule 26)

When rendering explosive shockwaves, detonation perimeters, Mach compression rings, impact blasts, or aura waves:
- **Sequential Water-Ripple Wavefront Staggering ("Dipping Fingers in Steady Water")**:
  - Shockwave rings MUST ALWAYS animate with sequential, staggered wave propagation where concentric compression rings pop out 1-by-1 from the detonation center with progressive time offsets ($t_0 = 0.00, t_1 = 0.12, t_2 = 0.24, \dots$) and extend outward smoothly along a decelerating power curve ($R_k = R_{\max} \cdot \text{lp}_k^{\text{speedPow}}$).
  - NEVER spawn all concentric rings at full radius simultaneously with fixed static multiplier fractions.
- **Expanding Translucent Interior Wash**:
  - The interior of expanding shockwaves must be filled with semi-transparent warm color washes (e.g. `rgba(255, 107, 26, 0.18 * waveAlpha)`) that expand dynamically with each active wave disc.
- **Wavefront Opacity & Dissipation**:
  - Each individual ring starts at $R = 0$, blooms in rapidly as it pops out ($\text{popIn} \le 0.10$), maintains crisp line weight during travel, and smoothly dissipates as it disperses at the perimeter ($\text{fadeOut} = (1 - \text{lp})^{1.25}$).
- **Clean Circular & Crescent Compression Bands**:
  - Shockwaves MUST ALWAYS be drawn as continuous, smooth, concentric expanding rings or crescents with sharp, solid line weights (e.g. supersonic white leading core, fiery orange outer stroke, violet ionization rim).
- **STRICT PROHIBITION of Radial Spoke Meshes & Cobwebbing**:
  - NEVER draw radial connecting lines, spoke rays, needle grids, starburst rays, or intersecting spokes that bridge across concentric shockwave rings. Doing so forms an unintended spiderweb, net, or cobweb pattern ("AI slop" aesthetic) that destroys visual punch and clarity.
- **Prohibition of Spinning Line Ticks**:
  - NEVER draw rotating straight line ticks or radial line segments attached to or spinning around shockwave perimeters. Particles, embers, and debris MUST be drawn as standalone discrete point dots, small squares, or detached shapes without any radial connecting lines.

## Mandatory Lifesteal Healthbar-Only Feedback Standard — Prohibition of Arena Floating Text (Rule 27)

When implementing, tuning, or maintaining lifesteal, blood siphon, or continuous vampiric HP recovery mechanics for any character (e.g. Reze Bomb Devil Form, Denji Chainsaw Shred, Ichigo Hollow Mask, Mahito Domain, Ruby Scythe):
- **Strict Prohibition of In-Arena Floating Text**: NEVER spawn floating combat text (`spawnFloatingText`) in the arena for lifesteal recovery procs. High-frequency combat lifesteal during rapid combos causes excessive visual clutter that obscures arena action.
- **Healthbar-Only Feedback Mechanism**: All lifesteal healing MUST be displayed exclusively through the healthbar systems:
  1. **Direct HP Replenishment**: `this.hp = Math.min(this.maxHp, this.hp + healAmount);`
  2. **Top HUD Healthbar Card Pulse**: `this._lastHealAmount = (this._lastHealAmount || 0) + healAmount; this._healthBarHealTimer = 16;`
  3. **In-Game Overhead Healthbar & Number**: Rendered automatically above/below the fighter via `this.drawHealth(ctx)`.
- **Distinction from Ultimate Full-Heals**: One-off major ultimate activations or dramatic revival transformations (e.g. `FULL REGENERATION!`) may show singular floating text, but continuous combat lifesteal procs MUST NEVER spawn floating text in the arena.

## Post-Change Suggestions

This applies to any chat-based AI coding assistant working in this repository, regardless of IDE, extension, model, or provider, whenever these project instructions are loaded.

After making a code change, always conclude the final response with a `### 💡 Suggestions` section containing 2–4 concise, actionable follow-ups relevant to the change. Each suggestion must include:

- **Why**: The problem or opportunity it addresses.
- **Pros**: The concrete benefits.
- **Cons**: The trade-offs or maintenance cost.
- **Don't**: A specific pitfall to avoid.
- **Example Scenario**: A concrete situation where the follow-up would help.

Do not suggest work that was already completed. Keep each part to 1–2 sentences, and make the scenario realistic and directly connected to the suggestion. Follow the detailed standard in `.agents/rules/post-change-suggestions.md`.

This is an always-on project instruction, not an on-demand skill. IDEs and chat agents differ in how they discover project instructions; configure any tool that does not automatically load the root `AGENTS.md` to include it as project context.

VS Code's Local agent harness also runs the Stop reminder in `.github/hooks/post-change-suggestions.json`, gated by Git changes during the current prompt. Other IDEs or hosted agent harnesses need their own supported Stop-hook configuration.