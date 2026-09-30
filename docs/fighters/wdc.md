# WDC (The Arbiter) — Fighter Guide

**Identity & Archetype:** Strategist / Tactician — Arena Manipulator & Rule Enforcer  
**Category:** Community Original  
**Theme Color:** `#1A1A2E` (Midnight Referee Black)  
**Secondary Color:** `#F5F5F5` (Crisp Referee White)  
**Accent Color:** `#FFD700` (Gold Whistle & Authority Glow)  
**Iconic Quote:** *"I make the rules here."*

---

## 🏟️ Lore & Overview
WDC is the ever-present referee and arbiter of the **Ball Fight Simulator** community — a figure who has appeared across countless YouTube arena matches as the impartial overseer, scorekeeper, and occasional enforcer of justice. Known throughout the *Earclacks* community and the broader Weapon Ball scene, WDC watches every bout with calculating precision, and when provoked into fighting, brings the full weight of the rulebook into combat.

In the Ramball Fight Simulator arena, WDC is designed as a **cerebral zone-control tactician** who manipulates the battlefield through grid-based traps, penalty debuffs, and strategic arena segmentation. Rather than overpowering opponents with raw damage, WDC dictates the flow of battle — punishing reckless aggression with yellow and red card penalties, dividing the arena into controlled zones, and rewarding patient, calculated spacing with powerful counter-play windows.

---

## 📊 Baseline Stats & Attributes

| Stat | Value | Description |
| :--- | :--- | :--- |
| **HP** | `360` | Moderate — relies on positioning over tankiness |
| **Move Speed** | `5.2` | Above average; quick repositioning to enforce zones |
| **Body Radius** | `22px` | Standard compact build |
| **Base Damage** | `18` | Low base — WDC isn't a brawler |
| **Base Cooldown** | `32 frames` | Quick whistle jabs between zone setups |
| **Melee Reach** | `52px` | Short whistle-baton strike range |
| **Frontal Arc** | `90°` | Tight precision strikes |
| **Knockback Resist** | `40%` | Moderate poise — holds ground when planting zones |

---

## 🛡️ Passive: Official Rulebook

WDC's passive system revolves around tracking and punishing enemy infractions — aggressive overextension and repeated attacks trigger escalating penalties.

### Infraction Counter
- Every time an enemy fighter lands a hit on WDC, they accumulate **1 Infraction Point**.
- Every time an enemy enters one of WDC's controlled zones uninvited, they accumulate **1 Infraction Point**.
- Infraction points decay at a rate of **1 point per 300 frames** (~5 seconds) if no new infractions are committed.

### Yellow Card (3 Infractions)
- **Trigger:** When an enemy reaches **3 Infraction Points**, WDC automatically issues a **Yellow Card**.
- **Effect:** The offending fighter suffers:
  - **-20% Movement Speed** for `180 frames` (~3 seconds).
  - **-15% Damage Output** for `180 frames` (~3 seconds).
  - A bright yellow card icon flashes above their head with a referee whistle SFX.
- **Cooldown:** Yellow Card can only trigger on the same target once every `480 frames` (~8 seconds).
- **Infraction Reset:** Resets the target's infraction counter to `0` after issuing.

### Red Card (6 Infractions — or 2nd Yellow Card)
- **Trigger:** When an enemy accumulates **6 Infraction Points**, or receives a **second Yellow Card** within `600 frames` (~10 seconds) of the first, WDC issues a **Red Card**.
- **Effect:** The offending fighter suffers:
  - **Full Movement Lock** (rooted in place, `vx = 0, vy = 0`) for `120 frames` (~2 seconds).
  - **Cannot Attack** for `120 frames` — weapon inputs are suppressed.
  - A dramatic red card slam animation with screen-edge vignette flash.
  - `35 Damage` "Ejection Penalty" burst applied instantly.
- **Cooldown:** Red Card can only trigger once per target per match round.

---

## ⚔️ Combat Arsenal

### Basic Attack: Whistle Baton Strike
WDC wields a golden referee whistle-baton — a compact authority stick that delivers quick, precise jabs with sharp metallic impact sounds.

- **Damage:** `18` per strike.
- **Knockback:** `4.5` impulse — light push to maintain spacing.
- **Arc:** `90°` tight frontal precision.
- **Reach:** `52px` — short range forces WDC to pick engagements carefully.
- **Hit Effect:** Each landed strike on an enemy adds **+1 Infraction Point** to the target (stacks with passive tracking).
- **Visual:** Quick forward thrust of the golden baton with a sharp whistle-pip audio cue and small gold spark burst on contact.

