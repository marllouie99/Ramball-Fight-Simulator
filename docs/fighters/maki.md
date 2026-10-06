# Maki Zen'in — The Awakened Demon

**Category:** Anime & Jujutsu Sorcerers  
**Theme Color:** Deep Obsidian / Fierce Crimson (`#18181B` / `#DC2626`)  
**Secondary Accents:** Soul Fracture Violet (`#8B5CF6`), Blade Glint Silver (`#E2E8F0`), Dragon-Bone Amber (`#F59E0B`)  
**Role:** Agile Frontline Duelist, Soul Executioner, Anti-Domain Infiltration Master  

---

## 📖 Lore & Character Philosophy

Maki Zen'in was born into the conservative and patriarchal Zen'in Clan with a flawed Heavenly Restriction—possessing the cursed energy of an ordinary person while lacking an innate cursed technique. Condemned and despised by her family, Maki carved her own path at Tokyo Jujutsu High.

Following the tragic death of her twin sister Mai, the last remaining trace of cursed energy binding Maki was severed. Her Heavenly Restriction was completed, elevating her physical prowess and senses to the absolute physical pinnacle—standing as the second coming of Toji Fushiguro.

During the Sakurajima Colony battle, through her encounters with master swordsman Daido Hagane and sumo enthusiast Miyo Rokujushi, Maki achieved ultimate sensory awakening: perceiving the temperature, air density, and atmospheric currents of the world. She now moves without friction, cuts the soul itself with the **Split Soul Katana**, and operates completely untethered from the rules of Jujutsu sorcery.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Maki's model, hair, tactical attire, and iconic burn scars strictly adhere to the front-profile camera orientation standard:
- **Head & Hair (`-Y` to `Y ~ 0`)**:
  - Short, tousled raven-black hair with sharp, jagged spikes framing the face.
  - Distinctive facial burn scars (Rule 18: Purely faceless minimalist silhouette—zero eyes, sclera, irises, nose, or mouth rendered).
  - High-collar black tactical sleeveless combat turtleneck.
- **Attire & Uniform (`+Y`)**:
  - Fitted dark charcoal/black combat vest with reinforced utility harness.
  - Wide tactical belt with cursed tool holsters at `y = +r * 0.60`.
  - Deep obsidian combat cargo trousers flowing down to reinforced boots at `+r * 1.00`.
- **Default Symmetrical Hands (Rule 20)**:
  - **Left Hand**: `(x: -r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30`.
  - **Right Hand**: `(x: +r * 0.82, y: +r * 0.38)` with `handRadius = r * 0.30` gripping the Split Soul Katana hilt.
  - Both hands render on the front layer overlapping the lower body perimeter.
  - Supports `state.showSkinOnly` toggle.

### 2. Discrete Pixel Art Rasterization ($P = 2.0\text{px}$) & Offscreen Canvas Cache (Rule 3.5)
- Model rasterized into an axis-aligned in-memory canvas (`_cachedMakiCanvas`) via `_renderMakiPixelBodyToCanvas(destCtx, r)`.
- Blitted during rotated gameplay frames using a single `ctx.drawImage` call with `ctx.imageSmoothingEnabled = false;`.
- Strict 4-neighbor attached boundary shell test with solid dark manga ink outline (`#0E0F14`) and zero disconnected floating crumbs.

### 3. Crescent Blade Slashes & Dynamic Eraser Wipe (Rule 15 Standard)
- **Split Soul Katana Slashes**: Double-tapered crescent arcs with deep obsidian/violet outer aura (`#8B5CF6`), pure razor-white core (`#FFFFFF`), and crimson fracture edge (`#DC2626`).
- **Eraser Wipe**: During recovery frames, trailing tails chase the blade tip smoothly via sinusoidal decay.

