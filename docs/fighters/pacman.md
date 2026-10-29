# Pac-Man — The Retro Arcade Legend (パックマン)

**Category:** Gaming & Retro Arcade (*Pac-Man* Series by Bandai Namco)  
**Character ID:** `pacman`  
**Theme Color:** Classic Arcade Yellow (`#FACC15`)  
**Secondary Accents:** Arcade Red Gloves & Boots (`#EF4444`), Pellet Cream Gold (`#FFE082`), Manga Ink (`#0E0F14`)  
**Role:** Arena Pellet Scavenger, Tactical Objective Gatherer, Apex Super Predator  

---

## 🟡 Lore & Character Philosophy

> *"Waka waka waka... CHOMP!"*

Born in the golden age of arcade gaming, **Pac-Man** is one of the most recognizable icons in electronic entertainment history. Navigating neon mazes and chased by colorful ghosts, Pac-Man's sole imperative is simple yet unyielding: consume every dot in sight. When the energized power pellets are claimed, the tables turn—the hunter becomes the apex predator, and nothing can escape his voracious appetite.

In *Circle Mini-Battle*, **Pac-Man** brings a completely unique, authentic, and pure gameplay loop:
1. **The Dot-Eating Phase (Pure Evasion & Objective Collection)**:
   - Upon round start, every single tile across the 8x8 arena grid (64 tiles) is filled with a Pac-Dot (including 4 prominent glowing corner Power Pellets).
   - In this state, Pac-Man is **strictly non-offensive** and has all default projectile shooting suppressed (Rule 23). He cannot strike or damage enemies directly.
   - Pac-Man follows standard arena rules by naturally traversing and rebouncing off the arena walls and colliding entities like an ordinary fighter (`applyMovementPhysics()` + `resolveWallBounce()`), gobbling down pellets organically as he crosses tiles with his iconic rhythmic *"waka waka"* audio.
2. **Super Chomp Mode (The ONLY Offensive Mechanic)**:
   - **Dual Triggers**:
     - **Power Pellet Munch**: Eating **ANY of the 4 big Power Pellets** immediately activates Super Chomp Mode for 6.0 seconds (360 frames), refreshing duration on subsequent big dots.
     - **Full Board Clear**: Consuming **all 64 dots** in the arena also activates Super Chomp Mode.
   - Pac-Man triggers an energizer shockwave (Rule 26) and global screen shake, unlocking a +25% movement speed boost and predatory razor-sharp chomping teeth.
   - During Chomp Mode, contacting an enemy executes a bone-crunching **30% Max HP bite attack** with massive hit stun, directional knockback, and crunchy retro sound.
   - Pac-Man can continue eating remaining dots during Chomp Mode. When Chomp Mode expires:
     - If all 64 dots have been cleared, the entire arena grid immediately **refills with dots on every tile**, resetting the board with 4 fresh Power Pellets.
     - If dots still remain, Pac-Man returns to normal mode to continue scavenging the remaining pellets.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model & Animated Wedge Mouth (Rule 19 & Rule 24)
Pac-Man's body model is rendered in `js/graphics/fighters/pacmanSkin.js` adhering to the canonical baseline body radius (`r = 25`):
- **Universal Baseline Body Radius (`r = 25`)**: Perfect circular canvas scaling with Rule 32 coordinate translation contract (`drawPacmanSkin(ctx, fighter)` translates internally).
- **Classic Arcade Yellow Gradient (`#FACC15` to `#F59E0B`)**: Radiant 3D sphere radial gradient mimicking the arcade cabinet artwork.
- **Dynamic Animated Chomp Mouth**:
  - Automatically calculates mouth opening and closing based on movement velocity and animation ticks.
  - Opens cleanly between $0^\circ$ and $45^\circ$ during dot scavenging.
  - In Super Chomp Mode, the mouth expands up to $70^\circ$, revealing menacing white comic teeth (`#FFFFFF` with `#0E0F14` outlines) and a deep crimson throat cavity (`#991B1B`).
- **Outer 4-Neighbor Ink Outline (`#0E0F14`)**:
  - Crisp manga ink outline preserving character silhouette clarity across all background environments.

### 2. Classic Retro Sphere Form (Hands Suppressed)
- In keeping with authentic arcade history, Pac-Man renders as a pure circular yellow sphere with an animated wedge mouth. Hands and weapons are permanently suppressed (`hideHands: true`, `hideWeapon: true`).

### 3. Hair & Head Asset Model Import (Rule 22)
- Asset registered at `Assets/model/pacman/Pacman-hair.png`.
- Eagerly initialized and cached via `_getPacmanHairImage()` and rendered through `_drawPacmanHair(ctx, r, facingLeft)`.

---

## ⚔️ Combat Kit & Skill Overview

### Passive: Pac-Dots (`dots`)
- **Grid Density**: 64 dots across an 8x8 arena tile layout (`getTileGridInfo(arena)`).
- **Standard Pellets (`r = 4`)**: Cream gold `#FFE082` discs with `#D97706` rim.
- **Power Pellets (`r = 8`)**: Four pulsing energizer orbs at tiles `(1,1)`, `(6,1)`, `(1,6)`, and `(6,6)`.
- **Gobble Radius**: Pac-Man automatically ingests dots within `r = 28px`, playing debounced `waka.wav` audio and spawning subtle bite sparks.

### Ultimate: Super Chomp Mode (`chomp_mode`)
- **Trigger Conditions**: Eating any of the 4 big Power Pellets (`dot.isPowerPellet`), OR consuming 100% of arena dots (`dotsEaten >= totalDots`).
- **Duration**: 360 frames (6.0 seconds), refreshed upon eating subsequent Power Pellets.
- **Speed Boost**: +25% movement speed multiplier (`1.25x`).
- **Damage**: Deals **30% of the target's Maximum HP** (`Math.round(opponent.maxHp * 0.30)`) on direct contact.
- **Cooldown**: 45 frames (~0.75s) between consecutive bites.
- **Impact Feedback**: Triggers 4.5 intensity screen shake, 24-frame hit stun, 14-unit knockback impulse, and floating `30% CHOMP!` combat text.
- **Cycle Reset**: Upon timer expiration after all 64 dots are cleared, calls `refillDots(arena)`, repopulating all 64 tiles with fresh dots and playing `refill.wav`.

---

## 📊 HUD Skill Providers & Dark Mode Exception (Rule 18)

| Skill ID | Label | Color | Progression / Range | Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `dots` | `PAC-DOTS` | `#FACC15` | `0% - 100%` (`eaten / total`) | Tracks arena clearing progress. Shows active count e.g. `(64/64)` when finished. |
| `chomp_mode` | `SUPER CHOMP` | `#FACC15` | `0% - 100%` (`timer / 360f`) | Displays remaining empowerment duration drain e.g. `(6.0S)`. Registered in `signatureMap` for Dark Mode exception. |

---

## 🔊 Audio SFX Architecture

All sound assets are located in `Assets/Sound Effects/PacmanSFX/`:
- `waka.wav`: Retro dual-tone rhythmic munch sound played while clearing standard pellets.
- `power_pellet.wav`: Pulsing arcade energizer siren triggered upon collecting corner power pellets or entering Super Chomp Mode.
- `chomp.wav`: Heavy, crunchy cartoon chomp SFX triggered upon biting an enemy.
- `refill.wav`: Melodic ascending arpeggio chime played when arena dots are replenished.

