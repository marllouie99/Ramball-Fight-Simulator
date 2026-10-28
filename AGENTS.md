# AI Coding Agent Instructions

## Canonical Default Model Hand Positioning & Weapon Wielding (Rule 20)

When creating or rendering new characters and model skins, ALWAYS use the approved default hand positioning standard:
- **Symmetrical Lower-Flank Placement**: Both hands are circular elements (`drawPixelHand`) positioned symmetrically at the lower-left and lower-right flanks of the central body circle in local coordinate space:
  - **Left Hand**: `(x: -r * 0.82, y: +r * 0.38)`
  - **Right Hand**: `(x: +r * 0.82, y: +r * 0.38)`
- **Hand Radius**: `handRadius = r * 0.30` (or `getHandSize(r * 0.30)`).
- **Layering & Overlap**: Both hands MUST be rendered on the **front layer** (after rendering the central body circle), overlapping the lower perimeter of the body circle so approximately half of each hand circle overlaps the body edge and half protrudes outward as a distinct side fist.
- **MANDATORY INSTRUCTION — ALWAYS USE DEFAULT HANDS TO HOLD WEAPONS**:
  - For all weapon users and dual wielders, weapons MUST ALWAYS be anchored directly at the canonical default hands:
    - Main-hand (Right Hand): hilt/grip anchors directly at `(x: +r * 0.82, y: +r * 0.38)`.
    - Off-hand / Dual-wield (Left Hand): hilt/grip anchors directly at `(x: -r * 0.82, y: +r * 0.38)`.
  - The canonical default hand MUST be drawn directly over the weapon grip/hilt (`drawPixelHand` at `(0, 0)` in weapon local space).
  - **STRICT PROHIBITION of Weapon-Generated Duplicate Hands**: Weapon renderers MUST NEVER generate, create, or instantiate separate or arbitrary hands. Never render weapons with disconnected hands floating on the body while empty default hands sit below (resulting in 4 hands on screen). Always ensure single-source-of-truth hand rendering with exactly ONE pair of hands on the character across all match states.

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

## Mandatory YouTube Shorts Thumbnail & Vertical Arena Layout Standard (Rule 28)

The vertical gameplay mode is used directly for YouTube Shorts channel thumbnails and video captures. Agents **MUST ALWAYS PRESERVE THE CANONICAL VERTICAL ARENA DIMENSIONS**:
- **Canonical Vertical Arena Geometry**: Strictly locked to `{ x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' }` on the `540 × 960` portrait canvas.
- **Strict Prohibition of Ad-Hoc Vertical Arena Scaling**: NEVER change vertical arena dimensions (`450×450`), horizontal centering (`x: 45`), or vertical position (`y: 240`) without explicit user instruction. This guarantees that all in-game YouTube Shorts thumbnails maintain 100% pixel-aligned consistency across the channel feed:
  1. **Top Match Title Banner (`#hudTopContainer`)**: Fixed header baseline with `240px` clearance above the arena.
  2. **Arena Bounding Box**: Uniform `450 × 450` square frame with `45px` side margins.
  3. **Bottom Skill & Status Card HUDs (`#hudBottomContainer`)**: Anchored directly below the arena floor (`y: 690 = 240 + 450`), preserving identical breathing room.
- **Viewport Isolation**: All horizontal widescreen expansions (e.g. 1400×1400 arena, wide spawns, camera zoom) MUST be isolated under `state.viewOrientation === 'horizontal'` and must never leak into vertical mode.

## Mandatory Horizontal Mode Side Doll & Sprite Sheet Ground-Anchor Standard (Rule 29)

When implementing, rendering, or scaffolding side character dolls or animated standing sprites in Horizontal Mode:
- **Placement & Symmetrical Flanking**:
  - Dolls occupy the empty vertical column below the Left (Player 1) and Right (Player 2) side HUD cards.
  - **Left Doll**: Anchored at `centerX = 118px`, `baselineY = arena.y + arena.height - 4px` (~`466px`), facing right toward the arena center.
  - **Right Doll**: Anchored at `centerX = 960px - 118px = 842px`, `baselineY = arena.y + arena.height - 4px` (~`466px`), facing left toward the arena center.
  - A subtle floor shadow ellipse (`rx = 44px, ry = 9px`) MUST be drawn under the feet of each doll at `(centerX, baselineY)`.
