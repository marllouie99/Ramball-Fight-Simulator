# Nameless Deity of Light (Terraria: Wrath of the Gods) — Fighter Guide

**Identity & Archetype:** Zoner / Transcendent Cosmic Entity / Reality Bender  
**Category:** Gaming  
**Theme Color:** `#FFE259` (Transcendent Celestial Gold)  
**Secondary Color:** `#A17FE0` (Cosmic Ultraviolet / Prismatic Violet)  
**Accent Colors:** `#00F0FF` (Chroma Rift Cyan), `#FFFFFF` (Blinding Starlight Core), `#0E0F14` (Deep Void Ink)  
**Iconic Weapon:** **Nameless Destroyer & Constellation Focus** (Cosmic Super-Ray & Dimensional Arcs)  

---

## 🌌 Lore & Overview

The **Nameless Deity of Light** is the supreme transcendent cosmic entity originating from the renowned *Terraria: Wrath of the Gods* (NoxusBoss) mod. Existing far above the mortal plane and the laws of physical reality, the deity manifests as a radiant starlight core draped in flowing prismatic robes and framed by a continuously rotating 12-point geometric star mandala halo.

In the Ramball Fight Simulator arena, the Nameless Deity dominates combat with overwhelming cosmic zoning, spatial distortion, and screen-spanning starlight artillery:
- Launching three-way homing **Prismatic Light Darts** and arcing starbursts.
- Manifesting an orbiting defensive **Supercluster Star Mandala**.
- Rending space with wide-arc **Dimension Cleaves** inspired by dimensional reality slices.
- Crushing matter into gravitational **Cosmic Singularities / Quasars**.
- Uncaging the catastrophic, continuous screen-spanning **"Nameless Destroyer"** super-beam.

---

## 📊 Baseline Stats & Attributes

| Stat | Value | Description |
| :--- | :--- | :--- |
| **HP** | `450` | Supreme health pool reflecting transcendent celestial durability |
| **Move Speed** | `4.8` | Ethereal gliding locomotion across arena space |
| **Body Radius** | `28px` (`drawR: 40px`) | Majestic silhouette framed by rotating geometric halo |
| **Base Damage** | `16` | Baseline homing starlight shard impact damage |
| **Base Cooldown** | `35 frames` | Rapid multi-shard starlight reload cadence |
| **Aiming Mode** | `360° Continuous` | Full omnidirectional skill targeting with committed cast locks |
| **Knockback Resist** | `80%` | High resistance to physical displacement |

---

## ☀️ Core Mechanics & Passive Characteristics

- **Transcendent Star Mandala Halo:** A multi-layered, 12-point geometric star mandala perpetually orbits behind the deity's body, radiating celestial gold and cyan chromatic aberration pulses in real time.
- **Ethereal Starlight Hands (Rule 20):** Symmetrical starlight palms hover at the lower flanks (`x: ±r * 0.82, y: +r * 0.38`), anchoring constellation focuses and channeling dimensional energy.
- **Committed 360° Cast Lock (Rule 1.4):** When initiating the *Nameless Destroyer* super-beam or *Cosmic Singularity*, the deity locks onto the calculated cast angle, disabling auto-aim tracking and applying authentic reverse recoil.
- **Anti-Cheese & Spatial Authority:** Immune to regular arena hazard displacement; spatial warping prevents knockback locking in arena corners.

---

## ⚔️ Combat Arsenal & Skill Matrix

### 🌟 Basic Attack: Prismatic Light Darts
- **Type:** 3-Way Homing Projectile Spread
- **Damage:** `14` per dart (`3` darts total = `42` burst)
- **Speed:** `10.5`
- **Homing Strength:** `0.075` steering force
- **Visuals:** Pure white cores with radiant golden energy halos and cyan chromatic trails that seek out enemy targets and detonate on impact.

---

