# Bomber Man — The Classic Maze Bomber (ボンバーマン)

**Category:** Gaming & Classic Arcade (*Bomberman* Series by Hudson Soft / Konami)  
**Character ID:** `bomberman`  
**Theme Color:** Classic Cobalt Blue (`#2563EB`) & Bomber White (`#F8FAFC`)  
**Secondary Accents:** Antenna & Glove Magenta-Pink (`#EC4899`), Blast Flame Orange (`#F97316`), Golden Power-Up (`#FACC15`), Cast-Iron Bomb Charcoal (`#1E293B`), Manga Ink (`#0E0F14`)  
**Role:** Tactical Trap Zoner, Scaling Area-Denial Specialist, Invincible Juggernaut  

---

## 📖 Lore & Character Philosophy

> *"Plant the bomb. Upgrade the flame. Walk through the minefield. Clear the arena!"*

Hailing from Planet Bomber, **White Bomberman** (*Shirobon*) is the legendary robotic hero who has defended the galaxy across decades of classic arcade and console battles. Armed with an inexhaustible supply of round black time-bombs and an iconic arsenal of stage power-up panels, Bomberman turns every battlefield into a high-stakes tactical labyrinth of interlocking blast zones.

In the *Circle Mini-Battle* arena, **Bomber Man** starts rounds with modest single-bomb placement and compact blast reach, then rapidly scales into a screen-filling demolition powerhouse by stacking his signature **Bomb Up** (up to **10 concurrent bombs**) and **Fire Up** (up to **Level 10 blast radius**) upgrades. Using his passive/active **Bomb Pass** ability to glide effortlessly through his own planted bombs while enemies are physically blocked and cornered by them, he orchestrates devastating chain-reaction cross-explosions—culminating in his **Ultimate: Invincible**, which renders him completely immune to all incoming enemy attacks while active (configured ~8.3s / 500 frames with a fixed 16.7s / 1000 frames cooldown).

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard & Rule 24 Toji Baseline)
Bomber Man's body model, helmet visor, tunic, belt, and boots strictly adhere to the front-profile camera orientation standard built on the canonical Toji body geometry (`r = 25`):
- **Zone 1: Helmet Face Dome & Visor Plate (`ry < r * 0.30`, `~7.5px`)**:
  - Crisp porcelain-white robotic helmet shell (`#F8FAFC`) with subtle cool-gray side contour shading (`#CBD5E1`).
  - **Visor Window (`Y ~ 0`)**: Classic rounded-rectangle peach/amber visor frame (`#FED7AA` fill with `#334155` visor border rim) spanning `-r * 0.46` to `+r * 0.46`.
  - **Faceless Minimalist Aesthetic (Rule 3.2 & Rule 19)**: Strictly zero eyes, vertical eye slits, pupils, sclera, mouth, or nose bridges drawn on the visor or face dome. Character identity is conveyed purely through his iconic white helmet frame, pink antenna bobble, blue bomber tunic, and golden belt buckle.
  - **Zero Baked Hair/Headgear**: The top dome remains clean inside the body circle; the antenna pom-pom is rendered strictly on Layer 2.
- **Zone 2: Collar & Royal Blue Bomber Tunic (`r * 0.30 <= ry < r * 0.65`)**:
  - Full-width classic Cobalt/Royal Blue tunic (`#2563EB`) covering `-r` to `+r` with deep navy side shading (`#1D4ED8`) and crisp chest highlight bevels (`#60A5FA`).
  - Clean white neck ring collar separating the helmet from the blue torso.
- **Zone 3: Classic Black Belt & Golden Buckle (`r * 0.65 <= ry < r * 0.78`)**:
  - High-contrast dark slate belt band (`#1E293B`) with a prominent centered square gold buckle (`#FACC15` rim, `#CA8A04` inner recess).
- **Zone 4: Lower White Trousers & Magenta Boots (`ry >= r * 0.78`)**:
  - Crisp white lower leg cuffs (`#E2E8F0`) transitioning into Bomberman's signature bright Magenta-Pink rounded shoes (`#DB2777` with `#F472B6` toe highlights), maintaining strict luminance separation ($Y \ge 24$) so dark tones never merge into the outer outline.
- **Outer 4-Neighbor Ink Outline Shell (Rule 24)**:
  - Solid dark manga ink outline (`#0E0F14`) rendered using the canonical 4-neighbor boundary test (`Math.hypot((gx ± 1) * P, gy * P) > r || Math.hypot(gx * P, (gy ± 1) * P) > r`).

