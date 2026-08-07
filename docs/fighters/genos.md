# Genos — The Demon Cyborg

**Category:** Anime  
**Color:** Incineration Orange (`#FF5500`) / Cybernetic Dark Charcoal (`#2B2B2B`)  
**Role:** High Mobility Ranged Blaster, Flame-Infused Brawler  

---

## Lore / Background

Genos is a 19-year-old cyborg and a self-proclaimed disciple of Saitama. Driven by a desire for vengeance against the mad cyborg who destroyed his hometown and killed his family, he constantly seeks upgrades to achieve absolute justice. Despite his serious and analytical nature, he is often relegated to a comedic straight-man role in OPM, writing down Saitama's every mundane word as profound wisdom. In the Circle Mini-Battle arena, Genos utilizes his highly advanced core and thruster-powered weaponry to lay waste to his enemies.

---

## Visual Design

- **Body Color:** Cybernetic Dark Charcoal (`#2B2B2B`) core circle with metallic silver accents.
- **Chest Core:** A glowing circular energy core at the center of his body. The core pulses with orange and yellow hues (`#FF7700` to `#FFD700`).
- **Hair:** Spiky blonde hair accents drawn as sharp triangular polygons bordering the top and sides of his circular body.
- **Eyes:** Dark black sclera with glowing yellow-orange pupils.
- **Arms:** High-tech mechanical arms with visible orange energy lines running down to his palms.
- **Movement / Thruster Effects:** When moving or dashing, Genos emits bright orange fire sparks and small grey smoke puffs from his back/shoulders, simulating thruster boosts.
- **Pose (Idle):** A combat-ready stance, facing the target with mechanical arms raised slightly and chest core pulsing.

---

## Core Philosophy & Design Challenge

Genos is designed to be a high-performance glass cannon.
- **Zoning vs. Close Combat**: He can fire explosive basic attacks from afar but has access to an explosive dash and a rapid martial arts flurry to handle close-range threats.
- **Defeat Penalty / Self-Destruct Threat**: Unlike other fighters who simply disappear when defeated, Genos enters a core overload phase upon fatal damage, forcing the enemy to either run away or take catastrophic damage from his self-destruction.
- **High Mobility, Lower Survivability**: Genos has very high movement speed and dash capabilities but has lower base health (`320 HP`) to balance his extreme offensive potential.

---

## Stats (Baseline)

| Stat | Value | Notes |
|---|---|---|
| HP | 320 | Lower than typical brawlers (e.g. Saitama's 420, Yuji's 380) |
| Speed | 5.2 | Fast baseline movement, augmented by thrusters |
| Attack Range | Ranged / Melee | Basic: 350px ranged blasts; Skill 1: 65px melee flurries |
| Armor / DR | 0% | Standard damage reception |

---

## Abilities

### Passive: Core Overdrive (Self-Destruct)