### Charged Attack: Technical Foul Whistle
- **Activation:** Hold basic attack input for `28 frames` to charge.
- **Effect:** WDC blows the whistle at full blast, releasing a **directional sonic cone** (`120°` arc, `130px` range).
  - Deals `28 Damage` to all enemies caught in the cone.
  - Inflicts `24 frames` of hit-stun (disorientation from the ear-splitting whistle).
  - Pushes enemies **backward** with `8.0` knockback impulse.
  - Applies **+2 Infraction Points** to all hit targets.
- **Cooldown:** `90 frames` after release.
- **Visual:** Expanding golden sound-wave rings radiate outward from WDC in the aimed direction, with manga-style "PWEEEEE!" onomatopoeia floating text.

---

## ⚡ Active Skills & Super Abilities

### Skill 1: Penalty Box (`📦`)
- **Hotkey / Trigger:** Skill 1 Button
- **Cooldown:** `420 frames` (~7 seconds)
- **Cast Time:** `16 frames` — WDC plants a flag marker on the ground.
- **Effect:** Creates a **Penalty Zone** on the arena floor — a `120px × 120px` (or `120px` diameter circle) golden-bordered grid zone at the targeted location.
  - **Duration:** `360 frames` (~6 seconds).
  - **Enemy Effects:** Any enemy standing inside the Penalty Box suffers:
    - **-30% Movement Speed** (slowed, like running through thick grass).
    - **+1 Infraction Point per 60 frames** (~1 point per second) of staying inside.
    - Subtle golden grid-line pulse on the arena floor beneath them.
  - **Ally / Self Effects:** WDC and teammates receive:
    - **+10% Movement Speed** boost while inside (home advantage).
    - **+8 HP/sec passive heal** while standing in the zone (medic tent).
  - **Max Active Zones:** `2` simultaneously. Placing a 3rd removes the oldest.
- **Visual:** A crisp 6×6 pixel-art mini-grid overlay (aligned to the arena tile system) with golden border lines and alternating dark/light checker squares. A small referee flag icon marks the center.

### Skill 2: Offside Trap (`🚩`)
- **Hotkey / Trigger:** Skill 2 Button
- **Cooldown:** `600 frames` (~10 seconds)
- **Cast Time:** `22 frames` — WDC raises both arms and blows the whistle.
- **Effect:** WDC deploys a **Laser Line Barrier** — a horizontal or vertical golden energy line spanning the full width or height of the arena at WDC's current position.
  - **Direction:** The line is perpendicular to WDC's current facing angle (horizontal if facing left/right, vertical if facing up/down).
  - **Duration:** `240 frames` (~4 seconds).
  - **Enemy Crossing Penalty:** When an enemy fighter crosses through the barrier line:
    - Instantly receives **+3 Infraction Points**.
    - Takes `22 Damage` (tripwire shock).
    - Receives `18 frames` of brief hit-stun.
    - The line flashes red at the crossing point.
  - **One-Time Trigger Per Enemy:** Each enemy can only be penalized **once per barrier instance** (prevents abuse from rapid back-and-forth crossing).
  - **Self Pass-Through:** WDC and allies can freely cross the line without penalty.
- **Visual:** A thin glowing golden line (`2px` wide) with pulsing diamond markers along its length. When crossed by an enemy, the line flashes crimson red with a sharp whistle blast.

---

## 🔥 Ultimate: Calculated Grid — Total Arena Domination