### 🛡️ Skill 1: Supercluster Star Mandala
- **Type:** Defensive / Proximity Orbiting Aura
- **Cooldown:** `380 frames` (~6.3 seconds)
- **Duration:** `240 frames` (4.0 seconds)
- **Orbit Radius:** `85px`
- **Star Count:** `6` orbiting supernova stars
- **Contact Damage:** `4` per tick (`32` burst on radial detonation)
- **Effect:** Spawns a ring of 6 orbiting celestial stars around the deity. Enemies attempting to enter close quarters suffer continuous starlight contact damage, while incoming weak projectiles are deflected.

---

### 🗡️ Skill 2: Dimension Cleave (Reality Slice)
- **Type:** 180° Prismatic Wave Sweep
- **Cooldown:** `340 frames` (~5.6 seconds)
- **Reach:** `145px` frontal reach
- **Arc Angle:** `~170°` (`Math.PI * 0.95`)
- **Damage:** `36`
- **Knockback:** `12.5` impulse
- **Effect:** Slices through the fabric of space with an ultraviolet/cyan blade arc, repelling encroaching melee brawlers and pushing them across the arena with heavy screen shake and trailing reality tear needles.

---

### 🕳️ Skill 3: Cosmic Singularity (Gravitational Quasar Collapse)
- **Type:** Area Denial / Black Hole Crowd Control
- **Cooldown:** `520 frames` (~8.6 seconds)
- **Radius:** `135px` gravitational pull radius
- **Duration:** `90 frames` (1.5 seconds)
- **Collapse Damage:** `45` true AOE damage
- **Effect:** Opens a gravitational cosmic rift at the target location that sucks in all hostile fighters, illusions, and minions. Upon reaching critical mass, the rift violently implodes in a blinding cyan/gold flash, dealing massive damage to everything caught in its center.

---

### ⚡ Ultimate: Nameless Destroyer (Apocalyptic Cosmic Super-Beam)
- **Type:** Continuous Screen-Spanning Super-Beam
- **Cooldown:** `850 frames` (~14.1 seconds)
- **Total Damage:** `140` distributed across high-frequency ticks
- **Beam Width:** `48px` collision half-width
- **Beam Length:** `1200px` (arena-wide span)
- **Execution Phases:**
  1. **Wind-Up (`45 frames`):** Geometric mandala focus rings contract inward toward the celestial core with gathering light particles.
  2. **Active Firing (`90 frames`):** Uncages a colossal, screen-spanning rainbow/starlight death ray with a white-hot core, ultraviolet borders, continuous `4-frame` damage ticks, screen shake (`6.5`), and physical recoil impulse pushing the deity backward.
  3. **Recovery (`25 frames`):** Post-beam dissipation and starlight flare fade.

---

## 🎨 Aesthetic & Engine Standards Compliance

- **Rule 19 (Upright Front POV):** Starlight crown on `-Y`, faceless starlight veil at `Y ~ 0` (strictly NO eyes, pupils, mouth, or nose), prismatic ultraviolet robes on `+Y`.
- **Rule 20 (Symmetrical Lower-Flank Hands):** Front layer starlight palms at `(x: ±r * 0.82, y: +r * 0.38)` with radius `r * 0.30`.
- **Rule 3.5 (Offscreen Discrete Rasterization):** Discrete $P = 2.0\text{px}$ pixel grid rendered once into `_cachedNamelessCanvas` to eliminate rotation seams and anti-aliasing artifacts.
- **Rule 2.2 (Prohibition of `shadowBlur`):** Zero canvas blur filters; all glows achieved via concentric transparent gradients and geometric polygon lines.
- **Rule 2.4 (Canvas Stack Balance):** 100% strictly matched `ctx.save()` / `ctx.restore()` transform depths across all charging and super-beam renders.
- **Rule 1.1 (Freeze & TimeStop Early Exits):** Top-level `_handleTimeStop()` guard interrupts casting states when caught in time-stop domains or freeze effects.
