# Zenitsu Agatsuma — Thunder Breathing God of Speed

**Category:** Anime & Demon Slayer / Demon Slayer Corps  
**Theme Color:** Lightning Gold (`#F59E0B` / `#FBBF24`) & Electric Amber (`#D97706` / `#FEF08A`)  
**Role:** Blinding Godspeed Iai-Slash Assassin, Shock-Stun Burst Duelist, Sleeping Thunder Prodigy  

---

## 📖 Lore & Character Philosophy

Zenitsu Agatsuma (*Agatsuma Zen'itsu — 我妻 善逸*) is a Demon Slayer who mastered the **Thunder Breathing First Form: Thunderclap and Flash (*Hekireki Issen*)** to the absolute pinnacle of perfection. Despite battling severe self-doubt while awake, Zenitsu falls into a focused, subconscious sleep trance (*Battle Trance*) when overwhelmed by danger, awakening his dormant genius swordsmanship. At his full potential, he moves at blinding, supersonic speeds, leaving thunderclaps and lightning arcs echoing across the battlefield.

In the *Circle Mini-Battle* arena, Zenitsu is a lightning-fast assassin specializing in instant straight-line iai slashes, zigzag wall-ricochet combos, and high burst electric damage.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Zenitsu's body model, hair silhouette, and attire strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - **Hair Silhouette (Rule 19.1)**: Iconic square-cut tiered blunt bangs and spiky bright golden-blonde hair (`#FBBF24` base, `#F59E0B` midtone) ending in fiery orange tips (`#F97316`).
  - **Faceless Minimalist Standard (Rule 19)**: Clean faceless circle body (strictly zero eyes, pupils, mouth, or nose).
- **Attire (`+Y`)**:
  - **Triangle Pattern Haori**: Bright yellow-to-orange gradient haori covered in crisp white equilateral triangles (*uroko* scale pattern).
  - **Corps Uniform**: Standard black Demon Slayer Corps gakuran uniform beneath the haori with white belt and matching yellow-triangle leg wraps.
- **Weapon & Hand Stance (Rule 20)**:
  - **Lightning Nichirin Katana**: Golden hilt wrapping, lightning-bolt hamon pattern along the blade edge, paired with a sleek black-and-gold scabbard.
  - **Iai Stance**: Lead hand on katana hilt, back hand steadying the scabbard opening at guard center with `state.showSkinOnly` support.

### 2. Particle Cleanliness & Zero shadowBlur (Rule 11)
- Thunder arcs and electric sparks are drawn as razor-sharp polygonal segments and concentric alpha rings without CPU `ctx.shadowBlur`.
- **Manga Action Speed Lines (Rule 16)**:
  - 4-point filled needle polygons (`maxThick: 1.2px – 2.4px`) streaming strictly behind Zenitsu during supersonic iai dashes.
  - **4-Slot Color Theme**: Lightning Gold (`#F59E0B`), Electric Cyan (`#38BDF8`), Pure White Core (`#FFFFFF`), and Deep Charcoal Ink (`#18181B`).

---

## 🛡️ Baseline Stats

| Attribute | Value | Notes |
| :--- | :--- | :--- |
| **HP** | `310` | Agile glass-cannon swordsman |
| **Base Speed** | `6.4` | Very high baseline movement speed |
| **Body Radius** | `25px` | Standard fighter collision circle |
| **Katana Reach** | `78px` | 140° Frontal Arc AOE Multi-Target |
| **Dash / Iai Speed** | `36.0 px/frame` | Near-instant teleport slash speed |
| **Crit Damage** | `1.75×` | High burst critical strike damage |

---

## ⚡ Passives & Inherent Mechanics

### 1. 💤 Slumbering Thunderclap & Battle Trance (*Nemuri no Kaminari — 眠りの雷*)
* When Zenitsu is stunned, frozen, or drops below 35% HP, he enters **Battle Trance**.
* Immediately breaks free of crowd control, reduces incoming damage by 25%, and guarantees a **100% Critical Strike** on his next skill or attack.

---

### 2. ⚡ Hyper-Sonic Static Charge (*Seidenki Kaden — 静電気荷電*)
* Moving and dashing builds **Static Charge** (up to 100).
* At 100 charge, Zenitsu's next attack discharges an electric burst dealing `20` bonus lightning damage and paralyzing the target for `18 frames` (0.3s).

---

## ⚔️ Active Skills & Moveset

### ⚡ Basic Attack: Thunder Iai Quickdraw & Sheath Flurry (140° Frontal Arc)
* **Type**: Multi-Target Frontal Arc Iai Quickdraw String (Rule 7 Melee Arc Standard)
* **Visual Style**: Golden electric arcs and instantaneous flash slash cuts.
* **Arc / Reach**: `140° cone`, `78px reach`
* **Combo Pattern**:
  * **Hit 1 (Flash Draw Cut)**: Snapping horizontal iai cut dealing `18` damage with a 6-frame flinch.
  * **Hit 2 (Lightning Cross Chop)**: Upward diagonal slash dealing `22` damage with an 8-frame hit-stun.
  * **Hit 3 (Reverse Sheath Strike)**: Katana snap into scabbard with explosive electric discharge dealing `28` damage + `22` knockback.

---

### 🌩️ Skill 1: Thunder Breathing First Form: Thunderclap and Flash (*Hekireki Issen — 霹靂一閃*)
* **Type**: Instantaneous Lightspeed Straight-Line Teleport Slash
* **Cooldown**: `3.8s` (`228 frames`)
* **Mechanics**:
  * Zenitsu assumes the low iai stance and teleports forward in a straight line at `36 px/frame`.
  * Slices through all enemies in his path, dealing `38` lightning damage and a 12-frame electric shock stun.
  * Leaves a crackling golden lightning trail across the arena floor.

---

### ⚡ Skill 2: Thunderclap and Flash: Sixfold (*Hekireki Issen: Rokuren — 霹靂一閃 六連*)
* **Type**: 6-Stage Zigzag Wall-Bounce Lightning Flurry
* **Cooldown**: `7.0s` (`420 frames`)
* **Mechanics**:
  * Zenitsu ricochets across the arena walls 6 times in rapid succession.
  * Each bounce generates a sonic boom, culminating in a converging lightning slash dealing 6 hits of `8` damage (total `48` damage) + `30` knockback.

---

### 🐉 Ultimate: Thunder Breathing Seventh Form: Flaming Thunder God (*Honoikazuchi no Kami — 火雷神*)
* **Type**: Colossal Golden Lightning Dragon Godspeed Decapitation
* **Cooldown**: `24.0s` (`1440 frames`)
* **Mechanics**:
  * Zenitsu unleashes his original creation: the Seventh Form.
  * Manifests a colossal roaring golden lightning dragon around his blade.
  * Dashes across the arena at hyper-speed, executing a titanic cross-slash dealing `85` burst damage and `48` knockback.
  * Shatters the arena floor with residual golden lightning arcs.
