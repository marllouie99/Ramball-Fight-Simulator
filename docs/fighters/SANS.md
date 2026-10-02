# 💀 SANS — The Judge of the Underground

> *"it's a beautiful day outside. birds are singing, flowers are blooming... on days like these, kids like you... should be burning in hell."*

---

## 📋 Overview

| Attribute | Value |
| :--- | :--- |
| **Character ID** | `sans` |
| **Display Name** | `SANS` |
| **Title / Boss Title** | `The Judge of the Underground` |
| **Origin** | *Undertale* / *Deltarune* by Toby Fox |
| **Archetype** | **Zoner / Boss** |
| **Theme Color** | `#00F5FF` (Electric Cyan) |
| **Secondary Color** | `#FFE600` (Bad Time Eye Yellow) |
| **Base HP** | `240` (Glass-cannon evasion pool) |
| **Base Move Speed** | `5.2` |
| **Hitbox Radius ($r$)** | `25px` |
| **Fighter Def ID** | `54` |

---

## ⚡ Combat Mechanics & Passives

### 1. Passive: Karmic Retribution (KR)
- **Description**: Sans does not deal standard blunt burst damage. All of his attacks (Bones, Gaster Blasters, Gravity Slams) inflict **Karmic Retribution (KR)** poison stacks onto enemy entities.
- **Tick Damage**: `1` to `3` damage every `14 frames` (~0.23s) scaling smoothly with active stacks.
- **Max Stacks**: `12` stacks for sustained battle pressure.
- **Duration**: `180 frames` (~3.0s of continuous health drain).
- **Armor Bypass**: KR bypasses basic defense shields and cannot reduce health below `1 HP` on its own until hit by an active attack.