### 2. Canonical Default Model Hand Positioning & Bomb Wielding (Rule 20)
- **Symmetrical Lower-Flank Placement**:
  - **Left Hand**: Positioned at `(x: -r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`. Rendered as Bomberman's iconic spherical Magenta-Pink glove (`#EC4899` fill, `#F472B6` highlight, `#0E0F14` outline).
  - **Right Hand (Main Bomb Hand)**: Positioned at `(x: +r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`. Spherical Magenta-Pink glove anchoring held bombs directly at `(0, 0)` in weapon local space.
- **Layering & Overlap**: Both hands are rendered on the front layer after the central body circle, overlapping the lower perimeter of the body circle.
- **Single-Source-of-Truth Hand Standard**: Bomb renderers never instantiate extra or floating hands; exactly one pair of hands is rendered across all states.

### 3. Head Antenna Asset Import (Rule 22 Standard)
- **Asset Path**: `Assets/model/bomberman/Bomberman-hair.png` (registered under `assets.hair` in `js/configs/characters/bombermanConfig.js`).
- **Module-Level Image Cache**: Eagerly initialized via `let _bombermanHairImage = null;` and `_getBombermanHairImage()`.
- **Renderer Function**: `_drawBombermanHair(ctx, r, facingLeft)` renders Bomberman's signature white stem and round magenta-pink antenna pom-pom bobble at `drawY = -r * 1.32` with nearest-neighbor pixel fidelity (`ctx.imageSmoothingEnabled = false;`), supporting `state.skinCustomizations?.bomberman`.

### 4. Discrete 2D Pixel Rasterization ($P = 2.0\text{px}$) & Offscreen Canvas Cache (Rule 3.5 & Rule 24)
- Bomber Man's procedural pixel body is rasterized once into an axis-aligned offscreen canvas (`_cachedBombermanCanvas`) via `_renderBombermanPixelBodyToCanvas(destCtx, r)`:
  ```javascript
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;
  ```
- Blitted during gameplay via `ctx.drawImage(_cachedBombermanCanvas, -size / 2, -size / 2)` with `ctx.imageSmoothingEnabled = false;`.

### 6. Dedicated Bomb & Explosion Sprite Asset Architecture (Rule 31 Compliant)
- **Bomb Sprite Frames (`Assets/model/bomberman/bomb/`)**:
  - Extracted from `ADHWK1.gif` into 3 discrete $256 \times 256\text{px}$ animation frames (`bomb-1.png`, `bomb-2.png`, `bomb-3.png`) with $\ge 14\text{px}$ transparent alpha padding.
  - Master composite horizontal strip: `Assets/model/bomberman/bomb/bomb-sheet.png` ($768 \times 256\text{px}$).
  - Cycles through `[0, 1, 2, 1]` based on fuse progress for authentic retro pulsating bomb breathing.
- **12-Frame Cross Explosion Sequence (`Assets/model/bomberman/explosion/`)**:
  - Extracted from `dFOsRT.gif` and formatted into a 12-frame kinematic progression (`explosion-1.png` through `explosion-12.png`) with 8-color authentic retro arcade palette and $\ge 20\text{px}$ transparent alpha margins on all borders (strictly Rule 31 compliant).
  - Master composite horizontal strip: `Assets/model/bomberman/explosion/explosion-b.png` ($3072 \times 256\text{px}$).
  - Rendered with dynamic wall clipping (`ctx.rect(-reachLeft, -reachUp, ...)`) to ensure explosion arms never penetrate arena boundaries.

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Max Scaled Value | Engineering / Combat Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `360` | `360` | Balanced arcade tactician health pool |
| **Base Speed** | `4.8` | `5.4` | Nimble maze-runner footwork |
| **Body Radius ($r$)** | `25px` | `25px` | Universal humanoid collision boundary (Rule 24) |
| **Starting Bomb Cap** | `1 Bomb` | **`10 Bombs` (Max)** | Scaled via **Passive: Bomb Up** (`+1` active cap each time basic attack CD finishes, Max 10) |
| **Starting Fire Level** | `Level 1` (`65px`) | **`Level 10` (`245px` Max)** | Scaled via **Skill 2: Fire Up** (`+1` per cast, Max 10) |
| **Bomb Fuse Timer** | `110 frames` (~`1.83s`) | `110 frames` | Classic pulsing 3-beat breathing bomb animation |
| **Bomb Kick** | Solid to Enemies | **Traveling Kick (`9.5px/f`)** | **Skill 2: Kick** allows Bomberman to kick bombs so they travel and can explode mid-traveling |
| **Invincible Duration** | — | **`30.0s` (`1800 frames`)** | **Ultimate**: 100% immune to incoming enemy attacks |
| **Shoot Suppression** | Blank `shoot()` | Blank `shoot()` | Rule 23 compliant — uses dedicated Bomb Laying system |

