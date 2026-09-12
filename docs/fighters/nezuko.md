# Nezuko Kamado — Awakened Demon & Exploding Blood Pyrokinesis

**Category:** Anime & Demon Slayer / Demons  
**Theme Color:** Demon Sakura Pink (`#EC4899` / `#F472B6`) & Exploding Pyrokinesis Magenta (`#BE185D` / `#E11D48`)  
**Role:** High-Impact Demon Brawler, Exploding Blood Pyrokinesis Support, Demonic Regeneration Tank  

---

## 📖 Lore & Character Philosophy

Nezuko Kamado (*Kamado Nezuko — 竈門 禰豆子*) is Tanjiro's younger sister who was transformed into a demon but miraculously retained her human emotional consciousness and protectiveness. Refusing to consume human flesh, Nezuko restores her demonic energy through deep slumber. In combat, she wields terrifying superhuman physical strength, lightning-fast axe kicks, sharp claws, and the **Blood Demon Art: Exploding Blood (*Bakketsu*)**, which combusts demon blood into brilliant pink pyrotechnic flames harmless to humans but catastrophic to enemies.

In the *Circle Mini-Battle* arena, Nezuko is a relentless close-quarters brawler with high natural sustain and explosive pyrokinesis counters.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Nezuko's body model, hair silhouette, and attire strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - **Hair Silhouette (Rule 19.1)**: Long, flowing jet-black hair (`#18181B` base) cascading over the shoulders with vibrant fiery vermilion/orange ombré tips (`#EA580C` / `#F97316`).
  - **Demonic Horn & Markings**: In Awakened Demon state, a single pale ivory demonic horn protrudes from the right forehead (`nx: 0.38, ny: -0.65`), accompanied by delicate vine markings framing the temple.
  - **Bamboo Muzzle & Red Cord (Rule 19)**: Signature cylindrical green bamboo muzzle (`#22C55E` with `#15803D` dark bamboo ring nodes) strapped across the mouth area with thin crimson cords.
  - **Faceless Minimalist Standard (Rule 19)**: Clean faceless circle body (zero eyes, pupils, or nose).
- **Attire (`+Y`)**:
  - **Asanoha Kimono**: Geometric pink *asanoha* (hemp leaf) pattern kimono (`#F472B6` base with geometric grid accents).
  - **Checkered Obi Sash**: Red and white checkered waist obi sash with orange cord trim.
  - **Outer Black Haori**: Dark brownish-black long haori draped over shoulders.
- **Weapon & Hand Stance (Rule 20)**:
  - **Demon Claws**: Sharp elongated crimson/pink demonic claws on both hands.
  - **Hand Layering**: Lead and back hands alternate lunges during claw swipes with `state.showSkinOnly` support.

### 2. Particle Cleanliness & Zero shadowBlur (Rule 11)
- Exploding blood pyrokinesis is rendered with concentric magenta gradient circles and sharp pink polygonal embers. Zero CPU `shadowBlur` is used.
- **Manga Action Speed Lines (Rule 16)**:
  - 4-point filled needle polygons (`maxThick: 1.2px – 2.2px`) streaming strictly behind Nezuko during supersonic demon lunges.
  - **4-Slot Color Theme**: Sakura Pink (`#EC4899`), Bakketsu Magenta (`#E11D48`), White Kinetic Core (`#FFFFFF`), and Deep Charcoal Ink (`#18181B`).

---

## 🛡️ Baseline Stats

| Attribute | Value | Notes |
| :--- | :--- | :--- |
| **HP** | `370` | High demonic durability |
| **Base Speed** | `6.0` | Supersonic demon sprint |
| **Body Radius** | `25px` | Standard fighter collision circle |
| **Claw & Kick Reach** | `70px` | 120° Frontal Arc AOE Multi-Target |
| **Demonic Regen** | `3% Max HP / 2s` | Passive out-of-combat regeneration |
| **Fire Resistance** | `50%` | Resistant to thermal/burn damage |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🩸 Demonic Regeneration & Slumber Vitality (*Oni no Saisei — 鬼の再生*)
* Nezuko regenerates **10 HP every 2.0 seconds** (120 frames) whenever she has not taken damage for at least 1.5 seconds.
* When dropping below 30% HP, her regeneration rate doubles to **20 HP per interval** as demon blood surges.

---

### 2. 🌸 Blood Demon Art Empowerment (*Kekkijutsu Kyōka — 血鬼術強化*)
* Striking burning, bleeding, or stunned targets ignites them with **Pink Bakketsu Flames**.
* Deals an additional **20% bonus true damage** and prolongs active burn status effects by 2 seconds.

---

## ⚔️ Active Skills & Moveset

### 🦵 Basic Attack: Demonic Axe Kick & Claw Flurry (120° Frontal Arc)
* **Type**: Multi-Target Frontal Arc Martial & Claw Combo (Rule 8 Brawler Arc Standard)
* **Visual Style**: Crimson/pink claw swipes and sharp kinetic shock arcs.
* **Arc / Reach**: `120° cone`, `70px reach`
* **Combo Pattern**:
  * **Hit 1 (Snapping Demon Claw Slash)**: Quick horizontal claw swipe dealing `16` damage with a 6-frame flinch.
  * **Hit 2 (Spinning Roundhouse Kick)**: Sweeping demon kick dealing `20` damage with an 8-frame hit-stun.
  * **Hit 3 (Crushing Overhead Demon Axe Kick)**: High-impact downward heel slam dealing `30` damage, spawning a ground impact crater and applying `26` physical knockback.

---

### 🚀 Skill 1: Awakened Demon Flying Dropkick (*Tobi Geri — 飛び蹴り*)
* **Type**: Supersonic Straight Line Flight Kick & Wall Slam
* **Cooldown**: `4.0s` (`240 frames`)
* **Mechanics**:
  * Nezuko launches herself forward at supersonic speed (`28 px/frame`).
  * Hits the first enemy for `32` damage and blasts them across the arena.
  * If the target collides with the arena boundary wall, they suffer an additional `18` wall-bounce collision damage and a 12-frame stun.

---

### 🔥 Skill 2: Blood Demon Art: Exploding Blood (*Kekkijutsu: Bakketsu — 血鬼術・爆血*)
* **Type**: AOE Pyrokinesis Detonation & Cleansing Fire
* **Cooldown**: `5.5s` (`330 frames`)
* **Mechanics**:
  * Nezuko clenches her fists, igniting all blood droplets and enemy debuffs in a 160px radius.
  * Enemies caught in the explosion take `40` burst fire damage and ignite with lingering Bakketsu burn (`5 dps` for 4s).
  * Immediately cleanses any active slow or bleed debuffs on Nezuko.

---

### 👹 Ultimate: Full Demon Awakening: Crimson Lotus Frenzy (*Oni-ka Kakusei — 鬼化覚醒*)
* **Type**: Berserk Demon Transformation, 5-Hit Claw Blitz & Ground Shatter
* **Cooldown**: `25.0s` (`1500 frames`)
* **Mechanics**:
  * Nezuko unleashes her full awakened demon physiology (growing her ivory horn and vine markings).
  * Becomes invulnerable for 1.0s while charging forward in an explosive blitz.
  * Delivers 4 rapid claw tears of `18` damage each, culminating in a colossal dual-heel ground slam dealing `70` AOE damage and `44` knockback.
  * Restores **40 HP** upon completing the transformation combo.
