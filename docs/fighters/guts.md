# Guts — The Black Swordsman (ガッツ)

**Category:** Anime & Dark Fantasy (*Berserk* by Kentaro Miura)  
**Theme Color:** Wrought Iron Charcoal / Cold Steel (`#1B1D22` / `#71717A`)  
**Secondary Accents:** Visceral Blood Crimson (`#DC2626`), Brand Curse Carmine (`#991B1B`), Cannon Fire Amber (`#F59E0B`), Pure Razor White (`#FFFFFF`), Void Manga Ink (`#0E0F14`)  
**Role:** Heavy Vanguard Juggernaut, Super-Armored Berserker, Relentless Executioner  

---

## 📖 Lore & Character Philosophy

> *"It was too big to be called a sword. Massive, thick, heavy, and far too rough. Indeed, it was like a heap of raw iron."*

Born from the corpse of a hanged woman beneath a gallows tree, Guts knew nothing of warmth—only the weight of a sword twice his size and the brutal rhythm of mercenary warfare. As the legendary former Raider Commander of the Band of the Hawk, Guts carved a bloody path across Midland alongside Griffith and Casca.

Everything shattered during the apocalyptic catastrophe of the Eclipse. Branded with the **Brand of Sacrifice** on the right side of his neck, Guts was condemned to be hunted by demons, restless spirits, and Apostles until the end of time. Armed with the **Dragon Slayer**—a monstrous 400-pound slab of raw iron forged by blacksmith Godo—and a left prosthetic iron arm concealing a high-explosive wrist cannon and repeating crossbow, Guts became **The Black Swordsman**.

When his human flesh breaks against monstrous odds, Guts dons the dwarf-forged **Berserker Armor**. The armor bites into his flesh with internal iron spikes to pin fractured bones, purges the sensation of pain, and unleashes the ravenous **Beast of Darkness**—allowing him to struggle, contend, and defy the God Hand itself until his very last breath.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard & Rule 24 Toji Baseline)
Guts' model, attire, bandoliers, armor plates, and scars strictly adhere to the front-profile camera orientation standard, built on the canonical Toji body geometry (`r = 25`):
- **Zone 1: Pure Face & Head Dome (`ry < r * 0.30`, `~7.5px`)**:
  - Weathered, battle-hardened sun-tanned skin tone (`#DFAC87`) with jaw contour shading (`#C4906C`).
  - **Closed Right Eye & Nose Bridge Slash Scar**: A crisp diagonal scar slash across the nose bridge and a closed right eye slit.
  - **Faceless Minimalist Anime Aesthetic (Rule 3.2 & Rule 18)**: Zero drawn pupils, irises, lips, or nose lines. Character identity is conveyed purely through his rugged hair silhouette, distinctive scars, tattered cloak collar, and heavy iron pauldrons.
  - **Brand of Sacrifice (Right Flank of Neck)**: Crimson occult stigma (`#DC2626`) on the right neck flank that pulses and bleeds crimson micro-droplets in combat.
  - **Zero Baked Hair**: Face dome remains completely clean; hair is strictly rendered on Layer 2.
- **Zone 2: Collar & Upper Torso / Cuirass (`r * 0.30 <= ry < r * 0.65`)**:
  - Full-circle width blackened steel breastplate (`#23262E`) with beveled center chest ridge and metallic glint bevels (`#4A505C`).
  - Dark tattered mercenary mantle / travel cloak draped behind shoulders with silver-riveted iron pauldrons on `±X` flanks (`#3F444E`).
  - Leather neck collar with steel gorget rim guarding the throat.
- **Zone 3: Waistband, Belt & Utility Bandolier (`r * 0.65 <= ry < r * 0.78`)**:
  - Twin criss-crossed studded leather utility belts (`#42281D`) with aged brass buckles (`#B48A42`).
  - Leather equipment pouches and throwing knife sheaths strapped at the waist flanks.
- **Zone 4: Lower Trousers & Armored Greaves (`ry >= r * 0.78`)**:
  - Heavy black padded mercenary trousers and articulated plate greaves (`#1C1E24`), maintaining strict luminance separation ($Y \ge 24$) against the outer outline.
  - Steel-capped combat sabatons anchoring the lower stance.
- **Outer 4-Neighbor Ink Outline Shell (Rule 24)**:
  - Solid dark manga ink outline (`#0E0F14`) rendered using the canonical 4-neighbor boundary test with zero floating single-pixel artifacts.

### 2. Canonical Default Model Hand Positioning & Weapon Wielding (Rule 20)
- **Symmetrical Flank Anchors**:
  - **Left Hand (Prosthetic Iron Arm)**: Positioned at `(x: -r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`. Dark gunmetal steel finish (`#4A505A`) with visible rivet joints and brass latch pins. Conceals the Miniature Wrist Cannon and Repeating Crossbow.
  - **Right Hand (Human Flesh Arm)**: Positioned at `(x: +r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`. Wrapped in white linen hand bandages (`#D1D5DB`) with exposed leather-gloved palm, gripping the hilt of the Dragon Slayer.
