# Choso — The Death Painting Eldest Brother

**Category:** Anime & Jujutsu Sorcerers  
**Theme Color:** Deep Crimson Blood (`#A31D1D` / `#8B0000`)  
**Secondary Accents:** Laser Core Radiant White-Pink (`#FF2A55` / `#FFFFFF`), Cursed Violet Shroud (`#6B1736` / `#4A0E2E`), Robe Charcoal Plum (`#261B2E`)  
**Role:** Sanguine Tactician, Arena Carpet Zoner, Laser Matrix Burst Finisher  

---

## 📖 Lore & Character Philosophy

Choso (脹相) is the eldest of the nine **Cursed Womb: Death Paintings** (*Jusō Taiten*), an incarnated hybrid born from the unholy union of a human woman, a cursed spirit, and the blood of the vile sorcerer Noritoshi Kamo (Kenjaku). Stern, melancholic, and fiercely devoted, Choso lives for a single absolute purpose: **the protection and love of his younger brothers**. 

*"I will stand at the front to protect them. Even if it makes me pathetic, even if I look ridiculous... an older brother has to lead the way for his little brothers!"*

When Choso discovers that Yuji Itadori shares the same bloodline, his paternal and brotherly instinct awakens with unstoppable conviction. In the *Circle Mini-Battle* arena, Choso wields the supreme zenith of **Blood Manipulation (*Sekiketsusōju — 赤血操術*)**. 

Unlike mortal Kamo clan sorcerers who risk fatal hypovolemic shock if they bleed excessively, Choso’s half-curse physiology allows him to **convert cursed energy directly into fresh blood**. He possesses an inexhaustible, infinite blood supply. Taking advantage of this biological miracle, Choso saturates the arena with his poisonous blood—and with a terrifying application of **Convergence (*Shuren*)**, hyper-pressurizes every stray blood droplet in the environment until it ignites, **transmuting scattered blood particles into a coordinated, multi-angle barrage of lethal, piercing laser beams!**

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard & Rule 24 Toji Baseline)
Choso's fighter model, facial silhouette, hair knots, and traditional Noritoshi robes strictly adhere to the front-profile camera orientation standard:
- **Head & Face Dome (`-Y` to `Y ~ 0`, Rule 3.2 Faceless Minimalist Aesthetic)**:
  - Clean fair/pale skin base dome (`#F2D7C3`) with side shadow contour (`#D8B298`).
  - **Zero Facial Features**: Strict prohibition of eyes, pupils, sclera, irises, nose bridge, or mouth.
  - **Iconic Blood Bridge Strip**: A prominent horizontal rectangular dark blood-scab band (`#5C131D` core with `#7F1D2B` edge) painted across the nose bridge and cheeks from `-r * 0.45` to `+r * 0.45` at `y = -r * 0.04` to `+r * 0.08`.
  - Bleak, cold expression communicated purely through posture and the horizontal blood stripe.
- **Hair Asset & High Twin Tufts (Rule 22 Standard)**:
  - External dedicated asset: `Assets/model/choso/choso-hair.png`.
  - Signature dark espresso / midnight-plum messy hair with two distinctive high-tied twin tufts/pigtails angling upward and outward at 45° from the crown apex (`drawY = -r * 1.35`).
  - Sharp jagged forehead bangs terminating at `y = -r * 0.22`, cleanly framing the upper skin dome.
- **Attire & Robes (`+Y`)**:
  - High cream-white under-kimono scarf collar tightly wrapped around the neck (`r * 0.28 <= ry < r * 0.42`).
  - Sleeveless dusty-lavender / deep plum-charcoal martial arts tabard tunic (`#2E2236`) spanning full circle width (`r * 0.42 <= ry < r * 0.65`).
  - Wide dark burgundy/black obi belt sash tightly bound at `y = +r * 0.65` to `+r * 0.78` with a forward knot fold.
  - Deep slate-black baggy hakama trousers (`#1A1622`) flowing downward to `+r * 1.05`.
