# Avatar of Emptiness (Terraria: Wrath of the Gods) — Fighter Guide

**Identity & Archetype:** Zoner / Dimension-Shifting Void Sovereign / Crowd Control Stasis  
**Category:** Gaming  
**Theme Color:** `#9D4EDD` (Abyssal Void Amethyst)  
**Secondary Color:** `#00F5D4` (Cryonic Rift Cyan)  
**Accent Colors:** `#FF0055` (Visceral Blood Red), `#06070B` (Obsidian Antishadow), `#FFFFFF` (Singularity White)  
**Iconic Weapon:** **Void Portal Claws & Rift Singularity** (Dimensional Rifts & Spatial Tears)  

---

## 🌌 Lore & Overview

The **Avatar of Emptiness** is the incomprehensible entity and final apocalyptic manifestation originating from *Terraria: Wrath of the Gods* (NoxusBoss). Emerging from a colossal planar rift in spacetime, the Avatar commands the total fabric of reality across three distinct parallel dimensions:

1. **The Dark Universe:** Antimatter waves, antishadow tendrils, and void blots.
2. **The Cryonic Universe:** Absolute zero outbursts, freezing shockwaves, and falling frost columns.
3. **The Visceral Universe:** Blood torrents, violent whirlpool surges, and molten gravity slams.

In the Ramball Fight Simulator arena, the Avatar of Emptiness is an oppressive, dimension-controlling powerhouse. It manipulates gravitational fields, summons portal strikes from beyond the arena boundaries, commands shifting elemental universe attacks, and channels the cataclysmic **"Universal Annihilation"** reality shatter.

---

## 📊 Baseline Stats & Attributes

| Stat | Value | Description |
| :--- | :--- | :--- |
| **HP** | `460` | Massive void health pool fortified by dimensional distortion |
| **Move Speed** | `4.7` | Gliding ethereal hover with spatial warp micro-teleports |
| **Body Radius** | `29px` (`drawR: 42px`) | Imposing antishadow silhouette with radiating rift tendrils |
| **Base Damage** | `17` | Baseline antimatter dart and void needle damage |
| **Base Cooldown** | `34 frames` | Swift dark energy pulsation reload rate |
| **Aiming Mode** | `360° Continuous` | Precision omnidirectional targeting for portals and rift beams |
| **Knockback Resist** | `85%` | Immense mass anchored across multiple dimensions |

---

## 🌑 Core Mechanics & Passive Characteristics

- **Antishadow Void Halo & Tendrils:** Dynamic shadowy tendrils and an orbiting violet-cyan event horizon perpetually writhe behind the Avatar's body, periodically releasing drifting void embers.
- **Dimensional Phase Shift (Passive Matrix):** Shifting between cosmic realms empowers the Avatar's attacks with alternating secondary effects:
  - *Cryonic Shift:* Inflicts brief movement chill on targets.
  - *Visceral Shift:* Boosts knockback and triggers secondary blood spurts.
  - *Dark Shift:* Adds homing antimatter micro-projectiles.
- **Ethereal Void Claws (Rule 20):** Symmetrical shadowy claw palms hover at the lower flanks (`x: ±r * 0.82, y: +r * 0.38`), anchoring planar rifts and tearing spacetime.
- **Committed 360° Cast Lock (Rule 1.4):** When channeling *Universal Annihilation* or opening *Arm Portal Strikes*, the Avatar clamps its facing angle and disables auto-aim drift while applying reverse recoil.

---

## ⚔️ Combat Arsenal & Skill Matrix

### 🌑 Basic Attack: Antimatter Void Blasts
- **Type:** 3-Way Dark Energy Blast Spread
- **Damage:** `15` per blast (`3` blasts total = `45` burst)
- **Speed:** `11.0`
- **Homing Strength:** `0.065` steering curvature
- **Visuals:** Obsidian black spheres enveloped in pulsing violet coronas and cyan chromatic fringes that track enemies and implode upon contact.

