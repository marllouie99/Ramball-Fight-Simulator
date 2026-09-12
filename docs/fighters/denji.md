# Denji — The Chainsaw Devil Hybrid

**Category:** Anime & Chainsaw Man / Devils  
**Theme Color:** Chainsaw Amber Gold (`#EAB308` / `#CA8A04`) & Blood Engine Crimson (`#DC2626` / `#991B1B`)  
**Role:** High-Speed Bleed Rushdown Brawler, Ripcord Hybrid Berserker, Blood-Siphon Revive Duelist  

---

## 📖 Lore & Character Philosophy

Denji is the **Chainsaw Devil (*Chensō no Akuma — チェンソーの悪魔*)**, formerly an impoverished devil hunter who fused with his canine companion **Pochita** (the Chainsaw Devil) to save his own life. Wielding a heart that doubles as an engine starter motor, Denji enters the arena already fully transformed as Chainsaw Man with roaring mechanical saws sprouting from his head and forearms. Driven by simple, primal desires—good food, a warm bed, and human affection—Denji fights with unhinged, feral tenacity, chewing through eldritch horrors and immortal devils alike by weaponizing their own blood to sustain his endless revving rampage.

In the *Circle Mini-Battle* arena, Denji is an unrelenting rushdown berserker. He overwhelms adversaries through high-RPM multi-hit frontal slashes, supersonic ripcord lunge drags, blood-siphon self-healing, and a clutch **Pochita Ripcord Revive** that supercharges his chainsaw engine upon fatal defeat.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Denji's body model, hair silhouette, and attire strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - **Human Form**: Messy, unkempt anime ochre/blonde hair (`#FACC15` highlight, `#EAB308` base, `#CA8A04` midtone, `#713F12` shadow) with discrete staggered fringe locks framing the face (Rule 19.1).
  - **Chainsaw Devil Hybrid Form**: Morphs into a cylindrical gunmetal/steel mechanical chainsaw warhead helmet (`#94A3B8` chrome highlight, `#64748B` plate base, `#334155` dark metal, `#0F172A` ink frame) with a towering central forehead chainsaw blade protruding forward-upward, active moving saw teeth (`#FFFFFF`), blood spatters (`#DC2626`), and dark exhaust muffler handles attached behind the head.
  - **Faceless Aesthetic (Rule 19)**: Clean faceless circle body in Human Form (zero eyes, pupils, mouth, or nose). In Chainsaw Form, features a mechanical triangular saw-toothed mouth grille.
- **Attire & Ripcord (`+Y`)**:
  - **Public Safety Uniform**: White dress shirt unbuttoned at the neck (`#FAF7F0` highlight, `#E2E8F0` midtone, `#94A3B8` shadow folds) with a loosened, askew black necktie (`#1E293B` / `#0F172A`).
  - **Pochita Chest Ripcord**: Iconic metallic pull-ring with high-tensile starter cord nestled over the upper left chest (`Y ~ +0.15r`, `#F97316` cord, `#E2E8F0` ring). Pulses with orange-hot ignition embers during rev states.
  - **Lower Torso**: Dark charcoal Public Safety trousers with defined belt buckle and pleats.
- **Weapon & Hand Stance (Rule 20)**:
  - **Human Form**: Standard brawler fists (lead hand at guard `(0, 0)`, back hand at `(1.05r, 0)`).
  - **Chainsaw Form**: Twin forearm-mounted chainsaw blades extending along both hands with rotating steel teeth, metallic rivets, and flying blood flecks.
  - **Skin Only Mode (`state.showSkinOnly`)**: When enabled, cleanly hides hands.

### 2. Blood Mist & Combustion Sparks (Rule 11 Zero shadowBlur Standard)
- **Engine Sparks**: Concentric transparent gradient circles simulating white-hot ignition flares (`rgba(249, 115, 22, 0.8)`) and amber spark flecks (`rgba(234, 179, 8, 0.6)`). Zero CPU `shadowBlur` is used.
- **Manga Action Speed Lines (Rule 16 Standard)**:
  - 4-point filled needle polygons (`maxThick: 1.2px – 2.4px`) streaming strictly behind Denji during supersonic engine dashes.
  - **4-Slot Color Theme**: Chainsaw Amber Gold (`#EAB308`), Molten Blood Crimson (`#DC2626`), Pure White Kinetic Core (`#FFFFFF`), and Manga Dark Gunmetal Ink (`#0F172A`).