### 2. Passive: Teleport Dodge & Stamina System
- **Description**: True to his lore, Sans avoids incoming hits with instant teleportation afterimages and a `"MISS"` floating banner.
- **Dodge Chance**: `85% Base Dodge Probability` (`dodgeChance: 0.85`) on standard incoming attacks when stamina is available.
- **Domain Dodge Chance**: `80% Spatial Dodge Probability` (`domainDodgeChance: 0.80`) against Sukuna's *Malevolent Shrine* slice lines.
- **Stamina Pool**: `100 Max Stamina` (regenerates at `+0.20/frame`, ~12/sec).
- **Dodge Cost**: `20 Stamina` per avoided attack (5 consecutive dodges from full pool).
- **Dodge Cooldown**: `16 frames` minimum between consecutive dodges.
- **Dodge Jump Distance**: `85px` teleport repositioning away from the attacker.
- **Fatigue & Vulnerability**: When stamina is fully depleted or while caught in hard CC time-stops (such as Gojo's *Unlimited Void* or domain stasis), Sans cannot dodge and takes direct damage.

---

## 🎯 Active Abilities & Skills

### 🦴 Basic Attack: Bone Toss
- **Type**: Ranged Projectile
- **Damage**: `8` (+ KR poison)
- **Velocity**: `8.5px/frame`
- **Reach**: `420px`
- **Cooldown**: `26 frames` (~0.43s)

---

### 💀 Skill 1: Gaster Blaster Barrage
- **Type**: Ranged Heavy Laser Cannon
- **Cooldown**: `320 frames` (~5.3s)
- **Blaster Count**: `2` Blasters (`3` during Bad Time mode)
- **Beam Damage**: `8` per tick (`24` total per blaster, `48` total burst, `72` in Bad Time) (+ KR stacks)
- **Laser Reach**: `800px`
- **Beam Width**: `38px`
- **Knockback**: `9 impulse`
- **Description**: Summons floating skeletal dragon skull cannons that track the target, open their jaws with cyan energy cores, and fire massive high-energy continuous laser beams with concussive screen shake.

---

### 🦴 Skill 2: Bone Zone & Ground Spear Traps
- **Type**: Area Denial / Crowd Control
- **Cooldown**: `240 frames` (~4.0s)
- **Bone Count**: `6` Projectiles (Spread angle: `0.60 rad`)
- **Bone Damage**: `5` per bone (up to `30` max point-blank) (+ KR poison)
- **Blue Bone Mechanic**: Blue bones freeze moving targets for `24 frames` (~0.40s). Stationary targets take zero damage and are not frozen.
- **Ground Spear Traps**: Erupts sharp rising bone spears under the opponent after a `24-frame` red warning box, dealing `16` damage.

---

### 💙 Skill 3 / Ultimate: Blue Soul Gravity Slam ("Bad Time")
- **Type**: Telekinesis / Arena Slam
- **Cooldown**: `580 frames` (~9.6s)
- **Duration**: `80 frames` (~1.33s channeling)
- **Bad Time Buff**: `360 frames` (6.0s duration with `+20% Speed` and `-25% Cooldowns`)
- **Initial Slam Damage**: `22` damage
- **Wall Smash Damage**: `8` damage per perimeter impact (up to 3 wall slams = `24` bonus)
- **Gravity Force**: `18 impulse`
- **Description**: Sans snaps his hand upward, flashes his cyan/yellow eye with dynamic flame wisps, turns the opponent's soul blue, and slams them telekinetically into arena boundaries with heavy screen shake.

---

## 🎨 Visual & Rendering Standards

### 1. Upright Front POV Orientation (Rule 19)
- **$-r \le ry < +r \cdot 0.15$ (Top)**: Skeleton skull dome, brow ridge, white bone stepped highlights, dark eye sockets with discrete pupils, nasal cavity, and grinning teeth line.
- **$+r \cdot 0.15 \le ry < +r \cdot 0.32$ (Collar)**: Oversized fluffy fleece collar framing the neck.
- **$+r \cdot 0.32 \le ry < +r \cdot 0.70$ (Torso)**: Open Royal Blue hoodie jacket (`#2563EB`) with clean white undershirt V-opening.
- **$+r \cdot 0.70 \le ry < +r \cdot 0.90$ (Shorts)**: Charcoal athletic gym shorts (`#18181B`) with crisp vertical white side stripes (`#FFFFFF`).
- **$+r \cdot 0.90 \le ry \le +r$ (Feet)**: Pastel pink slippers (`#F472B6`).

### 2. Symmetrical Lower-Flank Pixel Hands (Rule 20)
- **Left Hand**: `(x: -r * 0.82, y: +r * 0.38)` with radius `r * 0.30`
- **Right Hand**: `(x: +r * 0.82, y: +r * 0.38)` with radius `r * 0.30`
- Rendered on front layer overlapping the lower body circle perimeter via `drawPixelHand`.
- **Dynamic Telekinesis Pose**: Right hand snaps upward with cyan telekinetic aura pulses during Gravity Slam and Bone Wave casts.

### 3. Discrete Grid Engine & Offscreen Canvas Cache (Rule 3.5)
- Grid unit: $P = 2.0\text{px}$ with integer coordinate snapping.
- 4-neighbor attached boundary test for solid dark manga ink outline (`#0E0F14`).
- Offscreen canvas caching buffer (`_cachedSansCanvas`) eliminates rotated pixel grid artifacts and guarantees 60 FPS performance.

### 4. Bad Time Flashing Eye & Flame Aura (Rule 11)
- Left eye socket flashes between Cyan (`#00F5FF`) and Yellow (`#FFE600`) with dynamic rising flame tendrils.
- Concentric radial energy gradients with zero `shadowBlur`.
- Fading cyan/white ghost afterimages during teleport dodges.

---

## 📁 Source Code Architecture

| Component | File Path |
| :--- | :--- |
| **Character Config** | [`js/configs/characters/sansConfig.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/configs/characters/sansConfig.js) |
| **Fighter Entity Class** | [`js/entities/fighters/SansFighter.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/entities/fighters/SansFighter.js) |
| **Skin Model Renderer** | [`js/graphics/fighters/sansSkin.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/fighters/sansSkin.js) |
| **Weapons & VFX Renderer** | [`js/graphics/weapons/sansWeaponGraphics.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/weapons/sansWeaponGraphics.js) |
| **Fighter Factory** | [`js/entities/factories/fighterFactory.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/entities/factories/fighterFactory.js) |
| **Graphics Registry** | [`js/graphics/draw.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/draw.js) |
| **Audio SFX & OST** | [`Assets/Sound Effects/Sans/`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/Assets/Sound%20Effects/Sans/) |
| **Sprite Sheet Assets** | [`Assets/model/Sans/`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/Assets/model/Sans/) |
| **Balance Sheet Entry** | [`js/configs/fighter-balance-sheet.json`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/configs/fighter-balance-sheet.json) |

---

## 🔊 Sound Effects & Audio Mapping

- **Blaster Charge**: `Assets/Sound Effects/Sans/GasterBlaster.ogg`
- **Blaster Laser Fire**: `Assets/Sound Effects/Sans/GasterBlast.ogg`
- **Bone Toss & Ground Stab**: `Assets/Sound Effects/Sans/BoneStab.ogg`
- **Gravity Slam Impact**: `Assets/Sound Effects/Sans/Slam.ogg`
- **Teleport Dodge Flash**: `Assets/Sound Effects/Sans/Flash.ogg`
- **Dialogue Voice**: `Assets/Sound Effects/Sans/SansSpeak.ogg`
- **Soundtrack**: `Assets/Sound Effects/Sans/mus_zz_megalovania.ogg`