- **Layering & Overlap**: Rendered on the front layer overlapping the lower perimeter of the body circle.
- **Single-Source Hand Standard**: All weapons anchor directly to these canonical hands. Zero disconnected weapon hands.

### 3. Hair & Head Asset Model Import (Rule 22 — Berserker Helmet)
- **Asset Path**: `Assets/model/Guts/Guts_helmet.jpg` / `Assets/model/Guts/Guts_helmet.png` (registered under `assets.helmet` and `assets.hair` in `js/configs/characters/gutsConfig.js`).
- **Module-Level Eager Cache**: Loaded via `_getGutsHelmetImage()` with eager initialization and fallback logic (`.png` with `.jpg` fallback).
- **Helmet Silhouette**: Pixel art Berserker Armor wolf helmet with jagged snout, dark steel plates, and menacing crimson eye slits.
- **Proportions & Calibration**:
  - Raw Asset: `2048 × 2048` (visible bounding box `1597 × 2027` centered at `x = 1023.5`).
  - In-Game Proportions: Scaled to `targetW = r * 2.30` and `targetH = targetW * (2027 / 1597) = r * 2.92`, anchored at `drawY = -r * 1.45` to seamlessly frame the upper body circle and head dome. Supports real-time adjustments via `state.skinCustomizations.guts`.

### 4. Discrete 2D Pixel Rasterization ($P = 2.0\text{px}$) & Offscreen Canvas Cache (Rule 3.5)
- Guts' procedural pixel art body is rasterized once into an axis-aligned in-memory canvas (`_cachedGutsCanvas`) via `_renderGutsPixelBodyToCanvas(destCtx, r)`.
- Blitted during gameplay loops via `ctx.drawImage(_cachedGutsCanvas, -size / 2, -size / 2)` with `ctx.imageSmoothingEnabled = false;`.
- Re-rasterized only when `fighter.r` or visual state changes (such as Berserker Armor activation).

### 5. The Colossal Dragon Slayer Model & Weapon Graphics
- **Asset Path**: `Assets/model/Guts/Guts_heavy_sword.jpg` / `Assets/model/Guts/Guts_heavy_sword.png` (registered under `assets.sword` in `js/configs/characters/gutsConfig.js`).
- **Dimensions & Geometry**:
  - Raw Asset: `2048 × 2048` (grip hilt at `(440, 1660)`, blade tip at `(1800, 300)`, angle `-45.0°`).
  - Rotation Alignment: Rotated by `+45.0°` (`Math.PI / 4`) to orient the blade forward along the $+X$ axis.
  - In-Game Scale: Scaled to `reach = 85px` (`s = 85.0 / 1920.0`), anchored directly at the canonical right hand `(x: +r * 0.82, y: +r * 0.38)`.
- **Anatomy**:
  - **Hilt / Grip**: Long two-handed grip wrapped in weathered, battle-stained leather straps (`#5C4033`).
  - **Crossguard**: Heavy rectangular blackened iron block with a raised circular central boss.
  - **Blade Face**: Massive dual-beveled blackened raw iron slab (`#2B2E35`) with dark steel fuller streaks, battle chips/notches along the edge, and razor polished steel cutting bevels (`#C4CBD4`).
- **Weapon Studio Integration**: Fully customizable via `state.weaponCustomizations.guts` (offset X/Y, scale, rotation offset).

### 6. Dynamic Crescent Slashes & Eraser Wipe (Rule 15 Standard)
- **Supersonic Iron Crescent**: Annular blade arc enveloping the full blade span from guard (`innerR = r + 8px`) to blade tip (`outerR = r + 92px`).
- **3-Layer Heavy Cleave Palette**:
  - Outer Iron Smudge & Dark Mist: Deep charcoal soot aura (`rgba(27, 29, 34, 0.45)`).
  - Dense Cold Steel Body: Searing razor steel silver (`rgba(209, 213, 219, 0.90)`).
  - Razor-Sharp Core Streak: Supersonic razor white cutting edge (`rgba(255, 255, 255, 0.98)`).
- **Sinusoidal Eraser Wipe**: During recovery frames, the slash tip remains locked in world space while the tail angle rapidly chases the tip (`(1 - recP)^1.4`), cleanly erasing the crescent from tail to tip.

### 7. Clean Concentric Ground Smashes (Rule 26 Anti-Cobweb Standard)
- Dragon Slayer impact slams and Wrist Cannon explosions propagate clean, sequential water-ripple compression rings ($t_0 = 0.00, t_1 = 0.12, t_2 = 0.24$) expanding outward along a decelerating power curve ($R = R_{\max} \cdot p^{0.6}$).
- Semi-transparent dust wash interior with detached flying stone shrapnel and spark points.
- **Strictly Zero Radial Spoke Meshes, Cobweb Connecting Rays, or Spinning Ticks**.

