# Reze — The Bomb Devil Hybrid

**Category:** Anime & Chainsaw Man / Devils  
**Theme Color:** Tangerine Flame Orange (`#FF6B1A` / `#FF2E00`) & Spark Gold (`#FFE600` / `#FFF59D`)  
**Role:** High-Speed Explosive Rushdown Brawler, Blast Assassin, Tactical Nuke Finisher  

---

## 📖 Lore & Character Philosophy

Reze is the **Bomb Devil Hybrid (*Bakudan no Akuma — 爆弾の悪魔*)**, a lethal Soviet assassin dispatched to Tokyo to seize Denji’s Chainsaw Devil heart. Operating under the guise of an enchanting cafe barista, Reze seamlessly pivots between playful warmth and cold, supersonic explosive devastation. By pulling the grenade pin on her neck choker, she detonates her own body to transform into the fearsome Bomb Devil form—a walking weapon of mass destruction clad in dynamite and wielding living torpedo warheads.

In the *Circle Mini-Battle* arena, Reze is an explosive, hyper-kinetic rushdown fighter who dictates tempo through spark-propelled lunges, multi-target blast combos, detonating decoy clones, and a game-ending **Megaton Tsar Nuke** ultimate.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Reze's body model, hair silhouette, and attire strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - **Human Form**: Dark violet-black bob hair (`#201B2E` to `#352D48`) with parted asymmetric bangs framing the face, subtle side locks, and a delicate chignon/low bun silhouette behind the crown.
  - **Bomb Devil Hybrid Form**: Morphs into a cylindrical torpedo / atomic bomb warhead casing (`#2B2836` Gunpowder Matte) with polished metallic specular seams and an active glowing fuse wick trailing sparks off the top.
  - **Faceless Aesthetic (Rule 19)**: Clean faceless circle body (zero eyes, pupils, mouth, or nose).
- **Neck & Attire (`+Y`)**:
  - **Neck Choker Collar**: Iconic matte black choker with a gleaming metallic grenade pin pull-ring nestled at the center-front throat (`Y ~ +0.18r`).
  - **Human Attire**: Cream-white sleeveless ribbed tank top (`#FAF7F0`) with clean vertical fabric ribbing and a subtle dark cafe apron ribbon silhouette at the lower waistband.
  - **Bomb Devil Attire**: Dynamite stick bandolier harness strapped diagonally across the chest with glowing fuse cords wrapped along the torso.
- **Weapon & Hand Stance (Rule 20)**:
  - **Front Hand (Lead Hand)**: Positioned in brawler guard stance at `(0, 0)` in idle. During punches, lunges forward with animated orange-hot combustion sparks escaping the knuckles.
  - **Back Hand (Off-Hand)**: Positioned forward at `(1.05r, 0)` in idle, providing natural brawler depth behind the body layer.
  - **Skin Only Mode (`state.showSkinOnly`)**: When enabled, cleanly hides hands.

