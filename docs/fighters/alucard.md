# Alucard — The No-Life King

**Category:** Anime & Supernatural / Hellsing Ultimate  
**Theme Color:** Hellsing Crimson (`#8B0000` / `#B91C1C`), Obsidian Shadow (`#0E0F14`), Sterling Silver (`#E2E8F0`)  
**Role:** Anti-Regeneration Marksman, Vampiric Execution Brawler, Cross-Up Duelist  

---

## 📖 Lore & Character Philosophy

> *"The bird of the Hermes is my name, eating my wings to make me tame."*

Alucard is the **No-Life King (*Fushisha no Ō — 不死者の王*)**, the progenitor vampire Dracula bound in eternal servitude to the Royal Order of Protestant Knights (The Hellsing Organization) under the command of Sir Integra Fairbrook Wingates Hellsing. Wielding supernatural physiology, bottomless oceans of familiars, and an unholy thirst for combat, Alucard walks the earth as God's personal executioner against the monsters of the night.

In the *Circle Mini-Battle* arena, Alucard functions as a lethal **Anti-Regeneration Marksman and Vampiric Duelist**. Dual-wielding his iconic custom heavy handguns—the sacred silver **.454 Casull** and the explosive mercury **13mm Jackal**—he punishes enemies who rely on regeneration, healing, or defense buffs through constant **Grievous Wounds / Heal Block** oppression, converts all damage dealt into **Aggressive Regeneration**, unleashes the voracious **Baskerville Feast**, phases through opponents with invulnerable **Shadow Phase** dashes, and dismantles enemy rushdowns with his mocking **Illusion Counter**.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Alucard's body model, facial silhouette, and aristocratic attire strictly adhere to the front-profile camera orientation standard:
- **Head & Accessories (`-Y` to `Y ~ 0`)**:
  - **Crimson Fedora Hat**: High-resolution imported wide-brimmed fedora model (`Assets/model/Alucard/Red-hat.png`) with black silk band and cascading rear brim folds.
  - **Round Orange Glasses**: Iconic round tinted shooting glasses (`Assets/model/Alucard/Red-eye-glasses.png`) resting at eye level (`Y ~ 0`).
  - **Faceless Aesthetic (Rule 19)**: Clean faceless body circle beneath glasses and bangs (zero eyes, pupils, mouth, or nose drawn directly on the body sphere).
- **Attire & Victorian Duster (`+Y`)**:
  - **Victorian Duster Coat**: Flowing crimson trench coat (`#8B0000` base, `#991B1B` fold shadows, `#DC2626` highlights) with wide shoulder capes.
  - **Charcoal Vest & Cravat**: High Victorian white cravat/ascot at neck (`#F8FAFC`), charcoal three-piece vest (`#1E293B`), and tailored trousers.
- **Weapon & Hand Stance (Rule 20)**:
  - **Canonical Default Hand Positioning**: Symmetrical lower-flank fists (`drawPixelHand`) positioned at `(x: -r * 0.82, y: +r * 0.38)` and `(x: +r * 0.82, y: +r * 0.38)`.
  - **White Gloves with Hellsing Seal**: White gloves adorned with the Pentagram seal of Hermes (`#DC2626` ink sigil) holding weapons directly at the grip.
  - **Zero Duplicate Hands**: Single-source-of-truth hand rendering; weapons anchor directly to canonical hands.

### 2. Dual Firearm Ballistics & Recoil (Casull & Jackal)
- **Main-Hand: Hellsing ARMS .454 Casull Auto**:
  - Custom semi-automatic handgun finished in brushed sterling silver (`#E2E8F0`).
  - Fires custom explosive sacred silver hollow-point bullets (`alucardCasullBullet`), blessed by the Lancaster Cathedral.
- **Off-Hand: Hellsing ARMS 13mm Auto Anti-Freak Combat Pistol "Jackal"**:
  - Massive gunmetal matte black firearm (`#0F172A`) with golden cursive engraving: *"Jesus Christ is in Heaven now"*.
  - Fires explosive mercury gas armor-piercing rounds (`alucardJackalBullet`) with high kinetic impact and flame sparks.