### 8. 🥋 Dynamic Poses & Stance Architecture (Pre-Match Countdown vs In-Match Combat)
Guts implements distinct visual poses and stances for pre-match countdown/neutral exploration versus active in-match battle combat:

| Feature / Element | Stance 1: Countdown Neutral Stance (1st Pic) | Stance 2: Match Starting Battle Stance (2nd Pic) |
| :--- | :--- | :--- |
| **Trigger State** | `gameState === 'countdown'`, `select`, `faceoff`, or `isCountdownStance === true` | `gameState === 'playing'` / Active match combat |
| **Character Silhouette** | Upright, relaxed veteran posture with heavy cloak draped over back | Low, aggressive forward combat crouch with dynamic flowing cloak |
| **Headgear / Head** | **Unhelmeted Human Head** (`_drawGutsHair` via `Guts-hair.png`), spiky black manga hair, right eye battle scar, faceless dome | **Berserker Wolf Helmet** (`_drawGutsHelmet` via `Guts_helmet.png`), glowing crimson eye slit flares |
| **Dragon Slayer Position** | Resting across left shoulder (`(-r * 0.36, -r * 0.18)`), angled back across torso (`-0.52 rad`) | Held forward ready in two-handed grip at right hand anchor (`(+r * 0.82, +r * 0.38)`) |
| **Left Hand Placement** | Raised to left shoulder gripping the sword hilt directly (`(-r * 0.36, -r * 0.18)`) | Canonical lower-left flank (`(-r * 0.82, +r * 0.38)`), prosthetic iron gauntlet |
| **Right Hand Placement** | Hanging loose at right side (`(+r * 0.82, +r * 0.52)`), bandaged hand dangling naturally | Anchored directly over the weapon grip hilt (`(+r * 0.82, +r * 0.38)`) |
| **Rule 20 Compliance** | Exactly 1 pair (2 hands total): 1 at shoulder hilt, 1 loose at side. Zero duplicates. | Exactly 1 pair (2 hands total): 1 at left flank, 1 over weapon grip. Zero duplicates. |
| **Melee Combat Kinematics** | Stationary resting pose (no active combo) | Full 5-phase cleave lifecycle (Lift $\to$ Hold $\to$ Strike $\to$ Impact Lock $\to$ Recovery) |
| **Horizontal Doll Asset** | `Assets/model/Guts/Guts_neutral_countdown.png` (`145 × 175px`) | `Assets/model/Guts/Guts_battle_stance.png` (`205 × 155px`) |

---

## 🛡️ Baseline Stats

| Attribute | Base Form (The Black Swordsman) | Berserker Armor Active | Engineering / Combat Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `1150` | `1150` (Vampiric Drain & Spike Mend) | Colossal vanguard frontline health pool |
| **Base Speed** | `2.45` | `3.45` (`+40.8%`) | Heavy armored stride $\to$ Feral supersonic sprint |
| **Body Radius** | `25px` | `25px` | Universal baseline humanoid hitbox (Rule 24) |
| **Melee Reach** | `125px` | `145px` | Monstrous frontal arc blade envelope |
| **Poise / Super Armor** | `100 Poise` (Heavy Resistance) | `Infinite Poise` (Unstoppable) | Resistant to light chip hit-stun & interrupts |
| **Damage Mitigation** | `18%` (Blackened Plate) | `30%` (Dwarf-Forged Od Plating) | High natural physical damage reduction |
| **Critical Strike Rate** | `20%` (Bone Crushing) | `45%` (Visceral Cleave) | Devastating armor-penetrating critical hits |
| **Shoot Suppression** | Blank `shoot()` (Rule 23) | Blank `shoot()` (Rule 23) | Suppresses base generic projectile shooting |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🛡️ Indomitable Will: The Struggler (*Fukutsu no Aragai*)
> *"He who confronts death, struggles, and wriggles—that alone is the sword of a human being!"*

Guts' entire existence is defined by unyielding defiance against inescapable fate and demonic powers:
* **Heavy Poise & Flinch Resistance**:
  - Guts possesses an internal **100-Point Poise Gauge**. Light projectiles, chip attacks, and basic melee grazes do not stagger him or interrupt his attack animations.
  - Heavy attacks deplete poise. When depleted, poise regenerates fully after `1.8 seconds` without taking heavy hits.
* **Lethal Defiance (Death Gate Stagger)**:
  - When taking lethal damage that would reduce HP to 0, Guts refuses to fall:
  - Survives at **1 HP** with **1.2 seconds of Absolute Invulnerability** (`72 frames`).
  - Triggers a deafening heartbeat shockwave, enters **Death Gate Stagger**, and gains **+35% Movement Speed** and **+30% Damage** for `5.0 seconds` (Internal Cooldown: `50.0 seconds`).

---