- **Default Symmetrical Hands & Convergence Clasp (Rule 20 Standard)**:
  - **Left Hand**: `(x: -r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`.
  - **Right Hand**: `(x: +r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`.
  - **Convergence Hand Pose**: During *Convergence* and *Piercing Blood*, both hands translate smoothly to the center `(0, r * 0.25)` and clasp together into Choso's signature prayer compression gesture (`drawPixelHand` at `(0, 0)` with clasped fingers), cupping a radiant glowing blood sphere.
  - Full compatibility with `state.showSkinOnly`.

### 2. Discrete Pixel Art Rasterization ($P = 2.0\text{px}$) & Offscreen Cache (Rule 3.5 & Rule 24)
- Rasterizes the complete body circle onto an axis-aligned in-memory canvas (`_cachedChosoCanvas`) via `_renderChosoPixelBodyToCanvas(destCtx, r)`.
- Re-rasterizes ONLY when fighter radius `r` changes.
- Blits during rotated gameplay frames using a single `ctx.drawImage(_cachedChosoCanvas, -size / 2, -size / 2)` with `ctx.imageSmoothingEnabled = false;`.
- Strict 4-neighbor attached boundary shell test with solid dark manga ink outline (`#0E0F14`) and zero floating stray pixels.

### 3. Damage Blood Particles & Sanguine Particle Architecture
- Whenever Choso takes damage in combat, arterial blood particles spray violently out of his wounds (`spawnBloodEffect` into `state.bloodEffects`):
  - Every blood particle erupting from Choso is tagged (`isChosoBlood: true`, `sourceEntity: choso`) and tracked via the `onBloodParticleSpawned(particleData)` engine hook.
  - While airborne, droplets follow true fluid ballistic gravity arcs and arena wall/floor bounces.
  - Up to **32 concurrent blood droplets** can saturate the arena simultaneously.
  - Sanguine particles decay naturally over 12.0 seconds (`720 frames`), but Choso can seize command of them at any moment to transmute them into laser beams.

### 4. Crimson Laser Transmutation Visuals (Unique Signature Aesthetic)
- When Choso activates **Blood Transmutation: Crimson Laser Matrix**:
  - **Phase 1 — Gravitational Singularity Lock**: All active blood particles in the arena instantly stop all velocity (`vx = 0, vy = 0`), floating weightlessly.
  - **Phase 2 — Photonic Ionization**: Each blood droplet pulses violently, blooming into a blinding miniature crimson-white laser diode ring (`#FF2A55` outer halo, `#FFFFFF` pure core) with an expanding 2-stage compression ripple (Rule 26 compliant, no cobwebs or starburst spokes).
  - **Phase 3 — Optical Needle Telegraph**: Hair-thin target lock-on laser guidance beams (`0.75px`, `rgba(255, 42, 85, 0.65)`) snap from every blood node directly toward the opponent's center coordinate.
  - **Phase 4 — Supersonic Beam Discharge**: Every blood droplet simultaneously fires a high-intensity, continuous laser beam (`thickness: 4.5px`, white-hot core with radiant crimson-violet bloom) that lasts for 18 frames, cutting straight through the target with immense multi-hit concussive force!

### 5. Manga Action Speed Lines & Piercing Blood Shockwaves (Rules 16 & 26)
- **Speed Lines (Rule 16)**: 4-point filled needle polygons trailing strictly behind Choso during *Piercing Blood* recoil and *Flowing Red Scale* sprints.
  - 4-slot theme palette: Deep Blood Ink (`#3B0D14`), Cursed Crimson (`#A31D1D`), Laser Rose (`#FF2A55`), White Core (`#FFFFFF`).
