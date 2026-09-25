# Eye of Cthulhu — Ancient Ocular Horror

**Category:** Boss / Monster / Terraria  
**Identifier:** `eye_of_cthulhu`  
**Color Theme:** Crimson Rose (`#E11D48`) / Iris Cyan (`#06B6D4`) / Tendril Maroon (`#881337`)  
**Role:** Dual-Phase Flying Boss, Minion Swarm Controller, High-Velocity Rushdown Striker  

---

## Lore / Background

*"You feel an evil presence watching you..."*

The Eye of Cthulhu is a massive, disembodied ocular leviathan originating from the nocturnal skies of Terraria. Bound by ancient blood magic and eldritch anatomy, it stalks fighters from above, observing their combat techniques through a hyper-reactive lens before swooping down in relentless ramming attacks. When critically wounded, the eye violently sheds its outer lens and tears its central pupil open into a cavernous, razor-fanged maw—sacrificing all defense in favor of feral, blood-drenched hyper-speed dashes.

---

## Visual Design & Asset Mapping

The Eye of Cthulhu features dynamic multi-phase sprite rasterization with authentic Terraria pixel aesthetics:

```
          [ PHASE 1: OCULAR OVERSEER ]              [ PHASE 2: RAVENOUS MAW ]
             (100% - 50% Health)                       (50% - 0% Health)
                  ╭────────╮                               ╭────────╮
               ╭──│  (⊙)   │──╮                         ╭──│  /▼▼▼\ │──╮
              ~~~~│ (IRIS) │~~~~                       ~~~~│ \▲▲▲/  │~~~~
               ╰──│        │──╯                         ╰──│ (TEETH)│──╯
                  ╰────────╯                               ╰────────╯
             Assets/model/Eye of Cthulhu.png       Assets/model/eye of cthulhu phase 2.png
```

- **Phase 1 Model (`Assets/model/Eye of Cthulhu.png`)**:
  - Image Dimensions: `1774 x 887 px` containing a **6-frame horizontal animation strip**.
  - Animated undulation of trailing crimson optic nerve tendrils and pupil pulsing.
  - Frame sequence loops continuously at 8 ticks per frame (48-tick complete cycle).
- **Phase 2 Model (`Assets/model/eye of cthulhu phase 2.png`)**:
  - Image Dimensions: `1774 x 887 px` containing a **6-frame horizontal animation strip**.
  - Animated biting, fanged maw chomping cycle and undulating inflamed tendons.
  - Frame sequence accelerates to 4 ticks per frame during high-speed chain dashes.
- **Sprite Sheet Geometry & Slicing Matrix**:
  | Frame Index | Phase 1 Bounding Box ($X_{\text{start}}, X_{\text{end}}$) | Phase 2 Bounding Box ($X_{\text{start}}, X_{\text{end}}$) | Frame $Y$ Range | Center Origin $(c_x, c_y)$ |
  |---|---|---|---|---|
  | **Frame 0** | `[16, 285]` ($W = 270\text{px}$) | `[22, 273]` ($W = 252\text{px}$) | `Y: 345 - 544` | Mid-pupil / Center maw |
  | **Frame 1** | `[316, 574]` ($W = 259\text{px}$) | `[310, 567]` ($W = 258\text{px}$) | `Y: 345 - 544` | Mid-pupil / Center maw |
  | **Frame 2** | `[609, 869]` ($W = 261\text{px}$) | `[620, 879]` ($W = 260\text{px}$) | `Y: 345 - 544` | Mid-pupil / Center maw |
  | **Frame 3** | `[904, 1165]` ($W = 262\text{px}$) | `[913, 1174]` ($W = 262\text{px}$) | `Y: 345 - 544` | Mid-pupil / Center maw |
  | **Frame 4** | `[1198, 1456]` ($W = 259\text{px}$) | `[1196, 1460]` ($W = 265\text{px}$) | `Y: 345 - 544` | Mid-pupil / Center maw |
  | **Frame 5** | `[1489, 1757]` ($W = 269\text{px}$) | `[1494, 1749]` ($W = 256\text{px}$) | `Y: 345 - 544` | Mid-pupil / Center maw |