### 2. 🩸 Brand of Sacrifice & Od Gauge (*Ikenie no Rakuin*)
The cursed stigma carved into Guts' flesh throbs with visceral agony in the presence of evil and combat tension:
* **Combat Agony (Od Accumulation)**:
  - Taking damage, dealing damage, or standing near enemy domain expansions, summons, or clones charges Guts' **Od Gauge (0–100%)**.
  - Rate of charge: +1.0% per 10 damage dealt; +1.5% per 10 damage taken.
* **Blood Adrenaline Milestones**:
  - **At 50% Od**: The Brand begins bleeding glowing crimson trails. Guts gains **+12% Movement Speed** and **+15% Melee Attack Speed**.
  - **At 100% Od**: The gauge flares with volatile dark red cursed flames, unlocking the **Awakening of the Berserker Armor**.

---

### 3. ⚔️ Slab of Raw Iron: Astral & Armor Shred (*Dragon Koroshi*)
Tempered in the blood and malicious malice of over a thousand slaughtered demons, spirits, and Apostles, the Dragon Slayer exists simultaneously in the physical and astral realms:
* **Astral Penetration (True Damage Conversion)**:
  - 25% of all Dragon Slayer damage is dealt as **True Damage**, completely bypassing energy shields, barrier protections, and standard defense buffs.
* **Armor Crushing Debuff**:
  - Direct hits with the blade inflict **Armor Fracture** for `4.0 seconds`:
  - Reduces the target's physical resistance by **20%** (stacks up to 2 times for **40% total reduction**).
  - Fractured targets emit pulverized armor debris and gray metallic sparks when struck.

---

## ⚔️ Active Skills & Melee Combos

### 🗡️ Basic Attack: *Dragon Slayer Cleave Combo* (Rule 30 Melee Standard)
A brutal 3-hit heavy cleave sequence demonstrating authentic 5-phase heavy weapon kinematics, impact latch physics, and layered fleshy slap audio:

```
[Phase 1: Coil/Lift] ──► [Phase 2: Poised Hold] ──► [Phase 3: Hypersonic Whip Strike]
         (7f)                      (3f)                                 (6f)
                                                                         │
                                                                   (Impact at p >= 0.50)
                                                                         │
[Phase 5: Recovery Settle] ◄── [Phase 4: THE IMPACT LOCK / LATCH] ◄─────┘
         (10f)                                  (6f-7f)
                                       - Weapon locked into impact plane
                                       - Clamped vx = 0, vy = 0
                                       - Micro-tremor vibration (+-2.2px)
                                       - Slash ribbon locked at impact
                                       - Concentric compression ring & sparks
```

#### Hit 1: Horizontal Waist Cleave (*Ichi-monji Barai*)
* **Kinematics**:
  - **Phase 1 (Lift/Coil, 7f)**: Hoists the 400-pound iron slab behind his left shoulder, muscles coiling (`Math.sin(p * Math.PI * 0.5)`).
  - **Phase 2 (Hold, 3f)**: Tense pause at maximum rear extension as energy loads.
  - **Phase 3 (Strike, 6f)**: Explosive horizontal cleave across a **140° frontal arc** with forward lunging momentum (`+12px`).
  - **Phase 4 (Impact Lock, 6f)**: Blade latches rigidly into the impact angle (`+0.95 rad`). Velocity clamped to `vx = 0, vy = 0`. Sword micro-tremor jitter (`±2.0px`). Slash ribbon remains 100% unfurled on the cleavage plane.
  - **Phase 5 (Recovery, 9f)**: Blade settles forward with spring-damped return; crescent tail chases tip via sinusoidal eraser wipe.
* **Damage & Reach**: `38 Damage` (`+9.5 True Damage`), `120px reach`.
* **Audio Layer**: `attack_fleshhit` (1.0) + `attack_swordswing` (0.90) + heavy metallic steel clash.

#### Hit 2: Upward Rising Scoop (*Kiri-age Scoop*)
* **Kinematics**:
  - Scoops the heavy iron tip along the arena floor, lifting upward in a vicious diagonal cleave (**130° arc**).
  - Hits launch the enemy upward in vertical hit-stun suspension.
  - **Impact Lock (6f)**: Blade locks at upper apex (`-1.15 rad`). High-frequency vertical blade vibration.
* **Damage & Reach**: `44 Damage` (`+11 True Damage`), `125px reach`.
* **Audio Layer**: `attack_fleshhit` (1.0) + `Sukuna-slice` (0.85) + rising air vacuum rumble.

#### Hit 3: Colossal Overhead Splitting Slam (*Kabuto-wari Finisher*)
* **Kinematics**:
  - Guts leaps forward with both hands hoisting the Dragon Slayer above his head and violently slams the flat edge into the target and arena floor.
  - **Phase 4 Impact Lock (7f)**: Colossal iron slab buries 16px deep into the arena floor. Velocity locked to `vx = 0, vy = 0`. High-intensity ground micro-tremors (`±3.0px`). Concentric ground compression rings detonate at blade tip (Rule 26).
  - Launches targets into a **Kinetic Wall Ricochet** with `1.5s` of 50% movement slow upon rebound!
