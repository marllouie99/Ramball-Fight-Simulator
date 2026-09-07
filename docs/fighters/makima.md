# Makima — The Control Devil

**Category:** Anime & Chainsaw Man / Devils  
**Theme Color:** Velvet Blood Crimson (`#A31D24` / `#8B0000`) & Golden Halo (`#F59E0B` / `#FCD34D`)  
**Role:** Mid-to-Long Range Control Zoner, Minion Hijacker, Sacrificial Executioner  

---

## 📖 Lore & Character Philosophy

Makima is the **Control Devil (*Shihai no Akuma — 支配の悪魔*)**, high-ranking leader of Public Safety Devil Extermination Special Division 4. Behind her calm, polite demeanor and warm smile lies an omniscient, ruthless entity who perceives all living beings as either her dogs or tools to be utilized for a "superior peace." Driven by a deep, tragic longing to form an equal relationship—a connection impossible for a being whose very nature is total subjugation—Makima commands absolute authority over devils, fiends, and humans alike.

In the *Circle Mini-Battle* arena, Makima is an oppressive, psychological combatant who dominates spacing, redirects fatal damage to Japan's populace, and punishes arrogance with instantaneous kinetic annihilation. She can command enemy illusions and summons to turn against their masters, lock foes into submissive stasis with her **Chains of Domination**, and obliterate opponents from across the battlefield with her feared finger-gun gesture: **"Bang."**

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Makima's fighter model, silhouette, hair, and Public Safety uniform strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - Upright front-profile reddish-orange / salmon hair with neat, parted frontal bangs framing the face and signature side-framing strands.
  - A long, elegant single braid trailing down over her left flank (`-X`).
  - Strict compliance with **Rule 19**: Clean minimalist faceless aesthetic (zero eyes, pupils, mouth, or nose bridges).
- **Public Safety Attire (`+Y`)**:
  - Crisp ivory/white button-up collared dress shirt with sharp pointed collar wings, delicate fabric folds, and central pearl button placket.
  - Slim solid matte black silk necktie draped cleanly over the shirt placket (no tie clip).
  - High-waisted dark charcoal trousers with defined waistband, pleats, and fly seam.
- **Weapon & Hand Stance (Rule 20)**:
  - **Front Hand (Lead Hand)**: Held in her signature **Finger-Gun ("Bang!")** posture pointing along `+X`. Lunges forward crisply on basic attack shots with snappy kinetic recoil.
  - **Back Hand (Off-Hand)**: Positioned gracefully at her hip or holding a cup/leash behind the body layer.
  - **Skin Only Mode (`state.showSkinOnly`)**: When enabled, cleanly hides both hands and weapon grips.

### 2. Control Aura & Ethereal Halos (Rule 11 Zero shadowBlur Standard)
- **Dominion Halo**: Subtle, shimmering golden-crimson concentric aura rings floating behind her head that pulse gently during idle and intensify during ability activations.
- **Sacrifice Wisps**: Ephemeral black and red butterfly/paper wisps orbiting her perimeter, representing active Citizen Contract lives.

