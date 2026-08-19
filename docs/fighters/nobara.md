# Nobara Kugisaki — The Straw Doll Sorcerer

**Category:** Anime & Jujutsu Sorcerers  
**Theme Color:** Deep Rose Crimson (`#D94E68` / `#C83E54`)  
**Role:** Mid-Range Tactical Zoner, Trap Detonator, Soul Burst Executioner  

---

## 📖 Lore & Character Philosophy

Nobara Kugisaki is a first-year Jujutsu High sorcerer from the countryside who fights with fierce pride, unyielding self-expression, and ruthless tactical intellect. Unapologetic about who she is and unburdened by hesitation, Nobara lives by a simple conviction: *"I love myself when I'm pretty and all dressed up! And I love myself when I'm being strong! I am Nobara Kugisaki!"*

In the *Circle Mini-Battle* arena, Nobara represents a lethal hybrid of **long-range zoning, terrain minefields, and direct soul punishment**. Unlike conventional fighters whose attacks can be blocked or dodged, Nobara's **Straw Doll Technique (*Sūrei Juhō*)** establishes a spiritual link with her targets. Once her cursed nails are embedded, distance and physical barriers become irrelevant—allowing her to drive her hammer through a cursed effigy to deliver devastating internal soul damage directly into her enemy's core.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Nobara's fighter model, face, hair, and uniform strictly adhere to the front-profile camera orientation standard:
- **Head & Face (`-Y` to `Y ~ 0`)**:
  - Upright front-profile orange-brown ginger hair styled in her signature side-parted bob with sweeping diagonal bangs.
  - Expressive amber eyes with determined eyelashes and subtle ear contours on `±X`.
  - Manic battle grin / fierce focus visual during high-stack combos or Black Flash state.
- **Attire & Uniform (`+Y`)**:
  - High-collar dark navy Jujutsu High uniform jacket with polished brass school crest buttons.
  - Brown leather utility waist belt with twin side-pouches: a dedicated steel nail pouch on the left hip and hammer holster on the right.
  - Navy pleated uniform skirt contours.
- **Weapon & Hand Stance (Rule 20)**:
  - **Front Hand (Lead Hand)**: Grips her signature steel carpenter hammer at `(r * 0.95, 0)`. Lunges forward dynamically during hammer strikes.
  - **Back Hand (Off-Hand)**: Holds floating cursed energy steel nails shimmering with deep crimson and cyan cursed sparks.
  - **Skin Only Mode (`state.showSkinOnly`)**: When enabled, cleanly hides both the hammer and floating nails.

### 2. Embedded Nail & Straw Doll Visuals
- **Protruding Steel Nails**:
  - Nails embedded into enemies render as glowing, angled metallic spikes with black-crimson cursed energy wisps (`#D94E68`).
  - Stacks are visually tracked by 1 to 5 glowing spikes lodged in the enemy body.
- **Spectral Straw Doll (Effigy)**:
  - Summoned floating above Nobara or directly over the target during *Resonance*.
  - Rendered with woven straw texture (`#D4AF37`), twin cross-stitched button eyes, and red binding threads connecting to the target.