* **Damage & Reach**: `68 Heavy Damage` + `22 True Shockwave AOE Damage` (`90px radius`).
* **Audio Layer**: `attack_fleshhit` (1.0) + `groundSmash.mp3` (1.0) + `heavypunch1.mp3` (0.95) + reverberating iron bell chime.

---

### 💥 Skill 1: *Calamity Cleave Combo* (断絶・黄金斬波)
* **Cooldown:** `7.0s` (`420 frames`)
* **Reference Frames 1–12 Kinematic Lifecycle (Calibrated Exact Sword Angles & Positions)**:

#### Sequence 1: Calamity Cleave & Supersonic Crescent Wave (Reference Frames 1–6)
1. **Frame 1 (Neutral Battle Stance)**: Sword rests at shoulder angle (`2.97 rad` / `170°`, `lunge: 0, offY: 0`).
2. **Frame 2 (Ignition & Low Ready Guard - 12 frames)**: The Dragon Slayer ignites with radiant golden energy. Guts smoothly lowers his hands and tilts the blade into a low forward ready angle (`1.25 rad` / `72°`, `lunge: -3px, offY: +6px`).
3. **Frame 3 (Deep Coil Backward - 16 frames)**: Guts leans his torso backward (`lunge: -16px, offY: -3px`), smoothly drawing the incandescent golden blade high behind his back into maximum potential tension (`2.75 rad` / `158°`).
4. **Frame 4 (Sweeping Cleave Stroke - 9 frames)**: Guts lunges forward with full bodily drive (`lunge: +22px`), whipping the heavy steel blade across a full 298° cleave plane. The swing is visible and weighted across all 9 frames, releasing a 520px horizontal flash as it passes forward (`0°`), dealing `65 Direct Melee Damage` with an 8-frame impact lock.
5. **Frame 5 (Follow-Through Lock & Wave Detachment - 18 frames)**: The blade locks firmly high over his opposite (left) shoulder (`-2.45 rad` / `-140°`, `lunge: +22px, offY: -6px`) as the independent golden crescent wave detaches and soars forward across the floor at `10.5px/frame` (`45 Wave Damage`, `140px width`).
6. **Frame 6 (Twin-Ribbon Split & Follow-Through Hold - 14 frames)**: Guts firmly holds the follow-through pose over his left shoulder (`-2.45 rad`) while the crescent wave travels forward, seamlessly handing off directly into Sequence 2 (Frame 7) without any pause or settle to neutral!

#### Sequence 2: Reverse Cleave & Skyward Scoop Finisher (Reference Frames 7–12)
7. **Frame 7 (High Left Coil & Golden Vortex Inward Suction - 18 frames)**: Guts pulls the colossal blade up and back behind his left shoulder (`-2.70 rad` / `-155°`, `lunge: -12px, offY: -12px`). A swirling vortex of golden flakes and energy gathers inwards toward his feet.
8. **Frame 8 (Blinding Horizontal Counter-Cleave Flash - 5 frames)**: Guts violently drives his entire upper body forward (`lunge: +32px, offY: +2px`), cutting level across his waist from left to right (`-2.70 rad` through `0°` to `+0.35 rad` / `+20°`), detonating a 580px horizontal flash with supersonic speed needles.
9. **Frame 9 (Skyward Scoop Cleave Arc - 6 frames)**: The horizontal cleave whips upward into the sky, arcing from waist level into a high-right apex (`-0.65 rad` / `-37°`, `lunge: +28px, offY: -14px`), trailing an immense golden flame slash ribbon and dealing `85 Heavy Melee Damage` with 10 frames of impact stasis.
10. **Frame 10 (Skyward Apex Impact Lock & Wave 2 Detonation - 18 frames)**: Guts locks firmly in the apex plane at full extension (`vx = 0, vy = 0`), the blade vibrating with micro-tremor jitter (`±3.0px`), detonating an incandescent Golden Crescent Wave 2 (`55 Wave Damage`, `165px width`, `12.0px/frame`) and scattering shattered golden embers.
11. **Frame 11 (Poised Apex Hold & Radiant Blade Roar)**: Guts maintains the triumphant high-guard lock with the blazing golden blade roaring with radiant heat.
12. **Frame 12 (Poised Settle back to Battle Stance - 24 frames)**: The golden fire softly dissipates into embers, and Guts lowers the colossal iron blade with weighted inertia back across his torso to neutral battle stance (`2.97 rad` / `170°`) with damped spring recoil.

* **Audio Layer**: `attack_swordswing` (1.0) + `attack_fleshhit` (1.0) + `Sukuna-slice` (0.95) + `explosion.mp3` (0.75) + `heavypunch1.mp3` (0.85).

---

### 💣 Skill 2: *Prosthetic Arm Cannon & Repeating Crossbow* (義手砲 & 連射ボウガン)
* **Cooldown:** `7.0s` (`420 frames`)
* **Toggle:** `enableSkill2: 0` (Disabled by default during Skill 1 testing)
* **Dual Execution Mode (Tap vs Hold)**:

#### Mode A: Repeating Crossbow Barrage (Quick Tap)
* **Action**: Guts cranks the top-mounted mechanical winch of his left prosthetic forearm, unleashing a rapid volley of **5 piercing spring-steel bolts** in a concentrated forward cone ($18^\circ$ spread).
* **Kinematics**: Rapid mechanical ratchet sounds and bolt whistles (`5 frames` per bolt).
* **Damage**: `5 × 14 = 70 Piercing Damage`.
* **Utility**: Bolts pierce through minor summons and illusions, impaling the target and inflicting **30% Movement Slowdown** for `2.0 seconds`.

#### Mode B: Concealed Wrist Cannon — Zero-Range Blast (Hold > 18 frames)
* **Action**: Guts unlatches the iron palm plate of his prosthetic hand, dropping the hand down to expose a high-caliber steel cannon barrel aligned with his forearm.
* **Kinematics**:
  - Guts lunges forward into point-blank range, points the muzzle directly into the opponent's torso, and yanks the firing cord.
  - **Supersonic Cannon Blast**: Unleashes a massive explosive fireball and high-density gunpowder smoke plume.
  - **Heavy Recoil**: Guts is violently kicked backward opposite his aim angle by `-14.0px` velocity impulse.
  - **Impact Shockwave**: Detonates concentric supersonic Mach compression rings (Rule 26) in an `85px` blast radius.
* **Damage**:
  - **Standard Blast**: `100 Explosive Damage`.
  - **Point-Blank Sweet Spot (< 50px)**: **`145 Massive Critical Damage`**, instantly breaking target shields and triggering violent wall-bounce ricochet.
* **Audio Layer**: `Assets/Sound Effects/Attacks/explosion.mp3` (1.0) + `shootgunshot.mp3` (0.95) + deep sub-bass cannon crack.

---

### 🌪️ Skill 2: *Iron Cyclone / Cleaving Rush* (剛剣旋風 - Cyclone Cleave)
* **Cooldown:** `10.5s` (`630 frames`)
* **Action**: Guts drops his center of gravity, grips the Dragon Slayer with both hands, and rotates his entire torso in a high-torque 360° whirlwind cleave.
* **Kinematics & Phases**:
  - **Phase 1: High-Torque Spin (18 frames)**: Spins full 360° twice with a massive `135px reach` blade perimeter. Creates a centrifugal vacuum vortex that vacuums nearby opponents inward toward his body.
  - **Phase 2: Release Cleave (6 frames)**: Extends the full blade outward at maximum rotational inertia, launching all caught enemies outward into arena walls.
  - **Impact Lock (6f)**: Guts locks in an open wide stance as the centrifugal force stabilizes.
* **Super Armor & Poise**:
  - Guts gains **Unstoppable Super Armor** throughout the entire skill duration—immune to all stuns, interruptions, and knockback pushes.
* **Damage**: `2 × 42 = 84 Spin Damage` + `46 Release Cleave Damage` (Total: **`130 Total Damage`**).
* **Audio Layer**: `spinslash.mp3` (1.0) + `Assets/Sound Effects/Attacks/swordswing.mp3` + heavy wind cutter whoosh.

---

### 🐺 Ultimate Skill: *Awakening of the Beast: The Berserker Armor* (狂戦士の甲冑)
* **Cooldown:** `35.0s` (`2100 frames`) / **Requirement:** 100% Od Gauge (or auto-readies at 35s mark).
* **Visual & Audio Transformation**:
  - Guts clutches his head as the demonic Od within the armor surges. The dark wolf-like iron visor of the Berserker Armor snaps shut over his face with a series of metallic clangs and internal spike snaps.
  - Searing crimson light erupts from the wolf helmet's jagged eye slits.
  - Global screen darkens into high-contrast dark manga tones with floating crimson blood ash particles and the ominous crimson silhouette of the **Beast of Darkness** looming in the arena background.
  - **Audio Cue**: `Assets/Sound Effects/Skills/ragescream.mp3` (1.0) layered with metallic armor locking sounds, deep ominous heartbeat thuds, and a demonic wolf roar.

```
+=============================================================================+
|                      THE BERSERKER ARMOR TRANSFORMATION                     |
|                                                                             |
|   Human Form (Black Swordsman)              Berserker Form (Beast Unleashed)|
|                                                                             |
|      [ Clean Head Dome ]                         [ Wolf Helm Closes ]       |
|      [ Black Iron Cuirass ]          ───►        [ Jagged Crimson Eyes ]    |
|      [ Normal Dragon Slayer ]                    [ Spikes Piercing Flesh ]  |
|      [ Poise = 100 ]                             [ Infinite Super Poise ]   |
|                                                  [ +40% Speed / Vampirism ] |
+=============================================================================+
```

