# P.E.K.K.A (Clash of Clans & Clash Royale) — Fighter Guide

**Identity & Archetype:** Heavy Armored Juggernaut / Brawler  
**Category:** Gaming  
**Theme Color:** `#8B5CF6` (Electric Indigo / Heavy Violet Armor)  
**Secondary Color:** `#06B6D4` (Radiant Cyan / Visor & Horn Glow)  
**Accent Color:** `#22D3EE` (Power Core Cyan)  
**Iconic Quote:** *"BUTTERFLY!"*

---

## 🤖 Lore & Overview
P.E.K.K.A is the iconic, heavily armored robotic warrior from *Clash of Clans* and *Clash Royale*. Encased in impenetrable dark violet steel plating and sporting radiant curved horns, she strides into battle wielding a colossal greatsword with catastrophic striking force. Despite her terrifying presence and crushing swings, she harbors an innocent distraction: chasing after fluttering cyber-butterflies with unstoppable momentum.

In the Ramball Fight Simulator arena, P.E.K.K.A is designed as an **immovable powerhouse brawler** with 25% passive damage deflection, complete poise against basic knockbacks, dynamic 3-stage kinetic momentum greatsword cleaves, an unstoppable hyper-armor sprint, and room-clearing electric EMP overloads.

---

## 📊 Baseline Stats & Attributes

| Stat | Value | Description |
| :--- | :--- | :--- |
| **HP** | `480` | High health pool reflecting heavy titanium robotic armor |
| **Move Speed** | `4.4` | Deliberate, methodical stride balanced by high-speed burst sprint |
| **Body Radius** | `28px` | Imposing heavyweight physical silhouette |
| **Base Damage** | `38` | Base damage on initial Colossal Cleave swing |
| **Base Cooldown** | `48 frames` | Frame cooldown between weapon cleaves |
| **Frontal Cleave Reach**| `82px` | Reach in pixels from center for greatsword arc |
| **Frontal Cleave Arc**  | `140°` | Wide frontal sweep striking all targets in the cone |
| **Knockback Resist**   | `90%` | Extreme resistance to displacement forces |

---

## 🛡️ Passive: Heavy Titanium Plating & Juggernaut Poise

- **25% Flat Damage Deflection:** Reinforced alloy plating passively deflects 25% of all incoming direct and basic projectile damage (excluding true damage and domain execution effects). Deflected blows produce cyan metallic impact sparks.
- **Unstoppable Poise:** P.E.K.K.A completely ignores the knockback displacement of light basic enemy attacks and projectiles, maintaining advancing ground without being pushed back.
- **Death Overload EMP:** If destroyed by a lethal blow, P.E.K.K.A's internal power core breaches, instantly discharging an `80 Damage` radial electric EMP shockwave that stuns surrounding combatants.

---

## ⚔️ Combat Arsenal & Kinetic Momentum

### Basic Attack: Colossal Cleave & Escanor-Style Pause Hit Sequence
Reflecting her authentic *Clash of Clans* & *Clash Royale* mechanics combined with **Escanor's signature hit-pause mechanic**, P.E.K.K.A does not swing while running. Every basic attack follows a deliberate, heavyweight sequence with cinematic impact stasis:

```
[ 1. STOP MOVEMENT ] ──► [ 2. WIND UP ] ──► [ 3. STRIKE & HIT-PAUSE ] ──► [ 4. UNPAUSE LAUNCH ] ──► [ 5. BREATHER ] ──► [ 6. RESUME MOVING ]
     (vx = 0, vy = 0)      (Blade Hoisted       (Escanor-style Stasis:         (Explosive Screen Shake,     (Grounded Plant       (Cooldown counts down,
     (Aim Locked)          Over Shoulder,       Target Frozen, Tremor,        Target Launched Back,        Steam Venting,         Steering & physics
                           Charging Sparks)     10-20 frames)                 Sparks & Blood Burst)        vx = 0, vy = 0)        restart)
```

1. **Stop Movement & Aim Lock:** Upon closing within reach (`82px`), P.E.K.K.A anchors firmly in place (`vx = 0, vy = 0`), locking her aim angle directly onto the opponent.
2. **Pre-Attack Wind-Up (`20 frames` / ~0.33s):** P.E.K.K.A draws her colossal greatsword high back over her shoulder (-69° tilt) with gathering cyan/magenta sparks and a telegraph warning ring. Movement is completely halted.
3. **Active Release & Escanor-Style Hit-Pause (`10 - 20 frames`):** The instant her broadsword impacts an enemy:
   - **Cinematic Time-Stop Stasis:** The target is frozen dead in their tracks at the moment of impact with `suppressFreezeOverlay = true` (pure manga impact freeze, no ice overlay).
   - **Blade Impact Micro-Tremor:** P.E.K.K.A and her greatsword vibrate with high-tension micro-tremor (`1.4px` amplitude) as the blade bites into the target.
   - **Duration:** `10 frames` on Stage 1 & 2 hits; extended to `20 frames` on Stage 3 Overclock Crush.
4. **Explosive Unpause Release:** As the hit-pause timer reaches `0`, the stasis shatters:
   - Concussive arena screen shake detonates (`8.0` to `12.0` intensity).
   - The enemy is hurled backward with massive launch knockback (`7` to `24` impulse) and reels in heavy hit-stun.
   - Visceral impact flash, lightning sparks, and heavy cleave audio explode on release.
5. **Post-Strike Breather (`22 frames` / ~0.36s):** Her sword stays planted forward-downward in follow-through stance while cooling steam exhaust vents from her rear chassis (`vx = 0, vy = 0`).
6. **Resume Movement:** Once the breather expires, normal physics and steering AI resume, initiating a `42-frame` cooldown before the next attack sequence can begin.

