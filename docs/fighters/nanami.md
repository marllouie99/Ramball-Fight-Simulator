# Kento Nanami — The 7:3 Ratio Sorcerer

**Category:** Anime & Jujutsu Sorcerers  
**Theme Color:** Refined Golden Sand / Warm Ochre (`#D4AF37`)  
**Role:** Precision Heavy-Brawler, Armor-Shredding Melee Executioner  

---

## 📖 Lore & Character Philosophy

Kento Nanami is a Grade 1 Jujutsu Sorcerer and former corporate salaryman. Disillusioned with the absurdity of both corporate labor and the Jujutsu world, Nanami returned to jujutsu with a strict, pragmatic philosophy: treat sorcery as a job, avoid unnecessary overtime, and execute every strike with surgical efficiency.

In the *Circle Mini-Battle* arena, Nanami embodies the pinnacle of disciplined martial arts and geometric precision. Rather than relying on overwhelming destructive energy like Gojo or Sukuna, Nanami dissects the geometry of his opponents, forcibly carving a 7:3 ratio weak point onto anything he strikes to unleash devastating critical damage.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Nanami’s body model, face, attire, and hair strictly adhere to the front-profile camera orientation standard:
- **Head & Face (`-Y` to `Y ~ 0`)**:
  - Upright front-profile blonde hair with a sharp, disciplined side parting and dark golden shading.
  - Signature dark round goggles/sunglasses with glowing golden specular reflection highlights.
  - Calm, stoic facial expression with subtle ear contours on `±X`.
- **Attire & Uniform (`+Y`)**:
  - Tailored tan/beige business suit jacket over a crisp light-blue collared shirt.
  - Navy-blue necktie patterned with golden micro-dots.
  - Overtime visual transformation: When Overtime triggers, Nanami unbuttons his tan jacket and loosens his collar, exposing dark business shoulder suspenders and rolled-up cuffs.
- **One-Handed Brawler Guard Stance (Rule 20)**:
  - **Front Hand**: Positioned at `(r * 0.95, 0)` holding the blunt cleaver. During strikes, lunges forward along `+X` with smooth kinetic punch momentum.
  - **Back Hand**: Completely hidden (`hideBackHand = true`) for an authentic one-handed swordmaster stance.
  - **Skin Only Mode (`state.showSkinOnly`)**: When enabled, hides both the cleaver and front hand automatically.

### 2. Blunt Cleaver Model (Weapon Studio Integration — Rule 21)
- **Top-Spine Aligned Grip**: Ergonomic 3-rivet dark steel handle aligned flush with the top spine of the blade (`topY = -4.25`).
- **Spotted Wrap Cloth**: Textured ivory-white cloth wrapped spirally along the flat rectangular blade with organic black splotches and binding straps extending down his wrist.
- **Weapon Studio Customization**: Supports real-time adjustments for `offsetX`, `offsetY`, `scale` (`0.3x`–`3.0x`), and `angleOffset` via `state.weaponCustomizations.nanami`.

### 3. Dynamic Crescent Slash Blade Arc (Rule 15 Standard)
- **Downwards Rotational Chop**: Swings in a single downward arc from `-1.15 rad` (~11 o'clock) down to `+1.05 rad` (~5 o'clock).
- **Dynamic Eraser Transformation**:
  - **Active Swing (`progress < 0.65`)**: Golden crescent blade arc grows from start angle to tip angle across a `r + 56` radius.
  - **Recovery Erase (`progress >= 0.65`)**: The crescent tip locks at the final swing angle while the tail angle chases the tip (`(1 - recP)^1.4`), smoothly erasing the crescent from start to finish.
- **Layered Palette (`maxThick = 24.0px`)**:
  - Outer Cursed Energy Glow: Warm Golden Sand (`rgba(212, 175, 55, 0.35)` / Overtime: `rgba(255, 215, 0, 0.45)`).
  - Dense Core Polygon: Searing Radiant Gold (`rgba(255, 230, 95, 0.85)` / Overtime: `rgba(255, 245, 140, 0.92)`).
  - Razor-Sharp Cutting Edge: Crisp Pure White stroke (`1.8px`, `rgba(255, 255, 255, 0.96)`).

