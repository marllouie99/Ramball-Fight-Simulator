# The Conductor — The Locomotive Engineer

**Category:** Ball vs Ball (Roblox Tribute) & Mechanical Brawler  
**Theme Color:** Deep Navy (`#0F172A`), Locomotive Slate (`#334155`), Brass Gold (`#F59E0B`), and Steam White (`#F8FAFC`)  
**Role:** Area-Denial Zone Control, Wall-Rebound Rail Smasher, Locomotive Ramming Juggernaut  

---

## 📖 Lore & Character Philosophy

Inspired by the iconic **S-Tier Conductor Ball** from Roblox *Ball vs Ball*, **The Conductor** is a master engineer who transforms the battle arena into a lethal railway depot. Where other fighters rely on martial arts, magic, or divine cursed energy, The Conductor controls kinetic momentum and heavy steel infrastructure.

By striking the perimeter of the arena, The Conductor lays down active **Iron Railway Tracks**. With a pull of his brass train whistle cord, he unleashes roaring **Steam Locomotives** that barrel down the rails at supersonic speed, violently ramming, crushing, and pinning opponents against the arena walls.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard & Rule 24 Toji Baseline)
The Conductor’s body model, cap asset, and attire strictly adhere to the repository upright pixel-art rasterization standard ($P = 2.0\text{px}$ offscreen canvas buffer architecture):

* **Head & Cap Zone (`-Y` to `Y ~ 0` / Zone 1 Dome)**:
  * **Conductor Peak Cap (`Assets/model/conductor/conductor-cap.png`)**: High-crowned navy peaked service cap (`#0F172A`) with a polished black patent leather visor, gold braided chin strap cord (`#F59E0B`), and a center gold locomotive wheel emblem.
  * **Faceless Minimalist Standard (Rule 19 / Rule 3.2)**: Pure skin dome (`#E8BD9B` fair/tan) with zero eyes, pupils, mouth, or nose. Subtle sideburns frame the lower jawline.
* **Torso & Vest (`r * 0.28 <= ry < r * 0.64` / Zone 2)**:
  * Deep midnight navy double-breasted conductor vest (`#1E293B`) over a crisp white collared shirt (`#F8FAFC`).
  * Double vertical column of gleaming brass buttons (`#FBBF24`) and a golden pocket watch chain looping across the left vest pocket.
* **Waistband & Trousers (`ry >= r * 0.64` / Zone 3 & 4)**:
  * Heavy dark slate rail trousers (`#334155`) with vertical pinstripes and polished black engineer work boots.
* **Hands & Weapon Stance (Rule 20 Canonical Symmetrical Lower Flank Standard)**:
  * **Left Hand (`x: -r * 0.82, y: +r * 0.38`)**: Wields the **Brass Train Whistle** (`#F59E0B`), releasing animated white steam wisps when skills activate.
  * **Right Hand (`x: +r * 0.82, y: +r * 0.38`)**: Grips the heavy **Railroad Iron Spanner / Lantern** (`#64748B`), used for crushing melee strikes.
  * Overlaps the lower body perimeter cleanly on the front layer.

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Notes |
| :--- | :--- | :--- |
| **HP** | `360` | Heavy Tank / Brawler durability |
| **Base Speed** | `5.2` | Balanced, heavy momentum-based acceleration |
| **Body Radius** | `25px` | Standard humanoid radius (Rule 24 compliant) |
| **Wall Rebound Force** | `1.15x` | Bounces off walls with extra momentum to lay rails |
| **Melee Reach** | `70px` | 130° Frontal Arc AOE with Iron Spanner |
| **Max Active Tracks** | `3 Tracks` | Concurrent railway tracks allowed in arena |
| **Train Speed** | `26.0 px/frame` | Supersonic freight locomotive ram |
| **Train Hitbox Width** | `44px` | Solid rectangular collision bounding box |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🛤️ Iron Rails Deployment (*Tetsudō Fusetsu — 鉄道敷設*)
Whenever The Conductor strikes or rebounds off an arena wall:
* An **Iron Railway Track** instantly deploys along the impacted wall or spans straight across the arena to the opposing wall.
* Tracks feature glowing steel rails (`#94A3B8`), wooden railroad ties (`#78350F`), and vibrant amber signal lights (`#F59E0B`).
* Tracks remain active on the arena floor for **360 frames (6.0s)** before cleanly fading out.
* Maximum of **3 active tracks** can exist simultaneously; placing a 4th track deconstructs the oldest one with a puff of steam.

---

### 2. 💨 Boiler Momentum (*Jōki Atsuryoku — 蒸気圧力*)
* As The Conductor moves and bounces around the arena, internal **Boiler Steam Pressure** builds up from 0% to 100%.
* At 100% Steam Pressure:
  * Movement speed increases by `+15%` (`6.0 px/frame`).
  * Emits continuous white steam clouds from his cap and back.
  * Next train summoned gains **Supercharged Express Velocity** (`32.0 px/frame`) and inflicts `+25% bonus damage`.

---

### 3. 🛡️ Locomotive Super-Armor (*Kikansha no Kōtetsu — 機関車の鋼鉄*)
* The Conductor is 100% immune to damage and knockback from his own summoned trains.
* During whistle channeling and train launches, The Conductor gains **Heavy Super Armor**, reducing incoming damage by 35% and preventing flinch/knockback.

---

## ⚔️ Active Skills & Moveset