- **Hotkey / Trigger:** Ultimate Button (`🏟️`)
- **Charge Requirement:** Accumulate **12 total Infraction Points** issued across all enemies (Yellow & Red Cards both count toward charge).
- **Cast Time:** `40 frames` — WDC plants the whistle in the ground and raises both arms. The arena dims.
- **Duration:** `480 frames` (~8 seconds).
- **Effect:** WDC activates **Calculated Grid** — the entire arena floor transforms into a glowing **6×6 golden tactical grid** overlay (leveraging the arena tile system). During this ultimate:

  ### Grid Tile Control
  - The 36 grid tiles are divided:
    - **WDC's Tiles (Home Zone):** The 3×3 quadrant (9 tiles) around WDC's position glows **bright gold**. WDC and allies receive:
      - `+25% Movement Speed`
      - `+15% Damage Output`
      - `+12 HP/sec regeneration`
    - **Neutral Tiles:** The remaining tiles are dim gray — no buffs, no debuffs.
    - **Penalty Tiles:** Every `120 frames` (~2 seconds), WDC designates **4 random non-Home tiles** as **Penalty Tiles** (they flash crimson red for `60 frames` warning, then activate). Enemies standing on active Penalty Tiles suffer:
      - `18 Damage` per tick (ticks every `60 frames`).
      - **Full Red Card lockdown** if caught on 2 consecutive Penalty Tile activations.

  ### Arbiter's Judgment Aura
  - During Calculated Grid, WDC's **Infraction tracking is doubled** — all infraction sources generate **×2 points**.
  - Yellow Cards trigger at **2 Infractions** (instead of 3).
  - Red Cards trigger at **4 Infractions** (instead of 6).

  ### Ultimate End
  - When the `480 frame` duration expires, the grid fades with a final long whistle blast. All active Penalty Tiles, barriers, and zone buffs dissolve.
  - WDC's Infraction charge counter resets to `0`.

- **Visual:** The full arena floor is overlaid with a sharp, crisp pixel-art **6×6 grid** of golden lines matching the arena tile system. WDC's home zone tiles glow with warm amber. Penalty tiles pulse crimson with hazard warning hatching. A floating scoreboard HUD element appears near the top of the arena showing infraction tallies for each enemy.

---

## 🎨 Visual Design & Engine Standards Compliance

### Pixel Art Skin Design
- **Canonical Default Hand Positioning (Rule 20):** Hands positioned symmetrically at `(-r * 0.82, +r * 0.38)` and `(+r * 0.82, +r * 0.38)` in local space on the front layer. Right hand grips the golden whistle-baton weapon. Both hands wear black leather referee gloves with gold wrist-strap buckles.
- **Rule 19 Upright Front POV:**
  - `-Y` (Top): **Short, neat black hair** with clean side-part and subtle gel sheen. No wild spikes — professional, clean-cut referee aesthetic. A thin gold headband/comm-earpiece wraps around the crown.
  - `Y ~ 0` (Center): **Faceless per Rule 3.2.** Identity conveyed through the gold-rimmed **aviator sunglasses silhouette** (reflective gold-tinted lenses, no visible eyes behind them) and a sharp jawline shadow.
  - `+Y` (Bottom): **Classic black & white vertical-striped referee jersey** (alternating `#1A1A2E` midnight black and `#F5F5F5` crisp white stripes, each `P * 2` wide). Gold whistle lanyard hangs from the collar. Black belt with gold buckle. Black fitted pants/trousers.
- **Color Palette (4-Tier):**
  - **Tier 1 (Undercut/Root):** `#0D0D1A` (deepest shadow black)
  - **Tier 2 (Base Jersey Black):** `#1A1A2E` (midnight navy-black)
  - **Tier 3 (Jersey White):** `#F5F5F5` (clean referee white)
  - **Tier 4 (Gold Accents):** `#FFD700` (authority gold — whistle, headband, sunglasses rim, buckle, baton)
- **Rule 3.2 Faceless Minimalist:** No eyes, pupils, sclera, irises, mouths, or nose bridges. Identity conveyed through gold aviator sunglasses silhouette, professional hair part, and the iconic black & white striped jersey.
- **Rule 3.5 Discrete Grid ($P = 2.0\text{px}$) & Offscreen Canvas Cache:** Pre-rasterized into an axis-aligned offscreen buffer and blitted via `ctx.drawImage` with `imageSmoothingEnabled = false`.
- **Rule 3.4 Discrete Lock Arrays:** Hair uses short, controlled lock arrays — no sine waves. Gel-styled side-part with clean, angular separation.
- **Rule 11 Zero `shadowBlur`:** All golden glows (sunglasses, whistle, baton) use concentric alpha geometry fills.
- **Rule 2.4 Canvas 2D Stack Integrity:** Every `ctx.save()` paired with `ctx.restore()`.

### Weapon: Golden Whistle-Baton
- **Idle Grip:** Anchored at `(+r * 0.82, +r * 0.38)` with right hand drawn over the grip.
- **Design:** A short golden cylindrical baton (`18px` length, `4px` width) with a rounded whistle mouthpiece on one end and a flat authority cap on the other. Gold metallic body with thin black grip wrapping at the center.
- **Swing Animation:** Quick forward thrust/jab (not a wide arc), returning to rest in `12 frames`.