- **Per-Frame Sprite Sheet Foot & Spine Anchoring (Anti-Wobble Rule)**:
  - Multi-frame sprite sheets (e.g. `Denji-pixel-art-animation-sprite-sheet.png`) often have varying internal $X$ and $Y$ offsets per cell.
  - **STRICT PROHIBITION of Naive Centering**: NEVER draw multi-frame sprite cells with static `-drawW / 2` box offsets. Doing so causes the character to slide or wobble forward and backward back and forth as frames cycle.
  - **Mandatory Frame Anchors**: Each frame MUST declare calibrated ground anchor points (`footX`, `footY`). Rendering MUST translate to `-frame.footX * scale` and `-frame.footY * scale` so character feet and spine remain 100% stationary on the ground while the torso, chest, and head animate.
- **Natural Breathing Frame Sequences**:
  - Sprite breathing/idle animations MUST follow true physiological inhale/exhale cycles (e.g. Denji `[0, 2, 1, 3, 5, 4]`).
  - Play back at a calm breathing cadence ($\approx 6.5\text{--}9\text{ FPS}$, $8\text{--}10\text{ ticks/frame}$).
  - Multi-frame sprite sheet dolls MUST NOT have artificial external vertical $Y$-bobbing applied on top of built-in breathing frames.
- **Continuous 60 FPS Real-Time Timing**:
  - Always derive doll animation ticks from continuous high-resolution timestamps (`performance.now()`) to ensure fluid, uninterrupted frame cycling across all match states.

## Mandatory 5-Phase Melee Combat Animation, Impact Lock & Arm Physical Force Standard (Rule 30)