---

## 🛡️ Baseline Stats

| Attribute | Human Form | Chainsaw Devil Hybrid Form | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `360` | `360` | High effective HP via Pochita Ripcord Revive |
| **Base Speed** | `5.8` | `6.8` (`+17%`) | High-speed rushdown brawler mobility |
| **Body Radius** | `25px` | `25px` | Standard fighter hitbox |
| **Attack Reach** | `65px` (Punches) | `75px` (Chainsaw Blades) | 140° Frontal Arc AOE Multi-Target |
| **Engine Lunge Speed** | `26.0 px/frame` | `34.0 px/frame` | Supersonic arena drag lunge |
| **Lifesteal Ratio** | `0%` | `25%` of physical saw damage | Blood Siphon healing |
| **Revive Stocks** | `1 Stock` | — | Pochita Heart Ripcord Ignition |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🫀 Pochita's Heart: Ripcord Revive (*Pochita no Shinzō — ポチタの心臓*)
When Denji's HP drops to 0 for the first time in a round:
* Denji refuses to perish. Pochita's engine cord automatically pulls with a violent mechanical *CHRR-CLANK*.
* An instantaneous radial blood combustion burst (`radius: 150px`, `damage: 45`, `knockback: 32`) erupts outward, repelling nearby attackers, clearing enemy projectiles, and restoring **50% Max HP** (`180 HP`).
* Denji triggers **Pochita Overdrive** for 6 seconds, revving his chainsaws into high-speed hyperdrive with `+25% Movement Speed`, `35% Lifesteal`, and faster skill recovery.

---

### 2. 🩸 Blood Lust Siphon (*Ketsueki Kyūshū — 血液吸収*)
* While in Chainsaw Devil Hybrid Form, every hit dealt by Denji's head and arm chainsaws shreds enemy flesh, splashing blood droplets across the arena.
* Denji converts **25% of all physical chainsaw damage dealt** into immediate health restoration.
* Hitting bleeding or hemorrhaging enemies increases the heal ratio to **35%**.

---

### 3. ⚙️ High-RPM Shred & Hemorrhage (*Kōsoku Kaiten — 高速回転*)
* Each chainsaw hit applies **Hemorrhage stacks** (up to 6) to struck targets.
* Each stack reduces enemy physical defense by `5%` and causes `3` bleeding damage per second.
* At 6 stacks, the target suffers a **Vascular Rupture**, exploding for `28` bonus true damage and releasing bonus Blood Orbs on the floor.

---

## ⚔️ Active Skills & Moveset

### 👊 Basic Attack (Human Form): Street Brawler 3-Hit Fist Combo
* **Type**: Fast Melee Brawler String (Rule 7/8 Multi-Target Arc)
* **Visual Style**: Crisp 2D pixel-art fists with knuckle impact flares and kinetic arcs.
* **Combo Pattern**:
  * **Hit 1 (Left Snapping Jab)**: Fast straight punch dealing `12` damage with a 6-frame flinch.
  * **Hit 2 (Right Overhand Hook)**: Sweeping cross punch dealing `14` damage with an 8-frame flinch.
  * **Hit 3 (Drop-Kick Finisher)**: Lunging leap kick dealing `20` damage + `18` knockback.

---