- **Clean Concentric Shockwaves (Rule 26)**:
  - *Piercing Blood* muzzle blast: 3 staggered concentric compression discs popping out sequentially ($t_0 = 0.00, t_1 = 0.12, t_2 = 0.24$) along decelerating power curves.
  - Zero radial spokes, zero cobweb nets, zero spinning ticks.

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Flowing Red Scale Active | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `420` | `420` | High-durability Death Painting constitution |
| **Base Speed** | `2.45` | `3.18` (`+30%`) | Measured, tactical zoner spacing |
| **Body Radius** | `25px` | `25px` | Rule 24 Standard Humanoid Baseline |
| **Melee Reach** | `70px` | `75px` | 130° Frontal Arc Coagulated Blood Daggers |
| **Blood Droplet Cap** | `32 Nodes` | `32 Nodes` | Maximum lingering blood nodes in arena |
| **Blood Node Lifetime** | `12.0s` (`720f`) | `12.0s` | Refreshed upon new skill emissions |
| **Laser Beam Range** | Full Arena (`900px`) | Full Arena (`900px`) | Infinite range hitscan-velocity trajectory |
| **Laser Piercing Power** | `100% Piercing` | `100% Piercing` | Passes through summons, clones & multiple bodies |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🩸 Innate Technique: Infinite Sanguine Generation (*Mugen Ketsuryū — 無限血流*)
Unlike ordinary humans who suffer lethal blood loss and anemia from Blood Manipulation, Choso's half-curse biology enables **endless hematopoiesis**:
* **Cursed Energy to Blood Conversion**:
  - Choso has zero blood loss vulnerability.
  - Whenever Choso takes damage from enemy attacks, he bleeds violently—spawning **2 to 4 interactive Blood Droplet Nodes** that scatter around him with random velocity vectors (`speed: 3–6 px/f`).
  - Casting blood abilities also deposits blood droplets along their trajectory.
* **Poisonous Death Painting Blood (*Yūdokuketsu*)**:
  - Because Choso is a Cursed Womb: Death Painting, his blood is inherently lethal poison to humans and foreign sorcerers.
  - Stepping on or colliding with a Blood Droplet Node applies **1 stack of Blood Poison** for 4.0s (capped at 5 stacks).
  - Each stack slows movement speed by **5%** and deals **3 True Damage / sec**.

---

### 2. 🔴 Flowing Red Scale: Stack (*Sekirin Ketsurui: Chō — 赤鱗躍動・載*)
By manipulating his internal blood composition, Choso accelerates his pulse, body temperature, and erythrocyte oxygen delivery:
* **Activation Threshold**:
  - Automatically activates when HP drops below **60%**, or when manually triggered during high-combo chains.
* **Combat Doping Buffs**:
  - Movement speed increased by **+30%** (`2.45 → 3.18`).
  - Basic attack recovery speed improved by **+25%**.
  - All blood abilities spawn **double the quantity of Blood Droplet Nodes**.
  - Renders red capillary vascular markings glowing under his skin and eyes.

---

## ⚔️ Abilities & Moveset

### 🗡️ Primary Attack: Blood Edge & Sanguine Darts (*Ketsueki no Ya*)
* **Type**: Hybrid (130° Frontal Melee Cleave / Piercing Ranged Dart)
* **Cooldown**: `36 frames` (~0.60s)
* **Damage**: 
  - **Melee Mode (Distance ≤ 70px)**: `22 / 26 / 32 Damage` (3-Hit Blood Dagger Combo)
  - **Ranged Mode (Distance > 70px)**: `18 Piercing Damage`
* **Mechanics**:
  - **Melee Mode**: Choso coagulates hardened blood blades around his wrists and slashes in wide 130° crescents (Rule 30 compliant 5-phase impact lock). Third hit splatters 3 blood droplets across the target.
  - **Ranged Mode**: Choso snaps his wrist, flicking a high-pressure needle dart of condensed blood at high velocity (`15 px/f`). Pierces through minor obstacles and leaves a lingering blood droplet on impact.
* **Basic Projectile Suppression (Rule 23)**:
  - Overrides default `shoot(ownerIndex)` with dedicated Blood Dart logic to suppress generic circular bullets.

---