### 3. Manga Action Speed Lines (Rule 16 Standard)
- **Needle Polygon Geometry**: 4-point filled needle polygons (`maxThick = 1.0px – 2.0px`) streaming strictly behind Makima along her aim vector during *Bang!* kinetic recoil.
- **4-Slot Color Theme**: Velvet Blood Crimson (`#A31D24`), Solar Gold (`#F59E0B`), Pure White Kinetic Core (`#FFFFFF`), and Manga Dark Ink (`#110E14`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Dominion Mode (Active Chains) | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `360` | `360` | High effective HP via Contract Lives |
| **Base Speed** | `2.45` | `2.70` (`+10%`) | Steady, authoritative spacing |
| **Body Radius** | `25px` | `25px` | Standard fighter hitbox |
| **Citizen Lives** | `5 Stocks` | `5 Stocks` | Damage redirection pool |
| **Bang Range** | `850px` | `850px` | Instantaneous hitscan line trace |
| **Kinetic Knockback** | `36 Force` | `44 Force` | Massive wall-bounce physics |
| **Control Tether Range** | `420px` | `420px` | Multi-target tether pull & lock |

---

## ⚡ Passives & Inherent Mechanics

### 1. 📜 Innate Contract: Prime Minister's Accord (*Sōri Daijin no Keiyaku — 総理大臣の契約*)
Makima holds a binding contract with the Prime Minister of Japan. Any fatal damage, debilitating curse, or critical injury inflicted upon Makima is nullified and transferred to random citizens across Japan:

* **Citizen Stock Counter (5 Lives)**:
  * Makima enters match combat with **5 Citizen Lives** (rendered as golden tally marks and red butterfly silhouettes above her HUD bar).
  * While Citizen Lives remain, Makima possesses **20% flat damage resistance** against all physical and elemental strikes.
* **Fatal Blow Redirection**:
  * Upon receiving fatal damage (HP ≤ 0), Makima does NOT die. Instead, she enters a brief `0.35s` ethereal stasis while 1 Citizen Stock is consumed.
  * A shadowy citizen silhouette collapses in the background arena, and Makima instantly regenerates **40% Max HP** (`144 HP`), unleashing a radial compressional shockwave (`r: 120px`, `18 Force`) that repels nearby attackers.

---

### 2. 👁️ Absolute Dominance (*Shihai no Iatsu — 支配の威圧*)
Makima naturally asserts psychological authority over the battlefield:
* Enemies facing away from Makima take `15%` bonus damage from *Bang!*.
* Illusions, clones, and summoned entities that enter within `180px` of Makima suffer `30%` reduced movement speed and can be hijacked by *Chains of Domination*.

---

## ⚔️ Abilities & Moveset

### 💥 Primary Attack: *"Bang!"* (Lightning-Fast Full-Screen Invisible Beam)
* **Type**: Full-Screen Invisible Supersonic Kinetic Beam
* **Cooldown**: `44 frames` (~0.73s)
* **Damage**: `34 Direct Damage` + `24 Wall-Impact Crush Damage`
* **Mechanics**:
  * Makima aims her index finger and whispers *"Bang!"*
  * Instantly fires a lightning-fast, full-screen (`1600px`) invisible supersonic beam shot from her finger.
  * **Projectile Piercing**: Pierces through and instantly vaporizes all incoming enemy projectiles, bullets, slashes, and missiles in its line of fire.
  * **Full-Screen Multi-Target Piercing (Rule 6 Compliant)**: Pierces through all entities in the trajectory, striking fighters, illusions, and minions simultaneously across the entire arena.
  * **Wall-Stick Pin & Zero Rebounce (1.5s Stasis)**: Deals massive directional knockback (`knockbackForce: 46`). When an enemy collides with the arena boundary wall, they do **NOT** rebounce into the arena; instead, they are violently **pinned and stuck flat to the wall for 1.5 seconds (90 frames)** in complete stasis while suffering **24 Wall-Impact Crush Damage**, accompanied by heavy screen shake, wall impact blood splatters, and floating *"WALL PINNED!"* text.
  * **Atmospheric Shockwave Visual**: Rendered as expanding supersonic Mach rings and a subtle translucent vacuum corridor along the line of fire.

---

### ⛓️ Skill 1: Chains of Domination (*Shihai no Kusari — 支配の鎖*)
* **Type**: Multi-Target Tether Pull & Mind Subjugation
* **Cooldown**: `9.0 seconds` (`540 frames`)
* **Damage**: `24 Initial Damage` + `8/sec Bleed`
* **Mechanics**:
  * Makima extends 3 ethereal crimson chains from her fingertips or collar, latching onto up to 3 nearby targets (fighters, clones, or minions).
  * **Tether Stasis & Pull**: Pulls linked targets toward Makima at `12 px/frame` while inflicting a `1.2s` forced kneeling hit-stun (`applyTimeStop` applied exclusively to targets per Rule 5).
  * **Minion Hijacking**: If a chain latches onto an enemy summon or illusion (e.g., Doppelganger clone, Megumi Shikigami, or Turret), Makima **subjugates their mind**, turning them into loyal allies for `6.0 seconds` to attack their original creator!
  * **Command: Kneel**: Enemies linked by the chains have their damage output reduced by `25%` for the duration.

---

### 🗡️ Skill 2: Angel's Armory: 1000-Year Life-Span Spear (*Sen-nen no Yari — 千年の槍*)
* **Type**: Holy Energy Lance / Piercing True Damage
* **Cooldown**: `13.5 seconds` (`810 frames`)
* **Damage**: `75 True Damage` (Halberd Burst) / `140 True Damage` (1000-Year Spear Impact)
* **Mechanics**:
  * **Tap Cast (100-Year Halberds)**: Materializes 3 radiant golden halo-blades that fire sequentially at the target, piercing shields and armor.
  * **Hold/Channel (1000-Year Spear)**: Channels for `1.0s` to summon the colossal golden Angel Devil spear above her.
  * **True Piercing**: Launches the spear at supersonic speed with targeted tracking. Bypasses invulnerability barriers and ignores armor.
  * **Explosion Radius**: On impact, detonates into a radiant golden cross-pillar (`160px` radius) dealing heavy AOE damage and knocking targets back.

---

### 🩸 Ultimate: Kyoto Shrine Ritual: Gravitational Splatter (*Sanpai no Assaku — 参拝の圧殺*)
* **Type**: Cinematic Full-Screen Sacrificial Execution
* **Requirement**: 100% Ultimate Gauge
* **Total Damage**: `45% Max Target HP` + `280 Flat True Damage` (Instant Execution if target HP < 25%)
* **Cinematic Stages**:
  1. **Stage 1 — Sacrificial Stasis (0.0s – 0.6s)**:
     - The screen enters a deep crimson vignette dimming overlay (Rule 14 canvas-clipped overlay).
     - Makima assumes a serene prayer stance, clasping her hands together.
     - All active enemies and illusions are locked in sacrificial stasis.
  2. **Stage 2 — Chanting Puppets (0.6s – 1.4s)**:
     - Blindfolded sacrificial silhouettes appear around Makima, whispering the enemy's name in unison.
     - Dark cursed compression rings converge on the target's exact coordinates.
  3. **Stage 3 — The Heavenly Squeeze (1.4s – 2.0s)**:
     - Makima presses her palms firmly together.
     - An invisible, colossal gravitational column crashes down from the sky onto the target.
     - The enemy is violently flattened into a deep blood crater on the arena floor, spraying high-density blood impact splatters and suffering massive true damage. If the target's remaining HP is below 25%, they are instantly crushed out of existence.

---

## 📊 HUD Skill Layout & Visual Theme

All HUD skill progress bars strictly utilize Makima's unified theme color (**Rule 18 Compliant**):

```
┌─────────────────────────────────────────────────────────────┐
│ MAKIMA (CONTROL DEVIL)                        HP: 360 / 360 │
│ [█████████████████████████████████████████████████████████] │
│                                                             │
│ [Skill 1: Chains of Domination] [  READY  ] #A31D24 (Crimson)│
│ [Skill 2: Angel's Armory]      [  READY  ] #A31D24 (Crimson)│
│ [Ultimate: Shrine Ritual]      [  READY  ] #A31D24 (Crimson)│
│ [Citizen Contract Stocks: 🗲 🗲 🗲 🗲 🗲 (5/5 Lives Active)]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Matchup Dynamics & Strategy

### Strong Against:
- **Summoners & Illusionists (Doppelganger, Megumi, Turret Builders)**: *Chains of Domination* turns enemy summons and clones into her personal attack dogs.
- **Melee Brawlers & Rushdowns (Yuji, Saitama, Berserker)**: The sheer knockback force of *Bang!* combined with wall-bounce damage keeps rushdowns pinned to the arena walls.
- **Glass Cannons & Burst Assassins**: Her *Prime Minister Contract* completely absorbs fatal burst combos, allowing her to counter-attack while reviving.

### Weak Against:
- **Zero-Presence Physical Assassins (Toji Fushiguro)**: Toji's *Inverted Spear of Heaven (ISOH)* neutralizes her Control Chains on contact, and his zero cursed energy disrupts auto-tracking.
- **Relentless High-Frequency Hazard Domains (Sukuna's Malevolent Shrine)**: Rapid multi-slashes can burn through multiple Citizen Lives in quick succession.
- **Distance Snipers (Laser Fighter, Sharpshooter)**: Snipers who engage from outside her 850px *Bang!* line can chip her down safely.

---

## 🛠️ Code & Systems Compliance Checklist

- [x] **Rule 1 (TimeStop & Freeze Guards)**: Update loop checks `isFrozen || this.isTargetOfAmbush` and exits early.
- [x] **Rule 5 (Target-Only TimeStop)**: Freezes target exclusively during *Chains of Domination* tether without freezing Makima's own update loop.
- [x] **Rule 6 (Target Queries)**: Evaluates both `state.fighters` and `state.illusions` for *Bang!* penetration and chain subjugation.
- [x] **Rule 11 (No shadowBlur)**: Halos, crimson chains, and shockwave glows use concentric alpha gradients without Gaussian blur.
- [x] **Rule 14 (Global Dim Constraint)**: Shrine Ritual dimming rendered strictly within the game canvas.
- [x] **Rule 15 (Physics & Wall-Bounce)**: *Bang!* utilizes direct physics displacement and wall collision ricochet damage.
- [x] **Rule 16 (Manga Speed Lines)**: 4-point filled needle polygons aligned behind Makima along the recoil vector.
- [x] **Rule 18 (HUD Theme Consistency)**: Unified `#A31D24` velvet crimson styling across all skill slots in `hudManager.js`.
- [x] **Rule 19 (Upright Front POV)**: Head at `-Y`, torso and Public Safety suit at `+Y`, with vertical Y-mirroring on leftward aim. Zero facial features (no eyes/mouth/nose).
- [x] **Rule 20 (Hand Visibility & Skin Only)**: Evaluates `state.showSkinOnly` and fighter hand visibility flags before rendering finger gun and hands.