---

## 💣 Core Combat Mechanics & Skills Breakdown

```
                        ┌──────────────────────────────────────────┐
                        │          BOMBER MAN ARSENAL KIT          │
                        └────────────────────┬─────────────────────┘
                                             │
      ┌───────────────────────┬──────────────┴──────────────┬───────────────────────┐
      ▼                       ▼                             ▼                       ▼
┌───────────┐           ┌───────────┐                 ┌───────────┐           ┌───────────┐
│  PASSIVE  │           │  SKILL 1  │                 │  SKILL 2  │           │ ULTIMATE  │
│  Bomb Up  │           │  Fire Up  │                 │   Kick    │           │Invincible │
│ (Max. 10) │           │ (Max. 10) │                 │(Bomb Kick │           │  (30.0s   │
│Auto CD +1 │           │+1 Blast R.│                 │Mid-Travel)│           │ Immunity) │
└───────────┘           └───────────┘                 └───────────┘           └───────────┘
```

---

### 💣 Basic Attack: *Plant Time-Bomb & Cross Detonation*
* **Type**: Tactical Obstacle Deployment & Delayed Cross-Shaped (`+`) AOE Explosion
* **Plant Cooldown**: `24 frames` (~`0.40s` between drops, limited by active `maxBombs` capacity)
* **Fuse Duration**: `110 frames` (~`1.83 seconds`)
* **Bomb Radius**: `22px` physical sphere on the arena floor
* **Mechanics**:
  - Instead of firing generic bullets (`shoot(ownerIndex)` is suppressed per **Rule 23**), Bomber Man drops a classic glossy black spherical **Time-Bomb** at his current position or slightly ahead (`+18px` along `gunAngle`).
  - **Dynamic Capacity Progression**: Governed directly by his **Passive: Bomb Up** (starts at 1 bomb; each basic attack cooldown refresh unlocks +1 concurrent active bomb up to **10**).
  - **Classic Breathing Pulse**: While ticking on the floor, each bomb rhythmically swells and contracts (`scale = 1.0 + 0.12 * Math.sin(tick * 0.25)`) with an animated burning fuse spark at its crown that shifts from yellow to rapid flashing red during the final `30 frames`.
  - **4-Way Cross Blast (`+` Pattern) & Chain Reactions**:
    - When the fuse reaches `0`, the bomb detonates in an iconic 4-directional cardinal/aligned cross pillar (`0°`, `90°`, `180°`, `270°`) plus a central concentric shockwave disc (Rule 26).
    - **Chain Reaction Ignition**: Any other planted bomb caught within the blast arm of an exploding bomb has its fuse immediately reduced to `2 frames`, triggering instantaneous domino chain detonations across the arena!
  - **Damage, Knockback & Slow Debuff Mechanic**:
    - **Single Bomb Hit**: `28 Explosive Damage` + `14 Knockback Impulse`.
    - **Slow Debuff**: Entities struck by a bomb explosion cross blast are afflicted with a **`1.25s` (`75 frames`) Slow Debuff** (`slowMultiplier: 0.50`), cutting their movement speed in half ($50\%$) and displaying overhead `"SLOWED!"` floating text (`#38BDF8`).
    - **Multi-Bomb Chain Overlap**: Enemies caught in intersecting chain blasts take full primary damage from the first bomb plus `+8 Bonus Chain Damage` per additional overlapping bomb blast (preventing instant 1-frame 100%-to-0 cheese while heavily rewarding multi-bomb traps).

---

### 📦 Passive Ability: *Bomb Up* (ボムアップ — Dynamic Active Bomb Capacity Scaling)
> *"For the first lay, Bomberman can lay 1 active bomb. When the basic attack CD is up, he can lay 2 active bombs. When the basic attack CD is up again, he can lay 3 active bombs, so on and so forth (Max. 10)."*

* **Type**: Innate Combat Cadence Passive Scaling
* **Starting Capacity**: **`1 Active Bomb`** on the arena floor
* **Scaling Trigger**: Every time Bomberman's basic attack cooldown finishes / refreshes (`plantCooldown <= 0`):
  $$\text{maxActiveBombs} = \min(10, \text{maxActiveBombs} + 1)$$