### 🩸 Skill 1: Slicing Exorcist / Blood Chakram (*Karisō — 刈祓*)
* **Type**: High-Velocity Bouncing Blood Chakram / Carpet Spreader
* **Cooldown**: `6.0 seconds` (`360 frames`)
* **Damage**: `38 Slashing Damage` (multi-hits up to 2 times for `76 Damage`)
* **Lifespan**: `90 frames` (1.5 seconds)
* **Mechanics**:
  - Choso compresses blood into a rotating, circular disc blade of spinning razor-sharp blood and hurls it forward.
  - The Chakram slices through enemies with continuous shredding hitstun, bouncing off arena boundary walls up to **3 times**.
  - **Droplet Trail**: Every 6 frames of travel, the chakram flings off a droplets of blood, rapidly seeding the battlefield with **8–10 Blood Droplet Nodes**.

---

### 💥 Skill 2: Supernova (*Chōshinsei — 超新星*)
* **Type**: 360° Omnidirectional Sanguine Fragmentation Detonation
* **Cooldown**: `9.0 seconds` (`540 frames`)
* **Damage**: `14 Damage per Shrapnel Pellet` (Spawns 12 pellets in a radial starburst; up to `84 Burst Damage` at point-blank range)
* **Mechanics**:
  - Choso pulls surrounding blood into 8 dense, compressed blood orbs orbiting tightly around his body.
  - With a sudden concussive release, the orbs detonate outward in a 360° explosive fragmentation ring!
  - Enemies caught in the blast are knocked back with heavy physical hit-pause.
  - Each detonated pellet scatters into an active **Blood Droplet Node** upon reaching max range or hitting a wall, saturating the arena in a massive perimeter of blood nodes primed for his unique signature skill.

---

### 🔴⚡ UNIQUE SIGNATURE SKILL: Blood Transmutation: Crimson Laser Matrix (*Shuren: Kōsen Ketsurui — 収斂・光線血流*)
* **Type**: Arena-Wide Particle-to-Laser Conversion & Hitscan Piercing Crossfire
* **Cooldown**: `14.0 seconds` (`840 frames`)
* **Cast Time**: `16 frames` (Tense Convergence Clasp Stance)
* **Laser Damage**: `12 True Piercing Damage per Active Blood Node` (Up to `180+ True Burst Damage` if arena is saturated with 15+ blood droplets!)
* **Transmutation Duration**: `5.0 seconds` (`300 frames`)
* **Mechanics**:
  - **Step 1 — The Convergence Clasp**: Choso brings both hands together into his signature Convergence prayer clasp at `(0, r * 0.25)`. A localized time-slow distortion wavers around him (Rule 1.1 / 1.5 compliant).
  - **Step 2 — Particle Freezing & Diode Ignition**: 
    - Every single **Blood Droplet Node** previously scattered across the arena abruptly freezes in mid-air and on walls.
    - Each droplet crystallizes into a radiant, super-pressurized crimson-white optical focus diode (`#FF2A55` glowing ring with white core).
  - **Step 3 — Razor-Thin Lock Telegraph**:
    - For 10 frames, high-precision targeting lasers project from EVERY active blood node directly toward the primary opponent, illuminating the battlefield in a dense, crisscrossing red web of targeting lines.
  - **Step 4 — Supersonic Laser Discharge**:
    - With a deafening ionized thunderclap, ALL blood nodes simultaneously discharge continuous piercing laser beams!
    - The beams pierce through all obstacles, terrain, and shields, melting the target with stacked True Damage.
    - Enemies hit by 3 or more simultaneous beams are struck with **Sanguine Stun (0.50s immobilization)**.
  - **Step 5 — Active Overdrive Transmutation State (5.0s)**:
    - For the next 5.0 seconds, any blood particles emitted from Choso's body (whether from taking damage, swinging his blood daggers, or sprinting) do NOT fall as inert fluid—**they instantaneously ignite into miniature forward-firing laser pulses** (`8 Damage each`), creating a relentless storm of continuous laser fire!

---

