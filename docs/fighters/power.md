# Power — The Blood Fiend

**Category:** Anime & Chainsaw Man / Devils  
**Theme Color:** Crimson Blood Red (`#EF4444` / `#DC2626`) & Fiend Strawberry Gold (`#FDE047` / `#D97706`)  
**Role:** Blood Manipulation Tactician, Heavy Blood Hammer Smasher, Radial Blood Blade Zoner  

---

## 📖 Lore & Character Philosophy

Power is the **Blood Fiend (*Chi no Majin — 血の魔人*)**, a devil inhabiting a human corpse who works alongside Denji under Makima in Public Safety Special Division 4. Proud, chaotic, shameless, and unapologetically selfish, Power claims to be the "supreme genius" among fiends. Her sole genuine attachment in the world is her pet cat, **Meowky (Nyako)**. Power possesses the formidable ability to freely manipulate and solidify her own blood—as well as the spilled blood of others—into lethal melee and ranged armaments, ranging from towering, skull-shattering blood warhammers to thousands of orbiting crimson spears.

In the *Circle Mini-Battle* arena, Power is a dynamic, high-impact combatant who blends heavy frontal cleaves with tactical zone control. She generates floating **Blood Orbs** as she strikes foes, collecting them to amplify her blood reserves and unleash devastating shockwave attacks with her **Gigantic Blood Hammer**, curved **Blood Scythe**, and an arena-wide **Blood Rain Cataclysm** ultimate.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Power's fighter model, silhouette, demon horns, and attire strictly adhere to the front-profile camera orientation standard:
- **Head & Demon Horns (`-Y` to `Y ~ 0`)**:
  - **Twin Crimson Demon Horns**: Iconic sharp horns protruding from the top crown (`-r * 1.15` to `-r * 0.50`, `#EF4444` bright crimson tip, `#DC2626` base, `#991B1B` shadow, `#450A0A` root anchor).
  - **Strawberry-Blonde Hair Locks**: Long, flowing pastel strawberry-blonde/peach locks (`#FEF08A` highlight, `#FDE047` base, `#EAB308` midtone, `#B45309` shadow, `#451A03` ink border) framing the face with discrete bangs and cascading past the shoulders down both flanks (Rule 19.1).
  - **Faceless Aesthetic (Rule 19)**: Clean faceless circle body (zero eyes, pupils, mouth, or nose).
- **Public Safety Uniform / Hoodie (`+Y`)**:
  - **Unbuttoned Jacket / Teal-Blue Hoodie**: Power's signature loose jacket/hoodie worn casually over her shoulders (`#1E293B` jacket / `#0284C7` teal hoodie rim) over a white dress shirt (`#FAF7F0`).
  - **Red Necktie**: Crooked, loosely knotted red tie (`#DC2626` / `#991B1B`) dangling down the center chest.
  - **Charcoal Pants**: Dark trousers with defined waistline and belt.
- **Weapon & Hand Stance (Rule 20)**:
  - **Front Hand (Lead Hand)**: Wields the haft of the **Gigantic Blood Hammer** or summons floating blood blades along `+X`.
  - **Back Hand (Off-Hand)**: Positioned forward at `(1.05r, 0)` in idle stance, providing natural combat depth.
  - **Skin Only Mode (`state.showSkinOnly`)**: When enabled, cleanly hides hands.

