# Crazy Dave (Plants vs. Zombies) — Fighter Guide

**Identity & Archetype:** Zoner / Solar Flora Tactician  
**Category:** Gaming  
**Theme Color:** `#84CC16` (Plant Lime Green)  
**Secondary Color:** `#F59E0B` (Solar Amber)  
**Iconic Quote:** *"WABBI WABBO!"*

---

## 🌻 Lore & Overview
Crazy Dave is the wildly eccentric, pot-wearing botanist neighbor from *Plants vs. Zombies*. He thrives on collecting glowing golden Sun drops falling from the sky, popped out of opponents by his steel shovel swings, or cultivated by happy Sunflowers. With his collected solar currency, Dave plants a versatile botanical arsenal of Peashooters, sturdy Wall-nuts, explosive Cherry Bombs, and deploys high-speed Lawn Mowers.

---

## ☀️ Core Mechanic: Sun Economy
- **Starting Sun:** `50 ☀️` (Max Capacity: `500 ☀️`).
- **Overhead Sun Counter:** Displays Dave's real-time Sun storage in a floating glass pill above his head.
- **Ambient Sun:** Radiant Sun drops drift down from the sky every 2.6 seconds.
- **Magnetic Sun Attraction:** Dave exerts a `85px` magnetic radius pulling nearby suns toward himself.
- **Shovel Harvesting:** 100% of melee shovel strikes pop a `+25 ☀️` drop out of the target.
- **Sunflower Cultivation:** Each planted Sunflower yields `+25 ☀️` every 2.1 seconds.

---

## 🛠️ Combat Arsenal & Plant Skills

### Basic Attack: Garden Shovel Whack
- **Type:** Melee Frontal Arc (`130°` arc cone, `68px` reach)
- **Damage:** `22` per swing
- **Knockback:** `9.5` impulse
- **Special:** Pops `+25 ☀️` out of the struck opponent.

### Skill 1: Plant Sunflower (`50 ☀️`)
- **Cost:** `50 Sun` (Cooldown: `3.0s`)
- **HP:** `140 HP` (Max active: 2)
- **Effect:** Sways and radiates solar warmth, producing bouncing `+25 ☀️` drops every 2.1 seconds to supercharge Dave's economy.

### Skill 2: Plant Combat Flora (`50☀️ – 100☀️`)
- **Cost:**
  - **Peashooter (`100 ☀️`):** `180 HP`. Targets nearest opponent and fires supersonic green `PeaBullet` projectiles (`9 Damage` each, `460px` range, `22-frame` fire rate).
  - **Wall-nut (`50 ☀️`):** `380 HP`. Heavy defensive barrier. Absorbs incoming projectiles, blocks line of fire, and knocks back encroaching enemies with high collision force. Shows crack textures and a bandage when below 35% HP.

### Skill 3: Cherry Bomb (`150 ☀️`)
- **Cost:** `150 Sun` (Cooldown: `6.0s`)
- **Effect:** Drops twin cherry bombs with an agitated, flashing spark fuse (`0.75s` fuse). Swells and explodes in a massive `115px` radius dealing `110` explosive AOE damage and high knockback.

### Ultimate: "WABBI WABBO!" Lawn Mower Rush (`250 ☀️`)
- **Cost:** `250 Sun` (Cooldown: `13.3s`)
- **Effect:** Dave yells *"WABBI WABBO!"* and launches a high-speed motorized Lawn Mower (`14.0` speed) that charges forward across the arena, shredding all enemy projectiles in its path and dealing continuous `85` grinding damage with heavy wall bounce.

---

## 🎨 Aesthetic & Engine Standards Compliance
- **Rule 19 (Upright Front POV):** `-Y` tilted silver pot on head with side handle, `Y ~ 0` scruffy brown beard shadow (faceless minimalist aesthetic), `+Y` white polo shirt, blue denim jeans, brown boots.
- **Rule 3.5 (Offscreen Canvas Rasterization):** Discrete $P = 2.0\text{px}$ grid unit with integer snapping, 4-neighbor manga outline (`#0E0F14`), zero rotated fillRect grid artifacts.
- **Rule 2.2 (Prohibition of `shadowBlur`):** All golden sun halos and plant glows use clean radial gradients.
- **Rule 2.4 (Canvas Stack Integrity):** 100% matched `ctx.save()` / `ctx.restore()` stacks.