### 2. Combustion Particles & Concentric Auras (Rule 11 Zero shadowBlur Standard)
- **Spark Ignition**: Concentric transparent gradient circles simulating white-hot embers (`rgba(255, 230, 0, 0.8)`) and flame rims (`rgba(255, 107, 26, 0.5)`). Zero CPU `shadowBlur` is used.
- **Manga Action Speed Lines (Rule 16 Standard)**:
  - 4-point filled needle polygons (`maxThick: 1.2px – 2.2px`) streaming strictly behind Reze during supersonic rocket lunges.
  - **4-Slot Color Theme**: Tangerine Flame Orange (`#FF6B1A`), Molten Blast Crimson (`#FF2E00`), Pure White Kinetic Spark (`#FFFFFF`), and Manga Dark Gunpowder Ink (`#1A1622`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Bomb Hybrid Form | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `340` | `340` | High effective HP via Collar Pin Revive |
| **Base Speed** | `5.8` | `6.8` (`+17%`) | High-speed rushdown agility |
| **Body Radius** | `25px` | `25px` | Standard fighter hitbox |
| **Punch Reach** | `65px` | `75px` | 120° Frontal Arc AOE |
| **Rocket Lunge Speed** | `28.0 px/frame` | `34.0 px/frame` | Supersonic arena cross |
| **Revive Stocks** | `1 Stock` | — | Collar Pin Burst Trigger |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🧷 Hybrid Physiology: Collar Pin Ignition (*Bakudan no Sai-Kidō — 爆弾の再起動*)
When Reze's HP drops to 0 for the first time in a round:
* Reze does not immediately perish. Instead, she pulls her neck collar pin with an audible metallic *clink*.
* An instantaneous radial explosion (`radius: 140px`, `damage: 40`, `knockback: 28`) detonates outward, knocking away attackers, clearing enemy projectiles, and restoring **50% Max HP** (`170 HP`).
* Reze immediately activates **Bomb Devil Hybrid Form** for 10 seconds, gaining `+17% Movement Speed`, increased punch reach, and faster skill cooldown recovery.

---

### 2. 🚀 Blast Propulsion (*Shōgeki Kasoku — 衝撃加速*)
* Every rapid change of direction or high-speed sprint ignites micro-explosions behind Reze.
* Micro-explosions propel her forward with sharp instantaneous acceleration while leaving fiery scorch decals on the arena floor.
* Enemies caught directly in her back blast take `6` burn damage and minor flinch.

---

### 3. 💥 Gunpowder Residue (*Kayaku no Seikaku — 火薬の蓄積*)
* Every melee punch, spark flechette, and explosion applies **Gunpowder Residue stacks** (up to 5) to struck targets.
* Reaching 5 stacks detonates an internal combustion burst that deals `25` bonus true damage and breaks enemy super armor.

---

## ⚔️ Active Skills & Moveset

### 👊 Basic Attack: Explosive Martial Arts (120° Frontal Arc Blast Punches)
* **Type**: Close-Quarters Brawler Multi-Strike (Rule 7/8 Multi-Target Arc)
* **Arc / Reach**: `120° frontal cone`, `65px reach`
* **Combo Pattern**:
  * **Hit 1 & 2**: Rapid spark-infused chops dealing `16` physical damage + `1` Gunpowder stack.
  * **Hit 3 (Finisher - Spark Slap)**: Reze steps in and detonates a palm explosion dealing `28` damage, knocking targets back across the arena, and detonating all active Gunpowder stacks.

---

### 🎯 Primary Skill: Spark Flechette Barrage (*Senkō Dan — 閃光弾*)
* **Type**: High-Velocity Explosive Projectile Spread
* **Cooldown**: `180 frames` (~3.0s)
* **Mechanics**:
  * Reze snaps her fingers, firing a tight spread of 3 supersonic spark flechettes (`speed: 18 px/frame`).
  * On enemy hit or wall contact, each flechette detonates into a cluster explosion (`radius: 42px`, `damage: 22`), applying heavy hit sparks, screen shake, and 1 Gunpowder stack.

---

### 💣 Secondary Skill: Decapitation Decoy / Smoke Step (*Kubi-Kiri Bakuha — 首切り爆破*)
* **Type**: Explosive Clone Decoy & Flank Teleport
* **Cooldown**: `420 frames` (~7.0s)
* **Mechanics**:
  * Reze detaches an explosive decoy clone that charges directly at the nearest opponent with an ignited fuse.
  * Reze enters brief camouflage stealth and dashes into a flank position (`+150px` reposition).
  * If the decoy is attacked or after `90 frames` (1.5s), it detonates in a high-yield blast (`radius: 110px`, `damage: 45`, `knockback: 24`), releasing thick dark smoke that blinds and slows trapped enemies.

---

### 🚀 Mobility: Supersonic Rocket Lunge (*Bakuen Toppa — 爆煙突破*)
* **Type**: Supersonic Kinetic Air-Dash
* **Cooldown**: `300 frames` (~5.0s)
* **Mechanics**:
  * Reze unleashes continuous jet blasts behind herself, rocketing across the arena at `28 px/frame` with dense manga action speed lines streaming behind her.
  * On enemy impact, delivers an explosive divekick dealing `35` damage and creating a cracked scorch crater.
  * If colliding with the arena wall, Reze rebounds off the wall with an aerial backflip.

---

### ☢️ Ultimate: Bomb Devil Unleashed — "Megaton Tsar Nuke" (*Kyoku no Bakudan — 極の爆弾*)
* **Type**: 3-Phase Cinematic Arena Bombardment & Nuclear Crater Dive
* **Cooldown**: `1500 frames` (~25.0s)
* **Phases**:
  * **Phase 1: Pin Pull Transformation**: Time briefly stops (`timeStopTimer: 35 frames` on enemies; Rule 5 compliant). Reze pulls her collar pin, unleashing a golden-orange transformation shockwave and entering full Bomb Devil Form.
  * **Phase 2: Carpet Torpedo Barrage**: Reze ascends into the air and bombards the arena floor with 6 homing torpedo rockets that detonate in chain explosions (`damage: 20 per rocket`).
  * **Phase 3: Living Warhead Crater Dive**: Reze locks onto the primary opponent from above and dives headfirst as a living nuclear warhead.
    * **Impact**: Creates a massive expanding fireball shockwave (`radius: 220px`, `damage: 130 True Damage`, `knockback: 48`), violent screen shake, and arena scorch decals that burn enemies standing inside.

---

## 🎵 Audio Sound Effects Mapping

* **Collar Pin Pull**: Metallic sharp clink / pull-ring release (`Assets/Sound Effects/Skills/parry.mp3`).
* **Basic Punches**: Heavy brawler punch impacts (`Assets/Sound Effects/Attacks/heavypunch1.mp3`) & Palm blast explosion (`Assets/Sound Effects/Attacks/explosion.mp3`).
* **Spark Flechette**: Supersonic flame burst hiss (`Assets/Sound Effects/Attacks/flamespray1.mp3`) & cluster pops (`Assets/Sound Effects/Attacks/explosion.mp3`).
* **Decoy Detonation**: Combustion boom (`Assets/Sound Effects/Skills/fugaexplode.mp3`).
* **Rocket Lunge**: Jet dash boost (`Assets/Sound Effects/Skills/genos-dash-noise.mp3`).
* **Megaton Tsar Nuke**: Ultimate charging whine (`Assets/Sound Effects/Skills/genos-ultimatecharging.mp3`), supersonic dive (`Assets/Sound Effects/Skills/fugatravel.mp3`), and full-arena nuclear detonation (`Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3`).