- **Floating Physics & Levitation**:
  - Constant sinusoidal hovering oscillation (`yOffset = Math.sin(frame * 0.06) * 8.0px`).
  - Smooth 360° rotational alignment facing towards the opponent or committed dash direction.

---

## Core Philosophy & Design Challenge

The Eye of Cthulhu represents a classic **dual-phase attrition-to-rushdown archetype**:
1. **Phase 1 (The Overseer - Strategic Zoning & Minion Control)**: Keeps distance, floats across the perimeter, launches projectile spreads, and spawns mini-minion Servants of Cthulhu to distract and pressure enemies.
2. **Phase Transition (HP $\le$ 50%)**: Triggers a global screen rumble, pauses for a 45-frame screech roar, and swaps sprites into Phase 2.
3. **Phase 2 (The Ravenous Maw - Berserk Rushdown & Chain Dashes)**: Stops spawning minions and abandons ranged zoning entirely. Drops defense by 50% while boosting movement speed by 60%, chaining high-velocity zig-zag dashes with bloody needle speed lines.

---

## Baseline Stats

| Attribute | Phase 1 (100% - 50% HP) | Phase 2 (50% - 0% HP) | Notes |
|---|---|---|---|
| **Health (HP)** | 12,000 (Boss) / 480 (Fighter) | Retains Current HP | Dual-phase health progression |
| **Movement Speed** | 4.6 px/frame | 7.8 px/frame | Massive speed surge upon transformation |
| **Defense / DR** | 15% Damage Reduction | -25% Damage Vulnerability | Becomes more fragile in Phase 2 |
| **Collision Radius ($r$)** | 32 px | 36 px | Hitbox expands slightly with open maw |
| **Attack Archetype** | Ranged Zoning + Minion Spawns | Melee Rushdown + Chain Dashes | Distinct playstyle per phase |

---

## Combat Mechanics & Abilities

### Passive: Eldritch Levitation & Dual-Phase Metamorphosis

- **Levitation Hover**: The Eye ignores ground hazards and maintains a smooth floating physics vector with gentle inertia dampening.
- **Phase Metamorphosis (50% HP Threshold)**:
  - When HP drops to or below 50%, the boss enters a **45-frame transformation state**.
  - Emits the iconic **Terraria Boss Roar SFX** and generates an 8px camera trauma screen shake.
  - Replaces texture with Phase 2 fanged maw.
  - Pushes all nearby enemies back with an enrage shockwave ($180\text{px}$ radius).

---

### Phase 1: Abilities & Combat Loop (100% – 50% HP)

#### Passive: Eldritch Flight & Terrain Intangibility
- **Mechanic**: The Eye hovers above and around the player with smooth flight tracking.
- **Terrain Pass-Through**: Completely ignores internal obstacles, walls, and solid blocks (`isGhostTerrain = true`), allowing it to drift and strike freely through any arena geometry.
- **Defense Profile**: Protected by its intact outer lens, granting **Moderate Defense (12 DEF / 15% Damage Reduction)** against all incoming strikes.

#### Combat Loop: Hover, Spawn & Triple Ram Cycle
Phase 1 follows a rhythmic 3-stage combat cycle:
1. **Hover & Tracking Phase (3–4s)**: Drifts into positioning above the target while keeping aim locked with its iris.
2. **Servant Summoning**: Dilates its pupil and spawns **3–4 Servants of Cthulhu** ($r = 10\text{px}$, $120\text{ HP}$) that fly directly at the player. Defeating a Servant drops a restorative health orb ($+80\text{ HP}$).
3. **Telegraphed Triple Ram Sequence**:
   - **Wind-up (24 frames)**: Halts in mid-air, flashes red, and locks onto the player's position.
   - **Charge 1 $\rightarrow$ Charge 2 $\rightarrow$ Charge 3**: Executes **3 rapid sequential ramming dashes** in direct succession (`velocity: 16.0 px/frame`, `damage: 28` per collision).
   - **Recovery Pause (45 frames / 0.75s)**: After the 3rd charge, the Eye enters a momentary fatigue pause, giving the player a dedicated punishment opening before resuming flight.