### ⚙️ Basic Attack (Chainsaw Devil Form): Twin Chainsaw Shred (140° Frontal Arc)
* **Type**: High-RPM Multi-Hit Frontal Cleave (Rule 7/8 Multi-Target Arc)
* **Visual Style**: Solid 2D pixel-art saw arcs with rotating steel teeth, flying sparks, and blood splatters.
* **Arc / Reach**: `140° frontal cone`, `75px reach`
* **Combo Pattern**:
  * **Hit 1 (Right Arm Cross-Saw)**: Downward sweeping chainsaw slash dealing `16` damage + `1` Hemorrhage stack + heals `4 HP`.
  * **Hit 2 (Left Arm Upper-Saw)**: Upward diagonal chainsaw slash dealing `16` damage + `1` Hemorrhage stack + heals `4 HP`.
  * **Hit 3 (Dual Arm Scissor Shred)**: Simultaneous twin arm scissor bite dealing 3 rapid micro-ticks of `8` damage (total `24` damage) + `24` knockback + heals `6 HP`.

---

### 🎯 Skill 1: Ripcord Engine Rev Lunge (*Injin Dāshu — エンジンダッシュ*)
* **Type**: Supersonic Kinetic Lunge & Wall Drag
* **Cooldown**: `240 frames` (~4.0s)
* **Mechanics**:
  * Denji pulls his chest ripcord, revving his engine to maximum RPM (`speed: 30 px/frame`) while trailing dense manga action speed lines and fiery exhaust smoke.
  * **Contact & Drag**: On striking an enemy, Denji impales them on his forehead chainsaw and drags them across the arena until colliding with a wall or traveling `300px`.
  * **Wall Smash**: Colliding with the arena wall slams the enemy for `38` damage + `16-frame` wall stun, accompanied by violent screen shake and flying concrete debris.

---

### 🩸 Skill 2: Blood Intoxication Cleave (*Ketsueki Zangeki — 血液斬撃*)
* **Type**: Extended Chain Whip Sweep & Pull
* **Cooldown**: `360 frames` (~6.0s)
* **Mechanics**:
  * Denji lashes out his chainsaw chain in a wide 180° frontal sweep (`range: 160px`).
  * Ensnared enemies take `28` damage, are pulled directly into point-blank brawler range (`distance: 40px`), and suffer a `12-frame` stagger, setting them up for immediate basic attack shred combos.

---

### ⛓️ Ultimate: Chainsaw Devil Berserk — "Massacre Engine" (*Chēnsō no Kakusei — チェンソーの覚醒*)
* **Type**: 3-Phase Cinematic Arena Slaughter & Guillotine Plunge
* **Cooldown**: `1500 frames` (~25.0s)
* **Phases**:
  * **Phase 1: Full Devil Ignition**: Time freezes for `35 frames` on all enemies (Rule 5 compliant). Denji yanks his ripcord with both hands, roaring as blood geysers erupt and he enters full awakened Chainsaw Devil form.
  * **Phase 2: 360° Cyclone Massacre**: Denji spins rapidly across the arena at supersonic speed, dealing 6 continuous radial chainsaw slashes (`radius: 120px`, `damage: 15 per tick`, total `90` damage) while vacuuming nearby targets into the vortex.
  * **Phase 3: Guillotine Decapitation Plunge**: Denji leaps airborne and plunges straight down, driving his forehead and arm saws deep into the primary target.
    * **Impact**: Creates a massive blood crater explosion (`radius: 180px`, `damage: 65 True Damage`, `knockback: 40`), heavy screen shake, and heals Denji for `40 HP`.

---

## 🎵 Audio Sound Effects Mapping

* **Ripcord Pull**: Metallic pull-ring clink & spring release (`Assets/Sound Effects/Skills/parry.mp3`).
* **Chainsaw Revving**: High-RPM motor whine (`Assets/Sound Effects/Skills/genos-dash-noise.mp3`).
* **Saw Flesh Impacts**: Heavy metallic slashing & wet blood impact (`Assets/Sound Effects/Attacks/heavypunch1.mp3` & `Assets/Sound Effects/Attacks/explosion.mp3`).
* **Engine Lunge**: Jet engine roar (`Assets/Sound Effects/Skills/fugatravel.mp3`).
* **Massacre Engine Ultimate**: Ultimate charge hum (`Assets/Sound Effects/Skills/genos-ultimatecharging.mp3`) and full massacre finish (`Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3`).