### 3. Match Victory Gun Spin & Holster Animation
When Alucard secures victory in a round or match:
- Executes a smooth 360° twin gun-spinning flourish accompanied by clicking hammer and cylinder sound effects.
- Once spinning concludes, Alucard cleanly tucks both pistols and his hands beneath his crimson duster coat (`hideGuns = true`, `hideHands = true`), standing upright in imposing aristocratic composure.

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Modifiers & Scaling | Gameplay Impact |
| :--- | :--- | :--- | :--- |
| **HP** | `85` | Balanced Vampire Baseline | High effective HP through Aggressive Regeneration |
| **Speed** | `5.2` | Centralized Physics (`applyMovementPhysics`) | High positioning agility and kiting |
| **Body Radius** | `25px` | Rule 24 Toji Universal Standard | Universal humanoid collision boundary |
| **Casull Damage** | `7.0` | Holy Ballistic Piercing | High velocity, tight bullet spread |
| **Jackal Damage** | `8.0` | Explosive Mercury Impact | Heavy kinetic recoil, explosive spark burst |
| **Magazine Size** | `12 Rounds` | 6 Casull Silver + 6 Jackal Mercury | Alternating dual-chamber tactical volley |
| **Reload Duration** | `70 frames` (`1.16s`) | 20% reload movement penalty | Victorian curved clip tactical reload |
| **Crit Chance** | `15% – 50%` | Momentum scaling (+4% per crit) | Rewards sustained marksmanship |
| **Crit Multiplier**| `1.50x – 2.20x`| Momentum scaling (+0.10x per crit) | Devastating anti-boss headshot bursts |

---

## ⚡ Combat Mechanics Breakdown

```
                             ┌─────────────────────────────────┐
                             │       ALUCARD COMBAT KIT        │
                             └────────────────┬────────────────┘
                                              │
        ┌─────────────────────────┬───────────┴───────────┬─────────────────────────┐
        ▼                         ▼                       ▼                         ▼
┌───────────────┐         ┌───────────────┐       ┌───────────────┐         ┌───────────────┐
│   PASSIVE 1   │         │    ATTACKS    │       │    SKILL 1    │         │  SKILLS 2 & 3 │
│  Aggressive   │         │  Heavy Anti-  │       │  Baskerville  │         │ Shadow Phase  │
│ Regeneration  │         │  Regen Shots  │       │     Feast     │         │       &       │
│  (35% / 50%)  │         │(Grievous Wound│       │  (Shadow Dog) │         │Illusion Countr│
└───────────────┘         └───────────────┘       └───────────────┘         └───────────────┘
```

---

### 1. 🩸 Passive: Aggressive Regeneration
Alucard sustains his undying immortality by actively converting the violence he inflicts into fresh blood and life essence:
* **Base Lifesteal (35%)**: Every direct bullet hit, skill strike, hound bite, and counter-attack heals Alucard for **35% of all damage dealt**.
* **Aggressive Bloodlust (50% Boost at Low HP)**: When Alucard's health drops to **$\le$ 50% max HP**, his vampiric instincts surge into full aggression, escalating his lifesteal ratio to **50% of all damage dealt**.
* **Rule 27 Healthbar-Only Feedback Standard**: In accordance with esports visual clarity standards, continuous lifesteal **NEVER** spawns floating numbers in the arena. Healing feedback is communicated cleanly through:
  1. Direct HP bar restoration (`this.hp = Math.min(this.maxHp, this.hp + healAmount)`).
  2. Top HUD character card emerald pulse (`this._healthBarHealTimer = 16`).
  3. Floating in-game overhead HP numbers via `this.drawHealth(ctx)`.

---

### 2. ☠️ Heavy Anti-Regeneration Shots (Grievous Wounds / Heal Block)
The sacred silver bullets of the Casull and the explosive mercury cores of the Jackal poison the spiritual and biological healing factors of their targets:
* **Grievous Wounds Debuff**: Every attack landed by Alucard afflicts the enemy with **Grievous Wounds / Heal Block for 3.0 seconds (180 frames)**.
* **100% Healing & Regeneration Denial**: While afflicted, the target is completely forbidden from recovering HP:
  - All incoming healing, self-regen, lifesteal, and passive recovery are reduced to **0**.
  - Any attempt to recover health triggers a throttled **`"HEAL BLOCKED!"`** floating combat indicator in crimson (`#DC2626`).
  - Blocks shield and DEF restoration while active.
* **Visual Status Sigil**: Enemies afflicted with Grievous Wounds display a pulsing red status ring and a crossed crimson sigil overlay (`STATUS_OVERLAY_REGISTRY.grievousWounds`).

---

