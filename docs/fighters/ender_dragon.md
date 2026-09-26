# Ender Dragon — Ruler of The End

**Category:** Boss / Monster / Minecraft  
**Identifier:** `ender_dragon`  
**Color Theme:** Obsidian Charcoal (`#18181B`) / Void Magenta (`#C026D3`) / Acid Breath Purple (`#A21CAF`) / End Light White (`#F5D0FE`)  
**Role:** Flying Void Boss, Aerial Kinematics Rushdown, Lingering Acid Zoning  

---

## Lore / Background

*"The End is Near..."*

Dwelling at the apex of the desolate End dimension, the Ender Dragon is the sovereign titanic draconic leviathan born from ancient void energy and bedrock magic. Encased in midnight obsidian scales with glowing amethyst eyes, she commands the airspace with colossal flapping wings capable of batting opponents across the void. From her jaws spews lethal purple Dragon's Breath—an acidic vapor that coats the battlefield in lingering hazardous residue. When threatened, the dragon ascends to the center perch, channeling dark void lightning and unleashing expansive cataclysmic shockwaves that warp the fabric of reality.

---

## Visual Design & Asset Mapping

The Ender Dragon employs the authentic Circle Mini-Battle upright minimalist circle fighter standard combined with high-frame draconic wings animation:

```
               [ ANIMATED WINGS LAYER ]                  [ OBSIDIAN CIRCLE BODY ]
          (Dragon-wings-sprite-sheet.png)               (Upright Faceless Minimalist)
                   ╭────────────╮                              ╭────────────╮
                ╭──│  /\    /\  │──╮                        ╭──│  /\    /\  │──╮
              <<===│ (  WINGS ) │===>>                    <<===│ ( VOID CORE ) │===>>
                ╰──│   \____/   │──╯                        ╰──│   \____/   │──╯
                   ╰────────────╯                              ╰────────────╯
             Assets/model/Sprites/Dragon-wings-*            Upright Obsidian & Amethyst
```

### Visual Assets & Layering Architecture
- **Animated Dragon Wings Sheet (`Assets/model/Sprites/Dragon-wings-sprite-sheet.png`)**:
  - Image Dimensions: `1536 x 1024 px` containing a **6-frame 2x3 animation grid** (`512 x 512 px` per cell).
  - Clean alpha transparency with an open center matching the circle fighter body.
  - Flaps continuously behind the circle body in 6 fluid animation phases:
    - **Frame 0 [R0C0]**: Peak upstroke.
    - **Frame 1 [R0C1]**: Mid downstroke.
    - **Frame 2 [R0C2]**: Full downstroke bottom.
    - **Frame 3 [R1C0]**: Bottom rising.
    - **Frame 4 [R1C1]**: Mid upstroke.
    - **Frame 5 [R1C2]**: Cresting upstroke.
- **Upright Minimalist Circle Body (Radius $r = 36\text{px}$)**:
  - **Swept-Back Twin Dragon Horns**: Obsidian draconic horns extending at the crown ($-Y$) with glowing amethyst tips (`#D946EF`, `#F5D0FE`).
  - **Metallic Silver Dorsal Spine Ridges**: Stepped central spine plates (`#A1A1AA`, `#E4E4E7`).
  - **Faceless Minimalist Amethyst Brow Visor**: Radiant purple eye slits (`#D946EF`, `#F5D0FE`) adhering strictly to Rule 19 (no pupils, sclera, or mouth).
  - **Ender Heart Crystal Core**: Pulsating void crystal core on the lower chest ($+Y$).
  - **Layering Order**: Back Hand Claws $\to$ Animated Wings Sheet $\to$ Obsidian Circle Body $\to$ Front Hand Guard $\to$ Status Overlays.