---

## 💡 Combat Tactics & Matchups

### Strengths
- **Zone Denial King:** WDC excels at controlling space. Penalty Box slows and punishes enemies who try to camp or rush through key positions. Offside Trap punishes aggressive crossers.
- **Debuff Stacking:** The Infraction → Yellow Card → Red Card pipeline is devastating against aggressive melee brawlers who constantly engage. Fighters like Yuji, Toji, and Denji rapidly accumulate infractions.
- **Ultimate Turns the Arena into His Domain:** Calculated Grid gives WDC unmatched territorial advantage. The shifting Penalty Tiles force enemies to constantly reposition, disrupting their attack patterns.

### Weaknesses
- **Low Raw Damage:** WDC's base damage (`18`) and melee reach (`52px`) are among the lowest. He cannot win pure damage trades against brawlers or juggernauts.
- **Setup Dependency:** WDC needs time to place zones and accumulate infractions. Instant burst assassins (Zenitsu, Toji) can delete him before his control tools come online.
- **Zone Limitations:** Max 2 Penalty Boxes and 1 Offside Trap mean WDC cannot cover the entire arena simultaneously. Smart opponents can play around his active zones.

### Key Matchups
- **vs. Aggressive Melee Brawlers (Yuji, Denji, Sukuna):** Favorable — their constant aggression rapidly stacks infractions. Place Penalty Boxes in chokepoints and let the Yellow/Red Card pipeline cripple their assault.
- **vs. Ranged Zoners (Uryu, Layla, Sharpshooter):** Neutral — ranged fighters can avoid WDC's zones. Use Offside Trap to cut off their retreat lanes and force them into Penalty Boxes.
- **vs. Burst Assassins (Zenitsu, Toji):** Unfavorable — their speed and one-shot potential can bypass WDC's setup time. Pre-place a defensive Penalty Box on yourself and use Technical Foul Whistle to stun on approach.
- **vs. Domain Users (Gojo, Sukuna, Megumi):** Neutral/Favorable — WDC's Calculated Grid ultimate competes for arena control. If WDC pops his ultimate after the enemy domain expires, he gains full territorial advantage in the aftermath.
- **vs. Tanks (P.E.K.K.A, Mahoraga):** Unfavorable — tanks can endure the infraction penalties and still overwhelm WDC with raw HP and damage. Avoid prolonged trades and focus on kiting with zone denial.

---

## 🔊 Audio Design Notes

| Event | Sound Concept |
| :--- | :--- |
| **Basic Attack** | Sharp metallic whistle-baton tap with a brief "tink" |
| **Technical Foul Whistle** | Loud, shrill referee whistle blast (classic sports whistle) |
| **Yellow Card Issued** | Quick double-whistle chirp + card slap SFX |
| **Red Card Issued** | Long authoritative whistle blast + heavy card slam + crowd gasp |
| **Penalty Box Placed** | Flag-plant thud + grid activation hum |
| **Offside Trap Deployed** | Rising whistle trill + laser line zip |
| **Calculated Grid Ultimate** | Stadium horn fanfare + full whistle sequence + grid power-up hum |
| **Infraction Point Gained** | Subtle tally click/counter tick |

---

## 📋 Implementation Priority Checklist

- [ ] Draft and finalize `wdcConfig.js` with all stat values, cooldowns, and timers
- [ ] Implement `WdcFighter.js` extending base fighter class with Infraction tracking system
- [ ] Implement Yellow Card & Red Card passive debuff application
- [ ] Implement Basic Attack (Whistle Baton Strike) with infraction stacking
- [ ] Implement Charged Attack (Technical Foul Whistle — sonic cone)
- [ ] Implement Skill 1 (Penalty Box — zone placement and effects)
- [ ] Implement Skill 2 (Offside Trap — laser line barrier)
- [ ] Implement Ultimate (Calculated Grid — 6×6 arena tile takeover)
- [ ] Design pixel art skin (`_renderWdcPixelBodyToCanvas`) per Rule 19/3.2/3.5
- [ ] Design golden whistle-baton weapon renderer
- [ ] Integrate with `arenaTileSystem.js` for Calculated Grid overlay
- [ ] Add audio SFX entries to `basicAttackSounds.js` and `soundSystem.js`
- [ ] Register in fighter registry, character select screen, and config index
- [ ] Run `npm run verify` — zero Canvas 2D stack leaks, all tests passing