* **Maximum Capacity Cap**: **`10 Concurrent Active Bombs`**
* **Combat Flow & Progression**:
  1. **1st Lay (Start of Round)**: Bomberman lays his first bomb. Active bombs = `1 / 1`. Basic attack goes on cooldown (`24 frames` / ~`0.40s`).
  2. **1st CD Refresh**: Basic attack CD finishes. Passive triggers: active capacity expands to **`2 Bombs`** (`maxBombs = 2`). Bomberman can immediately lay bomb #2 while bomb #1 is still ticking!
  3. **2nd CD Refresh**: Basic attack CD finishes again. Passive triggers: active capacity expands to **`3 Bombs`** (`maxBombs = 3`). Bomberman can immediately lay bomb #3 while bombs #1 & #2 are ticking!
  4. **Continuous Ramp-Up**: Every completed basic attack cooldown cycle adds **`+1 Active Bomb Capacity`** until reaching the **`10-Bomb Cap`**.
  5. **Tactical Synergy**: Eliminates the need to press an active button for capacity upgrades. Bomberman rapidly carpets the arena in dense 4-way cross minefields simply by playing in rhythm with his basic attack CD.

---

### 🔥 Skill 1: *Fire Up* (ファイアーアップ — Blast Radius Upgrade)
> *"Increase the blast radius all bombs can make (Max. 10)."*

* **Type**: Permanent Match Blast Radius Scaling Upgrade
* **Cooldown**: `3.5 seconds` (`210 frames`)
* **Initial Cooldown**: `2.0 seconds` (`120 frames` at match start before first upgrade cast)
* **Maximum Stack Cap**: **`Level 10`** (`fireLevel = Math.min(10, this.fireLevel + 1)`)
* **Blast Radius Scaling Formula**:
  $$R_{\text{blast}}(\text{level}) = 65\text{px} + (\text{level} - 1) \times 20\text{px} \quad (\text{Level } 1 = 65\text{px} \longrightarrow \text{Level } 10 = 245\text{px})$$
* **Mechanics**:
  - Bomber Man absorbs a classic fiery-orange **Fire Up Power-Up Tile**, surging with crimson-gold combustion energy.
  - **Radius Upgrade (`+1` up to `Max. 10`)**:
    - Permanently increases the blast radius (`fireLevel`) of **all currently planted and future bombs** by **`+1 Level`**, up to **`Level 10`**.
    - Each level adds **`+20px`** of reach to every arm of the explosion cross and expands the central detonation shockwave disc, scaling from a compact `65px` pop at Level 1 to a massive `245px` arena-spanning cross-beam at **Level 10** (`490px` total tip-to-tip span across the `450×450` vertical arena!).
    - Each Fire Up level also increases bomb base damage by **`+2.5 Damage`** (`28` at Lv.1 $\to$ `50.5` at Lv.10) and shifts the flame core palette from standard orange (`Lv. 1–4`) $\to$ incandescent solar gold (`Lv. 5–7`) $\to$ white-hot plasma crimson (`Lv. 8–10`).
  - **At Max Stack (`10 / 10 Fire`)**:
    - Once `fireLevel === 10` is reached, activating **Fire Up** immediately **Remote-Detonates** the oldest active bomb on the field at maximum Level 10 firepower!

| Fire Up Level | Arm Reach ($R_{\text{blast}}$) | Total Cross Span ($2 \times R_{\text{blast}}$) | Bomb Damage | Flame Visual Tier |
| :---: | :---: | :---: | :---: | :--- |
| **Level 1 (Base)** | `65px` | `130px` | `28.0` | Classic Arcade Orange (`#F97316`) |
| **Level 3** | `105px` | `210px` | `33.0` | Bright Amber Flame (`#FB923C`) |
| **Level 5** | `145px` | `290px` | `38.0` | Solar Gold Core (`#FACC15`) |
| **Level 8** | `205px` | `410px` | `45.5` | Crimson-Gold Superfire (`#EF4444`) |
| **Level 10 (MAX)** | **`245px`** | **`490px` (Full Arena)** | **`50.5`** | **White-Hot Plasma Cross (`#FFFFFF` / `#DC2626`)** |

---

### 🥾 Skill 2: *Kick* (ボムキック — Bomb Kick & Mid-Travel Detonation)
> *"Allows Bomberman to kick his bombs so they travel across the arena and can explode mid-traveling."*