Genos's core acts as a final fail-safe.
- **Mechanic**: Upon taking fatal damage (HP hits 0), Genos does not immediately die. He becomes completely immune to further damage and CC, stops moving, and triggers a **2.5-second self-destruct sequence**.
- **Visuals**: A red floating `OVERLOAD` text appears above his head. His chest core rapidly flashes between bright yellow and warning red (`#FF0000`). Large orange/red warning circles pulse outward to indicate the blast area.
- **Explosion**: At the end of the 2.5s timer, Genos explodes in a **200px radius**. The explosion deals **250 True Damage** to all enemies (fighters and illusions, Rule #6 compliant) and deletes all active projectiles within the blast zone.
- **Aftermath**: Once the explosion completes, Genos is removed from play.

---

### Basic Attack: Incineration Palms

Genos fires rapid, explosive fire blasts from his palm ports.
- **Mechanic**: Fires a fire blast projectile in his facing direction.
- **Projectile Stats**: Travels at speed `14` up to a maximum range of `350px`.
- **Explosive Impact**: On collision with any enemy, wall, or at the end of its range, the projectile explodes in a **35px radius** AOE.
- **Damage**: The explosion deals **14 damage** to all targets caught in it.
- **Cooldown**: 27 frames (~0.45 seconds).
- **Visual**: A bright orange fire orb with a tiny trail of fire particles. On impact, creates a small fiery ring that decays in 10 frames. No CPU `shadowBlur` is used.

---

### Skill 1: Machine Gun Blows

A blistering flurry of thruster-powered punches.
- **Activation**: Genos dashes/blinks to the nearest enemy and unleashes a rapid punch sequence.
- **Mechanic**: Genos unleashes **8 rapid punches** in a **90-degree frontal arc, 65px reach** over 1.2 seconds.
- **Damage**: Deals **10 damage** per punch (80 total if all connect).
- **Target Pause (Rule #5 Compliant)**: Applying hit-pause to the target is mandatory. Each punch applies a short duration (10 frames) of hit-pause to the target(s) hit. Genos himself **must never** have `applyTimeStop` called on him during this flurry.
- **Knockback**: Each punch applies a tiny knockback force to keep targets in the punch zone; the final punch triggers a slightly larger knockback.
- **Cooldown**: 8 seconds.
- **Visuals**: Left and right fists alternate rapidly (both hands remain visible, keeping `hideFrontHand = false` and `hideBackHand = false` as per Rule #2). Small orange fire flares spark behind his elbows.

---

### Skill 2: Rocket Stomp & Dash

Thruster-powered mobility and ground slam.
- **Mechanic**: Genos charges forward in his current facing direction (aiming at the target) for a distance of **200px** in 18 frames (0.3s).
- **Slam Damage**: At the end of the dash (or upon colliding with an enemy), Genos slams the ground, dealing **30 damage** to all enemies in a **75px radius**.
- **Knockback**: Targets hit by the stomp are knocked back significantly away from the slam center.
- **Cooldown**: 6 seconds.
- **Visuals**: A bright orange fire trail follows Genos during the dash, and the stomp produces a circular shockwave of dirt and flame particles.

---

### Ultimate: Spiral Incineration Cannon

Genos locks onto his target, combines his arm cannons, and fires his maximum power incinerating beam.
- **Cooldown**: 28 seconds.
- **Phase 1 — Charge Wind-up (1.0 second / 60 frames)**:
  - Genos stands completely still and aims towards the target.
  - A bright orange warning targeting line projects from Genos to the edge of the arena.
  - His chest core glows with blinding orange light, pulling in ambient fire particles.
- **Phase 2 — Fire Beam (2.0 seconds / 120 frames)**:
  - Genos fires a massive continuous laser-like orange beam (width: **70px**, length: **600px**).
  - The beam pierces all enemies (fighters & illusions) and deletes any enemy projectiles in its path.
  - **Damage**: Deals **15 damage** every 6 frames (total 20 ticks = **300 damage**).
  - **Knockback**: Constantly pushes enemies away from Genos along the beam's vector.
  - **WebGL Optimization (Rule #10 & Rule #11)**: To preserve 60 FPS performance, the beam is rendered as a WebGL-hybrid sprite with additive blend mode (`window.PIXI.BLEND_MODES.ADD`). No CPU `shadowBlur` filters are used.

---

## Special Interaction Table

| Target / Interaction | Effect |
|---|---|
| Gojo (Limitless Infinity) | Gojo's Infinity freezes Genos's basic fire orbs and Rocket Dash. However, during the ultimate **Spiral Incineration Cannon**, the continuous heat and pressure drain Gojo's infinity gauge twice as fast. |
| Mahoraga (Adaptation) | Mahoraga adapts to fire damage after being hit 3 times. Once adapted, all fire damage from Genos is reduced by 50%. |
| Toji Fushiguro | Toji can dodge through the basic fire blast explosion using his high agility. Genos's self-destruct explosion ignores Toji's invulnerability frames. |
| Projectiles | Genos's Ultimate and Passive Explosion completely delete all projectiles caught in their radius. |

---

## AI Behavior Notes

- **Distance Management**: Genos's AI prefers to stay at a range of 250px - 300px, firing his basic Incineration Palms.
- **Skill 1 Priority**: If an enemy gets closer than 100px, Genos will prioritize firing **Machine Gun Blows** to deal high damage and push them back.
- **Skill 2 Priority**: Used to reposition, either chasing an opponent who is low on health, or escaping when cornered.
- **Ultimate Priority**: Fired when the target is at medium range, especially when the target's movement is restricted (stunned or cornered).
- **Core Overdrive**: When HP reaches 0, the AI shuts down, and the self-destruct stasis begins.

---

## Sound Design

| Event | Audio Direction |
|---|---|
| Basic Incinerate | Medium explosive blast sound |
| Machine Gun Blows | Rapid metal-striking-flesh sounds with jet engine hiss |
| Rocket Dash & Stomp | High-pitched booster hiss followed by a heavy concrete crunch |
| Ultimate Wind-up | High-frequency charging/whining energy sound |
| Ultimate Beam | Continuous roaring fiery explosion/rocket launch noise |
| Self-Destruct Countdown | Fast beeping warning siren |
| Self-Destruct Explosion | Massive thunderous detonation |

---

## Implementation Notes

- **File**: `js/entities/fighters/GenosFighter.js`
- **Skin File**: `js/graphics/fighters/genosSkin.js`
- **Config File**: `js/configs/characters/genosConfig.js`
- **Character ID**: `genos`
- **Extends**: Base `Fighter` class
- **Freeze Guard (Rule #1)**: Must call `_handleTimeStop()` at the beginning of the `update()` loop.
- **Hand Rendering (Rule #2)**: Keep front and back hands visible during flurry attacks, drawing mechanical arms extending dynamically.
- **Target Scanning (Rule #6)**: All AOE checks must scan `state.fighters` and `state.illusions`.
- **Renderer Performance (Rule #10, #11, #12)**: The ultimate beam and self-destruct warnings must avoid CPU `shadowBlur` and use clean gradients or Pixi WebGL layers.