### 3. 🐺 Skill 1: Baskerville Feast (*Baskāviru no Kiba — バスカヴィルの牙*)
* **Cooldown:** `4.0s` (`240 frames`)  
* **Damage:** `22.0`  
* **Surge Velocity:** `18.0 px/frame`  

Alucard partially opens Control Art Restriction Level 1, releasing the demonic **Black Hound of Baskerville** directly from his shadow cloak:
* **Dedicated 5-Frame Hellhound Animation (`Assets/model/Alucard/Hellbound animation/Hellhound_frame[1-5].png`)**:
  - **Surge Run Cycle (Frames 1–5)**: The shadow beast lunges forward, continuously cycling through all 5 fluid frames (jaws bared, eyes glowing crimson, shifting shadow mass) trailing dark smoke.
  - **Devouring Bite Impact (Frames 3–5)**: Upon colliding with the target, the animation snaps into maximum jaw extension (Frame 3) and ferociously crunches shut (Frames 4–5).
* **Screen-Crossing Charge**: The hound surges forward across the entire screen towards the enemy, tracking target displacement with fluid predatory movement at `18.0 px/frame`.
* **Devouring Impact**: Clamps down onto the target in a ferocious bite:
  - Deals `22.0` damage.
  - Immediately afflicts the victim with **Grievous Wounds (3.0s)**.
  - Siphons life back to Alucard via Aggressive Regeneration (`+8 HP` base, or `+11 HP` if below 50% max HP).
  - Triggers a directional blood splatter (`spawnBloodEffect`) and a clean concentric shockwave (`Rule 26`).

---

### 4. 🦇 Skill 2: Shadow Phase (*Kage no Genshō — 影の現象*)
* **Cooldown:** `5.33s` (`320 frames`)  
* **Dash Duration:** `22 frames`  
* **Phase Speed:** `18.0 px/frame`  
* **Invulnerability:** `100% i-frames`  

Alucard dissolves his physical mass into a swirling cloud of red mist and a swarm of flapping obsidian shadow bats:
* **Complete Invulnerability Frames (i-frames)**: For the full 22 frames of the phase, Alucard is 100% immune to damage (`takeDamage` returns `false`). Attacks, lasers, and projectile barrages pass harmlessly through him.
* **Cross-Up Phase Movement**: Alucard jets directly through the opponent, phasing past their body and weapons to reposition cleanly behind them.
* **Fluid Exit & Aim Alignment**: Upon exiting shadow phase, the bat swarm disperses outward in an explosion of red mist, and Alucard immediately realigns his guns (`Rule 1.3`) onto the opponent's exposed back to initiate a point-blank cross-up ambush.

---

### 5. 🎭 Skill 3: Illusion Counter (*Chōshō no Gen'ei — 嘲笑の幻影*)
* **Cooldown:** `7.0s` (`420 frames`)  
* **Stance Window:** `1.0s` (`60 frames`)  
* **Counter Damage:** `26.0`  
* **Stasis Duration:** `25 frames`  

Alucard stands completely motionless with a mocking grin, daring the opponent to strike his perceived opening:
* **The Mockery Stance**: Alucard halts all movement (`vx = 0, vy = 0`) while a glowing red rune ring and shadowy demonic eyes flare around him with the floating prompt **`"MOCKERY..."`**.
* **Shadow Decoy Dissolution**: If struck by an enemy attack during this 60-frame window:
  1. The incoming damage is **100% nullified** (`takeDamage` returns `false`).
  2. Alucard's body at the impact point dissolves into a shadow decoy and a scattering bat swarm.
  3. Alucard instantly teleports directly behind the attacker (`Rule 1.3` aim snap).
* **Cinematic Counter Execution**:
  - Traps the attacker in a **25-frame hit-pause stasis** (`applyTimeStop(25)`).
  - Alucard executes a point-blank dual discharge of both the Casull and Jackal directly into the attacker's back, dealing **26.0 damage**.
  - Siphons **9 to 13 HP** via Aggressive Regeneration.
  - Inflicts a fresh **3.0s Grievous Wounds** debuff.
  - Generates violent flame sparks, heavy blood bursts, camera shake, and a clean expanding concentric shockwave (`Rule 26`).

---