* **Berserker State Enhancements (Duration: 10.0 Seconds / 600 Frames)**:
  1. **Monstrous Kinematics**:
     - Movement Speed increased by **+40.8%** (`3.45px/f`).
     - Melee Attack Cooldowns reduced by **30%**, creating relentless supersonic cleave sequences.
     - Blade reach extended to `145px` with boiling crimson/black cursed energy auras.
  2. **Total Pain Suppression & Infinite Poise**:
     - Guts cannot be flinched, hit-paused, frozen, or interrupted by any attack or crowd-control debuff (except global time-stops).
  3. **Vampiric Blood Mend (Rule 27 Lifesteal Standard)**:
     - Every hit with the Dragon Slayer heals Guts for **35% of damage dealt**.
     - Healing is processed **strictly through the healthbar system** (direct HP replenish + top health card pulse + overhead HP display); **ZERO floating arena heal text is spawned**.
  4. **Feral Beast Combo**:
     - Basic attacks transform into wild, animalistic leaps and tearing sweeps with razor-sharp black-and-crimson crescent shockwaves.
     - Landing strikes trigger **Internal Spike Reinforcement**: restores 35 HP and expels razor blood quills dealing 20 AOE damage to nearby targets.

* **Ultimate Finisher: *Eclipse Severance* (断罪の一撃 - Finisher Reactivation)**:
  - If the Ultimate key is pressed again during the final 3.0 seconds (or automatically upon state expiry if in melee range):
  - Guts roars, launches himself high into the air, hoists the Dragon Slayer above his head with dark Od condensing into a colossal 200px blade silhouette, and executes a catastrophic bisection cleave into the arena floor.
  - **Damage**: **`165 Pure True Damage`**, shattering shields and tearing a jagged crimson fissure across the arena floor that lingers for 2.5 seconds.

---

## 🔊 Sound Design & Audio Palette

| Event / Combat Action | Primary Sound Asset / Synthesizer | Supplementary Layer | Description & Auditory Feel |
| :--- | :--- | :--- | :--- |
| **Dragon Slayer Swing** | `Assets/Sound Effects/Attacks/swordswing.mp3` | `Assets/Sound Effects/Skills/woosh.mp3` | Deep, low-frequency air displacement of a 400-pound iron slab |
| **Blade Flesh Impact** | `Assets/Sound Effects/Attacks/fleshhit.mp3` (Vol: 1.0) | `Assets/Sound Effects/Attacks/heavypunch2.mp3` (Vol: 0.90) | Visceral concussive wet slap impact of heavy iron crushing muscle |
| **Finisher Ground Slam** | `Assets/Sound Effects/Attacks/groundSmash.mp3` (Vol: 1.0) | `Assets/Sound Effects/Attacks/heavypunch1.mp3` (Vol: 0.95) | Earth-shattering impact boom with reverberating iron skillet chime |
| **Repeating Crossbow** | Web Audio Rapid Ratchet ($440\text{Hz} \to 880\text{Hz}$) | `Assets/Sound Effects/Attacks/spikestab.mp3` | Snappy high-frequency mechanical gear release and bolt impact |
| **Wrist Cannon Blast** | `Assets/Sound Effects/Attacks/explosion.mp3` (Vol: 1.0) | `Assets/Sound Effects/Attacks/shootgunshot.mp3` (Vol: 0.95) | Deafening black-powder concussive detonation with metallic recoil echo |
| **Cyclone Cleave** | `Assets/Sound Effects/Skills/spinslash.mp3` (Vol: 1.0) | `Assets/Sound Effects/Attacks/swordswing.mp3` | Roaring centrifugal wind gale and whistling steel blade edge |
| **Armor Transformation**| `Assets/Sound Effects/Skills/ragescream.mp3` (Vol: 1.0) | Web Audio Iron Ratchet + Sub-Bass Heartbeat ($45\text{Hz}$) | Sickening iron snapping, bone realignment, and furious battle roar |
| **Brand Throbbing** | Custom Low-Frequency Pulse ($60\text{Hz} \leftrightarrow 120\text{Hz}$) | Audio Filter High Resonance | Menacing astral presence warning hum |

---

## 📐 Hitbox Geometry & Kinetic Physics

```
               [Frontal Arc 140° Reach: 125px]
                       .  - - -  .
                   .       |       .
                 /         |         \
                /          |          \
               |     \     |     /     |
               |       \   |   /       |
               |         \ | /         |
                \         (G)         /
                 \      [Guts]       /
                   .               .
                       .  - - -  .
```

- **Frontal Arc Dimensions**:
  - Horizontal Cleave: **$140^\circ$ arc**, **$125\text{px}$ radius**.
  - Rising Scoop: **$130^\circ$ arc**, **$125\text{px}$ radius**.
  - Overhead Slam: **$90^\circ$ narrow concentrated wedge**, **$135\text{px}$ reach** with **$90\text{px}$ circular ground shockwave**.
  - Cyclone Cleave: **Full $360^\circ$ circular sweep**, **$135\text{px}$ radius**.
  - Wrist Cannon: **$60^\circ$ conical burst**, **$85\text{px}$ forward reach** (sweet spot: $\le 50\text{px}$).