### 🩸⚡ ULTIMATE: Piercing Blood: True Convergence (*Teisō / Fuga — 穿血・真収斂*)
* **Type**: Cinematic Supersonic Pressure Cannon & Full-Arena Line Cleave
* **Cooldown**: `28.0 seconds` (`1680 frames`)
* **Total Damage**: `145 True Damage` (`45 Shockwave Blast` + `100 Sustained Supersonic Beam`)
* **Recoil Force**: `18 px/frame` backward momentum with global camera shake
* **Cinematic Execution Sequence**:
  1. **Phase 1 — Extreme Pressure Compression (Frames 1–28)**:
     - Choso anchors his stance, clasping his palms tightly in front of his chest.
     - A colossal sphere of compressed blood shrinks violently down to a marble-sized singularity at `(0, r * 0.25)`.
     - 3 concentric supersonic compression shockwaves ripple inward (Rule 26).
     - Screen colors tint to deep monochromatic crimson-violet with pitch-black vignette.
  2. **Phase 2 — Mach 3 Piercing Release (Frames 29–65)**:
     - Choso uncaps the pressure! A devastating, Mach 3 supersonic beam of hyper-pressurized blood shoots from between his index fingers along his committed 360° cast angle (Rule 1.4).
     - Beam diameter: `28px` with white-hot laser core (`#FFFFFF`), burning crimson mid-sheath (`#FF1E44`), and dark violet ionization outer boundary (`#6B1736`).
     - Pierces end-to-end through the entire arena, obliterating all enemy projectiles, traps, and barriers in its path.
  3. **Phase 3 — Sanguine Vapor Fallout & Laser Ignition**:
     - As the colossal beam disperses, it leaves a vapor trail of **12 fresh Blood Droplet Nodes** along its line of fire.
     - If *Blood Transmutation: Crimson Laser Matrix* is currently active, these 12 vapor nodes immediately ignite into supplementary laser beams, executing a devastating double-burst finale!

---

## 📊 HUD Skill Layout & Visual Theme

All HUD skill progress bars and card accents strictly use Choso's unified **Deep Crimson Blood** theme color (`#A31D1D`) adhering to **Rule 18 / Rule 2.8**:

```
┌─────────────────────────────────────────────────────────────┐
│ CHOSO (DEATH PAINTING ELDEST)                 HP: 420 / 420 │
│ [█████████████████████████████████████████████████████████] │
│                                                             │
│ [Skill 1: Slicing Exorcist]    [  READY  ] #A31D1D (Blood)  │
│ [Skill 2: Supernova]           [  READY  ] #A31D1D (Blood)  │
│ [Skill 3: Crimson Laser Matrix][  READY  ] #FF2A55 (Laser)  │
│ [Ultimate: Piercing Blood]     [  READY  ] #A31D1D (Blood)  │
│ [Active Blood Nodes in Arena: ◆◆◆◆◆◆◆◆◆◇ (18/32)]           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Matchup Dynamics & JJK Synergies

| Opponent | Lore & Mechanical Matchup Dynamic |
| :--- | :--- |
| **vs Yuji Itadori** | **"My Little Brother!" Resonance**: Choso feels a deep, instinctual soul resonance with Yuji. Choso's blood poison does not harm Yuji. If Yuji and Choso are paired on the same team, both gain **+15% Attack Power** and Choso prioritizes body-blocking projectiles targeting Yuji. |
| **vs Naoya Zenin** | **Sanguine Counter to Projection Sorcery**: True to their Shibuya/Itadori Extermination arc duel, Naoya's supersonic 24 FPS speed is crippled by Choso's blood-carpeted arena! Stepping on Choso's blood floor applies poison and viscosity friction, reducing Naoya's movement speed and disrupting his predetermined 24-frame paths. |
| **vs Satoru Gojo** | **Limitless Barrier Physics (Rule 1.7)**: Gojo's Infinity halts standard blood droplets, chakrams, and physical slashes. However, Choso's **Crimson Laser Matrix** fires high-frequency photonic energy from 20+ simultaneous angles, testing the spatial barrier, while *Piercing Blood* requires Gojo's full barrier concentration. |
| **vs Mahito** | **Poison to Cursed Spirits**: Mahito cannot manipulate Choso's soul without touching him, while Choso's cursed blood is inherently toxic to cursed spirits, dealing +25% bonus poison tick damage to Mahito. |
| **vs Toji Fushiguro** | **Zenin / Heavenly Restriction Clash**: Toji's high-speed dashes can evade *Piercing Blood* narrow trajectories; however, Choso's 360° *Supernova* and omnidirectional *Laser Matrix* create unavoidable area coverage that Toji cannot slip through without taking chip damage. |

---

## 🔊 Sound Design & Audio Mapping

| Combat Event | Sound Effect Path | Volume / Playback | Rationale |
| :--- | :--- | :--- | :--- |
| **Blood Dagger Slash (Melee)** | `Assets/Sound Effects/Attacks/attack_fleshhit.mp3` layered with `attack_swordswing.mp3` | `1.00 Vol` / `1.10x` | Visceral, wet cutting slap adhering to Rule 30 audio standards |
| **Blood Dart Flick** | `Assets/Sound Effects/Attacks/dagger_throw.mp3` | `0.85 Vol` / `1.20x` | Sharp, high-pressure liquid flick |
| **Chakram Whirring Flight** | `Assets/Sound Effects/Skills/blade_spin.mp3` | `0.90 Vol` / `1.05x` | Rapid rotary buzz of high-speed fluid disc |
| **Supernova Blast** | `Assets/Sound Effects/Attacks/heavy_explosion.mp3` | `1.15 Vol` / `1.15x` | Concussive multi-shrapnel shotgun detonation |
| **Convergence Prayer Clasp** | `Assets/Sound Effects/Skills/enhance.mp3` | `1.10 Vol` / `0.90x` | Sudden low-pass vacuum whoosh signaling tension |
| **Laser Diode Ignition** | `Assets/Sound Effects/Skills/spark_charge.mp3` | `0.95 Vol` / `1.30x` | High-frequency optical hum as droplets turn to laser diodes |
| **Crimson Laser Discharge** | `Assets/Sound Effects/Attacks/laser_fire.mp3` | `1.25 Vol` / `1.15x` | Crackling, piercing supersonic photonic burst |
| **Piercing Blood Muzzle Blast** | `Assets/Sound Effects/Attacks/cannon_fire.mp3` | `1.35 Vol` / `1.00x` | Colossal Mach 3 supersonic hydraulic cannon boom |

---

## 📁 Source Code & Component Map (Target Implementation)

When implementing Choso into the game engine, code must be cleanly compartmentalized across the following modular architecture:

| System / Component | Target File Path | Primary Responsibilities |
| :--- | :--- | :--- |
| **Fighter Entity & Combat Engine** | [`js/entities/fighters/ChosoFighter.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/entities/fighters/ChosoFighter.js) | Subclasses `Fighter`. Implements `update()`, freeze guards (Rule 1.1), 5-phase attacks (Rule 30), blood droplet entity manager, and laser transmutation state machine. |
| **Fighter Configuration** | [`js/configs/characters/chosoConfig.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/configs/characters/chosoConfig.js) | Contains HP, speed, radius (`25px`), damage coefficients, cooldowns, blood droplet life, laser parameters, and asset references. |
| **Skin & Hair Pixel Art Renderer** | [`js/graphics/fighters/chosoSkin.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/fighters/chosoSkin.js) | Rule 24 Toji baseline standard, offscreen canvas cache, faceless skin dome, blood bridge strip, Noritoshi robes, Rule 20 symmetrical hands, and Rule 22 hair model import. |
| **Blood VFX & Laser Renderer** | [`js/graphics/weapons/chosoBloodGraphics.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/weapons/chosoBloodGraphics.js) | Renders blood droplet nodes, coagulated daggers, Chakram disc, Supernova fragmentation, needle telegraphs, and photonic laser beam ribbons. |
| **Fighter Registry Integration** | [`js/entities/fighterFactory.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/entities/fighterFactory.js) | Registers `'choso'` character ID, constructor bindings, and asset preloads. |
| **Selection Card & UI Registry** | [`js/ui/fighterSelection.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/ui/fighterSelection.js) | Adds Choso's character selection card, preview sprite hook, thumbnail icon, and sound triggers. |

---

## 🛠️ Code & Systems Compliance Checklist

Before committing any implementation code for Choso, verify full compliance against all repository rules:

- [x] **Rule 1.1 (TimeStop & Freeze Guards)**: Update loop strictly evaluates `_handleTimeStop()` and halts movement/cooldowns during time-stop or ambush stasis.
- [x] **Rule 1.2 (Centralized Physics)**: Delegates movement and boundary resolution to `super.update()` / `resolveWallBounce()`.
- [x] **Rule 1.4 (Continuous 360° Aiming)**: *Piercing Blood* and *Laser Matrix* snapshot cast angle at initiation, locking facing direction during fire.
- [x] **Rule 1.5 (Attacker vs Target Freeze)**: Time-pause during *Piercing Blood* or *Laser Matrix* locks the target, NEVER Choso himself.
- [x] **Rule 1.6 (Frontal Arc AOE)**: Blood Edge melee slashes cover a 130° frontal arc, checking both `state.fighters` and `state.illusions`.
- [x] **Rule 1.7 (Gojo Infinity Barrier)**: Standard blood particles halt at Infinity; high-intensity lasers apply pressure without bypassing unless lore-permitted.
- [x] **Rule 1.8 & Rule 23 (Basic Projectile Suppression)**: Explicitly overrides `shoot(ownerIndex)` with dedicated blood skills to prevent generic bullet spawning.
- [x] **Rule 1.9 & Rule 25 (Non-Freezing Active VFX Decay)**: Active blood droplets and laser beam arrays decay at the top of `update()` before `_handleTimeStop()`.
- [x] **Rule 2.2 & Rule 11 (Prohibition of shadowBlur)**: Laser glow and blood auras rendered using concentric alpha steps with zero Canvas `shadowBlur`.
- [x] **Rule 2.4 (Canvas Transform Stack Integrity)**: Every `ctx.save()` is matched by an exact `ctx.restore()`.
- [x] **Rule 2.5 & Rule 16 (Manga Speed Lines)**: 4-point filled needle polygons trailing behind Choso during high-speed actions.
- [x] **Rule 2.6 & Rule 15 (Crescent Slash Eraser Wipe)**: Blood dagger crescent sweeps cleanly erase from tail to tip during recovery.
- [x] **Rule 2.8 & Rule 18 (HUD Theme Consistency)**: Unified `#A31D1D` crimson blood theme across all HUD bars.
- [x] **Rule 2.9 & Rule 21 (Overhead Health Drawing)**: Custom `draw()` pipeline explicitly calls `this.drawHealth(ctx)` and `this.drawFreezeTimer(ctx)` on top layer.
- [x] **Rule 2.11 & Rule 26 (Clean Concentric Shockwaves)**: Sequential water-ripple compression rings with zero spiderweb spoke meshes.
- [x] **Rule 2.12 & Rule 27 (Lifesteal / Regen Feedback)**: No floating combat text in arena; all HP recovery routed strictly to healthbar pulse.
- [x] **Rule 3.1 & Rule 19 (Upright Front POV)**: Head at `-Y`, robes at `+Y`, with Y-axis mirroring on leftward aim.
- [x] **Rule 3.2 (Faceless Minimalist Standard)**: Zero eyes, pupils, or mouth; character defined by blood bridge mark, hair tufts, and robes.
- [x] **Rule 3.5 & Rule 24 (Discrete Pixel Art & Toji Reference Standard)**: $P = 2.0\text{px}$ discrete grid, offscreen canvas cache, `r = 25px` universal standard humanoid scale.
- [x] **Rule 3.6 & Rule 20 (Canonical Hand Positioning)**: Symmetrical flank placement `(±r * 0.82, r * 0.38)` with `handRadius = r * 0.30` and Convergence clasp transition.
- [x] **Rule 22 (Hair & Head Asset Import)**: Dedicated `Assets/model/choso/choso-hair.png` asset eagerly cached via module loader.
- [x] **Rule 30 (5-Phase Melee Combat & Physical Force)**: 5 distinct phases for Blood Edge melee combo with impact lock, stationary clamp, micro-tremor, and layered slap audio.
