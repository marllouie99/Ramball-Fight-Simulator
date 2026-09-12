# Tanjiro Kamado — Sun & Water Breathing Demon Slayer

**Category:** Anime & Demon Slayer / Demon Slayer Corps  
**Theme Color:** Checkered Forest Emerald (`#10B981` / `#059669`) & Hinokami Sunfire Crimson (`#EF4444` / `#DC2626`)  
**Role:** Fluid Water Flow & Explosive Sunfire Duelist, Scent of Opening Thread Precision Striker  

---

## 📖 Lore & Character Philosophy

Tanjiro Kamado (*Kamado Tanjirō — 竈門 炭治郎*) is the eldest son of the Kamado family and a dedicated Demon Slayer wielding both the adaptive **Water Breathing (*Mizu no Kokyū*)** and the ancestral **Sun Breathing (*Hinokami Kagura*)**. Endowed with an acute, supernatural sense of smell, Tanjiro detects the emotional state of allies and spots the razor-thin "Opening Thread" in enemy defenses that signals a decisive strike opportunity.

In the *Circle Mini-Battle* arena, Tanjiro is a versatile, high-mobility precision swordsman. He adapts fluidly between wide-arc defensive water deflections, continuous spiraling dragon slashes, and explosive high-damage Sunfire Kagura executions.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Tanjiro's body model, hair silhouette, and attire strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - **Hair Silhouette (Rule 19.1)**: Spiky, swept-back dark burgundy-black hair (`#18181B` base, `#7F1D1D` to `#B91C1C` fiery tips) structured as discrete normalized lock arrays.
  - **Demon Slayer Scar / Mark**: Prominent crimson flame birthmark/scar located on the upper-left forehead (`nx: -0.35, ny: -0.05`).
  - **Hanafuda Earrings**: Signature rectangular white Hanafuda earrings with red rising sun disc and radiating black rays dangling beside the head.
  - **Faceless Minimalist Standard (Rule 19)**: Clean faceless circle body (strictly zero eyes, pupils, mouth, or nose).
- **Attire (`+Y`)**:
  - **Checkered Haori**: Iconic emerald-green and pitch-black checkerboard patterned haori (`#10B981` and `#18181B`) draped over a dark Demon Slayer Corps gakuran uniform.
  - **White Belt & Collar**: Crisp white uniform collar and obi sash with leg wraps.
- **Weapon & Hand Stance (Rule 20)**:
  - **Nichirin Katana**: Pure pitch-black Nichirin blade with a circular spoke flame tsuba (handguard) and silver blade collar.
  - **Hand Layering**: Standard dual brawler/swordsman hands with `state.showSkinOnly` support.

### 2. Particle Cleanliness & Zero shadowBlur (Rule 11)
- Water streams and Hinokami sun flames are drawn using clean concentric alpha rings and geometric polygonal arcs without expensive CPU `ctx.shadowBlur`.
- **Manga Action Speed Lines (Rule 16)**:
  - 4-point filled needle polygons (`maxThick: 1.2px – 2.2px`) streaming strictly behind Tanjiro during water dragon dashes.
  - **4-Slot Color Theme**: Emerald Water Cyan (`#06B6D4`), Sunfire Crimson (`#EF4444`), White Kinetic Core (`#FFFFFF`), and Deep Demon Slayer Charcoal (`#18181B`).

---

## 🛡️ Baseline Stats

| Attribute | Value | Notes |
| :--- | :--- | :--- |
| **HP** | `340` | Standard resilient anime duelist health |
| **Base Speed** | `5.8` | Fluid and responsive movement |
| **Body Radius** | `25px` | Standard fighter collision circle |
| **Katana Reach** | `80px` | 140° Frontal Arc AOE Multi-Target |
| **Critical Hit Multiplier** | `1.50×` | Boosted via Opening Thread passive |
| **Cooldown Rate** | `1.15×` | Total Concentration Constant acceleration |

---

## ⚡ Passives & Inherent Mechanics

### 1. 👃 Scent of the Opening Thread (*Kagikomi no Sukima — 隙の糸*)
When attacking an enemy whose HP is below 40%, or immediately following an evasion or wall ricochet:
* Tanjiro perceives the luminous **Opening Thread** connected directly from his katana tip to the opponent's core.
* His next basic attack or skill strike gains **+25% Critical Strike Chance** and ignores 35% of target physical armor.
* Landing an Opening Thread strike spawns an instantaneous crimson thread snap particle effect and delivers crisp hit-flinch.

---

### 2. 🫁 Total Concentration: Constant (*Zen Shūchū: Jōchū — 全集中・常中*)
* Tanjiro maintains continuous deep breathing throughout combat.
* Grants a passive **+12% Movement Speed** boost and **15% faster cooldown recovery** across all active skills.

---

## ⚔️ Active Skills & Moveset

### 🌊 Basic Attack: Water Breathing 3-Hit Flow (140° Frontal Arc)
* **Type**: Multi-Target Frontal Arc Sword String (Rule 7 Melee Arc Standard)
* **Visual Style**: Flowing azure water trails and sparkling droplet beads along the katana swing arc.
* **Arc / Reach**: `140° cone`, `80px reach`
* **Combo Pattern**:
  * **Hit 1 (First Form: Water Surface Slash — *Minamo Giri*)**: Horizontal surface sweep dealing `18` damage with an 8-frame flinch.
  * **Hit 2 (Second Form: Water Wheel — *Mizuguruma*)**: 360° vertical somersault water wheel dealing `22` damage with a 10-frame hit-stun.
  * **Hit 3 (Eighth Form: Waterfall Basin — *Takitsubo*)**: Crushing vertical downward plunge dealing `28` damage + `24` physical knockback push.

---

### 🐉 Skill 1: Water Breathing Tenth Form: Constant Flux (*Seisei Ruten — 生生流転*)
* **Type**: Lunging Spiraling Dragon Dash & Continuous Escalating Slashes
* **Cooldown**: `4.5s` (`270 frames`)
* **Mechanics**:
  * Tanjiro dashes forward enveloped in a spiraling water dragon aura.
  * Strikes up to 3 times in rapid succession, with each consecutive hit dealing escalating damage (`16` → `22` → `32` damage).
  * Clears incoming standard enemy projectiles during the initial dash.

---

### ☀️ Skill 2: Sun Breathing: Clear Blue Sky (*Heki-ra no Ten — 碧羅の天*)
* **Type**: 360° Upward Flaming Sun Arc & Projectile Deflection
* **Cooldown**: `6.0s` (`360 frames`)
* **Mechanics**:
  * Tanjiro spins his Nichirin blade into a full 360-degree blazing solar wheel.
  * Deals `35` fire damage, inflicts a 3-second Sunfire Burn (`4 dps`), and knocks enemies upward.
  * Completely deflects physical enemy projectiles caught in the circle.

---

### 🐲 Ultimate: Hinokami Kagura: Dragon Sun Halo Head Dance (*Nichiun no Ryū Kaburimai — 日運の竜 頭舞い*)
* **Type**: High-Speed Arena-Wide Flaming Dragon Dance & Sunburst Cataclysm
* **Cooldown**: `24.0s` (`1440 frames`)
* **Mechanics**:
  * Tanjiro unleashes the full might of Sun Breathing.
  * Executes 4 rapid zigzagging supersonic teleports across the arena, leaving blazing solar dragon afterimages.
  * Deals 4 strikes of `20` damage followed by a titanic 160° solar cleave dealing `65` damage and `40` knockback.
  * Trapped targets take continuous burn ticks and heavy hit-stasis.