### 🏆 Match Victory: The Crossed X Stance
When Alucard secures match victory, he executes his signature victory sequence matching the iconic Hellsing anime and manga release stance:
1. **Twin-Gun Spin Flourish (Frames 50 to 24)**:
   - Alucard halts movement (`vx = 0, vy = 0`) and snaps upright facing the screen (`gunAngle = 0`).
   - Performs a rapid 2.5-revolution spin flourish on both the .454 Casull and 13mm Jackal around their trigger guards.
   - Wisps of dark barrel smoke dissipate softly into the air.
2. **Crossed Arms Transition (Frames 24 to 0)**:
   - Forearms glide smoothly across the torso, forming a bold **"X"** with his crimson duster coat sleeves (right arm crossing in front of left arm).
   - The white combat gloves (`drawAlucardHand`) with the red seal of Hermes anchor directly at the crossed upper chest (`targetX: ±r * 0.38, targetY: +r * 0.10`).
   - The twin magnums sweep outward into an imposing symmetrical **"V"** wing formation:
     - **13mm Jackal (Left / Black)**: Points diagonally **UP and to the LEFT** at `-33.2°` (`-0.58 rad`).
     - **.454 Casull (Right / Silver)**: Points diagonally **UP and to the RIGHT** at `-33.2°` (`-0.58 rad`).
3. **Locked Victory Screen Pose**:
   - Weapons and hands remain proudly displayed on screen (`hideGuns = false`, `hideHands = false`, `isVictoryXPose = true`, `victoryXPoseProgress = 1.0`).
   - Symmetrically frames Alucard's head, shaggy black hair, and amber spectacles across round end, match end, and winner reveal modal screens.
   - Strictly enforces Rule 20 single-source-of-truth hand rendering with exactly one pair of hands on screen across all match states.

---

## 🎮 Matchup Dynamics & Strategy

### 🟢 Favorable Matchups
* **Denji & Reze (Regen / Lifesteal Berserkers)**: Denji's Pochita Revive and saw lifesteal, as well as Reze's Bomb Devil regeneration, rely heavily on sustaining HP through rapid trades. Alucard's constant Grievous Wounds shuts down their recovery completely, turning war-of-attrition brawlers into fragile targets.
* **Mahoraga & Escanor (High HP Tanks)**: Thick HP pools provide ample targets for Alucard's Aggressive Regeneration. Baskerville Feast and Illusion Counter kite and dismantle their heavy, telegraphed swings.
* **Musashi & Tanjiro (Melee Slashers)**: Close-range sword rushdowns are easily baited into Alucard's **Illusion Counter**, punishing aggressive dashes with behind-the-back execution volleys.

### 🔴 Challenging Matchups
* **Toji Fushiguro**: Toji's Inverted Spear of Heaven interrupts active skill channels, and his high mobility allows him to contest Alucard's kiting. Alucard must save **Shadow Phase** exclusively to dodge Toji's 3-stage ambush combo.
* **Gojo Satoru**: Limitless Infinity blocks Alucard's bullets until bypassed or outplayed. Alucard relies on baiting Red or Blue with **Illusion Counter** to pierce behind Gojo and capitalize on post-skill vulnerability windows.
* **Sans**: Sans uses 1-frame dodge mechanics and Karma damage over time rather than direct healing, meaning Grievous Wounds has less value. Alucard must rely on **Shadow Phase** i-frames to navigate dense Gaster Blaster arrays.

---

## 📋 Technical File Map

| File Path | Description |
| :--- | :--- |
| `js/entities/fighters/GunSlingerFighter.js` | Core Alucard class implementing combat loops, state machines, skills, and ballistics |
| `js/configs/characters/gunslingerConfig.js` | Fighter stats, cooldowns, bullet speeds, lifesteal percentages, and asset paths |
| `js/graphics/fighters/gunSlingerSkin.js` | Upright faceless body model, crimson duster, glasses, fedora, and offscreen canvas caching |
| `js/graphics/weapons/gunSlingerWeaponGraphics.js` | Dual .454 Casull and 13mm Jackal renderers, muzzle flashes, and recoil animations |
| `js/graphics/ui/hudSkillProviders.js` | In-game skill HUD provider rendering Baskerville, Shadow Phase, and Counter cooldown bars |
| `js/graphics/statusEffects.js` | Grievous Wounds crossed red sigil status effect overlay renderer |
| `js/entities/fighter.js` | Universal heal block enforcement via `set hp(value)` and status timers |
| `scripts/testInteractions.mjs` | Automated regression test suites verifying victory spin (Test 72) and all 5 mechanics (Test 73) |