* **Type**: Active & Contact Bomb Kick (Sliding Bomb Projectile & Mid-Travel Explosion)
* **Cooldown**: `2.5 seconds` (`150 frames` for active kick command; contact kick triggers automatically when colliding with a stationary planted bomb)
* **Initial Cooldown**: `1.5 seconds` (`90 frames` at match start before first kick command)
* **Kick Range (Proximity Rule)**: `64px` (`bombKickRange: 64` — Bomberman must be in touching or immediately adjacent boot range to kick a bomb; long-distance kicks are strictly prohibited)
* **Travel Direction Standard**: **Strict 4-Way Orthogonal Cardinal Directions (UP, DOWN, LEFT, RIGHT only)**. Arbitrary or diagonal angles snap strictly to the nearest cardinal vector with the perpendicular velocity component locked strictly to `0` (`vx = ±speed, vy = 0` or `vx = 0, vy = ±speed`).
* **Kick Travel Speed**: `9.5px / frame`
* **Mechanics**:
  - **Tile-Centered Plant $\rightarrow$ Strict Orthogonal Straight Kick (UP / DOWN / LEFT / RIGHT)**:
    - Every bomb is initially planted centered in its tile block (`x = arena.x + (col + 0.5) * cellW`, `y = arena.y + (row + 0.5) * cellH`).
    - When Bomber Man triggers **Kick** (`castKick`) while right next to a bomb, or runs directly into a stationary planted bomb, he kicks the bomb along the nearest cardinal axis: **UP** (`-Y`), **DOWN** (`+Y`), **LEFT** (`-X`), or **RIGHT** (`+X`).
    - The bomb travels across the arena in a fixed orthogonal line (`speed: 9.5px/f`). It **never tracks, steers toward, diagonalizes, or homingly follows enemies**.
  - **Strict Proximity Requirement (Anti-Long-Distance Kick)**:
    - Bomberman must be within touching or immediately adjacent boot contact range (`Math.hypot(bomb.x - this.x, bomb.y - this.y) <= 64px`).
    - Kicking distant bombs from across the arena is strictly blocked.
  - **Strict Anti-Rebounce & Wall Latch Standard**:
    - When a kicked traveling bomb reaches an arena boundary wall, it **MUST NEVER REBOUNCE** or ricochet like a pinball.
    - Instead, the bomb clamps cleanly to the arena perimeter, stops traveling immediately (`isTraveling = false`, `vx = 0`, `vy = 0`), snaps to the nearest tile center, and continues its fuse countdown until detonation.
  - **Direct Kinetic Impact & Enemy Hit Stop**:
    - Enemies struck directly by a sliding kicked bomb take **`12 Kinetic Impact Damage`** and **`10 Knockback`**.
    - Upon striking an enemy, the bomb **STOPS sliding immediately** and snaps to the adjacent tile block rather than bulldozing, pushing, or following the enemy around the arena.
  - **Kick Hit-Pause & Impact Stasis (5 Frames / ~83ms)**:
    - Upon contact when Bomberman kicks a planted bomb, a crisp **5-frame hit pause** activates across both Bomberman and the bomb.
    - During this brief window, Bomberman holds his kicking extension pose with velocity clamped (`vx = 0, vy = 0`), while the bomb remains stationary at the impact point with an active magenta impact shimmer ring (`rgba(236, 72, 153, 0.92)`).
    - An impact flash (`#EC4899`) and screen rumble (`triggerGlobalScreenShake(1.8, 4)`) detonate at the contact centroid before high-velocity sliding begins.
  - **Global Combat Hit Effect on Blast & Kinetic Collisions**:
    - When entities (fighters or illusions) are struck by a bomb explosion or directly by a sliding bomb, the full global hit feedback suite is invoked:
      - **12-Frame Anime Punch Impact Frame**: Renders the canonical retro anime impact sequence from `Assets/effects/Punch Attack/` (`spawnAnimePunchImpactFrame(target.x, target.y, 65, pushAngle, 'orange')` or `'gold'`).
      - **Impact Flash & Sparks**: Concentric radial impact bloom (`spawnImpactFlash`, 38px, `#F97316` / `#FACC15`) with spark ember burst (`spawnSparks`, 10 particles).
      - **Global Hit-Flash Overlay**: Triggers `target.hitFlashTimer = 8` for the universal white body flash.
      - **Impact Audio & Camera Shake**: Heavy flesh impact sound (`audioSystem.playSFX('attack_fleshhit', 0.65)`) and concussive arena rumble (`triggerGlobalScreenShake(6.0, 12)` on base detonation; `8.5, 16` on chain reactions).
      - **Standardized Damage Pipeline**: Uses `applyDamageToTarget` with directional knockback impulse.
  - **Can Explode Mid-Traveling**:
    - A kicked bomb's fuse (`fuseTimer`) continues counting down every frame while it slides across the floor.
    - If `fuseTimer <= 0` while traveling, the bomb **explodes mid-traveling** at its real-time coordinates `(bomb.x, bomb.y)`, unleashing its full 4-way `+` cross-flame blast on the move!
    - **12-Frame Kick Impact Animation (`Assets/model/bomberman/kick/`)**:
      - Triggered at the boot contact point between Bomberman and the kicked bomb.
      - Adheres to the **12-Frame Animation Standard (The Reze Model)**: 12 sequential $256 \times 256\text{px}$ frames (`kick-1.png` $\dots$ `kick-12.png`) and master horizontal strip (`kick-b.png`, $3072 \times 256\text{px}$).
      - Features a retro 16-bit arcade golden-amber 4-pointed diagonal cross-star impact flash (`X` shape) with white-hot core (`#FFFFFF`), light cream highlight (`#FFEEA9`), golden yellow body (`#FAC23A`), amber contour (`#B45309`), dark outline (`#5B3919`), expanding shockwave ring, and dissolving spark embers.
      - **Rule 31 Anti-Clipping**: All non-zero alpha pixels stay within radius $R \le 106\text{px}$ from center, leaving $>22\text{px}$ pure transparent border margin (`alpha = 0`) on all 4 edges to prevent any rectangular box artifacts.