### 4. Manga Action Speed Lines (Rule 16 Standard)
- 4-point filled needle polygons trailing opposite her velocity vector (`-cos(gunAngle)`, `-sin(gunAngle)`).
- 4-slot theme palette: Obsidian Ink (`#18181B`), Crimson Fury (`#DC2626`), Soul Violet (`#8B5CF6`), Razor White (`#FFFFFF`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | In Sensory Flow | Notes |
| :--- | :--- | :--- | :--- |
| **HP** | `1050` | `1050` | Heavy frontline health pool with superhuman durability |
| **Base Speed** | `5.20` | `6.50` (`+25%`) | High sprint velocity with frictionless atmospheric stepping |
| **Body Radius** | `24px` | `24px` | Standard agile combat hitbox |
| **Melee Reach** | `115px` | `135px` | Wide multi-target frontal arc blade reach |
| **Damage Mitigation** | `15%` | `25%` | Inherent physical resistance to standard blunt/kinetic impacts |
| **Critical Hit Rate** | `20%` | `40%` | Soul-splitting precision strikes |

---

## ⚡ Passives & Inherent Mechanics

### 1. 👻 Heavenly Restriction: Complete (0 Cursed Energy & Domain Untargetability)
Maki possesses absolute zero cursed energy, operating as an invisible physical anomaly to Jujutsu sorcery:
* **Domain & Stasis Invisibility**:
  - Closed Domain Expansions (Gojo's *Unlimited Void*, stasis fields) cannot trap or freeze Maki.
  - Domain sure-hit attacks treat Maki as an inanimate object and fail to lock onto her.
* **Auto-Aim Disruption**:
  * Enemy homing projectiles and automated targeting systems suffer a $35^\circ$ spread inaccuracy penalty against Maki.

---

### 2. 🗡️ Split Soul Katana: True Soul Cleave & Anti-Heal (*Shakkontō*)
Maki's primary cursed tool ignores physical toughness and cuts directly through the contours of the soul:
* **True Damage**: All basic attacks and blade skills deal pure unmitigated True Damage, ignoring enemy armor, shields, and damage reduction buffs.
* **Soul Wound (Anti-Regeneration Debuff)**:
  - Striking an opponent inflicts a **Soul Bleed** debuff for **4.0 seconds**.
  - Afflicted targets suffer **75% reduced healing & regeneration** (severely restricting Gojo RCT, Sukuna regeneration, and Nezuko healing).
  - Ticks small soul fracture damage every 30 frames (`10 true damage / sec`).

---

### 3. 💨 Atmospheric Surface Stepping & Flow Evade
Maki perceives the subtle density and temperature differentials in the atmosphere, treating the air as a solid physical foothold:
* **Mid-Air 360° Air Vectors**:
  - Maki can execute an airborne vector step (double jump/pivot) to instantly redirect velocity in any direction.
* **Flow State Micro-Dodge**:
  - When an incoming enemy melee swing or projectile comes within $45\text{px}$, Maki automatically slips through the strike with an afterimage step, taking 0 damage and gaining $+25\%$ movement speed for 1.5s (8.0s internal cooldown).

---

## ⚔️ Active Skills & Ultimate

### 🗡️ Basic Attack: *Split Soul Sword Combo*
* A 3-hit forward lunging sword combo (Slash $\to$ Rising Cleave $\to$ Overhead Soul Smash):
  - **Hit 1**: 28 True Damage, 130° frontal arc, fast startup.
  - **Hit 2**: 34 True Damage, 140° frontal arc, creates vacuum pull.
  - **Hit 3**: 48 True Damage, launches target into ground bounce with crimson soul shockwave.

---

### 💥 Skill 1: *Dragon-Bone Kinetic Jet Burst (Ryūhoku)*
* **Cooldown:** `7.0s` (`420 frames`)
* **Kinetic Storage**:
  - Taking damage or striking enemies stores kinetic energy in the Dragon-Bone blade's 3 rear exhaust nozzles.
* **Active Release**:
  - Maki ignites the rear nozzles, rocketing forward at extreme velocity in a supersonic thrust:
  - **Base (0–1 Stacks)**: Deals 55 True Damage and thrusts 180px forward.
  - **Overdrive (3 Stacks)**: Deals 110 True Damage, wall-pins the opponent, and triggers a massive fiery kinetic shockwave in a 160px radius.

---

### 🥋 Skill 2: *Zen'in Annihilation Riposte (Severing Stance)*
* **Cooldown:** `9.0s` (`540 frames`)
* Maki enters a 0.35s counter stance holding her blade reverse-gripped.
* **On Parry**:
  - Slashes through the incoming attack, teleporting instantly behind the attacker.
  - Delivers a vertical bisection cleave dealing **70 True Damage**, staggering the target for 45 frames and silencing their basic attacks for 1.5 seconds.

---

### 🌌 Ultimate: *Sakurajima Awakening: "Everything is Visible"*
* **Cooldown:** `35.0s` (`2100 frames`)
* Maki achieves absolute enlightenment, perceiving all entities, air currents, and soul boundaries:
* **Phase 1 (Manga Desaturation & Flow Lock)**:
  - The arena desaturates into high-contrast black-and-white manga line art with floating crimson air ripples.
  - Maki vanishes from sight and steps on 3 atmospheric footholds around the target.
* **Phase 2 (Triangular Soul Flurry)**:
  - Maki delivers 3 ultra-fast flash slashes from different angles (`3 × 35 = 105 True Damage`).
* **Phase 3 (Bisecting Soul Execution)**:
  - Maki drops from above with a two-handed downward soul cleave dealing **120 True Damage** (Total: **225 True Damage**).
  - Triggers a full-screen crimson and violet visceral soul fracture line.
  - **Minion Obliteration**: Instantly shatters and destroys all active enemy summons, clones, or constructs (Rika, Illusions, Clones, Turrets) caught in the blast.

---

## 🔊 Sound Design & Audio Palette

| Event | Sound Asset / Synthesizer | Description |
| :--- | :--- | :--- |
| **Split Soul Slash** | `Assets/Sound Effects/Attacks/sword_slash_heavy.mp3` | Sharp, reverberating razor steel slice with deep bass |
| **Soul Wound Proc** | Custom Web Audio Violet Frequency ($880\text{Hz} \to 220\text{Hz}$) | Ghostly soul tearing resonance |
| **Dragon-Bone Jet** | `Assets/Sound Effects/Attacks/rocket_boost.mp3` | Explosive kinetic backfire exhaust roar |
| **Parry Riposte** | `Assets/Sound Effects/Attacks/parry_clash.mp3` | Heavy metallic spark clash followed by flesh bisection |
| **Ultimate Flow** | `Assets/Sound Effects/Attacks/manga_impact_boom.mp3` | Bass-heavy cinematic warp drop followed by rapid slashes |
