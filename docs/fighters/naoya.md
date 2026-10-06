# Naoya — The Projection Sorcery Prodigy

**Category:** Anime & Jujutsu Sorcerers  
**Theme Color:** Electric Lime / Pale Gold (`#76E042` / `#C8E64A`)  
**Secondary Accents:** Film Strip Ink Black (`#12141A`), Shutter Cyan (`#00F2FE`)  
**Role:** Hypersonic Speedster, Stasis-Lock Combo Assassin, Precision Frame-Trapper  

---

## 📖 Lore & Character Philosophy

Naoya Zenin is the arrogant, elitist leader of the Hei—the Zenin Clan’s premier squad of jujutsu sorcerers. Obsessed with speed, lineage, and standing alongside Satoru Gojo and Toji Fushiguro at the pinnacle of sorcery, Naoya views anyone unable to keep up with his pace as completely unworthy of existing.

In *Circle Mini-Battle*, Naoya embodies relentless kinetic acceleration and spatial manipulation through **Projection Sorcery**. By dividing every second into 24 distinct frames and strictly choreographing his trajectory, Naoya accelerates to blinding supersonic speeds while trapping opponents who fail to adapt inside frozen 24 FPS film frames.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Naoya's model, hair, face, and traditional Zenin attire strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - Light blonde dyed hair with distinctive black/dark-tipped undercut roots and sharp side strands.
  - Distinctive Zenin ear piercings (3 discrete studs along left earlobe).
  - High-collar kimono contour with sharp jawline shadow (Strict Rule 18 Faceless Minimalist Aesthetic: zero eyes, nose, or mouth rendered).
- **Attire & Uniform (`+Y`)**:
  - Traditional dark charcoal/slate-black Zenin clan Haori over a pale sage-green under-kimono.
  - Wide obi sash tied tightly at `y = +r * 0.65` in deep obsidian ink.
  - Hakama pleated trousers flowing downward to `+r * 1.05`.
- **Default Symmetrical Hands (Rule 20)**:
  - **Left Hand**: `(x: -r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`.
  - **Right Hand**: `(x: +r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30` gripping the concealed cursed tanto hilt.
  - Rendered on the front layer overlapping the lower body perimeter.
  - Supports `state.showSkinOnly` toggle.

### 2. 24-Frame Shutter Glass & Film Strip Visuals
- **24 FPS Cell Overlay & Pre-Break Cracks**:
  - Targets afflicted with Frame Freeze are enveloped inside an oscillating, semi-transparent 24 FPS cel pane (`rgba(118, 224, 66, 0.25)` to `rgba(0, 242, 254, 0.45)`).
  - Features 35mm film reel perforations along the left and right borders with an active countdown timer indicator (`'1/24s'`, `'24 FPS STASIS'`).
  - **Structural Stress Cracks**: When the freeze duration enters its final 14 frames, jagged spiderweb fracture fissures propagate from the center out towards the perimeter accompanied by high-frequency micro-tremor shudder.
- **Glass Break Animation & Authentic SFX**:
  - Upon timer expiration (or when stasis is broken early by Mach 3 collision or finisher), the shutter glass violently shatters!
  - **Exploding Shards**: Spawns 4 distinct 35mm corner frame fragments with sprocket holes, 16 sharp polygonal translucent cyan/lime crystal shards with white razor edges and dark manga ink borders, and an expanding rectangular shockwave pulse.
  - **Audio & Impact**: Plays authentic glass shatter audio (`Assets/Sound Effects/NaoyaSFX/Naoya_glass_break.mp3`), screen shake (`triggerGlobalScreenShake`), cyan impact flash, and `'24 FPS SHATTER!'` floating combat text.
- **Sonic Boom Shockwave Rings**:
  - Expanding concentric shockwave polygons with zero `shadowBlur` (Rule 11) using gradient falloffs when breaking Mach thresholds.

### 3. Crescent Slash & Kinetic Thrust (Rule 15 Standard)
- **Tanto Draw & Palm Strike Arcs**:
  - Double-tapered golden-lime crescent arcs (`#76E042` outer glow, `#FFFFFF` core cutting line) with 140° frontal coverage.
  - Recovery Phase Eraser Wipe erases crescent geometry cleanly from trailing tail to leading tip.