---

### Phase 2: Abilities & Attacks (50% – 0% HP)

#### Basic Attack: Ravenous Maw Chomp
- **Mechanic**: A rapid forward snapping bite in a $120^\circ$ frontal cone ($70\text{px}$ reach).
- **Damage**: `36 damage`.
- **Status Effect (Bleed)**: Inflicts a 3-second bleed debuff (ticking 15 damage every 30 frames) and cuts enemy healing by 50%.
- **Cooldown**: `24 frames` (~0.4s).

#### Skill 1: Expert Mode Chain Zig-Zag Dashes
- **Mechanic**: Executes a blistering sequence of **4 to 6 rapid micro-dashes** targeting the opponent's predicted movement vectors.
- **VFX & Speed Lines**: Renders 4-point needle speed lines (Rule 16 standard) in Crimson (`#E11D48`) and White Core (`#FFFFFF`) behind the body.
- **Scaling**: Dash speed scales higher as health drops lower (reaching up to `22.0 px/frame` below 15% HP).
- **Cooldown**: `8.0 seconds`.

#### Skill 2: Crimson Roar & Blood Spike Burst
- **Mechanic**: Pauses for 15 frames and screeches, generating a $160\text{px}$ radial shockwave.
- **Spike Burst**: Scatters 12 piercing bone/blood needles radially in $360^\circ$ (`damage: 22` each).
- **Control Effect**: Pushes the opponent back and interrupts non-super-armor channeling.
- **Cooldown**: `14.0 seconds`.

#### Ultimate: True Night Horrors (Blood Moon Surge)
- **Mechanic**: Enters total frenzy for 6 seconds.
- **Effects**:
  - Gaze lights the arena in Blood Moon crimson darkness.
  - Grants 100% immunity to hit-stun and movement-stopping CC.
  - Decreases all dash cooldowns by 50%.
  - Leaves lingering hazardous crimson ichor pools on the arena floor that deal contact burn damage.
- **Cooldown**: `35.0 seconds`.

---

## Special Fighter Interactions & Lore Counters

| Opponent | Interaction Behavior |
|---|---|
| **Satoru Gojo** | Phase 1 minions and Phase 2 dashes halt on contact with Gojo's **Limitless Infinity**. High-speed Phase 2 dashes generate intense barrier spark particles. |
| **Toji Fushiguro** | **Inverted Spear of Heaven (ISOH)** slices through the Eye's charge momentum, knocking it out of dash trajectory and executing Servants in 1 hit. |
| **Lord Escanor** | **Solar Poise** grants Escanor 100% immunity to the Eye's dash pushback. Colliding with Escanor causes the Eye to bounce backward off his physical frame! |
| **Ryomen Sukuna** | **Cleave / Dismantle** instantly vaporizes approaching Servants into crimson mist; *Malevolent Shrine* continuously shreds the Eye's large hitbox. |
| **Zenitsu Agatsuma** | **Thunderclap and Flash** dashes directly through the Eye during its ram attack, triggering a slow-motion clash spark. |

---

## Technical & Architecture Standards

1. **Config-Driven Stats**: All attributes, damage values, minion health caps, and dash speeds configured cleanly in `js/configs/bosses/eyeOfCthulhuBossConfig.js` and `js/configs/characters/eyeOfCthulhuConfig.js`.
2. **Transform Stack Integrity**: All PNG rendering in `js/graphics/fighters/eyeOfCthulhuSkin.js` strictly encapsulates `ctx.save()` / `ctx.restore()` ensuring stack depth is always 0.
3. **Zero `shadowBlur`**: Glowing crimson auras and ocular gazes rendered via layered transparent concentric arcs and gradient meshes.
4. **Committed 360° Ramming Angles**: Directional charges snapshot target angle at wind-up and lock facing rotation throughout dash execution.