### 🔧 Basic Attack: Iron Spanner Swing & Whistle Blast
* **Type**: Multi-Target Frontal Arc Melee (Rule 7/8 compliant)
* **Cooldown**: `40 frames` (~0.66s)
* **Damage**: `18 damage` + `12 knockback`
* **Mechanics**: The Conductor swings his heavy steel spanner in a wide 130° arc. Struck opponents take blunt damage and suffer a `12-frame` micro hit-stun. If a target is hit while standing on an active railway track, they take **1.5× damage (`27 damage`)** and are dragged toward the center of the track.

---

### 🚂 Skill 1: Steam Express Ram (*Mugen Shinkō — 無限進行*)
* **Type**: High-Speed Environmental Hazard & Wall-Pin Ram
* **Cooldown**: `240 frames` (~4.0s)
* **Damage**: `38 impact damage` + `20 wall-splat damage`
* **Mechanics**:
  1. The Conductor raises his brass whistle and pulls the cord: **"CHOO CHOO!"**
  2. A massive vintage **Steam Locomotive** (`width: 90px, height: 40px`) spawns at the start of the nearest active railway track.
  3. The train roars down the track with billowing smoke particles and glowing yellow headlights.
  4. Any enemy caught in the train's path is **rammed, dragged along the tracks, and slammed into the arena wall** for a devastating wall-splat stun (`25 frames`).
  5. Clears and deflects enemy basic projectiles in its path.

---

### 💨 Skill 2: Boiler Steam Vent (*Kōatsu Jōki Hōshutsu — 高圧蒸気放出*)
* **Type**: 360° Radial Burst, Projectile Deflection & Burn Knockback
* **Cooldown**: `300 frames` (~5.0s)
* **Radius**: `110px` around Conductor
* **Damage**: `24 fire/burn damage` + `18 radial push`
* **Mechanics**:
  * The Conductor opens the emergency pressure valves on his boiler.
  * A dense 360° shockwave of scalding white steam bursts outward, pushing away all nearby rushdown attackers.
  * Applies **Steam Scald (Lingering Burn)** dealing `4 damage/sec` for 4 seconds.
  * Instantly extinguishes enemy flame projectiles and provides a brief `15-frame` invulnerability window.

---

### 🚨 Ultimate: Grand Central Freight Run (*Tetsudō Daigakusetsu — 鉄道大激走*)
* **Type**: Arena-Wide Multi-Track Locomotive Overdrive
* **Cooldown / Meter**: 100% Ultimate Meter (or `600 frames`)
* **Total Potential Damage**: `120+ damage` across multiple train strikes
* **Cutscene / Visual Sequence**:
  1. **Station Signal Bell**: A vintage railroad crossing bell rings rapidly (*ding-ding-ding-ding*) while red crossing lights flash on the HUD.
  2. **Grid Lock Rails**: 4 glowing railway tracks instantly cross the arena in an **"X" and "+" intersection pattern**.
  3. **Multi-Train Freight Sweep**: Three full steam trains (Engine + Coal Tender + Freight Boxcars) roar across the arena from multiple directions in staggered succession ($t = 0\text{ms}, 250\text{ms}, 500\text{ms}$).
  4. Enemies caught in the junction point are trapped in a cross-ram juggle, taking massive multi-hit damage and getting pinned to the corners of the arena!

---

## 🔊 Audio & Sound Design

| Sound Event | Sound Description / Asset Target |
| :--- | :--- |
| **Whistle Chime** | High-pitch vintage two-tone brass steam train whistle (`Assets/Sound Effects/conductor/train_whistle.mp3`) |
| **Train Chug & Piston** | Heavy rhythmic steam piston chugging and rail wheel clatter (`train_chug.mp3`) |
| **Crossing Signal Bell** | Authentic railway crossing warning bell with alternating dual-tone rings (`train_bell.mp3`) |
| **Steam Vent Burst** | High-pressure pressurized pneumatic steam release hiss (`steam_burst.mp3`) |
| **Spanner Impact** | Heavy solid metallic wrench clang (`wrench_hit.mp3`) |

---

## 🔄 Special Fighter Interactions

* **Crazy Dave Plants (Wall-nuts & Lawnmowers)**: The Conductor's Steam Train acts as a heavy industrial vehicle; it plows directly through Wall-nuts and trigger plants, dealing double structural damage.
* **Gojo Limitless Infinity**: Standard trains are halted by Infinity unless The Conductor is in **Supercharged Express Mode (100% Boiler Pressure)**, which creates immense kinetic pressure that slowly pushes Gojo toward the wall.
* **Saitama Serious Punch**: If Saitama hits an oncoming train with Serious Punch, the train shatters into flying metal debris with an explosive shockwave!
* **Toji Fushiguro**: If Toji attempts an Ambush teleport onto a moving railway track, the oncoming train intercepts the phantom strike, turning Toji's ambush into a high-speed collision!

---

## 📁 File Structure & Registration Plan

When implementing The Conductor into the engine, the following files will be created/updated:

1. **Config**: `js/configs/characters/conductorConfig.js` (Stats, cooldowns, train dimensions, audio paths).
2. **Entity Class**: `js/entities/fighters/ConductorFighter.js` (Combat logic, track manager, train collision system).
3. **Renderer & Skin**: `js/graphics/fighters/conductorSkin.js` (Toji-standard body model, cap rendering, spanner/whistle hands).
4. **VFX & Train System**: `js/graphics/weapons/conductorTrainGraphics.js` (Track rendering, animated steam locomotives, particle smoke).
5. **Hair / Cap Asset**: `Assets/model/conductor/conductor-cap.png`.
6. **Factory & Registry**: `js/entities/factories/fighterFactory.js` and `js/core/config.js`.