---

### ❄️ Skill 1: Cryonic Absolute Zero (Frost Columns & Freeze Wave)
- **Type:** Radial Frost Outburst & Area Freeze
- **Cooldown:** `360 frames` (~6.0 seconds)
- **Duration:** `150 frames` (2.5 seconds)
- **Radius:** `130px` cryogenic frost pulse
- **Damage:** `30`
- **Effect:** Erupts a freezing shockwave outward from the Avatar's core, halting approaching enemies with high deceleration and spawning 3 falling crystalline frost columns along the enemy's trajectory.

---

### 🩸 Skill 2: Visceral Blood Torrent (Gravitational Whirlpool)
- **Type:** Directional Pressure Wave & Pull Vortex
- **Cooldown:** `390 frames` (~6.5 seconds)
- **Reach:** `155px` frontal reach
- **Arc Angle:** `~160°`
- **Damage:** `38`
- **Knockback:** `13.0` inward-to-outward whip impulse
- **Effect:** Summons a roaring visceral blood torrent across a wide frontal cone, sweeping enemy fighters into a localized vortex before blasting them backward with screen-shaking kinetic force.

---

### 🌌 Skill 3: Dark Dimension Portal Strikes (Arm Jut Out)
- **Type:** Spatial Teleport Ambush / Multi-Portal Claw Strike
- **Cooldown:** `480 frames` (~8.0 seconds)
- **Range:** `260px` targeting range
- **Strikes:** `4` successive portal tears
- **Damage:** `12` per portal claw (`48` total)
- **Effect:** Tears open 4 dark dimensional rifts around the target's position in rapid sequence. Giant shadowy arms jut out from each portal, crushing the target from multiple angles.

---

### 💥 Ultimate: Universal Annihilation (Apocalyptic Reality Shatter)
- **Type:** Full-Screen Dimensional Implosion & Beam Burst
- **Cooldown:** `880 frames` (~14.6 seconds)
- **Total Damage:** `150` distributed across rapid tearing ticks
- **Beam / Shatter Width:** `52px` core collision width
- **Execution Phases:**
  1. **Convergence (`50 frames`):** The arena darkens as spacetime distorts inward into a central black singularity; the Avatar hovers with spread claws.
  2. **Active Reality Shatter (`95 frames`):** Uncages a colossal prismatic violet and cyan antimatter death-beam tearing through the screen with continuous `4-frame` damage ticks, heavy screen shake (`7.0`), and severe physical recoil.
  3. **Supernova Collapse (`30 frames`):** The beam finishes with a blinding white-out explosion and dimensional glass shatter sound, dispersing starlight particles across the arena.

---

## 🎨 Aesthetic & Engine Standards Compliance

- **Rule 19 (Upright Front POV):** Shadow horns and rift mantle on `-Y`, faceless obsidian mask with vertical rift glow at `Y ~ 0` (strictly NO eyes, pupils, mouth, or nose), flowing antishadow robe tendrils on `+Y`.
- **Rule 20 (Symmetrical Lower-Flank Hands):** Front layer shadowy claw hands at `(x: ±r * 0.82, y: +r * 0.38)` with radius `r * 0.30`.
- **Rule 3.5 (Offscreen Discrete Rasterization):** Discrete $P = 2.0\text{px}$ pixel grid rendered once into `_cachedAvatarCanvas` to prevent sub-pixel seam artifacts during rotation.
- **Rule 2.2 (Prohibition of `shadowBlur`):** Zero canvas blur filters; all ethereal glows created with concentric stepped gradient bands.
- **Rule 2.4 (Canvas Stack Balance):** 100% strictly matched `ctx.save()` / `ctx.restore()` transform depths across all dimension portals and ultimate animations.
- **Rule 1.1 (Freeze & TimeStop Early Exits):** Universal `_handleTimeStop()` evaluation prevents state leakage when frozen.