---

### 🌟 Ultimate Skill: *Invincible* (無敵ファイアーボール / Invincibility Vest)
> *"Invincible - Allows Bomberman to be immune to INCOMING ATTACK from enemies for 30 seconds."*

* **Type**: Supreme Defensive Overdrive & Total Incoming Attack Immunity
* **Cooldown**: `42.0 seconds` (`2520 frames`) (Initial Round Start Charge: `18.0s` / `1080 frames`)
* **Active Duration**: **`30.0 Seconds` (`1800 frames` at 60 FPS)**
* **Mechanics**:
  - Bomber Man activates the legendary **Mystery Item / Invincibility Vest** from classic *Bomberman*, enveloping his body in a cycling 8-bit Golden-Rainbow prism aura (`#FACC15` $\leftrightarrow$ `#38BDF8` $\leftrightarrow$ `#EC4899` $\leftrightarrow$ `#FFFFFF`) accompanied by an upbeat retro invincibility chime!
  - **100% Immunity to Incoming Enemy Attacks (`30.0 Seconds`)**:
    - For the entire **`1800-frame` (`30.0s`)** duration, `this.isInvincibleUltimate = true`.
    - **All incoming attacks from enemies are completely nullified**: enemy melee strikes, projectiles, laser beams, summons, and offensive skill hits deal **`0 Damage`**, apply **`0 Hit-Stun`**, and inflict **`0 Knockback`** (`takeDamage(amount, ...)` intercepts incoming enemy damage, plays a crisp retro metallic deflection ping, and flashes an overhead **`"INVINCIBLE!"`** gold badge).
    - **Self-Bomb Immunity**: While **Invincible** is active, Bomber Man is also 100% immune to the blast waves of his own bombs, allowing him to stand directly at the epicenter of a 10-bomb, Level-10 Fire Up chain reaction while the opponent is obliterated around him!
  - **Visual & HUD Countdown**:
    - Renders a smooth concentric golden-prism ring around Bomber Man (`Rule 11` compliant—zero `shadowBlur`, drawn via concentric alpha rings) and a live `30.0s → 0.0s` countdown bar on his HUD card.
    - During the final `3.0 seconds` (`180 frames`), the golden aura blinks at a faster cadence to telegraph that Invincibility is about to expire.

```
+================================================================================+
|                    ULTIMATE: INVINCIBLE (CONFIGURED DURATION)                  |
|                                                                                |
|   [Incoming Enemy Melee / Projectile / Laser / Skill] ──►  0 DMG (NULLIFIED!)  |
|   [10 Planted Bombs + Level 10 Fire Up Chain Blast]   ──►  Bomberman Unharmed! |
|   [Active Duration Timer: 500 frames (~8.3 seconds)]  ──►  Golden Prism Aura   |
+================================================================================+
```

---

## 📊 HUD Skill Layout & Visual Theme

All HUD skill progress bars and status indicators strictly use Bomber Man's unified **Classic Cobalt Blue** theme color (`#2563EB`) adhering to **Rule 18 / Rule 2.8**:
- **Rule 18 Theme Consistency**: Every skill bar (`bomb_up`, `fire_up`, `bomb_kick`, `invincible`) uses `#2563EB`.
- **Config Toggle Gating**: Each skill checks `isSkillEnabled(cfg.enable[Skill], ...)` so toggling off a skill in `bombermanConfig.js` cleanly hides its HUD bar.
- **Clean Label Standard**: Zero redundant parenthetical `(READY)` or `(ACTIVE)` suffixes. Dynamic values (`LV.X/10`, `(30S)`, `(TRAVELING)`) communicate state cleanly.
- **Signature & Ultimate Registration**: `invincible` registers in `signatureMap` inside `isSkillExceptionInDarkMode()` to remain visible in Signature/Dark Mode HUD filters.

