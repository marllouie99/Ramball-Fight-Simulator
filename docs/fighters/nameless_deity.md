# Nameless Deity (Terraria: Wrath of the Gods) — Fighter Guide

**Identity & Archetype:** Zoner / Transcendent Cosmic Entity  
**Category:** Gaming  
**Theme Color:** `#FFE259` (Transcendent Celestial Gold)  
**Secondary Color:** `#A17FE0` (Cosmic Ultraviolet / Prismatic Violet)  
**Accent Colors:** `#00F0FF` (Chroma Rift Cyan), `#FFFFFF` (Starlight Core)  
**Iconic Weapon:** **Nameless Destroyer** (Apocalyptic Cosmic Super-Ray)  

---

## 🌌 Lore & Overview
The **Nameless Deity of Light** is the supreme transcendent cosmic boss originating from the acclaimed *Terraria: Wrath of the Gods* mod. Existing beyond mortal comprehension, the entity manifests as a radiant starlight core draped in shifting prismatic robes and encircled by an ever-revolving 12-point geometric star mandala halo.

In the Ramball Fight Simulator arena, the Nameless Deity dominates the battlefield with omnidirectional cosmic zoning: unleashing homing starlight shards, deploying defensive supercluster star shields, rending space with dimensional cleaves, commanding gravitational black hole singularities, and charging the catastrophic **"Nameless Destroyer"** super-beam.

---

## 📊 Baseline Stats & Attributes

| Stat | Value | Description |
| :--- | :--- | :--- |
| **HP** | `420` | High health pool reflecting transcendent cosmic durability |
| **Move Speed** | `4.8` | Ethereal gliding locomotion across arena space |
| **Body Radius** | `28px` | Majestic silhouette framed by rotating geometric halo |
| **Base Damage** | `16` | Baseline homing starlight shard damage |
| **Base Cooldown** | `35 frames` | Rapid multi-shard starlight reload rate |
| **Aiming Mode** | `360° Continuous` | Full omnidirectional skill and super-beam aiming |
| **Knockback Resist** | `75%` | High resistance to physical displacement |

---

## ☀️ Core Mechanics & Passive Characteristics

- **Transcendent Star Mandala Halo:** A multi-layered, 12-point geometric halo continually orbits behind the deity's body, radiating celestial gold and cyan chromatic aberration rings in real time.
- **Ethereal Starlight Hands:** Symmetrical starlight palms hover at the lower flanks (`r * 0.82, r * 0.38`), anchoring weapon cores and channeling dimensional energy.
- **Committed 360° Super-Beam Lock:** When initiating the ultimate, the Nameless Deity locks its trajectory onto the target direction, suppressing auto-aim tracking to maintain a straight beam of starlight.

---

## ⚔️ Combat Arsenal & Skill Matrix

### Basic Attack: Prismatic Light Darts
- **Type:** 3-Way Homing Projectile Spread
- **Damage:** `14` per dart (`3` darts total)
- **Speed:** `10.5`
- **Homing Strength:** `0.06` steering force
- **Visuals:** Pure white cores with radiant golden energy halos that seek out enemy targets and detonate on impact.

---

### Skill 1: Supercluster Star Mandala
- **Type:** Defensive / Proximity Aura
- **Cooldown:** `400 frames` (~6.6 seconds)
- **Duration:** `240 frames` (4 seconds)
- **Effect:** Spawns a ring of 6 orbiting celestial supernova stars around the deity (`75px` orbit radius). Enemies attempting to enter close combat suffer continuous starlight contact damage (`3` per tick) and spark explosions.

---

### Skill 2: Dimension Cleave
- **Type:** 180° Prismatic Wave Sweep
- **Cooldown:** `340 frames` (~5.6 seconds)
- **Reach:** `140px` frontal radius
- **Arc Angle:** `~171°` (`Math.PI * 0.95`)
- **Damage:** `32`
- **Knockback:** `12.0` impulse
- **Effect:** Sweeps an ultraviolet/cyan dimensional energy blade forward, repelling encroaching melee brawlers and pushing them across the arena with heavy screen shake.

---

### Skill 3: Cosmic Singularity (Gravitational Vortex)
- **Type:** Area Denial / Black Hole Crowd Control
- **Cooldown:** `520 frames` (~8.6 seconds)
- **Radius:** `130px` gravitational pull radius
- **Duration:** `90 frames` (1.5 seconds)
- **Collapse Damage:** `42` explosive true AOE damage
- **Effect:** Opens a gravitational cosmic rift at the target location that sucks in all hostile fighters, illusions, and minions. Upon reaching critical mass, the rift implodes in a blinding cyan/gold flash, dealing massive damage to everything caught in its center.

---

### Ultimate: Nameless Destroyer (Apocalyptic Cosmic Super-Beam)
- **Type:** Continuous Screen-Spanning Super-Beam
- **Cooldown:** `850 frames` (~14.1 seconds)
- **Total Damage:** `130` distributed across high-frequency ticks
- **Beam Width:** `46px` collision half-width
- **Beam Length:** `1200px` (arena-wide span)
- **Phases:**
  1. **Wind-Up (`45 frames`):** Geometric mandala focus rings contract inward toward the celestial core with gathering light particles.
  2. **Active Firing (`90 frames`):** Uncages a colossal, screen-spanning rainbow/starlight death ray with a white-hot core, ultraviolet borders, continuous `4-frame` damage ticks, screen shake (`6.5`), and physical recoil impulse pushing the deity backward.
  3. **Recovery (`25 frames`):** Post-beam dissipation and starlight flare fade.

---

## 🎨 Aesthetic & Engine Standards Compliance
- **Rule 19 (Upright Front POV):** Starlight crown on `-Y`, faceless starlight veil at `Y ~ 0` (strictly NO eyes, mouth, or nose), prismatic ultraviolet robes on `+Y`.
- **Rule 20 (Symmetrical Lower-Flank Hands):** Front layer starlight palms at `(x: ±r * 0.82, y: +r * 0.38)` with radius `r * 0.30`.
- **Rule 3.5 (Offscreen Discrete Rasterization):** Discrete $P = 2.0\text{px}$ pixel grid rendered once into `_cachedNamelessCanvas` to eliminate rotation seams.
- **Rule 2.2 (Prohibition of `shadowBlur`):** Zero canvas blur filters; all glows achieved via concentric transparent gradients and geometric lines.
- **Rule 2.4 (Canvas Stack Balance):** 100% strictly matched `ctx.save()` / `ctx.restore()` transform depths across all charging and super-beam renders.
