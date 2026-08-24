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
- Stunned, paralyzed, or time-stopped entities (fighters & illusions) render the 3D orbiting golden rings and stars stun visual (`drawParalyzeEffect`), avoiding full-body cyan paint overlays.

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

## 16. Manga Action Speed Line Effects — Construction & Angle Standards

### Overview
Manga action speed lines (motion lines) are compact clusters of razor-sharp, tapered needle streaks that stream **behind** a fighter during high-speed flurries, lunges, or rapid strike abilities. They visually convey supersonic momentum and strike direction. These standards apply to all existing and future fighters.

### Architecture & Pipeline
- Implement as a dedicated canvas 2D draw function in `effectsRenderer.js` (e.g., `draw<FighterName>SpeedLines()`).
- Export via `draw.js` and call from `renderSystem.js` **before** `drawFighters()` so lines render underneath the fighter body.
- Maintain a **pre-seeded static array** (e.g., `_speedLineSeeds`) initialized once and reset when the ability re-activates to eliminate per-frame GC allocations.

### Needle Polygon Geometry (NOT strokes)
- **ALWAYS** draw speed lines as **4-point filled needle polygons** — NEVER use uniform `ctx.stroke()` lines:
  ```javascript
  // 4 points forming a sharp double-tapered needle polygon
  ctx.moveTo(startX, startY);     // sharp trailing tip (far behind fighter)
  ctx.lineTo(topMidX, topMidY);  // top edge of needle body
  ctx.lineTo(endX, endY);        // sharp leading tip (near fighter back)
  ctx.lineTo(botMidX, botMidY); // bottom edge of needle body
  ctx.closePath();
  ctx.fill();
  ```
- Keep max thickness (`maxThick`) subtle: **1.0px – 2.5px max** for crisp ink fidelity.
- Offset the bulge midpoint toward the leading edge (`midOff = halfLen * 0.15`) for sharp tapering.

### Cluster Proportions & Scaling
- Scale perpendicular cluster width to match the fighter's body radius: `±(fighter.r * 1.4)` (e.g., `±35px` for `r=25`).
- Use a **parabolic length distribution** across the cluster (`normDist = 1 - Math.abs(norm)`), where center lines are longest (~90px) and edge lines are shortest (~35px).
- Use a compact cluster density of **20–25 lines** total.

### Trajectory Alignment & Direction (CRITICAL)
- **Angle Alignment**: Speed lines MUST align strictly with the fighter's facing/aim angle (`aimAngle = fighter.gunAngle || fighter.angle || 0`).
- **Backward Streaming**: Speed lines MUST trail **BEHIND** the fighter's body, opposite to the strike direction:
  ```javascript
  const backOffset = fighter.r * 1.2; // Offset behind fighter body
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const perpX = -sinA;
  const perpY =  cosA;

  // NEGATIVE cosA/sinA positions cluster behind the fighter along the attack vector
  const lineCenterX = fighter.x - cosA * (backOffset + travel) + perpX * seed.perpOffset;
  const lineCenterY = fighter.y - sinA * (backOffset + travel) + perpY * seed.perpOffset;
  ```
- Keep travel range compact (e.g., `travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100)`), keeping lines tightly anchored behind the fighter without flying off-screen.

### Character Theme Palette Standard
Structure color palettes using a 4-slot alternating pattern tailored to the fighter's lore theme:
```javascript
// Example 4-slot theme structure: [Primary Theme, Secondary Accent, White Core, Dark Ink Line]
if (i % 4 === 0) color = primaryThemeColor;    // e.g. Fiery Orange (Genos), Cursed Pink (Yuta), Crimson (Sukuna)
else if (i % 4 === 1) color = secondaryColor; // e.g. Hot Gold (Genos), Deep Purple (Yuta), Black Flame (Sukuna)
else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White-hot core
else color = 'rgba(15, 15, 22, 0.90)';        // Dark manga ink line
```

### Seed Memory & Re-activation Management
- Cache seed arrays at module level.
- Track ability state (e.g., `fighter._lastFlurryState`) and reset seed cache to `null` whenever a new activation begins so random offsets refresh cleanly.

## 17. Domain Expansion Classification & High-Frequency Hazard Hit-Stun Standards