```
┌───────────────────────────────────────────────────────────────────┐
│ BOMBER MAN (THE CLASSIC MAZE BOMBER)                HP: 360 / 360 │
│ [███████████████████████████████████████████████████████████████] │
│                                                                   │
│ [Passive: Bomb Up]       [██████████] #2563EB BOMB UP (10 MAX)    │
│ [Skill 1: Fire Up]       [██████████] #2563EB FIRE UP (10 MAX)    │
│ [Skill 2: Bomb Kick]     [██████████] #2563EB BOMB KICK           │
│ [Ultimate: Invincible]   [████████░░] #2563EB INVINCIBLE (24S)    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔊 Sound Design & Audio Mapping

| Combat Event / Action | Primary Audio Path / Synth | Volume / Pitch | Description & Auditory Feel |
| :--- | :--- | :--- | :--- |
| **Plant Bomb (`Basic`)** | `Assets/Sound Effects/BombermanSFX/Place Bomb.wav` | `0.85 Vol` / `1.00x` | Authentic retro arcade bomb drop placement audio |
| **Bomb Cross Detonation** | `Assets/Sound Effects/Attacks/explosion.mp3` | `0.85 Vol` (Base) / `0.90 Vol` (Chain) | Punchy concussive combat blast audio |
| **Walking Cadence** | `Assets/Sound Effects/BombermanSFX/Walking 1.wav` | `0.50 Vol` / `1.00x` | Authentic rhythmic 50-frame step loop while moving |
| **Skill 1: Bomb Up** | `Assets/Sound Effects/Sprites SFX/crazydave-sun-pickup.mp3` | `0.75 Vol` / `1.10x` | Bright retro arcade power-up collection chime |
| **Skill 2: Fire Up** | `Assets/Sound Effects/BombermanSFX/era_vera-easter22-gun-melee-summon.wav` | `0.85 Vol` / `1.00x` | High-impact weapon melee summon audio on Fire Up surge |
| **Bomb Kick** | `Assets/Sound Effects/BombermanSFX/Kick - Pressure Block.wav` | `0.85 Vol` / `1.00x` | Authentic retro arcade pressure block kick contact audio |
| **Ultimate: Invincible Cast** | `Assets/Sound Effects/Skills/shieldcharge.mp3` | `0.90 Vol` / `1.05x` | Iconic invincibility barrier activation fanfare |
| **Invincible Attack Deflect** | `Assets/Sound Effects/Skills/parry.mp3` | `0.65 Vol` / `1.35x` | Crisp metallic retro ping when nullifying incoming enemy attacks |

---

## 🎯 AI Behavior & Tactical Decision Matrix

1. **Early-Game Power-Up Scaling (`Bombs < 5` or `Fire < 5`)**:
   - Bomber Man prioritizes casting **Skill 1: Bomb Up** and **Skill 2: Fire Up** off cooldown while kiting at mid-range, dropping defensive bombs between himself and aggressive rushdown opponents.
2. **Bomb Pass Corner Trapping**:
   - Because Bomber Man can freely walk through his own bombs (**Skill 3: Bomb Pass**) while opponents are blocked by them, the AI plants lines of 3–6 bombs and steps *back through* the bomb line, baiting enemies into colliding with the solid bomb barrier right as the chain detonation fires.
3. **Late-Game 10-Bomb / Level-10 Fire Carpet**:
   - At `10 Bombs` and `Level 10 Fire Up`, Bomber Man carpets the arena in interlocking cross-blast grids where one detonation triggers an unavoidable 10-bomb chain reaction across the entire `450×450` arena.
4. **Invincible Overdrive**:
   - As soon as **Ultimate: Invincible** is ready, Bomber Man activates his **incoming attack immunity**, ignores all enemy zoning/combos, and aggressively plants max-level bombs directly in the opponent's path without any fear of counter-attacks.

---

## 🛡️ Engine Compliance & Repository Rules Checklist

| Rule # | Repository Standard | Bomber Man Implementation Specification | Status |
| :---: | :--- | :--- | :---: |
| **Rule 1.1** | Freeze & TimeStop Early Exits | `const isFrozen = this._handleTimeStop(); if (isFrozen \|\| this.isTargetOfAmbush) { this.interruptAttacks(); return; }` placed right after top-of-update VFX decay. | **COMPLIANT** |
| **Rule 1.2** | Centralized Movement & Physics | Uses `this.applyMovementPhysics(speedMultiplier)` and `this.resolveWallBounce(arena, opponent)` (with beam/stasis guards). | **COMPLIANT** |
| **Rule 19** | Upright Front POV & Faceless Minimalist | Upright front-facing helmet, pink antenna at `-Y`, visor at `Y ~ 0` (zero eyes/mouth/nose), blue tunic & gold belt at `+Y`, vertical flip `ctx.scale(1, -1)` when facing left. | **COMPLIANT** |
| **Rule 20** | Canonical Default Hand Positioning | Symmetrical spherical pink hands at `(-r * 0.82, +r * 0.38)` and `(+r * 0.82, +r * 0.38)`, `handRadius = r * 0.30`. Held bomb anchors directly at right hand. Zero duplicate hands. | **COMPLIANT** |
| **Rule 21** | Mandatory Overlay HP & Status Drawing | Custom `draw(ctx, opponent)` explicitly calls `this.drawHealth(ctx);` and `this.drawFreezeTimer(ctx);` at the end of `draw()`, and implements `drawBody(ctx)`. | **COMPLIANT** |
| **Rule 22** | Dedicated Hair/Head Asset Import | Imports `Assets/model/bomberman/Bomberman-hair.png` via `_getBombermanHairImage()` with eager initialization and `_drawBombermanHair(ctx, r, facingLeft)`. | **COMPLIANT** |
| **Rule 23** | Mandatory Basic Projectile Suppression | Overrides `shoot(ownerIndex)` with bomb-laying action so generic bullets never spawn. | **COMPLIANT** |
| **Rule 24** | Universal Body Model (Toji Baseline) | `r: 25, radius: 25`, discrete $P = 2.0\text{px}$ offscreen canvas cache (`_cachedBombermanCanvas`), 4-neighbor `#0E0F14` outline, luminance $Y \ge 24$ on dark belt/boots. | **COMPLIANT** |
| **Rule 25** | Non-Freezing Active Visual Effects Decay | `_updateVisualExplosions()` and `_updateVisualEffects()` run at the very top of `update()` before `_handleTimeStop()` so bomb blast animations never freeze in mid-air. | **COMPLIANT** |
| **Rule 26** | Clean Concentric Shockwaves (Anti-Cobweb) | Bomb detonations use sequential water-ripple wave discs ($t_0=0.00, t_1=0.12, t_2=0.24$) with warm interior washes and zero radial spoke meshes or spinning ticks. | **COMPLIANT** |
| **Rule 28** | YouTube Shorts Vertical Arena Standard | Designed around the canonical `450 × 450` vertical arena (`x: 45, y: 240`), with Level 10 Fire Up spanning the full arena width cleanly. | **COMPLIANT** |
| **Rule 31** | Uncropped Visual Effects (Anti-Box) | Cross-flame arms and Invincible aura rings use rounded caps and radial gradients with generous transparent padding and zero flat `fillRect` box clipping. | **COMPLIANT** |