When creating, scaffolding, animating, or tuning melee weapons and basic attack combos for any fighter (e.g. Maki Zen'in, Escanor, Toji, Ichigo, Nanami, Musashi, PEKKA, Knight, Guts):
- **STRICT PROHIBITION of Weightless Snappy Swings & Detached Floating Hands**:
  - NEVER implement melee attacks that transition immediately from the swing stroke into recovery on the exact frame the stroke finishes. Doing so creates an unsatisfying, snappy, floaty swing that feels like a rubber band snapping back or bouncing off thin air.
  - NEVER render weapons with disconnected, floating hands rotating around a static body center `(0, 0)` with no bodily leverage.
- **Mandatory Minimum Frame Durations & Anti-Snappiness Mandate (Anti-Micro-Frames)**:
  - **STRICT PROHIBITION of Snappy Micro-Frames**: NEVER set attack animation phase durations to tiny, compressed frame counts (e.g. 2–4 frame strikes, 1–3 frame windups/locks/recoveries). At 60 FPS (16.6ms/frame), a 3-frame strike passes in 50ms—below human visual motion continuity threshold—causing the weapon to teleport instantly and appear as an ugly, jerky rubber-band snap.
  - **Minimum Frame Allocations**:
    - **Heavy Melee Cleaves & Special Skills** (e.g. Dragon Slayer, Escanor Divine Axe, Calamity Cleave, Boss Finishers): Windup $\ge 20\text{--}30\text{f}$ (never $< 16\text{f}$), Strike $\ge 8\text{--}12\text{f}$ (STRICT PROHIBITION of $< 8\text{f}$, never 2–4f!), Impact Lock $\ge 12\text{--}18\text{f}$ (never $< 10\text{f}$), Recovery Settle $\ge 18\text{--}26\text{f}$ (never $< 14\text{f}$). Total duration $\ge 60\text{--}85\text{f}$ (~$1.0\text{--}1.4\text{s}$).
    - **Standard / Quick Combo Strikes**: Lift $\ge 8\text{--}12\text{f}$, Hold $\ge 2\text{--}4\text{f}$, Strike $\ge 6\text{--}8\text{f}$ (STRICT PROHIBITION of $2\text{--}4\text{f}$!), Impact Lock $\ge 6\text{--}8\text{f}$, Recovery Settle $\ge 12\text{--}16\text{f}$. Total duration $\ge 35\text{--}48\text{f}$.
  - **Maximum Angular Delta Clamping ($\Delta \theta \le 35^\circ\text{--}45^\circ$ per frame)**: A weapon's rotation angle must NEVER jump more than $35^\circ\text{--}45^\circ$ in a single frame. Wide $180^\circ\text{--}300^\circ$ cleaves MUST be distributed across at least $8\text{--}12\text{ frames}$ in Phase 3 using non-linear power ease (`Math.pow(sp, 2.2)` to `2.6`).
- **Mandatory Muscular Arm Linkages & Physical Force Drive**:
  - **Dynamic Arm Linkage Rendering (Shoulders to Grip)**: Renderers MUST explicitly draw dynamic arm segments (upper arm, elbow flexion, forearm polygons or strokes matching character skin tone, sleeves, or armor) connecting the fighter's shoulders/torso flanks (`±r * 0.65, r * 0.22`) directly to the hands gripping the weapon.
  - **Bodily Kinetic Force Transfer (Translational Lunge & Dip)**: Hands and weapon hilt MUST translate dynamically through space via `_getSwordSwingOffsets()` (`lunge`, `offY`) rather than rotating statically around `(0, 0)`:
    - **Phase 1 (Coil / Lift)**: Arms and weapon pull backward into tension (`lunge = -coilBack`, `offY = -liftY`).
    - **Phase 3 (Hypersonic Whip Strike)**: Upper body muscles thrust forward, driving hands and weapon into the cleave plane with exponential power ease (`Math.pow(sp, 2.5)`).
    - **Phase 4 (Impact Lock)**: Hands and arms remain locked at full extension (`lunge = maxLunge`, `offY = cleaveDip`), sustaining target collision force.
  - **Push-Pull Muscular Lever Mechanics (Dual Hands)**: For 2-handed weapons, the main hand (near crossguard) acts as the forward driving fulcrum lever while the off-hand (near pommel) pulls backward or guides counter-torque, visibly levering the blade through the cutting plane.
  - **Kinetic Recoil Kickback & Elastic Muscle Settle**: In Phase 5 (Recovery Settle), arresting the inertia of swinging heavy steel MUST apply a physical backward velocity recoil impulse on the fighter entity (`this.vx -= Math.cos(angle) * recoilKick`), screen rumble (`triggerGlobalScreenShake(2.5, 4)`), and spring-damped arm recovery oscillation (`Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2)`).
- **Mandatory 5-Phase Animation Architecture**: All melee swings MUST implement the 5-phase timing lifecycle across config (`js/configs/characters/<name>Config.js`), weapon renderer (`js/graphics/weapons/*WeaponGraphics.js`), and entity loop (`js/entities/fighters/*Fighter.js`):
  1. **Phase 1: Coil / Lift (`hit*LiftFrames`, 8–12f quick, 20–30f heavy)**: Smooth backward anticipation lift drawing arms and blade into potential energy load (`Math.sin(wp * Math.PI * 0.5)`). Heavy skills stage multi-step ready-to-coil drops.
  2. **Phase 2: Poised Hold (`hit*HoldFrames`, 2–4f quick, 4–6f heavy)**: Tense pause at apex of anticipation (Escanor poised hold) before releasing the strike.
  3. **Phase 3: Hypersonic Whip Strike (`hit*StrikeFrames`, 6–8f quick, 8–12f heavy — STRICT PROHIBITION of 2–4f!)**: Explosive acceleration into the cleave plane with exponential power ease (`Math.pow(sp, 2.2)` to `2.6`) and lunging forward momentum. Deliver impact damage, hit-pause, and audio at `strikeP >= 0.50`.
  4. **Phase 4: THE IMPACT LOCK / IMPACT LATCH (`hit*ImpactLockFrames` / `hit*LockFrames` / alias `hit*PinFrames`, 6–8f quick, 12–18f heavy)**:
     - **Stationary Weapon Lock**: Weapon MUST remain firmly locked/latched into the impact plane (embedded in the ground, struck into target flesh, or locked at cleave apex, e.g. `weaponRot = 1.10`, `weaponLunge = 24px`, `weaponOffY = 14px`) throughout the entire impact lock window before recovery begins.
     - **Zero Forward Velocity Clamp**: Fighter velocity MUST be clamped (`this.vx = 0; this.vy = 0;`) while the weapon is locked at impact to simulate hard physical collision and inertia transfer.
     - **Micro-Tremor Jitter**: Weapon experiences high-frequency vibration/tremor (`±2.2px`, `±0.12 rad`) against impact resistance (`swordTremorIntensity`).
     - **Visual Slash Ribbon Lock Hold**: Slash arcs and annular ribbon meshes MUST remain 100% unfurled and anchored at the impact plane throughout the entire lock window. Recovery eraser wipes MUST NOT begin until Phase 5 starts.
     - **Direct 1:1 Leading-Edge Blade Anchor**: The leading edge of the slash ribbon/arc MUST be locked directly to the weapon's real-time angle (`currentEndAngle = swordLocalAngle`), NEVER computed with a separate easing exponent that causes visual drift.
     - **Full-Length Geometric Enveloping**: The radial span of the slash effect MUST envelop the full length of the blade from guard/collar (`innerR = r + hiltOffset`) to the blade tip kissaki (`outerR = r + hiltOffset + bladeLength + 4px`), with impact sparks and compression rings detonating directly at the blade tip.
     - **Impact Compression & Sparks**: Expanding concentric compression ring and discrete ember sparks at the impact contact point (Rule 26 compliant).
  5. **Phase 5: Extraction & Recovery Settle (`hit*RecoveryFrames`, 12–16f quick, 18–26f heavy)**: Blade dislodges from the impact plane and returns to guard stance with spring-damped settle (`Math.pow(1.0 - rp, 1.8)` with damped harmonic wave), while the slash arc erases from tail to tip (Rule 15).
- **Mandatory Multi-Sequence Combo Continuity (Zero Mid-Combo Angle Reset)**:
  - Whenever creating or animating a multi-sequence attack animation or chained combo skill (e.g. Sequence 1 $\rightarrow$ Sequence 2), **NEVER reset the weapon angle back to neutral stance between sequences** (`seq1RecoveryFrames: 0`, using nullish coalescing `?? 0`).
  - Sequence 1 MUST hold its Phase 4 follow-through lock angle and hand offsets (`cleaveApexAngle`, `{ lunge, offY }`), and Sequence 2 MUST begin its Phase 1 coil directly from Sequence 1's exact ending lock angle and offsets. Only the **final sequence** in the combo executes Phase 5 Recovery Settle back to neutral stance.
  - Do NOT register `durationKey` in `SkillManager` for multi-sequence skills managed by custom sequence timers, so `SkillManager.tickDurations()` never double-decrements the timer or prematurely terminates `activeKey` after Sequence 1.
- **Layered Fleshy "Slap" Audio Palette**:
  - Combat hits MUST layer `attack_fleshhit` (1.0 volume) with blade slicing SFX (`sukuna_slice` or `attack_swordswing` at 0.90 volume) and heavy sub-bass punches (`attack_heavypunch1` on combo finishers) to deliver a visceral concussive slap impact rather than a generic metallic whoosh.
- **Reference Playbook**: For detailed math, schemas, and templates, see dedicated skills `melee-attack-animator` (`.agents/skills/melee-attack-animator/SKILL.md`) and `chemical-katana-animator` (`.agents/skills/chemical-katana-animator/SKILL.md`).
- **Mandatory 12-Frame Visual Animation Creation & Directory Standard**:
  - **Trigger**: Whenever the user asks to create, generate, extract, format, or implement a 12-frame animation (explosions, bursts, slashes, projectile travels, fireballs, shockwaves, impacts, or beam effects), the agent **MUST ALWAYS activate the `twelve-frame-animation-generator` skill (`.agents/skills/twelve-frame-animation-generator/SKILL.md`)**.
  - **MANDATORY DIRECTORY PROTOCOL — GO TO FIGHTER'S MODEL FOLDER & CREATE EFFECT FOLDER**:
    1. The agent MUST go to `Assets/model/` and navigate into the fighter's dedicated model directory: `Assets/model/<characterId>/` (e.g. `Assets/model/gojo/`, `Assets/model/sukuna/`, `Assets/model/reze/`, `Assets/model/ash/pokemon/charizard/`).
    2. Inside that fighter's model folder, CREATE a dedicated subfolder specifically named for that certain visual animation (e.g. `Assets/model/<characterId>/<visualName>/` such as `Assets/model/gojo/Purple_idle_travel/`, `Assets/model/sukuna/Fuga_explosion/`, `Assets/model/reze/explosion/`, `Assets/model/ash/pokemon/charizard/Flame/`).
    3. Put the animation files DIRECTLY inside that created visual folder: all 12 individual frames named `<visualName>-1.png` through `<visualName>-12.png` and the master composite horizontal strip `<visualName>-b.png`.
    4. Register the asset in `js/configs/characters/<name>Config.js` under `assets.<visualName>` and implement the 12-frame loader & renderer in `js/graphics/weapons/<name>WeaponGraphics.js`.
  - **STRICT PROHIBITION**: NEVER save 12-frame animations in arbitrary root directories, global assets folders, or temporary folders without creating the dedicated visual subfolder inside the fighter's `Assets/model/<characterId>/` directory.
- **Canonical 12-Frame Weapon Slash Attack Template & Skill**: Whenever the user asks to generate, extract, format, or implement an animation for any weapon attack, melee strike, blade slash, or sword cleave, the agent **MUST ALWAYS look for the canonical slash template in `Assets/effects/Slash Attack/` FIRST** before searching anywhere else (see dedicated skill `slash-animation-generator` at `.agents/skills/slash-animation-generator/SKILL.md`). The slash effect MUST spawn at the very tip of the weapon (`get[Weapon]TipWorldPos()`), envelop the blade reach with anchor `(95, 135)`, trail strictly behind the cutting blade during Phase 3, and preserve $>20\text{px}$ clearance from the fighter's head/body.
- **Mandatory YouTube Video Title & Matchup Packaging Skill**: Whenever the user asks for a YouTube video title, Shorts hook, clickbait angle, unique title, or packaging for any matchup or character in Circle Mini-Battle / Fight of Characters, the agent **MUST ALWAYS activate the `youtube-title-generator` skill (`.agents/skills/youtube-title-generator/SKILL.md`)** to provide structured titles across the 5 canonical tiers (Unique/Thematic Contrasts, High-CTR Shorts Hooks, Debate Drivers, Cinematic Manga One-Liners, and Clean SEO Channel Branding) with a highlighted top recommendation.

## Mandatory Uncropped Visual Effects & Anti-Rectangular Clipping Standard (Rule 31 — Anti-Box & Feathered Boundary Standard)

Whenever creating, extracting, formatting, or rendering visual effects, sprite animations, beams, bursts, auras, shockwaves, portals, or projectile graphics:
- **STRICT PROHIBITION of Rectangular Bounding Box Clipping ("The Box Artifact")**:
  - Visual effects MUST NEVER be clipped or truncated by the boundaries of their sprite frame or draw calls.
  - NEVER crop sprite frames tightly into expanding or organic visual elements where non-zero alpha pixels touch the top (`y = 0`), bottom (`y = height - 1`), or origin edges (`x = 0`). Doing so causes the sprite to render with amateurish, razor-sharp flat rectangular cutoffs that destroy combat immersion.
- **Mandatory Generous Transparent Padding on Sprites**:
  - When extracting or generating animation frames and sprite sequences (e.g. 12-frame animations, bursts, explosions, charging orbs):
    - All non-continuous borders MUST maintain generous 100% transparent alpha margins (minimum 15–30px of `alpha = 0` padding) around all visual elements.
    - Top row (`y = 0`), bottom row (`y = height - 1`), and non-travel origin borders MUST have `max(alpha) === 0`.
    - For directional linear beams, ONLY the forward travel edge (extending down the length) is permitted to meet the right border; the origin/back edge, top flank, and bottom flank MUST remain 100% transparent.
- **Prohibition of Flat `fillRect` Aura Cuts**:
  - Renderers MUST NEVER use `ctx.fillRect()` with hard perpendicular start lines (e.g. `ctx.fillRect(0, -auraH, length, auraH * 2)`) to render atmospheric energy auras or beam glows. When rotated, a `fillRect` starting at `x = 0` renders a sharp diagonal cut across the screen.
  - Atmospheric auras and energy washes MUST use smooth rounded caps at the origin (e.g. `ctx.arc(0, 0, auraH, Math.PI / 2, -Math.PI / 2, false)`) combined with a soft 360° radial gradient bloom (`ctx.createRadialGradient(0, 0, 0, 0, 0, auraH * 1.15)`), guaranteeing organic, soft, non-linear dissipation around the fighter's body.
- **Calibrated Centroid Anchor for Origin Portals**:
  - When drawing origin portals, muzzle accelerator rings, or charging spheres at a fighter's hands `(0, 0)`, the draw origin MUST be anchored to the true visual centroid of the orb/swirl (`portalOriginX = orbCentroidX * scale`, `portalOriginY = portalDrawH / 2`), ensuring the circular geometry blooms symmetrically from the hands without flat rectangular clipping.

## Mandatory Universal Character Black Outline Standard (Rule 32)

Whenever creating, scaffolding, designing, or rendering any character or model skin:
- **MANDATORY INSTRUCTION — ALWAYS ADD OUTER BLACK OUTLINE**: The agent **MUST ALWAYS** render a crisp, bold black manga ink outline (`#0E0F14` or `#000000`, 2.0px stroke) around the character's body circle and pixel hands:
  ```javascript
  // Layer 1.5: Mandatory Universal Character Black Outline Standard (Rule 32)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#0E0F14';
  ctx.stroke();
  ctx.restore();
  ```
- **Arena Background Contrast & Anti-Blend Standard**: The canonical arena floor in Circle Mini-Battle is bright/white (`#FFFFFF` / `#F8FAFC`). Any fighter with fair skin, white helmets (e.g. Bomber Man), light/blonde hair, or bright clothing MUST have a crisp black outline so the character geometry never bleeds into or vanishes against the arena floor.
- **Canonical Hand Outline**: Canonical default hands (`drawPixelHand`) MUST always use `outlineColor = '#0E0F14'` (or `#000000`) so fists remain sharply defined against the body.
- **Reference Playbook & Skill**: Activate the dedicated skill `character-black-outline` (`.agents/skills/character-black-outline/SKILL.md`).

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