- **Kinetic Impulse Vectors**:
  - Hit 1 & Hit 2: Moderate stagger knockback (`push = 4.5px/f` for 8 frames).
  - Hit 3 (Overhead): Catastrophic downward slam launching targets into high-speed arena wall bounce (`bounceSpeed = 14.0px/f`).
  - Wrist Cannon Recoil: Pushes Guts backwards along `-cos(aimAngle) * 12.0px`.

---

## 🛡️ Engine Compliance & System Rules Checklist

| Rule # | Repository Rule Specification | Guts Implementation Architecture | Status |
| :---: | :--- | :--- | :---: |
| **Rule 19** | Upright Minimalist Skin Standard (Front POV) | Front-profile camera orientation, vertical scale flip on left facing (`ctx.scale(1, -1)`), faceless minimalist aesthetic (zero drawn eyes, mouth, nose; scars, brand, and spiky hair convey identity). | **COMPLIANT** |
| **Rule 20** | Canonical Default Model Hand Positioning | Left Hand at `(-r * 0.82, +r * 0.38)` (Prosthetic Iron Arm), Right Hand at `(+r * 0.82, +r * 0.38)` (Bandaged hand on Dragon Slayer). Zero duplicate hands. | **COMPLIANT** |
| **Rule 21** | Mandatory Overlay HP & Status Drawing | Calls `this.drawHealth(ctx);` and `this.drawFreezeTimer(ctx);` on top layer at end of `draw()`. Implements `drawBody(ctx)`. | **COMPLIANT** |
| **Rule 22** | Dedicated Hair Asset Model Import | Imports and caches `Assets/model/guts/Guts-hair.png` via `_getGutsHairImage()`. Supports `state.skinCustomizations.guts`. | **COMPLIANT** |
| **Rule 23** | Mandatory Basic Projectile Suppression | Explicitly overrides `shoot(ownerIndex)` with blank method to suppress default generic bullet projectiles. | **COMPLIANT** |
| **Rule 24** | Universal Body Model (Toji Baseline Standard) | Baseline radius `r: 25`, $P = 2.0\text{px}$ discrete offscreen canvas rasterization (`_cachedGutsCanvas`), 4-neighbor manga ink outline (`#0E0F14`), vertical 4-zone geometry. | **COMPLIANT** |
| **Rule 25** | Non-Freezing Active Visual Effects Decay | `_updateVisualExplosions()` and `_updateVisualEffects()` execute at top of `update()` before `_handleTimeStop()` freeze check. | **COMPLIANT** |
| **Rule 26** | Clean Concentric Shockwave Standard | Ground smashes and cannon blasts use sequential staggered water-ripple wave discs ($t_0=0.00, t_1=0.12, t_2=0.24$); strictly zero radial spoke meshes or cobwebs. | **COMPLIANT** |
| **Rule 27** | Lifesteal Healthbar-Only Feedback | Berserker Armor vampiric lifesteal updates directly on HP bar and top HUD health card; zero floating arena heal text. | **COMPLIANT** |
| **Rule 28** | YouTube Shorts Thumbnail & Vertical Arena Baseline | Guaranteed compatibility with canonical vertical arena `{ x: 45, y: 240, width: 450, height: 450 }`. | **COMPLIANT** |
| **Rule 30** | 5-Phase Melee Animation & Impact Lock | Full 5-phase lifecycle (Coil $\to$ Hold $\to$ Whip $\to$ Impact Lock $\to$ Recovery Settle), velocity clamped `vx=0, vy=0` during latch, micro-tremor jitter, layered slap audio. | **COMPLIANT** |

---

## 📂 File Architecture Plan for Implementation Phase

When scaffolding and coding Guts into the game engine, the following modular files will be created and integrated:
1. **Fighter Config**: `js/configs/characters/gutsConfig.js` — Base stats, 5-phase animation frame counts, skill timings, audio paths, and color themes.
2. **Body Skin Renderer**: `js/graphics/fighters/gutsSkin.js` — Discrete 2D pixel rasterization ($P = 2.0\text{px}$), Toji baseline proportions, faceless scar dome, Brand of Sacrifice, and Berserker Armor wolf visor.
3. **Weapon Renderer**: `js/graphics/weapons/gutsWeaponGraphics.js` — The Dragon Slayer model, double-beveled raw iron slab, dynamic crescent slash ribbons, and eraser wipe.
4. **Fighter Entity**: `js/entities/fighters/gutsFighter.js` — Combat logic, 5-phase melee state machine, Wrist Cannon blast, Cyclone Cleave, Berserker Armor transformation, and Rule 23 shoot suppression.
5. **System Registration**:
   - `js/configs/characterConfig.js` (registration in character registry)
   - `js/core/state.js` (selection roster & default unlocks)
   - `index.html` (script loading tags)
