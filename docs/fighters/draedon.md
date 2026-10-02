# Draedon (Terraria: Calamity Mod) — Fighter Guide

**Identity & Archetype:** Zoner / Supreme Exo-Mechanical Architect  
**Category:** Gaming  
**Theme Color:** `#06B6D4` (Exo Plasma Cyan)  
**Secondary Color:** `#F59E0B` (Ares Plasma Amber)  
**Accent Colors:** `#10B981` (Thanatos Mint), `#EF4444` (Targeting Laser Red), `#0B0F19` (Obsidian Chassis)  
**Iconic Weapon:** **Exo Electric Disintegrator** (Multi-Stream Plasma Melting Cannon)  

---

## ⚡ Lore & Overview
**Draedon** is the enigmatic supreme cybernetic mastermind and genius scientist from the legendary *Terraria: Calamity Mod*. As the creator of the colossal Exo Mechs (XF-09 Ares, XM-05 Thanatos, and XS-01 Artemis & XS-03 Apollo), Draedon represents the pinnacle of technological warfare and devastating plasma weaponry.

In the Ramball Fight Simulator arena, Draedon commands an arsenal of high-tech Exo-gadgets: firing dual-stream kinetic plasma pulses, calling down Ares homing Gauss artillery, deploying Thanatos refractive armor shields with high-voltage radial discharges, coordinating drone cross-lasers, and uncaging the apocalyptic **"Exo Electric Disintegrator"** continuous melting ray.

---

## 📊 Baseline Stats & Attributes

| Stat | Value | Description |
| :--- | :--- | :--- |
| **HP** | `430` | High health pool backed by obsidian titanium Exo-Plating |
| **Move Speed** | `4.6` | Hovering jet locomotion powered by rear Exo-Thrusters |
| **Body Radius** | `28px` | Heavy cybernetic chassis silhouette |
| **Base Damage** | `18` | Baseline dual-stream Exo-Pulse bolt damage |
| **Base Cooldown** | `32 frames` | Rapid high-frequency cybernetic fire rate |
| **Aiming Mode** | `360° Continuous` | Precision omnidirectional targeting for artillery and beams |
| **Damage Mitigation**| `35%` | Flat damage reduction while Thanatos Matrix is active |

---

## 🤖 Core Mechanics & Passive Characteristics

- **Hovering Drone Wings:** Twin floating Exo-thruster modules hover perpetually behind Draedon's chassis, bobbing dynamically in the air and radiating cyan and amber energy cores.
- **Holographic Sensor Visor:** A faceless cybernetic helmet adorned with a glowing cyan holographic visor stripe and high-voltage energy conduit.
- **Thanatos Refractive Plating:** Capable of hardening its external alloy matrix to reduce incoming impact damage while building a retaliatory electrical charge.
- **Committed 360° Super-Beam Lock:** When charging the Exo Disintegrator, Draedon commits to the target angle, stabilizing his chassis against high-voltage recoil.

---

## ⚔️ Combat Arsenal & Skill Matrix

### Basic Attack: Twin Exo-Pulse Blaster
- **Type:** Twin-Stream Piercing Plasma Bolts
- **Damage:** `12` per pulse (`24` total if both strike)
- **Speed:** `12.0`
- **Spread Offset:** `12px` parallel separation
- **Visuals:** High-velocity cyan plasma cores with obsidian outlines that pierce through basic clutter.

---

### Skill 1: Ares Gauss Artillery
- **Type:** Multi-Rocket Homing Barrage
- **Cooldown:** `380 frames` (~6.3 seconds)
- **Rocket Count:** `4` homing missiles
- **Damage:** `9` per rocket (`36` total)
- **Speed:** `7.5`
- **Homing Strength:** `0.08` trajectory curve
- **Effect:** Launches a salvo of 4 amber Gauss rockets from rear weapon pods. The rockets curve dynamically through the air toward enemy fighters before detonating in cluster explosions.

---

### Skill 2: Thanatos Energy Matrix
- **Type:** Defensive Armor & Radial Shockwave
- **Cooldown:** `440 frames` (~7.3 seconds)
- **Duration:** `120 frames` (2.0 seconds)
- **Damage Mitigation:** `35%` flat incoming damage reduction
- **Discharge Damage:** `30`
- **Discharge Radius:** `110px`
- **Effect:** Surrounds Draedon in a glowing mint-green Thanatos refractive shield. Upon activation, instantly discharges a 360° high-voltage shockwave that deals damage and violently knocks back nearby enemies.

---

### Skill 3: Exo Cross-Lasers (Artemis & Apollo)
- **Type:** High-Speed Cross-Laser Sweep
- **Cooldown:** `480 frames` (~8.0 seconds)
- **Range:** `450px`
- **Damage:** `36`
- **Visuals:** Ruby red targeting lasers that converge and slash across the enemy's coordinates.

---

### Ultimate: Exo Electric Disintegrator (Plasma Melting Super-Beam)
- **Type:** Continuous Screen-Spanning Disintegration Beam
- **Cooldown:** `820 frames` (~13.6 seconds)
- **Total Damage:** `135` distributed across high-frequency melting ticks
- **Beam Width:** `42px` collision half-width
- **Beam Length:** `1200px` (arena-wide span)
- **Phases:**
  1. **Wind-Up (`40 frames`):** High-voltage Thanatos coils ignite with blue and amber electric arcs crackling around the cannon's barrel.
  2. **Active Firing (`95 frames`):** Unleashes a searing, continuous dual-layer cyan/amber plasma death ray. Jagged green electric arcs fork off the beam edges as it melts targets with continuous `4-frame` ticks, screen shake (`6.0`), and physical recoil impulse.
  3. **Recovery (`25 frames`):** Thermal venting exhaust cools the emitter barrel back to idle.

---

## 🎨 Aesthetic & Engine Standards Compliance
- **Rule 19 (Upright Front POV):** Cybernetic crest on `-Y`, faceless cyan holographic visor stripe at `Y ~ 0` (strictly NO eyes, mouth, or nose), obsidian armor plates and amber conduit on `+Y`.
- **Rule 20 (Symmetrical Lower-Flank Hands):** Front layer cybernetic gauntlets positioned at `(x: ±r * 0.82, y: +r * 0.38)` with radius `r * 0.30`.
- **Rule 3.5 (Offscreen Discrete Rasterization):** Discrete $P = 2.0\text{px}$ pixel grid rasterized once into `_cachedDraedonCanvas` with integer snapping and dark manga ink outline (`#030712`).
- **Rule 2.2 (Prohibition of `shadowBlur`):** Zero canvas blur filters; electric arcs and plasma glow rendered cleanly with optimized geometry.
- **Rule 2.4 (Canvas Stack Balance):** 100% strictly matched `ctx.save()` / `ctx.restore()` transform depths across all charging arcs and super-beam renders.