### Domain Expansion Category Separation
- **Paralyzing / Time-Stop Domains (Closed Barriers):** Domains that induce stasis/information overload (e.g. Gojo's *Unlimited Void*) explicitly apply `timeStopTimer` or paralyzing status effects to trapped targets.
- **Damaging / Open-Barrier Domains:** Domains that unleash continuous spatial slashes or elemental hazard attacks (e.g. Sukuna's *Malevolent Shrine*) deal area-of-effect damage, physical push, and hit sparks over time, but MUST NOT freeze enemy update loops or trap entities in time-stop stasis.
- **NEVER** use a generic `isEnemyDomainActive = f.domainActive` boolean check to freeze a fighter's update loop. Always verify if the active domain is explicitly a paralyzing domain (e.g. `f.characterId === 'gojo'`).

### High-Frequency Hazard CC Prohibition
- Recurring environmental or domain hazards that tick on rapid intervals (e.g. domain slashes every 8 frames) MUST NOT invoke `applyHitStun(duration)` on trapped fighters or illusions.
- Applying multi-frame `hitStun` on rapid tick intervals refreshes the hit-stun timer faster than it decays, causing an unintended perma-freeze. High-frequency hazards must deal damage and impulse without applying CC hit-stun.

### Minion / Companion AI Decoupling Standard
- Companion entities, minions, and illusions (such as Rika, Doppelganger clones, or summons) MUST evaluate their own status effects (`rk.timeStopTimer`, `rk.electricStunTimer`) independently of their owner's transient `hitStunTimer`. An owner taking basic flinch hit-stun must never paralyze a companion's AI update loop.

## 18. HUD Skill Bar Color Theme Consistency Standard
- **Unified Character Palette**: All HUD skill progress bars for a given fighter (e.g. Basic Skill, Secondary Skill, Ultimate/Domain) MUST use the **exact same consistent color theme** (`themeColor = f.color || ...`).
- **NEVER** assign mismatched, ad-hoc, or hardcoded accent colors to individual skill bars in `hudManager.js` (such as setting one bar to yellow and another to pink). Every skill bar returned in a fighter's HUD array MUST reference `themeColor` to preserve visual elegance and character identity.

## 19. Fighter Skin & Face Orientation Standards (Always Facing Camera / Viewer POV)

### Upright Coordinate Layout (Front Profile POV)
Fighter body models, heads, hair, and uniforms MUST ALWAYS be drawn oriented upright facing directly towards the player/camera (front POV):
- **`-Y` (Top)**: Hair, bangs, horns/crest, forehead, head accessories, top of head.
- **`Y ~ 0` (Center)**: Headwear/eyewear (blindfolds, goggles, masks, eye patches), iconic markings/scars/stitches, stubble/beard shadow silhouettes.
- **`+Y` (Bottom)**: Collar, neck opening, torso, jacket/tunic/uniform, belt, clothing folds.
- **`-X` / `+X` (Left / Right)**: Symmetrical ears, side hair locks, shoulders, arms.
- **NEVER** draw faces or clothing oriented sideways along the X-axis (e.g. placing hair at `-X` and torso at `+X`). The character must never appear lying horizontally.

### Facial Features Standard: Prohibition of Eyes, Mouth, and Nose (Minimalist Aesthetic)
- **STRICT PROHIBITION**: **NEVER** draw eyes, pupils, sclera, irises, eyelashes, mouths, lips, or nose bridges on fighter skins.
- Character identity and expressiveness MUST be conveyed exclusively through:
  - Distinctive hair silhouettes, bangs, and side locks.
  - Signature eyewear or headwear (e.g., Gojo's blindfold, Nanami's 7:3 goggles).
  - Iconic thematic markings, scars, and stitches (e.g., Sukuna's cursed marks, Mahito's face stitches, Toji's lip scar silhouette).
  - Beard, mustache, or stubble shadow silhouettes / tonal gradients.
  - Tailored clothing, collars, ties, robes, and armor.
- Maintaining clean, faceless circle bodies preserves the stylized 2D minimalist Ramball aesthetic and eliminates visual clutter during high-speed arena combat.

### Local Space Transform & Vertical Mirroring
All skin renderers must apply the standard transform so that facing direction aligns with `gunAngle` while keeping the character upright:
```javascript
const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
ctx.rotate(angle);

// Mirror Y-axis vertically so hair stays on top (-Y) and body on bottom (+Y) when moving/aiming left
const facingLeft = Math.abs(angle) > Math.PI / 2;
if (facingLeft) {
  ctx.scale(1, -1);
}
```

### Brawler Hand Positioning & Layering
Inside this local coordinate frame:
- **`+X`** points directly toward the opponent target.
- **Back Hand (Behind Body Circle Layer)**: Positioned on the forward/aim side at `(r * 1.05, 0)` in idle stance.
- **Body Circle (Middle Layer)**: Drawn at `(0, 0)` with upright head (`-Y`) and torso (`+Y`).
- **Front Hand (Front Layer — On Top of Body)**: Positioned at guard center `(0, 0)` in idle stance.
- During punches, hands alternate lunging forward along `+X` (`r * 0.85 + lungeExtension * 1.40`) with opposite recoil (`oppositeRecoil = -Math.sin(...)`).

## 20. Fighter Hand Visibility & Skin Only Guard Standard
- All fighter skin renderers, custom brawler hand rendering methods, and weapon graphics MUST evaluate `fighter.hideFrontHand` / `fighter.hideBackHand` OR the global `state.showSkinOnly` state before rendering any hands, fists, or weapon grips.
- Standard hand draw pattern across all existing and future fighter skin renderers:
  ```javascript
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands && !fighter.hideFrontHand) {
    // Draw front hand
  }
  ```
- **Skin Only Button (`state.showSkinOnly`)**: When enabled in the weapon menu or preview, `state.showSkinOnly` MUST hide BOTH weapons and hands across ALL fighters automatically without exception.

## 21. Weapon Studio System — Customization Architecture & Standards

### Overview
The **Weapon Studio** (`js/graphics/ui/WeaponStudioScreen.js`) is a dedicated interactive screen accessible from the main menu that allows users to visually customize weapon geometry, positioning, scale, and render layering. All customizations persist via `localStorage` through the `saveWeaponCustomizations()` / `loadWeaponCustomizations()` functions in `state.js`.

### State Structure (`state.weaponCustomizations`)
The unified customization object lives at `state.weaponCustomizations` and is initialized by `initCustomizations()` in `WeaponStudioScreen.js`:
```javascript
state.weaponCustomizations = {
  mahito: {
    blades: [
      { idx: 0, knuckleX, knuckleY, fanAngle, length, heelWidth, topArchY, tipY },
      { idx: 1, ... }, { idx: 2, ... }, { idx: 3, ... }
    ],
    drawOrder: [0, 1, 2, 3],  // Z-layer ordering (index 0 = backmost drawn first)
    weaponScale: 1.0           // Global scale multiplier for entire claw weapon
  },
  yuta:   { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
  toji:   { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
  cronos: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
  ruby:   { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 }
};
```

### Mahito Claw Adjustable Properties
Mahito's claw weapon has **per-finger** and **global** adjustable properties:

#### Per-Finger (4 blades: Finger 1–3 + Thumb)
| Property | Description | Adjusted Via |
|----------|-------------|--------------|
| `knuckleX`, `knuckleY` | Knuckle joint position relative to hand | Drag the **teal handle** on the preview canvas |
| `fanAngle` | Blade fan rotation angle | Drag the **crimson tip handle** (derived from angle to knuckle) |
| `length` | Blade length from knuckle to tip | Drag the **crimson tip handle** (derived from distance) |
| `topArchY` | Curvature arch of the blade spine | `+`/`-` buttons in the **Arch** control when finger is selected |
| `tipY` | Vertical tip offset (blade curvature endpoint) | `+`/`-` buttons in the **Tip** control when finger is selected |

#### Global Mahito Properties
| Property | Description | Range |
|----------|-------------|-------|
| `drawOrder` | Array controlling which finger renders in front/behind. ▲/▼ arrows on each finger card swap layer positions. | `[0,1,2,3]` permutation |
| `weaponScale` | Uniform scale multiplier applied to the entire claw (hand + all blades). | `0.30x` – `3.00x`, step `0.05` |

### Non-Mahito Weapon Adjustable Properties (Yuta, Toji, Cronos, Ruby)
These weapons share a common transform customization interface:

| Property | Description | Detail Card | Range |
|----------|-------------|-------------|-------|
| `offsetX` | Horizontal position offset | 📍 POSITION (X, Y) | Unlimited, step `2.0` |
| `offsetY` | Vertical position offset | 📍 POSITION (X, Y) | Unlimited, step `2.0` |
| `scale` | Uniform scale multiplier | 📐 SCALE & ANGLE | `0.30x` – `3.00x`, step `0.05` |
| `angleOffset` | Rotation angle offset (radians) | 📐 SCALE & ANGLE | Unlimited, step `0.08 rad` (~4.6°) |

### Studio UI Components
| Component | Location | Purpose |
|-----------|----------|---------|
| **Left Panel** | Left sidebar | Weapon selector (Mahito, Yuta, Toji, Cronos, Ruby) |
| **Right Panel** | Right sidebar | Detail cards (finger selection / position / scale-angle), layer ordering ▲▼ buttons, scale controls |
| **Preview Area** | Center canvas | Live weapon preview with interactive drag handles |
| **Zoom Controls** | Below preview | `−`/`+` buttons, progress bar, `%` label, `⟲` reset. Mouse wheel zoom supported. Range: `0.8x`–`6.0x` |
| **Drag Handles** | On preview (conditional) | **Teal circle**: grip/knuckle position. **Crimson circle**: tip/scale-angle endpoint. Only visible when a detail card is selected. |
| **Reset Button** | Bottom center | Resets ALL properties for the selected weapon to defaults (including `drawOrder`, `weaponScale`) |

### Rendering Integration Standards
- **Mahito Claws (`mahitoWeaponGraphics.js`)**: Both `drawClawMorphArm()` (in-game) and `drawMahitoClawWeapon()` (preview) MUST:
  1. Read `state.weaponCustomizations.mahito.weaponScale` and multiply it into `clawScale` and `handRadius`.
  2. Read `state.weaponCustomizations.mahito.drawOrder` and sort blades by this order before iterating to draw: `const orderedBlades = drawOrder.map(i => blades[i]).filter(Boolean);`
- **Non-Mahito Weapons** (Toji, Yuta, Cronos, Ruby): Each weapon's drawing function reads `state.weaponCustomizations[type]` and applies `ctx.translate(custom.offsetX, custom.offsetY)`, `ctx.scale(custom.scale, custom.scale)`, and `ctx.rotate(custom.angleOffset)` after standard weapon transforms.
- **Persistence**: `saveWeaponCustomizations()` writes to `localStorage('ramball_weaponCustomizations')`. `loadWeaponCustomizations()` reads and hydrates `state.weaponCustomizations` on startup. Always call `saveWeaponCustomizations()` after any mutation (button clicks, drag mouseup events).

### Adding New Weapons to the Studio
To support a new weapon in the Weapon Studio:
1. Add the weapon key and label to the `weapons` array in `WeaponStudioScreen.js`.
2. Add a default customization entry in `initCustomizations()` under `state.weaponCustomizations` (use the standard `{ offsetX, offsetY, scale, angleOffset }` template for single-piece weapons).
3. Add a `case` in `drawWeaponPreview()` in `WeaponIndexScreen.js` to call the weapon's drawing function.
4. In the weapon's drawing function, read `state.weaponCustomizations[key]` and apply the transform offsets.
5. Add a centering `offsetX` in the switch at the top of `drawWeaponPreview()` if the weapon needs horizontal offset adjustment for proper preview centering.

## 22. Dynamic Screen Dimming & Entity Healing Visual Standards

### Screen Dimmed Mode HUD Font Standards
- **Automatic White Color Shift**: Whenever full-screen dimming is active (Domain Expansions, Hollow Purple firing, Furnace blast, Serious Punch, etc.), all HUD font elements (Fighter Names, Skill Bar Labels, Info Stats) MUST automatically transition to crisp white (`#FFFFFF`) with a high-contrast dark drop-shadow (`0 0 5px rgba(0, 0, 0, 0.90)`).
- **Non-Bold Constraint**: Font text MUST enforce `font-weight: normal !important;` during dimmed mode to prevent text from appearing overly heavy or bolded against the dark overlay.
- **Exclusion of Skill Channeling Windups**: `isScreenDimmedActive()` MUST return `false` during skill channeling/windup states (`isChannelingDomain`, `domainChargeTimer > 0`, `isChannelingPurple`) so HUD fonts remain in their standard default state during windups.
- **Automatic Restoration**: When full-screen dimming finishes, the `.hud-dimmed` CSS class is removed, instantly reverting all HUD fonts back to their character theme colors (`#D946EF`, `#00E5FF`, `#FFD700`, etc.).

### Floating Heal Text Standard (Mahoraga Format)
- **Unified Text & Palette Format**: All HP regeneration, RCT healing, and clone reconsolidation heal text MUST follow the Mahoraga standard format: `+<amount>` in bright neon emerald green (`#00FF66`) with subtle horizontal position jitter (`(Math.random() - 0.5) * 16`) rendered directly over the entity's body. Avoid appending unnecessary suffix strings like `HP`.
- **HUD Bar Glow Pulse**: Any major heal event MUST set `this._healthBarHealTimer = 16` (or `14`) to trigger the green pulsing box-shadow glow animation on the fighter's top HUD health card fill bar.

### Clean HUD Skill Bar Label Standard
- **No Parenthetical Suffixes or Countdown Timers**: All HUD skill bar labels returned in `hudSkillProviders.js` MUST contain ONLY the clean skill title (e.g., `SOUL EVASION`, `IDLE TRANSFIGURATION`, `SOUL MULTIPLICITY`).
- **NEVER** append status suffixes (such as `(USED)`, `(ACTIVE)`, `(READY)`) or countdown timer strings (such as `(1.9s)`) onto skill bar labels. The fill progress percentage (`pct`) and ready state (`ready`) handle all visual feedback automatically.

## 23. Configuration-Driven Architecture & Prohibition of Hardcoded Combat Values

### Strict Config Derivation Requirement
- **ALL** character attributes, core stats, skill cooldowns, channeling timers, animation durations, damage numbers, damage multipliers, hit-stun frames, reach/range limits, knockback impulses, projectile velocities/radii, evasion thresholds, and minion/illusion stats MUST strictly derive from their corresponding character configuration file in `js/configs/characters/` (e.g., `mahitoConfig.js`, `gojoConfig.js`, `sukunaConfig.js`, `tojiConfig.js`, `nanamiConfig.js`, `mahoragaConfig.js`, `yutaConfig.js`, `genosConfig.js`, etc.) accessible through `CONFIG.<characterId>`.

### Prohibition of Arbitrary In-Code Constants
- **NEVER** hardcode arbitrary magic numbers (such as `cd = 400`, `damage = 25`, `reach = 360`, `minionHp = 25`, `hitStun = 14`, `threshold = 0.35`) inside:
  - Fighter class definitions (`*Fighter.js`)
  - Combat execution modules (`*Combat.js`)
  - Projectile system handlers (`projectileSystem.js`)
  - Minion and illusion managers (`illusionSystem.js`)
  - Status effect & entity renderers (`statusEffects.js`, `EntityRenderer.js`)
  - HUD skill providers (`hudSkillProviders.js`)
  - UI stat sheets and index screens (`FighterIndexScreen.js`, `WeaponIndexScreen.js`)

### Defensive Fallback Value Alignment
- Whenever using fallback expressions (such as `CONFIG.mahito?.soulMultiplicity?.cooldown || 1000` or `CONFIG.mahito?.evasion?.threshold ?? 0.75`), the fallback value **MUST EXACTLY MATCH** the default constant value defined in the fighter's config file.
- **NEVER** provide an arbitrary, stale, or guessed value as a fallback.

### Full UI & HUD Gauge Synchronization
- HUD skill progress bars (`hudSkillProviders.js`), cooldown clocks, and stat displays MUST read from the exact same configuration keys as the combat logic so that visual meters and physical gameplay timers remain 100% synchronized at all times.

## 24. HUD Health Bar Green Heal Pop-Out Pulse & Cheat Heal Standards

### Health Bar Pop-Out Heal Glow & DOM Heal Bubble (`_lastHealAmount` & `_healthBarHealTimer`)
- Whenever a fighter triggers an instant HP restoration, cheat code heal (such as CJ's `HESOYAM`), Reverse Cursed Technique (RCT), or life-drain effect:
  - The executing fighter MUST set:
    ```javascript
    this._lastHealAmount = actualHealed; // Triggers DOM .hud-heal-bubble pop-out floating text directly over the top HUD health card bar!
    this._healthBarHealTimer = 30;       // Triggers vibrant neon emerald green (.heal-glow) box-shadow pulse on the health bar
    this._healthBarShakeTimer = 8;       // Triggers subtle physical punchy pop-out shake on the health card
    ```
  - In `hudManager.js`, `triggerHudHealBubble(cachedCard.hpBar, fighter._lastHealAmount)` automatically attaches a floating `.hud-heal-bubble` (`+<amount>`) styled with neon green shadow (`#00FF66`) and floating animation above the health bar.
  - This provides an immediate, punchy pop-out visual confirmation directly on the health bar (matching Mahoraga / Mahito heal standards).

### Floating In-World Text & Cheat Notification Separation
- In addition to the HUD health bar pop-out bubble, the in-world floating text over the fighter's body MUST follow Rule 22 format (`+<amount>` in `#00FF66`).
- Cheat currency, shields, or titles (e.g. `+$250,000` in `#22C55E` and `+75 KEVLAR SHIELD` in `#38BDF8`) MUST spawn as dedicated separate floating text elements to prevent visual clutter or overlapping.

## 25. Tactical Force — Engineering & Visual Standards

### 1. Unified Neon Theme Weapon Graphics Standard
- **Unified Visual Identity**: ALL firearms in Tactical Force (M4A1, SPAS-12, Desert Eagle, AWP, and all future firearms) MUST strictly adhere to the unified **Neon Tactical Cyberpunk Theme**:
  - **Base Chassis / Receiver**: Deep obsidian and cyber-slate matte body (`#0b0f19`, `#0f172a`, `#1e293b`).
  - **Luminous Neon Contours**: Razor-sharp glowing neon outline borders and energy conduit inlays (`lineWidth: 1.2px – 1.4px`) with high contrast against dark backdrops.
  - **Thematic Character & Weapon Neon Color Matrix**:
    - **M4A1 (Tactical Rifle)**: **Neon Electric Cyan** (`#00e5ff` / `#38bdf8`)
    - **SPAS-12 (Tactical Shotgun)**: **Neon Emerald / Matrix Mint** (`#10b981` / `#00ff88`)
    - **Desert Eagle (Magnum Pistol)**: **Neon Cyber Amber / Solar Gold** (`#f59e0b` / `#ffb703`)
    - **AWP (Bolt-Action Sniper)**: **Neon Hyper Plasma Blue / Cyan** (`#00f0ff` / `#38bdf8`)
  - **Holographic Optics & Sights**: Semi-transparent neon tinted glass (`rgba(neon, 0.65)`) with bright white center reticle dot.
  - **Muzzle Flashes**: Directional multi-spike flash polygons with white-hot core (`#ffffff`) and theme-matching neon outer petals.
  - **Prohibition of `shadowBlur`**: NEVER use `ctx.shadowBlur` or `ctx.shadowColor` for neon weapon glows (Rule 11). Simulate luminescence with concentric shapes and high-contrast neon vector fills.

### 2. Fighter Update Loop & Combat Method Signatures
- **Argument Propagation in `update()`**: Subclasses (`RifleFighter`, `ShotgunFighter`, `PistolFighter`, `SniperFighter`) MUST pass all parameters to `super.update(opponent, ownerIndex, arena)`. Failing to pass `opponent` causes base physics to drop target tracking and halt movement.
- **Top Freeze Guard (Rule 1)**: Must return immediately when `this._handleTimeStop()` evaluates to true.
- **Overloaded `shoot()` Signature Support**: Handle overloaded calls where `typeof target === 'number'` to prevent `undefined` ownerIndex.

### 3. Obstacle Physics & Collision Standards
- **Obstacle Penetration Resolution**: Rectangular cover barriers must resolve both perimeter and interior overlaps, reflecting velocity with restitution (`0.85 – 0.90`).
- **Natural Tangent Deflection & Normalization**: Always apply a subtle tangential deflection jitter on bounce and invoke `entity.normalizeSpeed()` so fighters immediately recover standard patrol velocity.

### 4. Ultra-Simple Persistent Tactical HUD Architecture
- **In-Place DOM Mutation**: NEVER re-assign `innerHTML = ...` inside recurring update ticks. Cache card element references (`_tacticalCards = { top: [], bottom: [] }`) and update properties in-place.
- **Ultra-Simple Minimalist Layout**:
  - Top HUD (Team 1 CT): 2 compact side-by-side cards.
  - Bottom HUD (Team 2 T): 2 compact side-by-side cards.
  - Minimal elements: Operative name on the left, current HP / `KIA` on the right, and a clean 6px solid health bar underneath.
  - Zero bloated paddings, zero drop-shadow blur filters, zero nested sub-bars or clutter.

### 5. Tactical Map Geometry & Arena Dark Mode Standards
- **Clean Minimalist Geometry**: Solid slate walls (`#1e293b` fill, `#475569` border) and solid dark arena floor (`#0d1117`).
- **Pitch Black Canvas Background**: Outer canvas space MUST be deep pure black (`#000000`) for high-contrast neon readability.

### 6. Unified Tactical Projectiles Standard (Dynamic Character Color Theme)
- **Unified Streamlined Geometry**: All tactical projectiles share a sleek, aerodynamic tracer capsule (`drawTacticalBullet`) with a brilliant white-hot kinetic core and a tapered trailing speed streak.
- **Dynamic Character Theme Color**: The outer neon tracer glow and motion streak MUST dynamically reflect the firing character's color theme (`p.color || shooter.color || shooter.themeColor`), ensuring visual harmony across all operatives (M4A1 Cyan, SPAS-12 Emerald, Desert Eagle Amber, AWP Plasma Blue).
- **Proportional Caliber Scaling**: Caliber differences (shotgun pellets vs. magnum pistol slugs vs. sniper match rounds) are represented via `bulletLength`, `bulletWidth`, and `tacticalCaliberScale` while strictly preserving the unified capsule geometry.

### 7. Tactical AI Line-of-Sight (LOS) & Wall Occlusion Standards
- **Line-of-Sight Raycasting**: All tactical AI fighters MUST evaluate `hasLineOfSight(x1, y1, x2, y2, obstacles)` before aiming and shooting.
- **No Wall Auto-Aim Lock**: When an opponent is occluded behind a wall (`hasLineOfSight === false`), AI fighters MUST NOT lock their guns through the wall. Instead, they aim forward in the direction of their movement velocity, slicing corners naturally.
- **Hold Fire on Blocked Sightlines**: AI fighters MUST NOT discharge weapons into solid cover obstacles (`if (!hasLineOfSight) return;`), saving ammunition until clear line-of-sight is established.
- **LOS Target Prioritization**: `getClosestOpponent()` prioritizes engaging enemies with unobstructed sightlines over occluded targets.
- **Obstacle-Clipped Laser Sight**: Sniper laser aimlines must raycast against obstacles (`raycastToObstacles()`) and terminate directly on the wall surface with a laser point.

### 8. Tactical Game Mode Configuration Standards
- **Centralized Mode Config**: All Tactical Shooter match rules, team structures, rounds, health pools, and HUD layouts are defined in `Tactical Force/tacticalModeConfig.js` (`TACTICAL_GAME_MODES`, `TACTICAL_MODE_SETTINGS`, `TACTICAL_SYSTEM_CONFIG`).
- **Standardized Modes**:
  - `Tactical 2v2`: 2v2 CT (M4A1, SPAS-12) vs T (Desert Eagle, AWP), 3 rounds, 500 HP, Sector 01 map.
  - `Tactical 1v1`: 1v1 duel, 3 rounds, 500 HP.
  - `Tactical Stand Off`: 1 round sudden death, 1500 HP.
  - `Tactical FFA`: 4-player deathmatch, 3 rounds, 500 HP.
  - `Tactical 4v4`: 4v4 full squad encounter, 5 rounds, 500 HP.
  - `Tactical Random`: Random firearm loadout round rotations.
- **System Rules**: Always enforce dark arena theme, 2D line of sight, and unified projectile visuals across all tactical modes.