#### Kinetic Momentum 3-Stage Attack Scaling
Striking enemies accumulates kinetic energy, stepping through a **3-Stage Momentum Chain**:

```
[ Hit 1: 38 Dmg ] ──► [ Hit 2: 54 Dmg ] ──► [ Hit 3: 96 Dmg (OVERCLOCK CRUSH) ]
   (Light Swing)         (Cyan Energy)             (Screen Shake + Stun + Launch)
```

1. **Stage 1 (Base Cleave):** Deals `38 Damage` and `7` knockback impulse.
2. **Stage 2 (Energized Cleave):** Blade crackles with radiant cyan runes, dealing `54 Damage` and `11` knockback impulse.
3. **Stage 3 (Overclock Crush):** P.E.K.K.A channels full battery voltage into a crushing overhead slam dealing `96 Damage`, `24` launch knockback, `24 frames` of hit-stun, and heavy camera screenshake.
- **Momentum Reset Delay:** If P.E.K.K.A does not land a swing within `210 frames` (~3.5 seconds), accumulated momentum decays back to stage 1.

---

## ⚡ Active Skills & Super Abilities

### Skill 1: Butterfly Chase ("BUTTERFLY!")
- **Hotkey / Trigger:** Skill 1 Button (`🦋`)
- **Cooldown:** `520 frames` (~8.6 seconds)
- **Effect:** P.E.K.K.A spots a fluttering ethereal cyber-butterfly ahead and enters an unstoppable hyper-armor sprint toward it:
  - **Speed Boost:** Increases movement speed by `+85%` (`8.14` sprint speed).
  - **Target Acquisition:** Pursues a path leading to the opponent or the fluttering butterfly in the arena.
  - **Overhead Impact Slam:** Upon colliding with an enemy during the sprint, P.E.K.K.A slams down her greatsword for `75 Damage` and launches the opponent backward.

### Skill 2: Electric Overload (Super P.E.K.K.A EMP Blast)
- **Hotkey / Trigger:** Skill 2 Button (`⚡`)
- **Cooldown:** `720 frames` (~12.0 seconds)
- **Charge Time:** `38 frames` channeling with electric spark arcs gathering around her chassis.
- **Detonation Radius:** `210px` circular shockwave.
- **Effects:**
  - Deals `62 Damage` to all entities inside the blast radius.
  - Inflicts `45 frames` of electrical paralysis hit-stun.
  - Vaporizes and destroys all basic incoming enemy projectiles within the perimeter.

---

## 🎨 Visual Design & Engine Standards Compliance

- **Canonical Default Hand Positioning (Rule 20):** Hands are positioned symmetrically at the lower-left and lower-right flanks of the central body circle (`drawPixelHand`) at `(-r * 0.82, +r * 0.38)` and `(+r * 0.82, +r * 0.38)` in local space on the front layer, overlapping the lower perimeter boundary of the body circle, wearing heavy slate-steel gauntlets with magenta elixir bracer spikes and gripping the colossal falchion cleaver.
- **Rule 19 Upright Front POV & Clash of Clans Armor Redesign:** Authentically modeled after Supercell's iconic P.E.K.K.A design:
  - `-Y` (Top): Heavy rounded slate-steel helmet dome with raised center crest, protruding brow visor plate with steel rivets, and twin curved glowing elixir magenta horns sweeping outward and upward (`#C026D3` -> `#E879F9`).
  - `Y ~ 0` (Center): Dark recessed faceplate cavity with glowing magenta eye slits and nasal vent, protected by a raised curved steel gorget neck collar and spiked shoulder pauldrons.
  - `+Y` (Bottom): Muscular twin-lobed slate-steel cuirass / breastplate with chest rivets, segmented abdominal band, and layered waist fauld and tasset skirt plates.
- **Rule 3.2 Faceless Minimalist:** No eyes, pupils, sclera, irises, mouths, or nose bridges. Robotic armor identity is conveyed through the angled glowing magenta visor apertures, dark nasal slot, and curved horn silhouette.
- **Rule 3.5 Discrete Grid ($P = 2.0\text{px}$) & Offscreen Canvas Cache:** Pre-rasterized once into an axis-aligned buffer (`_renderPekkaPixelBodyToCanvas`) and blitted via `ctx.drawImage` with `imageSmoothingEnabled = false`, completely preventing sub-pixel rotation artifacts and maintaining locked 60 FPS.
- **Rule 11 Zero `shadowBlur`:** All glowing runes, elixir spikes, and energy channels use concentric alpha geometry.
- **Rule 2.4 Canvas 2D Stack Integrity:** Every `ctx.save()` is paired with a guaranteed `ctx.restore()`. Tested and verified with 0 stack leaks across all animation and combat states.

---

## 💡 Combat Tactics & Matchups

- **Against Fast Melee Brawlers:** P.E.K.K.A's passive 25% damage reduction and basic knockback immunity let her trade blows efficiently. Advance forward and let kinetic momentum scale up to the devastating 96-damage Overclock Crush.
- **Against Ranged Projectile Zoniers:** Use **Skill 1 (Butterfly Chase)** to close the distance rapidly under hyper-armor. Follow up with **Skill 2 (Electric Overload)** to neutralize incoming projectile waves while paralyzing the zoner for a guaranteed greatsword cleave.
- **Lethal Trade Assurance:** When fighting high-burst opponents, remember that P.E.K.K.A's Death EMP triggers upon defeat, often taking low-health enemies down with her in tight rounds.
