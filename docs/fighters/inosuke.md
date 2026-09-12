# Inosuke Hashibira — Beast Breathing King of the Mountains

**Category:** Anime & Demon Slayer / Demon Slayer Corps  
**Theme Color:** Wild Beast Indigo (`#3B82F6` / `#1D4ED8`) & Boar Fur Slate Grey (`#6B7280` / `#9CA3AF`)  
**Role:** Wild Dual-Blade Berserker, Spatial Awareness Radar Hunter, Hyper-Flexible Unpredictable Brawler  

---

## 📖 Lore & Character Philosophy

Inosuke Hashibira (*Hashibira Inosuke — 嘴平 伊之助*) was raised by wild boars in the mountains, creating his own instinctual combat style: **Beast Breathing (*Kedamono no Kokyū*)**. Wielding twin chipped and serrated Nichirin blades, Inosuke charges headfirst into battle with ferocious momentum. His tactile sensitivity allows him to feel subtle vibrations in the air via **Spatial Awareness**, preventing surprise attacks, while his double-jointed anatomy allows him to dislocate joints at will to extend his attack reach and evade incoming blows.

In the *Circle Mini-Battle* arena, Inosuke is an aggressive dual-wielding berserker with wide 160° sweeping hitboxes, projectile-shredding whirlwinds, and reckless charging momentum.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Inosuke's body model, head mask, and attire strictly adhere to the front-profile camera orientation standard:
- **Head & Boar Mask (`-Y` to `Y ~ 0`)**:
  - **Grey Boar Mask Silhouette**: Authentic grey boar head mask (`#6B7280` base, `#4B5563` shadow) with upright pointed ears lined in dark brown.
  - **Pink Snout Silhouette**: Distinctive rounded pink boar snout (`#F472B6` with dark nostrils) centered at `Y ~ -0.15r`.
  - **Twin Curved Bone Tusks**: Twin ivory-white tusks curving outward-upward from the cheeks (`nx: -0.65, ny: 0.15` and `nx: 0.65, ny: 0.15`).
  - **Faceless Minimalist Standard (Rule 19)**: Clean mask silhouette (strictly zero human eyes, pupils, mouth, or nose).
- **Attire (`+Y`)**:
  - **Bare Muscular Torso**: Tanned athletic chest and defined muscular torso.
  - **Deer Fur Pelt Waistband**: Fluffy brown deer fur waistband belt wrapped around hips (`Y ~ 0.55r`).
  - **Baggy Hakama Trousers**: Dark indigo/navy trousers (`#1E293B`) tucked into furry bear hide shin guards.
- **Weapon & Hand Stance (Rule 20)**:
  - **Dual Chipped Nichirin Katanas**: Twin blades with jagged, chipped serrated cutting edges, wrapped in white cloth bandages instead of traditional cord hilts.
  - **Dual Wield Hand Layering**: Both hands visible, wielding one serrated katana forward and one reversed/raised, with `state.showSkinOnly` support.

### 2. Particle Cleanliness & Zero shadowBlur (Rule 11)
- Beast wind slashes and ground debris are drawn using crisp geometric line polygons and alpha arcs without CPU `ctx.shadowBlur`.
- **Manga Action Speed Lines (Rule 16)**:
  - 4-point filled needle polygons (`maxThick: 1.2px – 2.4px`) streaming strictly behind Inosuke during wild charges.
  - **4-Slot Color Theme**: Beast Sky Indigo (`#3B82F6`), Fur Pelt Grey (`#9CA3AF`), White Kinetic Core (`#FFFFFF`), and Deep Charcoal Ink (`#18181B`).

---

## 🛡️ Baseline Stats

| Attribute | Value | Notes |
| :--- | :--- | :--- |
| **HP** | `350` | Resilient mountain brawler health |
| **Base Speed** | `6.2` | High charging velocity |
| **Body Radius** | `25px` | Standard fighter collision circle |
| **Dual Katana Reach** | `85px` | Wide 160° Frontal Arc AOE Multi-Target |
| **Knockback Resistance** | `30%` | Solid wild boar footing |
| **Wall Ricochet Boost** | `+25% Speed` | Gains momentum bouncing off walls |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🐗 Beast Spatial Awareness (*Kūkan Shikaku — 空間識覚*)
* Inosuke senses microscopic shifts in air pressure.
* **Immune to rear/backstab surprise criticals** (negates ambush backstabs).
* Bouncing off arena walls immediately grants a **+25% Speed Burst** and targets the closest enemy.

---

### 2. 🦴 Dislocated Joint Reach (*Kansetsu Hazushi — 関節外し*)
* Inosuke dislocates his shoulder and elbow joints at will during lunges.
* Grants a **15% passive evasion rate against physical projectiles** and extends his basic attack reach to **85px**.

---

## ⚔️ Active Skills & Moveset

### 🐗 Basic Attack: Beast Breathing Dual Serrated Hack (160° Frontal Arc)
* **Type**: Multi-Target Wide Frontal Arc Dual Blade String (Rule 7 Melee Arc Standard)
* **Visual Style**: Twin serrated wind slashes and flying stone/debris sparks.
* **Arc / Reach**: `160° wide cone`, `85px reach`
* **Combo Pattern**:
  * **Hit 1 (First Fang: Pierce — *Ugachi*)**: Dual forward thrust dealing `16` damage with a 6-frame flinch.
  * **Hit 2 (Second Fang: Slice — *Kirisaki*)**: Dual horizontal cross-slash dealing `22` damage with an 8-frame hit-stun.
  * **Hit 3 (Third Fang: Devour — *Kuizaki*)**: Twin blade inward scissor clamp dealing `32` damage + `26` physical knockback.

---

### 🌪️ Skill 1: Beast Breathing Fifth Fang: Crazy Cutting (*Go no Kiba: Kuruizaki — 狂い咲き*)
* **Type**: 360° Omnidirectional Dual-Blade Whirlwind Shred & Projectile Deflection
* **Cooldown**: `4.2s` (`252 frames`)
* **Mechanics**:
  * Inosuke spins rapidly in place, slashing in all directions with both serrated blades.
  * Deals 3 rapid ticks of `12` damage (total `36` damage) in a 100px radius.
  * Completely deflects and destroys all incoming enemy projectiles during the spin.

---

### 💥 Skill 2: Beast Breathing Eighth Fang: Explosive Rush (*Hachi no Kiba: Bakuretsu Mōshin — 爆裂猛進*)
* **Type**: Unstoppable Boar Charge & Heavy Knockback
* **Cooldown**: `5.5s` (`330 frames`)
* **Mechanics**:
  * Inosuke lowers his boar head and sprints forward with unstoppable hyper-armor (`30 px/frame`).
  * Rams into targets for `36` damage, bowling them backward (`38` knockback force) into arena walls.

---

### 🏔️ Ultimate: Beast Breathing Ultimate: King of the Mountain Cataclysm (*Yama no Ō: Garyū no Kiba — 山の王・我流の牙*)
* **Type**: Spatial Lock-On, 8-Hit Serrated Cross-Cleave Combo & Decapitation Finisher
* **Cooldown**: `24.0s` (`1440 frames`)
* **Mechanics**:
  * Inosuke locks onto all enemies via Spatial Awareness.
  * Unleashes a furious 8-hit cross-cleave combo with both blades tearing through targets for `8 × 8 = 64` damage.
  * Concludes with a colossal dual-blade cross-decapitation shockwave dealing `60` burst damage and `46` knockback.