- **Disintegration Death Sequences (`Assets/model/Sprites/Ender-dragon-Disintegration-Sequence.png` & `Sequence2.png`)**:
  - Image Dimensions: `1536 x 1024 px` each (2x3 grid, 6 frames each).
  - Authentic Minecraft death animation: The dragon halts in mid-air, ascends, and emits piercing shafts of purple/white radiant light through its torso and wings before exploding into void soul particles.

---

## Baseline Stats

| Attribute | Fighter Mode (1v1 / Standard) | Boss Mode (Raid Boss) | Notes |
|---|---|---|---|
| **Health (HP)** | 520 HP | 1,200 HP | High durability draconic health pool |
| **Movement Speed** | 4.4 px/frame | 5.2 px/frame | Smooth aerial acceleration with inertia |
| **Collision Radius ($r$)** | 36 px | 48 px | Scaled up for Boss Mode encounter |
| **Knockback Resistance** | 100% Poise Immunity | 100% Poise Immunity | Immune to normal flinch and bullet knockback |
| **Terrain Navigation** | Intangible (`isGhostTerrain`) | Intangible (`isGhostTerrain`) | Flies effortlessly through walls and arena obstacles |
| **Attack Archetype** | Aerial Rushdown & Acid Zoning | Aerial Raid Boss | High kinetic displacement and lingering hazards |

---

## Combat Mechanics & Abilities

### Passive: Void Levitation & Unyielding Poise
- **Terrain Intangibility**:
  - As a flying draconic leviathan, the Ender Dragon completely ignores all solid blocks, obstacles, and interior arena walls (`this.isGhostTerrain = true`), drifting and swooping freely across all arenas.