### 3. Manga Action Speed Lines (Rule 16 Standard)
- **Needle Polygon Geometry**: 4-point filled needle polygons (`maxThick = 0.8px – 1.6px`) streaming strictly behind Nobara along her attack vector during lunge attacks.
- **4-Slot Color Theme**: Deep Rose Crimson (`#D94E68`), Cursed Flame Coral (`#FF6B81`), Radiant White Core (`#FFFFFF`), and Manga Dark Ink (`#1A141A`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Ecstasy Mode (<50% HP) | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `400` | `400` | Balanced mid-range pool |
| **Base Speed** | `2.40` | `2.88` (`+20%`) | High-mobility spacing |
| **Body Radius** | `25px` | `25px` | Standard fighter hitbox |
| **Melee Reach** | `65px` | `65px` | 120° Frontal Arc Hammer Swing |
| **Nail Piercing Velocity** | `14 px/frame` | `18 px/frame` | Fast projectile launch |
| **Max Embedded Nails** | `5 Nails` | `5 Nails` | Per target stack limit |
| **Nail Duration** | `8.0s` (`480f`) | `8.0s` | Refreshed on every nail hit |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🪡 Innate Technique: Straw Doll Technique (*Sūrei Juhō — 芻霊呪法*)
Every basic attack and skill embeds cursed iron nails into targets or the surrounding arena:

* **Embedded Nail Stacks (`target.embeddedNails`)**:
  - Basic ranged nail shots embed **1 nail**; melee hammer swings embed **2 nails** (capped at **5 stacks** per target).
  - Each embedded nail reduces the target's physical resistance by `3%` and links their soul to Nobara's Straw Doll.
* **Terrain Landmine Anchors**:
  - Ranged nails that miss enemies embed firmly into arena floors and outer boundary walls.
  - Up to **8 active nails** can exist in the environment simultaneously, waiting to be detonated by *Hairpin*.

---

### 2. 🩸 Unflinching Ecstasy (*Kōyō no Shinshō — 高揚の心象*)
Nobara embraces the thrill and pain of life-or-death battle. When her HP drops below **50%** or upon landing a Black Flash:

* **Battle Rush**: Gain `+20%` movement speed and `+25%` projectile speed.
* **Rapid Reload & Swing**: Nail shot cooldown reduced by `30%`, and melee hammer swings gain `+20%` faster animation recovery.
* **Pain Tolerance**: Grants `15%` damage mitigation during active skill channeling.

---

## ⚔️ Abilities & Moveset

### 🔨 Primary Attack: Cursed Nail Launch & Hammer Strike
* **Type**: Hybrid (Ranged Projectile + 120° Frontal Arc Melee)
* **Cooldown**: `42 frames` (~0.70s)
* **Mechanics**:
  - **Ranged Mode (Distance > 65px)**: Nobara tosses a cursed nail and bats it with her hammer at high speed. Deals `18 Damage` and embeds `1 nail` on impact. Pierces through illusions and destructible entities.
  - **Melee Mode (Distance ≤ 65px)**: Swings her steel hammer in a wide downward arc. Deals `24 Damage` with heavy physical knockback and embeds `2 nails` directly into the enemy.

---

### 🌸 Skill 1: Hairpin (*Kanzashi — 簪*)
* **Type**: Remote Cursed Energy Detonation / Area Control
* **Cooldown**: `5.5 seconds` (`330 frames`)
* **Damage**: `28 Damage per Embedded Nail` (Up to `140 Burst Damage` at 5 stacks) + `35 AOE Damage` on terrain nails
* **Mechanics**:
  - Nobara channels cursed energy through her hammer, snapping her fingers or striking the ground to detonate **ALL active nails** in enemies and the arena.
  - **Target Detonation**: Embedded nails burst into violent erupting black-crimson thorns, inflicting heavy hit-stun (`0.45s`), armor shred, and knockback.
  - **Terrain Minefield Detonation**: Environmental nails detonate in a `75px` radius shockwave, catching approaching rushdown fighters (e.g. Toji, Yuji, Berserker) in high-damage crossfire.

---

### 🪆 Skill 2: Straw Doll Technique: Resonance (*Tomonari — 共鳴り*)
* **Type**: Remote Soul Strike / Armor & Distance Bypass
* **Cooldown**: `10.0 seconds` (`600 frames`)
* **Damage**: `60 – 115 True Damage` (Scales with distance and embedded nail count: `60 + (Nails × 11)`)
* **Mechanics**:
  - Nobara manifests her signature **Straw Doll**, places a cursed link from the enemy inside, and slams a glowing spike through its heart with her hammer.
  - **True Soul Damage**: Pierces through all shields, physical barriers, and terrain geometry, delivering internal soul damage directly to the linked target regardless of map distance.
  - **Limitless Barrier Bypass (Rule 9 Interaction)**: If nails are embedded in Gojo before Infinity activates, Resonance bypasses Infinity completely because damage is transmitted spiritually through the effigy rather than traveling as an external physical projectile.
  - **Anti-Clone & Illusion Obliteration**: If Resonance targets a clone (e.g., Doppelganger clone or illusion decoy), the decoy is instantly destroyed, and **75% of the damage echoes back to the real caster**!

---

### ⚡ Ultimate: Black Flash: Supreme Resonance (*Kokusen: Dai Tomonari — 黒閃・大共鳴り*)
* **Type**: Cinematic Multi-Stage Execution & Arena Cursed Eruption
* **Cooldown**: `32.0 seconds` (`1920 frames`)
* **Total Damage**: `195 True Damage` (`65 Impact` + `130 Soul Explosion`)
* **Cinematic Stages**:
  1. **Phase 1 — Black Flash Blitz**:
     - Nobara focuses her cursed energy within `0.000001 seconds`, lunging forward with supersonic speed lines.
     - Delivers a catastrophic **Black Flash hammer strike** wrapped in pitch-black and crimson spatial lightning.
     - Deals `65 Impact Damage`, inflicts `0.6s` cinematic hit-pause, and forcibly injects **5 Max Nail Stacks** into the target.
  2. **Phase 2 — Colossal Straw Doll Impalement**:
     - A towering spectral Straw Doll manifests above the battlefield, chained to the enemy by glowing cursed tendrils.
     - Nobara leaps into the air and drives a massive cursed spike through the doll's heart.
     - The target's core violently detonates in an arena-wide explosion of Black Flash sparks, soaring rose petals, and erupting cursed thorns dealing `130 True Damage` and knocking the enemy across the arena.

---

## 📊 HUD Skill Layout & Visual Theme

All HUD skill progress bars strictly utilize Nobara's unified theme color (**Rule 18 Compliant**):

```
┌─────────────────────────────────────────────────────────────┐
│ NOBARA KUGISAKI                               HP: 400 / 400 │
│ [█████████████████████████████████████████████████████████] │
│                                                             │
│ [Skill 1: Kanzashi (Hairpin)]   [  READY  ] #D94E68 (Rose)  │
│ [Skill 2: Resonance]           [  READY  ] #D94E68 (Rose)  │
│ [Ultimate: Black Flash]        [  READY  ] #D94E68 (Rose)  │
│ [Nail Stacks Linked: ◆◆◆◇◇ (3/5)]                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Matchup Dynamics & Strategy

### Strong Against:
- **Doppelganger & Illusionists**: *Resonance* hard-counters decoys, instantly vaporizing clones and echoing massive damage directly to the real caster.
- **Defensive & Barrier Users (Gojo / Shielders)**: Once a nail lands, *Resonance* bypasses Infinity and invulnerability barriers completely through spiritual soul linkage.
- **Aggressive Rushdown Fighters**: Pre-placed terrain nails allow *Hairpin* to turn the arena into an inescapable landmine perimeter.

### Weak Against:
- **Stealth & Fast Assassins (Toji Fushiguro)**: Toji's zero-cursed-energy Heavenly Restriction disrupts auto-targeting, and his burst speed can close distance before nail traps are fully deployed.
- **Ultra Long-Range Snipers (Laser / Sharpshooter)**: Extreme range snipers can pressure Nobara from beyond her primary nail toss trajectory.

---

## 🛠️ Code & Systems Compliance Checklist

- [x] **Rule 1 (TimeStop & Freeze Guards)**: Returns immediately when `isFrozen` or `isTargetOfAmbush` is active; cancels active hammer channels.
- [x] **Rule 6 (Target Queries)**: Evaluates both `state.fighters` and `state.illusions` for nail hits and Hairpin detonations.
- [x] **Rule 7 (Frontal Arc AOE)**: 120° frontal cone for melee hammer swings.
- [x] **Rule 9 (Infinity Compliance)**: Resonance transmits through the spiritual effigy link, respecting Gojo's barrier mechanics while providing authentic lore counterplay.
- [x] **Rule 11 (No shadowBlur)**: All cursed rose glows and sparks rendered using concentric alpha layers without CPU Gaussian blur.
- [x] **Rule 16 (Manga Speed Lines)**: 4-point filled needle polygons aligned behind Nobara during Black Flash blitz.
- [x] **Rule 18 (HUD Theme Consistency)**: Unified `#D94E68` rose color across all skill bars in `hudManager.js`.
- [x] **Rule 19 (Upright Front POV)**: Head at `-Y`, torso at `+Y`, with Y-mirroring on leftward aim.