---

## 📂 Proposed File Architecture for Implementation Phase

When scaffolding and implementing **Bomber Man** into the codebase, the following modular files will be created and registered:

| Component | Target File Path | Responsibilities |
| :--- | :--- | :--- |
| **Fighter Specification Doc** | [`docs/fighters/bomberman.md`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/docs/fighters/bomberman.md) | Complete character design, scaling tables, and rules compliance reference |
| **Character Configuration** | `js/configs/characters/bombermanConfig.js` | Base stats (`r: 25`, `hp: 360`), `maxBombs: 1 → 10`, `fireLevel: 1 → 10`, `invincibleDuration: 1800` (30s), cooldowns, and asset paths |
| **Fighter Entity Class** | `js/entities/fighters/BombermanFighter.js` | Bomb entity array management, **Passive: Bomb Up** (Max 10), **Fire Up** (Max 10), **Bomb Pass** collision bypass, **30s Invincible** `takeDamage` immunity override, and chain-reaction physics |
| **Body Skin Renderer** | `js/graphics/fighters/bombermanSkin.js` | Rule 24 Toji-standard offscreen pixel rasterizer (`_cachedBombermanCanvas`), Rule 22 antenna loader, Rule 20 symmetrical pink hands, and Invincible prism aura |
| **Bomb & Flame VFX Renderer** | `js/graphics/weapons/bombermanWeaponGraphics.js` | Pulsing round black bombs, sizzling fuse sparks, `+` cross-flame pillars scaling from Lv.1 to Lv.10, power-up tile popups, and Rule 26 concentric shockwaves |
| **HUD Skill Provider** | `js/graphics/ui/hudSkillProviders.js` | Displays real-time `Bomb Up (X/10)`, `Fire Up (Lv.X/10)`, `Bomb Pass`, and `Invincible (30.0s)` HUD bars |