- **Unyielding Boss Poise**:
  - 100% immune to being flinched, stunned, or pushed back by standard bullet strikes, explosions, and melee combos (`knockbackVx = 0, knockbackVy = 0`).
  - **Vulnerability Exception**: Remains susceptible to gravitational black holes and continuous suction beams (e.g. Gojo's *Hollow Purple* / *Lapse Blue*, Escanor's *Cruel Sun*, Yuta's *Pure Love Beam*).
- **Unified Dynamic Flight**:
  - Employs a dedicated 6-frame flapping animation cycle using `Assets/model/Sprites/Ender-dragon-model-sprite-sheet.png` for all movement in any direction.
  - Dynamically flips horizontally with `ctx.scale(-1, 1)` when facing/moving left and applies subtle clamped banking tilt ($\pm 12^\circ$), guaranteeing the dragon is never rendered upside down.

---

### Skill 1: Dragon's Breath / Void Fireball (`dragonsBreath`)
- **Cooldown**: 480 frames (~8.0s)
- **Mechanics**:
  - The Ender Dragon rears back and launches an explosive purple Dragon Fireball traveling at `9.0 px/frame` along committed 360° aim angle.
  - On collision with an opponent or upon reaching max range, the fireball detonates with an area-of-effect impact (70px radius) dealing 28 impact damage.
  - **Lingering Acid Pool**: Spawns a glowing purple pool of Dragon's Breath on the ground that lingers for 180 frames (3.0s). Any enemy standing within the vapor pool suffers continuous acid damage (6 damage every 15 frames) and 25% movement slow.

---

### Skill 2: Wing Buffet / Kinetic Swoop (`wingBuffet`)
- **Cooldown**: 540 frames (~9.0s)
- **Mechanics**:
  - The Ender Dragon violently beats her wings, generating a sonic shockwave, and accelerates into a ferocious high-velocity swoop dash (`18.5 px/frame` for 18 frames).
  - Opponents caught in the dragon's frontal collision arc (120° arc, 80px reach) take 38 kinetic damage and are launched with massive knockback impulse (`20.0 px/frame`).
  - Provides brief super-armor during the flight rush.

---

### Skill 3 / Ultimate: Void Cataclysm & Perch (`voidCataclysm`)
- **Cooldown**: 1,100 frames (~18.3s)
- **Mechanics**:
  - The Ender Dragon halts in mid-air, ascending slightly into a perching stance for a 70-frame channeling window.
  - Purple void lightning arcs across her obsidian wings while ambient floor light darkens.
  - **The Roar**: At frame 40, she emits the legendary Ender Dragon roar, triggering a 12px camera trauma screen shake.
  - **Void Burst**: Releases an expansive 360° radial shockwave (220px radius) dealing 65 damage and launching all nearby enemies away.
  - Simultaneously discharges 6 homing void fireballs in an outward spiral that curve toward surviving opponents.

---

## Special Fighter Interactions & Lore Counters

| Opponent | Interaction Behavior |
|---|---|
| **Satoru Gojo** | The Dragon's physical swoops and fireballs halt upon contact with **Limitless Infinity**. However, the lingering Dragon Breath acid cloud bypasses standard collision by damaging entities standing within the ambient vapor volume! |
| **Lord Escanor** | When the dragon swoops into Escanor during **Solar Poise**, Escanor remains rooted while the dragon's kinetic force deflects off his golden frame. |
| **Toji Fushiguro** | **Inverted Spear of Heaven (ISOH)** slices through Dragon Fireballs, nullifying the projectile before it can deploy its lingering acid cloud. |
| **Ryomen Sukuna** | Sukuna's **Dismantle** slices through the dragon's massive hitbox; during *Malevolent Shrine*, the dragon's flight speed is slightly slowed by the unrelenting rain of slashes. |
| **Zenitsu Agatsuma** | **Thunderclap and Flash** can pierce through the dragon mid-swoop, triggering an electric clash impact. |

---

## Audio & SFX Configuration

All sound effects, audio paths, and playback volumes are strictly configured in [`enderDragonConfig.js`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/js/configs/characters/enderDragonConfig.js):

| Key | File Path | Default Vol | Usage / Event |
|---|---|---|---|
| `roar` | `Assets/Sound Effects/Skills/ragescream.mp3` | `1.00` | Void Cataclysm ultimate roar & boss entrance |
| `fireball` | `Assets/Sound Effects/Skills/redblast.mp3` | `0.85` | Dragon Fireball launch |
| `fireballImpact` | `Assets/Sound Effects/Skills/purpledeploy.mp3` | `0.90` | Fireball detonation & acid pool deployment |
| `wingFlap` | `Assets/Sound Effects/Skills/woosh.mp3` | `0.65` | Wing flap acoustic sweep |
| `swoop` | `Assets/Sound Effects/Skills/dash2.mp3` | `0.90` | Wing Buffet high-speed rushdown |
| `swoopHit` | `Assets/Sound Effects/Attacks/heavypunch1.mp3` | `0.95` | Heavy kinetic collision on opponent |
| `acidTick` | `Assets/Sound Effects/Attacks/fleshhit.mp3` | `0.50` | Lingering Dragon Breath acid tick |
| `lightning` | `Assets/Sound Effects/Skills/thunderstrike.mp3` | `0.85` | Void Cataclysm charging arc |
| `disintegration` | `Assets/Sound Effects/Skills/purpledeploy.mp3` | `1.00` | Defeat sequence void beam explosion |

---

## Technical & Architecture Standards

1. **Config-Driven Architecture**: All stats, timers, reach limits, cooldowns, sound paths, and volumes derive from `js/configs/characters/enderDragonConfig.js` and `js/configs/bosses/enderDragonBossConfig.js`.
2. **Transform Stack Integrity**: All PNG rendering in `js/graphics/fighters/enderDragonSkin.js` strictly encapsulates `ctx.save()` and `ctx.restore()` ensuring canvas stack depth is strictly 0.
3. **Zero `shadowBlur`**: Void amethyst energy fields and acid vapors are rendered using layered semi-transparent concentric arcs and gradient meshes.
4. **Committed 360° Aim**: Dragon's Breath and Wing Buffet commit to target angle upon initiation and disable tracking during execution.