### 4. Manga Action Speed Lines (Rule 16 Standard)
- **Needle Geometry**: 4-point filled needle polygons (`maxThick = 0.75px – 1.5px`) anchored strictly behind Nanami's body along his attack vector.
- **4-Slot Color Theme**: Golden Sand (`#D4AF37`), Warm Ochre Gold (`#F59E0B`), White Core (`#FFFFFF`), and Manga Ink Line (`#181A1D`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Overtime (120%) | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `420` | `420` | High resilience brawler pool |
| **Base Speed** | `2.30` | `2.76` (`+20%`) | Clean arena bounce movement |
| **Body Radius** | `25px` | `25px` | Standard fighter hitbox size |
| **Melee Reach** | `65px` | `65px` | 130° Frontal Arc AOE |
| **Damage Reduction** | `0%` | `15%` | Flat incoming damage mitigation |
| **Black Flash Chance** | `15%` | `40%` | Triggered on 7:3 Ratio Critical hits |

---

## ⚡ Passives & Inherent Mechanics

### 1. 📐 Innate Technique: Ratio Technique (*Shichisan no Jutsu*)
Nanami forcibly divides his target's body into a 10-point line and creates a weak point at the 7:3 ratio coordinate:

* **Dynamic Measurement Grid & Crosshair**:
  - When an enemy enters combat acquisition range (`220px`), an active 10-point measurement ruler is drawn across the enemy's silhouette.
  - The **7:3 weak point** is highlighted by a golden bracket crosshair `[ + ]`, an animated pulsing radar ring, and a floating `'7:3'` tag.
* **Forced Critical Hit (True Damage)**:
  - Landing through the 7:3 ratio deals **2.0× True Damage** (Standard shift) / **1.8× True Damage** (Overtime), completely bypassing shields and standard damage mitigation.
  - Triggers a **10-point Grid Shatter Impact** visual burst with radiating golden fracture lines, golden sparks, screen shake, and floating `'7:3 CRITICAL!'` text.
* **Armor Fracture Status Effect**:
  - 7:3 Critical strikes inflict **Armor Fracture** for `3.0 seconds` (`180 frames`).
  - Fractured targets take **+20% bonus damage** from all incoming attacks, rendered with glowing golden hairline fracture cracks across their body.

---

### 2. ⏳ Binding Vow: Overtime (*Jigai*)
Nanami places a self-imposed restriction on his cursed energy during standard hours, unleashing his full reservoir when work goes beyond schedule:

* **Standard Shift (Match Start / HP > 40%)**:
  - Nanami operates at 85% capacity with disciplined movement and steady combat pacing (30% Ratio Crit chance).
* **Overtime Activation**:
  - Triggers automatically after **25 seconds** in the round **OR** when Nanami's HP drops below **40%**.
  - Displays floating golden text `'OVERTIME: 120%'`, triggers global screen shake, and plays his activation sound cue.
* **120% Cursed Energy Boosts**:
  - **Attack Damage**: `+25%` boost to all basic attacks and skills.
  - **Movement Speed**: `+20%` faster movement.
  - **Damage Mitigation**: `15%` flat reduction on all incoming damage.
  - **Guaranteed Critical Strike Charge**: The first strike of an engagement is a **100% Guaranteed 7:3 Critical Strike**, recharging every **2.5 seconds** (`150 frames`). Subsequent basic swings while recharging have an elevated **45% Critical chance**.
  - **Black Flash Resonance**: 7:3 Critical hits have an elevated **40% Black Flash probability** (dealing `+50%` bonus damage).

---

## ⚔️ Abilities & Moveset

### 🗡️ Primary Attack: Blunt Cleaver Chop
* **Type**: Multi-Target Frontal Arc Melee (Rule 7 Compliant)
* **Damage**: `22 Damage` (Standard) / `30 Damage` (Overtime) / `55–75 True Damage` (7:3 Critical)
* **Cooldown**: `55 frames` (~0.92s) / `44 frames` in Overtime
* **Arc & Range**: `130°` frontal arc cone with `65px` reach.
* **Mechanics**:
  - Nanami aims at the nearest valid enemy entity (`state.fighters` + `state.illusions`) and swings his wrapped cleaver in a downward rotational arc.
  - All enemies caught within the arc and distance take physical damage, hit stun, and kinetic pushback.
  - Rolls for 7:3 Ratio Critical (35% standard, 100% in Overtime) and Black Flash (15% standard, 50% in Overtime).

---

### ⚡ Skill 1: Decisive Strike / Ratio Lunge (*Shichisan Issen*)
* **Type**: Supersonic Melee Dash & Execution Slash
* **Cooldown**: `7.0 seconds` (`420 frames`)
* **Damage**: `38 Damage` (`95 True Damage` on 7:3 Critical)
* **Travel Distance**: `180px` in `16 frames`
* **Mechanics**:
  - Nanami compresses his posture and flash-steps forward in a straight line toward his target.
  - Slices through all enemy targets and illusions in his path with an instantaneous horizontal cleaver sweep.
  - Deals guaranteed 7:3 Critical damage to the primary target with `0.5s hit-stun` (`30 frames`) and streams manga speed lines behind him.
* **Overtime Synergy**: If Decisive Strike defeats an enemy or lands during Overtime, its cooldown is reduced by 50%.

---

### 💥 Skill 2: Collapse (*Tōka*)
* **Type**: Structural Ground-Shatter & AOE Hazard
* **Cooldown**: `10.0 seconds` (`600 frames`)
* **Damage**: `45 AOE Damage`
* **Radius**: `200px` radial shockwave
* **Mechanics**:
  - Nanami brings his blunt cleaver down onto the arena floor at a precise structural 7:3 weak point.
  - Detonates the environment, unleashing an explosive shockwave with flying concrete debris and dust clouds.
  - Instantly destroys enemy illusions and deployables (turrets, clones, ice walls).
  - Traps surviving enemies in heavy rubble, applying a **40% movement speed reduction for 2.5 seconds** (`150 frames`).

---

### ⚡💥 Ultimate: 4-Fold Black Flash Blitz (*Kokusen Renpatsu*)
* **Type**: Spatial Multi-Strike Execution Combo
* **Cooldown**: `25.0 seconds` (`1500 frames`)
* **Total True Damage**: `150 HP` (30 + 30 + 30 + 60)
* **Execution Sequence (Rule 5 Compliant — Attacker loop remains active while target receives hit-pause)**:
  1. **Phase 1: Concentration & Arena Dimming**:
     - The arena background dims via hybrid container overlay (`div.game-box`).
     - Black and crimson cursed lightning sparks swirl violently around Nanami's cleaver.
  2. **Phase 2: The 4-Fold Consecutive Blitz**:
     - **Strike 1 (Flank Slash)**: Flash-steps to the target's left flank, landing a 7:3 Black Flash cut (`30 True Damage`).
     - **Strike 2 (Backhand Sweep)**: Teleports to the target's right side with an instantaneous backhand strike (`30 True Damage`).
     - **Strike 3 (Overhead Cleave)**: Teleports above the target, bringing the cleaver down vertically (`30 True Damage`).
     - **Strike 4 (Execution Finisher)**: Teleports in front and delivers an upward diagonal spatial blow (`60 True Damage`), triggering a massive Black Flash explosion that sends the target ricocheting into the arena wall.
  3. **Debuff Application**: Fully applies the **Armor Fracture** debuff for 4.0 seconds on any surviving enemy.

---

## 🎯 Matchup Dynamics & Synergies

| Opponent | Unique Interaction |
| :--- | :--- |
| **vs Mahito** | **Soul Geometry Piercing**: Nanami's 7:3 Ratio attacks cut directly into Mahito's soul contours, dealing full unmitigated True Damage. |
| **vs Satoru Gojo** | **Limitless Barrier (Rule 9)**: Standard cleaver chops are stopped and frozen by Gojo's Infinity barrier unless Gojo is recovering from barrier cooldown or Nanami uses *Collapse* floor shockwaves. |
| **vs Toji Fushiguro** | **Weapon Clash Dynamics**: When Nanami's blunt cleaver strikes Toji's Inverted Spear of Heaven, high-density golden/purple sparks spawn with a mutual 0.2s physical clash recoil. |
| **vs Sukuna** | **Cleave / Dismantle Resilience**: During Overtime, Nanami's 20% damage mitigation allows him to endure rapid domain slashes while closing distance. |
| **vs Yuji Itadori / Aoi Todo** | **Black Flash Resonance**: Teaming with Yuji or Todo grants a synergy aura, increasing all team members' Black Flash trigger chances by `+25%`. |

---

## 🔊 Sound Design & Audio Mapping

| Combat Event | Sound Effect Path | Volume / Speed |
| :--- | :--- | :--- |
| **Cleaver Basic Swing** | `Assets/Sound Effects/Attacks/swordswing.mp3` | `0.95 Vol` / `1.0x` |
| **7:3 Ratio Critical Impact** | `Assets/Sound Effects/Skills/toji-2stseq-2ndweaponAttack.mp3` | `1.20 Vol` / `1.0x` |
| **Decisive Strike Lunge** | `Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3` | `1.10 Vol` / `1.1x` |
| **Collapse Ground Slam** | `Assets/Sound Effects/Attacks/groundSmash.mp3` | `1.25 Vol` / `0.95x` |
| **Black Flash Strike** | `Assets/Sound Effects/Skills/yuji-blackflash.mp3` | `1.30 Vol` / `1.0x` |
| **Overtime Activation** | `Assets/Sound Effects/Skills/enhance.mp3` | `1.20 Vol` / `1.0x` |

---

## 📁 Source Code & Component Map

| System / Component | File Path |
| :--- | :--- |
| **Fighter Entity & Combat Loop** | [`js/entities/fighters/NanamiFighter.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/entities/fighters/NanamiFighter.js) |
| **Fighter Configuration** | [`js/configs/characters/nanamiConfig.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/configs/characters/nanamiConfig.js) |
| **Skin & Face Renderer** | [`js/graphics/fighters/nanamiSkin.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/fighters/nanamiSkin.js) |
| **Cleaver, Slash Arc & Crosshairs** | [`js/graphics/weapons/nanamiWeaponGraphics.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/weapons/nanamiWeaponGraphics.js) |
| **Manga Action Speed Lines** | [`js/graphics/renderers/effectsRenderer.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/renderers/effectsRenderer.js) |
| **Armor Fracture Visuals** | [`js/graphics/renderers/fighterRenderer.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/renderers/fighterRenderer.js) |