### 2. Blood Droplets & Crimson Auras (Rule 11 Zero shadowBlur Standard)
- **Blood Crystallization Aura**: Concentric transparent gradient rings simulating boiling crimson fiend energy (`rgba(239, 68, 68, 0.8)`) and deep burgundy cores (`rgba(153, 27, 27, 0.5)`). Zero CPU `shadowBlur` is used.
- **Manga Action Speed Lines (Rule 16 Standard)**:
  - 4-point filled needle polygons (`maxThick: 1.2px – 2.2px`) streaming strictly behind Power during blood hammer lunges.
  - **4-Slot Color Theme**: Bright Blood Crimson (`#EF4444`), Deep Fiend Burgundy (`#991B1B`), Pure White Kinetic Glint (`#FFFFFF`), and Manga Dark Ink (`#110E14`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Blood Boost Mode (Max Reserves) | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `330` | `330` | Standard fighter durability |
| **Base Speed** | `5.9` | `6.7` (`+14%`) | Swift fiend agility |
| **Body Radius** | `25px` | `25px` | Standard fighter hitbox |
| **Hammer Reach** | `85px` | `95px` | 140° Heavy Frontal Arc Cleave |
| **Blood Reserve Gauge** | `0 / 100` | `100 / 100` | Gained by collecting Blood Orbs |
| **Hammer Stun Duration** | `18 frames` | `28 frames` | Heavy ground shockwave crush |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🩸 Blood Reservoir (*Chi no Chochiku — 血の貯蓄*)
* As Power damages enemies with her blood weapons or punches, struck foes shed **Blood Orbs** (3–5 orbs per combo) that drop onto the arena floor.
* Walking near Blood Orbs automatically magnetizes and absorbs them, filling Power's **Blood Gauge** (up to 100).
* Every 25 Blood points grants `+5% Attack Damage` and `+3% Movement Speed`.
* At 100 Blood points, Power enters **Blood Devil Intoxication**, causing her blood hammer and scythe attacks to spawn trailing blood shockwaves.

---

### 2. 😈 Fiend Arrogance (*Majin no Kyōki — 魔人の狂気*)
* Power deals **20% bonus damage** against enemies suffering from Bleed or Hemorrhage status effects.
* When receiving a critical hit, Power automatically dashes backward `80px` leaving a cluster of sharp blood caltrops that damage pursuing enemies for `18` damage.

---

## ⚔️ Active Skills & Moveset

### 🔨 Basic Attack: Gigantic Blood Hammer (140° Heavy Frontal Cleave & Shockwave)
* **Type**: Heavy Impact Frontal Cleave (Rule 7/8 Multi-Target Arc)
* **Visual Style**: Massive crystalline crimson blood mallet rasterized in solid 2D pixel art (`#EF4444` gleaming crimson edge, `#DC2626` body, `#7F1D1D` core, and jagged blood spikes).
* **Arc / Reach**: `140° frontal cone`, `85px reach`
* **Combo Pattern**:
  * **Hit 1 (Overhead Blood Smash)**: Power swings the giant mallet downward, smashing the ground for `24` damage and creating a 140° radial shockwave that flinches enemies for `12 frames`.
  * **Hit 2 (Horizontal Blood Cleave)**: Power sweeps the mallet horizontally across `140°`, launching struck enemies sideways for `24` damage + `22` knockback.
  * **Hit 3 (Finisher — Earthshaker Blood Burst)**: Power leaps slightly and drives the mallet headfirst into the arena floor, detonating a jagged crimson blood shockwave (`radius: 110px`) dealing `36` damage + `18-frame` heavy stun and dropping 4 Blood Orbs.

---

### 🗡️ Skill 1: Blood Scythe Whirlwind (*Chi no Ōgama — 血の大鎌*)
* **Type**: 360° Radial Spin Cleave & Crescent Projectile Wave
* **Cooldown**: `240 frames` (~4.0s)
* **Mechanics**:
  * Power condenses her blood into a curved, elongated blood scythe (`reach: 90px`).
  * Spins full 360° twice in rapid succession, dealing `22` damage per spin (`44` total) to all enemies within radius.
  * The second spin unleashes a crescent wave of high-velocity blood blades (`speed: 20 px/frame`, `damage: 26`) traveling across the arena that pierces through enemies and applies 5 seconds of Bleed (`4 dmg/sec`).

---

### 🩸 Skill 2: Thousand Blood Daggers (*Chi no Senbon — 血の千本*)
* **Type**: Floating Radial Blade Summon & Homing Barrage
* **Cooldown**: `380 frames` (~6.3s)
* **Mechanics**:
  * Power conjures a circular halo of 6 razor-sharp crimson blood daggers floating behind her back.
  * After a 10-frame telegraph, the daggers launch sequentially toward the nearest enemy at supersonic speed (`26 px/frame`).
  * Each dagger deals `12` damage (`72` total if all hit), applying micro hit-stuns and pinning the target in place for `20 frames`.

---

### 👑 Ultimate: Prime Blood Devil Eruption — "Blood Rain Cataclysm" (*Chi no Akuma: Kōrin — 血の悪魔・降臨*)
* **Type**: 3-Phase Full Arena Blood Spear Geyser
* **Cooldown**: `1500 frames` (~25.0s)
* **Phases**:
  * **Phase 1: Blood Ignition**: Time briefly freezes for `35 frames` on all enemies (Rule 5 compliant). Power points upward as crimson blood geysers shoot skyward and her demon horns glow brightly.
  * **Phase 2: Thousand Spear Orbital Barrage**: Towering crystalline blood spears descend like heavy rain across the entire arena floor over 1.5 seconds, detonating in chain explosions (`damage: 18 per spear`, 6 spears total).
  * **Phase 3: Prime Blood Pillar**: Power slams both hands onto the arena center, erupting a colossal 200px wide pillar of boiling blood from underneath the primary target.
    * **Impact**: Deals `80 True Damage`, blasts enemies upward with `48 Knockback`, and fully restores Power's Blood Reservoir to 100%.

---

## 🎵 Audio Sound Effects Mapping

* **Blood Hammer Swing & Crush**: Heavy metallic warhammer swing (`Assets/Sound Effects/Attacks/heavypunch1.mp3`) & seismic ground slam (`Assets/Sound Effects/Attacks/explosion.mp3`).
* **Blood Scythe Spin**: Sharp blade whistle (`Assets/Sound Effects/Skills/parry.mp3`).
* **Blood Daggers Launch**: Rapid piercing projectile whoosh (`Assets/Sound Effects/Attacks/flamespray1.mp3`).
* **Blood Rain Cataclysm**: Ultimate charging whine (`Assets/Sound Effects/Skills/genos-ultimatecharging.mp3`) and full arena blood eruption boom (`Assets/Sound Effects/Skills/fugaexplode.mp3`).