### 4. Manga Action Speed Lines (Rule 16 Standard)
- **Needle Geometry**: 4-point filled needle polygons trailing directly opposite to his velocity vector (`-cos(gunAngle)`, `-sin(gunAngle)`).
- **4-Slot Color Theme**: Electric Lime (`#76E042`), Shutter Cyan (`#00F2FE`), Pure White Core (`#FFFFFF`), Dark Film Ink (`#0E1015`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Top Speed (Mach 1+) | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `380` | `380` | Fast, lightweight assassin health pool |
| **Base Speed** | `2.85` | `5.70` (`+100%`) | Base velocity escalates with 24-Frame Stacks |
| **Body Radius** | `24px` | `24px` | Standard compact agile hitbox |
| **Melee Reach** | `68px` | `85px` | Extended lunging palm and knife reach |
| **Damage Mitigation** | `0%` | `10%` | Evasion wind buffer at top speed |
| **Acceleration Ramp** | `+0.25 / sec` | Max 8 Stacks | Stacks grant speed, crit rate, and push power |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🎞️ Innate Technique: Projection Sorcery (*Tōei Juhō*)
Naoya continuously accelerates and slips through enemy attacks as he strikes opponents, building permanent 24-FPS momentum and evasion with every hit:

* **Permanent Speed & Evade Stacking on Damage**:
  - Every time Naoya damages an enemy with skills or flurry strikes, he gains **+1 Frame Stack** (capped at **maxFrameStacks** total, with a configurable limit of **4 stacks per flurry** via `CONFIG.naoya.maxStacksPerFlurry`).
  - Each stack permanently increases his movement speed by **+0.50** and grants **+4% Evade Chance** (scaling from 5% base up to a 70% cap).
  - Successfully dodging enemy attacks triggers a **"24 FPS DODGE!"** kinetic shutter reaction with cyan spark trails.
  - At **5+ Stacks**, Naoya unlocks **Subsonic Overdrive**: gains cascading ghost afterimages and manga needle speed lines.
* **Forward Frame Stepping**:
  - A 24-FPS ghost projection frame constantly spawns just ahead of Naoya's movement trajectory.
  - Stepping onto the ahead frame triggers a shutter pop visual burst while the stepped frame smoothly dissolves behind him.

---

### 2. 🪟 24-Frame Palm Touch: Frame Freeze Stasis (*Koma-Furi*)
Touching an enemy during active Projection Sorcery forces them to abide by the 24 FPS rule:

* **Frame Stasis Application**:
  - Basic attack combos and **Skill 1 (Frame Blitz)** apply 1 count of **Frame Disruption**.
  - At 3 disruptions OR upon direct palm impact during Mach speed, the enemy fails the 24 FPS constraint and is locked inside a **24 FPS Film Frame** for **1.0 second** (`60 frames`).
  - **Internal Cooldown**: `4.0 seconds` (`240 frames` via `CONFIG.naoya.frameFreezeCooldown`) prevents perma-freezing enemies from continuous basic attacks.
* **Vulnerability Window**:
  - Frozen targets are completely immobilized and take **+30% bonus True Damage** from Naoya's follow-up strikes.
  - Striking a frozen target shatters the film frame with a glassy acoustic burst, dealing bonus shatter AOE damage.

---

## ⚔️ Abilities & Moveset

### 🗡️ Primary Attack: Concealed Tanto & Palm Flurry
* **Type**: High-Speed Multi-Target Frontal Arc Melee (Rule 1.6 Compliant)
* **Damage**: `18 / 22 / 28 Damage` (3-Hit Chain) / `45 True Damage` on Frame-Frozen targets
* **Cooldown**: `38 frames` (~0.63s)
* **Arc & Range**: `135°` frontal arc cone with `68px` reach.
* **Mechanics**:
  - Rapidly strikes with alternating open-palm thrusts and a reverse-grip concealed cursed tanto.
  - Third strike delivers a forward lunging palm slap that knocks opponents backward and builds +2 Frame Stacks.

---

### ⚡ Skill 1: Frame Blitz / 24-Point Accel (*Nijūyon Koma Senkō*)
* **Type**: Omnidirectional Supersonic Dash & Frame Stasis Tag
* **Cooldown**: `5.5 seconds` (`330 frames`)
* **Damage**: `35 Kinetic Slash Damage`
* **Travel Range**: `240px` in `12 frames`
* **Mechanics**:
  - Naoya traces a geometric 3-segment zigzag path, blitzing through opponents along his committed 360° cast angle.
  - Bypasses projectile barriers and applies **Instant 1.0s Frame Freeze** to the first enemy struck.
  - Spawns a trail of 35mm film negative particle effects and dense needle speed lines behind his flight path.
  - Resets basic attack cooldown immediately upon landing.

---

### 💥 Skill 2: Sonic Boom Rebound / Shockwave Kick (*Onpoku Kyaku*)
* **Type**: Wall-Bounce Kinetic Repulsion & Sonic Shockwave
* **Cooldown**: `8.0 seconds` (`480 frames`)
* **Damage**: `42 Physical Damage` + `25 Wall Impact True Damage`
* **Radius**: `160px` shockwave cone
* **Mechanics**:
  - Naoya leaps off the floor or rebounds off the nearest arena boundary with explosive kinetic force, delivering an overhead flying thrust kick.
  - Sends the target flying into the arena wall with **Kinetic Wall Ricochet**, applying a **50% Movement Slow for 1.8s**.
  - Emits a circular sonic boom ring that clears enemy small projectiles (daggers, kunai, bullets, bone shards) within 160px.

---

### 🪟💥 Ultimate: 24 FPS Mach 3 Runway Breach (*Out-of-Bounds Acceleration & Sonic Shatter*)
* **Type**: Cinematic Out-of-Bounds Runway Orbit & Mach 3 Inbound Supersonic Breach
* **Cooldown**: `24.0 seconds` (`1440 frames`)
* **Total True Damage**: `75 True Damage`
* **Execution Sequence (Rule 1.5 Compliant — Attacker updates freely while target is placed in hit-pause)**:
  1. **Phase 1: Out-of-Bounds Perimeter Orbit**:
     - Locks the target inside a 24-frame stasis time-stop cel.
     - Naoya blurs outside the arena boundaries (+42px outer margin), treating the outer courtyard perimeter as his personal supersonic runway.
     - Sprints around the outer arena perimeter for 2 full revolutions, spawning glowing cyan/lime 24-FPS frame tick marks and supersonic corner shockwaves.
  2. **Phase 2: Aim Lock & Needle Telegraph**:
     - Naoya halts at his outer breach vantage point.
     - Traces a committed 4-point manga needle targeting line and `[ 24 FPS MACH 3 ]` lock box straight through the target.
  3. **Phase 3: Mach 3 Supersonic Breach (Finisher)**:
     - Naoya bursts straight through the arena wall at Mach 3, smashing directly into the opponent with an explosive sonic-boom piercing thrust (`75 True Damage`).
     - Smashes the opponent across the arena into a heavy wall-bounce rebound, safely re-anchoring Naoya within the arena bounds.

---

## 🎯 Matchup Dynamics & Synergies

| Opponent | Unique Interaction |
| :--- | :--- |
| **vs Satoru Gojo** | **Limitless Barrier Interaction (Rule 1.7)**: Naoya cannot touch Gojo directly through Infinity; however, top-speed Sonic Boom Shockwaves can push Gojo and force barrier energy drain. |
| **vs Toji Fushiguro** | **Zenin Clan Complex**: Naoya's Frame Stacks build 50% faster against Toji, but Toji's Heavenly Restriction bypasses Frame Stasis duration (reduces freeze to 0.35s). |
| **vs Kento Nanami** | **Speed vs Ratio**: Nanami's 7:3 Ratio can catch Naoya during his trajectory stumble; however, Naoya's Mach speed makes him difficult for Nanami to measure. |
| **vs Yuji Itadori / Todo** | **Swapping & Divergent Fist**: Todo's Boogie Woogie forces Naoya to break his predetermined 24-frame trajectory, causing an instant trajectory violation stumble. |
| **vs Mahito** | **Soul Frame Encapsulation**: 24 FPS Frame Freeze halts Mahito's idle transfiguration morphing for the full duration of the freeze. |

---

## 🔊 Sound Design & Audio Mapping

| Combat Event | Sound Effect Path | Volume / Speed |
| :--- | :--- | :--- |
| **Tanto Swing / Basic Attack** | `Assets/Sound Effects/Attacks/swordswing.mp3` | `0.90 Vol` / `1.15x` |
| **Flurry Knife Takeoff / Unsheathe** | `Assets/Sound Effects/NaoyaSFX/Naoya_takeoff_knife.mp3` | `1.05 Vol` / `1.00x` |
| **Final Strike Knife Stab** | `Assets/Sound Effects/NaoyaSFX/Naoya_stabs.mp3` | `1.20 Vol` / `1.00x` |
| **Frame Freeze Stasis Lock** | `Assets/Sound Effects/Skills/enhance.mp3` | `1.10 Vol` / `1.30x` |
| **Frame Blitz Supersonic Dash** | `Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3` | `1.15 Vol` / `1.25x` |
| **Sonic Boom Shockwave Kick** | `Assets/Sound Effects/Attacks/groundSmash.mp3` | `1.20 Vol` / `1.10x` |
| **Ultimate 5-Angle Flurry Hits** | `Assets/Sound Effects/Skills/toji-2stseq-2ndweaponAttack.mp3` | `1.25 Vol` / `1.20x` |
| **Mach 3 Glass Shatter Finisher** | `Assets/Sound Effects/NaoyaSFX/Naoya_glass_break.mp3` | `1.35 Vol` / `1.05x` |

---

## 📁 Source Code & Component Map (Target Implementation)

| System / Component | Target File Path |
| :--- | :--- |
| **Fighter Entity & Combat Engine** | [`js/entities/fighters/NaoyaFighter.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/entities/fighters/NaoyaFighter.js) |
| **Fighter Configuration** | [`js/configs/characters/naoyaConfig.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/configs/characters/naoyaConfig.js) |
| **Skin & Hair Pixel Art Renderer** | [`js/graphics/fighters/naoyaSkin.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/fighters/naoyaSkin.js) |
| **Tanto & 24 FPS Frame Visuals** | [`js/graphics/weapons/naoyaWeaponGraphics.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/graphics/weapons/naoyaWeaponGraphics.js) |
| **Fighter Registry Integration** | [`js/entities/fighterFactory.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/entities/fighterFactory.js) |
| **Selection Card & UI Registry** | [`js/ui/fighterSelection.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/ui/fighterSelection.js) |
