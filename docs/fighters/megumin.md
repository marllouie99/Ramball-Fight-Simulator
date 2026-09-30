# Megumin — The Crimson Demon Archmage

**Category:** Anime & Fantasy / *KonoSuba: God's Blessing on this Wonderful World!*  
**Theme Color:** Crimson Red & Arcane Gold (`#C81D25` / `#FFD166` / `#7B0828`)  
**Role:** Cataclysmic Glass Cannon Artillery, Single-Spell High-Stakes Nuker, Tactical Chanting Specialist  

---

## 📖 Lore & Character Philosophy

Megumin is the premier Archmage of the renowned **Crimson Demon Clan (*Kōmaminzoku — 紅魔族*)**, hailing from the fantasy world of Axel. Gifted with prodigious magical aptitude and immense intellect, Megumin chose to forsake all standard spell utility, elemental balance, and basic martial arts for a singular, uncompromising obsession: **Explosion Magic (*Bakuretsu Mahō — 爆裂魔法*)**.

Driven by pure *chuunibyou* flair, theatrical posturing, and romanticized devotion to the ultimate destructive art, Megumin allocated every single skill point into boosting the power, chant speed, and apocalyptic radius of Explosion. In battle, she categorically refuses to cast any other offensive spell or swing a conventional weapon.

In the *Circle Mini-Battle* arena, Megumin is the ultimate high-stakes archetype:
* **Strict Single-Spell Offense**: She possesses **EXACTLY 1 offensive ability — EXPLOSION!**
* **The Dramatic Incantation**: Unleashing Explosion requires a long, cinematic, theatrical chanting incantation during which she gathers atmospheric mana while evading or parrying attacks.
* **Apocalyptic Screen Detonation**: Once the incantation completes, Megumin releases a cataclysmic, multi-stage nuclear explosion that obliterates health bars and engulfs the arena in blinding crimson light.
* **Total Mana Burnout (The Faceplant)**: The spell consumes 100% of her mana and stamina in a single blast. Immediately upon firing, Megumin exhausts herself and collapses face-down onto the floor, unable to move or fight further.

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard)
Megumin’s body model, hat, hair silhouette, and wizard robes strictly adhere to the front-profile camera orientation standard:
- **Head & Brunette Bob (`-Y` to `Y ~ 0`)**:
  - **Hair Silhouette**: Voluminous dark brunette anime bob (`#22121E` to `#3B2032`) with distinct discrete pointed locks framing both sides of the face, sweeping fringe bangs across the forehead, and a signature cute crown tuft/ahoge at `y = -1.22r`.
  - **Eyepatch & Seal**: Iconic black rectangular eyepatch with gold cross trim covering her right eye (`Y ~ 0`). During chant overcharge, the eyepatch pulses with a glowing ruby cross glint.
  - **Faceless Minimalist Aesthetic (Rule 19)**: Clean faceless circle body (zero eyes, pupils, mouth, or nose).
- **Robes & Attire (`+Y`)**:
  - **Crimson Tunic**: Symmetrical scarlet tunic robe (`#C81D25`) with gold filigree collar and hem trim.
  - **Waist Belt & Choker**: Dark brown leather belt with brass buckle at `y = +0.55r` and a black throat choker with a central gold gem.
  - **Wizard Cape**: Flowing crimson cape with golden lining pinned at her right shoulder with an ornate round brooch.
  - **Mismatched Legwear**: Asymmetric bandages wrapped along one leg and a high dark stocking on the other.
- **Weapon & Hand Stance (Rule 20)**:
  - **Front Hand (Casting Hand)**: Positioned at `(0, 0)` grasping her Archmage Staff.
  - **Archmage Staff Model**: Long walnut-wood staff crowned with an ornate gold claw mounting an unearthly floating Crimson Mana Sphere that spins and intensifies during chant channeling.
  - **Back Hand (Chuunibyou Pose)**: Positioned in a dramatic open-palm gesture at `(1.05r, 0)` framing her face or staff.
  - **Faceplant Depletion Sprite**: When exhausted, Megumin switches to a horizontal collapsed sprite flat against the floor with comical spiral sweat runes.

### 2. Discrete Grid Rasterization ($P = 2.0\text{px}$) & Offscreen Canvas Cache (Rule 3.5)
- Megumin's pixel art body, wizard hat, and staff are rasterized ONCE into an offscreen canvas (`_cachedFighterCanvas`) using discrete $2.0\text{px}$ Cartesian grid blocks.
- Blitted directly during gameplay via `ctx.drawImage` with `ctx.imageSmoothingEnabled = false;` to guarantee zero rotated sub-pixel grid artifacts and locked 60 FPS performance.

### 3. Particle VFX & Concentric Auras (Rule 11 Zero shadowBlur Standard)
- **Arcane Rune Circles**: Concentric transparent gradient circles with rotating geometric Crimson Demon glyphs drawn via flat vector math.
- **Mana Vortex**: Spiral inward particle streams pulling red/gold embers toward the staff orb.
- **Zero CPU `shadowBlur`**: Visual bloom and glows are rendered exclusively through multi-tier transparent color layering.

### 4. Manga Action Speed Lines (Rule 16 Standard)
- 4-point filled needle polygons (`maxThick: 1.0px – 2.0px`) trailing strictly behind Megumin during evasive hops and cape flutters.
- **4-Slot Color Theme**: Crimson Flare (`#C81D25`), Solar Gold (`#FFD166`), Pure White Mana Core (`#FFFFFF`), and Deep Obsidian Ink (`#14080E`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Chanting State | Depleted State | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **HP** | `280` | `280` | `280` | Fragile glass cannon health pool |
| **Base Speed** | `2.45` | `0.40` (`-84%`) | `0.00` (Immobile) | High evasion while free; slow while chanting |
| **Body Radius** | `25px` | `25px` | `25px` | Standard fighter hitbox size |
| **Offensive Attacks** | **1 Only** | **1 Only** | **0** | **Explosion is her sole damaging ability** |
| **Chant Duration** | `240 frames` (4.0s) | — | — | Can be accelerated via Chuunibyou Focus |
| **Explosion True Damage**| `420 True Dmg` | Scaling | — | Bypasses shields and damage reduction |
| **Blast Radius** | `260px` | Scales w/ Chant | — | Near arena-wide cataclysmic AOE |
| **Burnout Duration** | `360 frames` (6.0s) | — | — | Fully prone and helpless after cast |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🌟 The One True Path (*Bakuretsu no Michi — 爆裂の道*)
Megumin has dedicated her entire soul and skill tree exclusively to Explosion Magic:
* **Single Offensive Spell Constraint**: Megumin cannot perform standard melee strikes, basic weapon attacks, or secondary damage spells.
* **Basic Input Replaced**: Pressing basic attack triggers **Staff Twirl Parry & Evasive Hop** (defensive utility), deflecting incoming projectiles and creating distance rather than dealing damage.

---

### 2. 📜 Crimson Demon Incantation Resonance (*Eishō Kyōmei — 詠唱共鳴*)
The majesty of Explosion scales directly with the completeness of Megumin's chanting:
* **Chant Gauge (0% to 100%)**:
  * Chanting steadily fills the **Incantation Gauge** over `240 frames` (4.0 seconds).
  * Chanting cannot be canceled once initiated unless interrupted by hard crowd control (Stun, Freeze, Paralyze).
* **Power Scaling**:
  * **Quick Release (50%–75% Chant)**: Moderate explosion radius (`180px`), `260 True Damage`.
  * **Full Incantation (100% Chant)**: Gargantuan explosion radius (`260px`), `420 True Damage`, creates lingering firestorm vortex, and applies violent global screen shake.
  * **Overcharged Incantation (>100% via Chuunibyou Focus)**: `500 True Damage` + full arena screen-engulfing white flash.

---

### 3. 💤 Total Mana Burnout: The Faceplant (*Kansenshitai — 完全脱力*)
* **Instant Stamina Drain**: The exact frame the Explosion shockwave erupts, Megumin's mana pool is completely emptied.
* **Prone State**: Megumin immediately collapses face-down on the arena floor (`isDepleted = true`, `speed = 0`).
* **Helpless Duration**:
  * She remains prone and immobilized for **360 frames** (6.0 seconds), rendering her completely vulnerable to any surviving opponents.
  * In Tag Team / Duo mode, she must be protected or tagged out while prone.
  * Comedic speech bubble displays random post-explosion ratings: *"120 points!"*, *"I can't move..."*, *"A splendid explosion!"*.

---

### 4. 🎭 Chuunibyou Dramatic Posturing (*Chūnibyō Pōzu — 中二病ポーズ*)
* When Megumin stands still or successfully dodges an attack, she strikes dramatic anime poses with her cape and staff.
* Posturing accelerates her Chant Gauge generation by **+50%** and emits swirling arcane rune particles that slightly repel incoming standard bullets.

---

## ⚔️ Moveset & Abilities Breakdown

```
================================================================================
                           MEGUMIN MOVESET MATRIX
================================================================================
 [Basic Action]  -> Staff Twirl Parry & Panic Hop    (Defensive / Projectile Deflect)
 [Skill 1]       -> Chuunibyou Focus & Rune Stance   (Accelerates Chant / Mana Shield)
 [Skill 2]       -> Eyepatch Seal Release: Crimson Gleam (Flash Blind / Crowd Push)
 [Mobility]      -> Archmage Cape Flutter Dash       (Speed Line Evasive Leap)
 [SOLE ULTIMATE] -> "EXPLOSION!" (Bakuretsu Mahō)    (Cinematic Arena-Wide Nuke)
================================================================================
```

---

### 🛡️ Basic Action: Staff Twirl Parry & Panic Hop (*Tsue no Bōgyo & Panikku Hoi*)
* **Type**: Non-Damaging Defensive Parry & Evasive Reposition
* **Cooldown**: `45 frames` (0.75s)
* **Mechanics**:
  * Megumin spins her walnut staff in a rapid circular motion in front of her body for `18 frames`.
  * **Projectile Reflection**: Any standard enemy projectile contacting the spinning staff is deflected away safely.
  * **Panic Hop**: Immediately following the spin, Megumin hops backward `60px` away from the nearest enemy with comical panic speed lines, ensuring safe chanting distance.
  * Deals **0 damage**.

---

### 🔮 Skill 1: Chuunibyou Focus & Arcane Barrier (*Kōbō no Eishō — 紅魔の詠唱構え*)
* **Type**: Chanting Acceleration & Shimmering Magic Shield
* **Cooldown**: `300 frames` (5.0s)
* **Duration**: Up to `120 frames` (2.0s) of channeled focus
* **Mechanics**:
  * Megumin plants her staff firmly into the ground and chants in an exaggerated dramatic stance.
  * Manifests a translucent hexagonal Crimson Demon Barrier (`#FF3366` with glowing rune glyphs) that absorbs up to `90 damage` of incoming attacks.
  * While active, fills the **Explosion Chant Gauge at 2.5× normal speed**.
  * If the barrier is broken, Megumin stumbles back slightly but retains accumulated chant progress.

---

### 👁️ Skill 2: Eyepatch Seal Release: Crimson Gleam (*Fūin Kaijo: Kurenai no Senkō — 封印解除*)
* **Type**: Crowd-Control Flash & Area Pushback
* **Cooldown**: `420 frames` (7.0s)
* **Range**: `140px` radial cone
* **Mechanics**:
  * Megumin theatrically lifts her black eyepatch, unleashing a brilliant ruby-red flare from her sealed Crimson Demon eye.
  * **Blinding Flash**: Enemies caught in the 140px cone are afflicted with **Blind & Flinch for 35 frames**, interrupting their ongoing attack animations and reducing movement speed by **60% for 1.5s**.
  * **Shockwave Repel**: Pushes nearby melee attackers back `80px`, buying crucial uninterrupted chanting time.
  * Deals **0 damage**.

---

### 🌪️ Mobility: Archmage Cape Flutter Dash (*Kōma no Shundō — 紅魔の瞬動*)
* **Type**: High-Agility Evasive Warp / Cape Glide
* **Cooldown**: `160 frames` (2.6s)
* **Mechanics**:
  * Megumin swooshes her scarlet wizard cape, dashing rapidly `110px` in the input direction.
  * Leaves behind a puff of crimson smoke with floating black demon runes.
  * Grants **12 frames of invulnerability (i-frames)** to dodge through lethal beams, cleaves, or artillery.

---

### 💥 THE SOLE OFFENSIVE SPELL: "EXPLOSION!" (*Bakuretsu Mahō — 爆裂魔法*)

> *"Darkness blacker than black and darker than dark, I beseech thee, combine with my deep crimson.*  
> *The time of awakening cometh! Justice, fallen upon the infallible boundary, appear now as an intangible distortion!*  
> *Dance, dance, dance! I desire for my torrent of power a destructive force: a destructive force without equal!*  
> *Return all creation to cinders, and come forth from the abyss!*  
> ***Crimson Magic: EXPLOSION!***"

* **Type**: 4-Phase Cinematic Arena Cataclysm (Rule 1.4 Committed Aim Lock)
* **Chant Windup**: `240 frames` (4.0s) default (can be reduced with Chuunibyou Focus)
* **Aiming**: 360° Omnidirectional lock committed upon cast initiation (`Math.atan2(dy, dx)`); aim locks rigidly throughout casting.

#### 🌟 The 4 Phases of Explosion:

```
[ Phase 1: Incantation Chant ] -> [ Phase 2: Gravitational Vortex ] -> [ Phase 3: Apocalyptic Detonation ] -> [ Phase 4: Faceplant Burnout ]
   (Rotating Arcane Circles)          (Singularity & Aim Lock)               (420 True Dmg Super-Nuke)           (6.0s Helpless Prone)
```

1. **Phase 1: The Grand Incantation (Chant Windup — 240 frames)**:
   - Megumin points her staff toward the target coordinate.
   - Dual concentric Crimson Demon magic circles (`radius: 70px` and `140px`) spawn on the ground beneath Megumin and at the target impact zone, rotating in opposite directions.
   - The arena background progressively dims to deep charcoal-red (`#18080C`) while floating runic kanji (*紅魔 / 爆裂 / 破滅*) radiate outwards.
   - High-pitch mana resonance frequency rises steadily.

2. **Phase 2: Gravitational Singularity (30 frames before blast)**:
   - A superdense black-crimson orb of concentrated mana coalesces at the target impact point.
   - Strong gravitational vortex pulls all enemies within `200px` toward the center singularity (`pullSpeed: 6 px/frame`), preventing last-second escape.

3. **Phase 3: The Super-Nuke Detonation (Impact Frame & Blastwave)**:
   - Megumin screams *"EXPLOSION!"* as a towering pillar of incandescent crimson and blinding pure-white light erupts from the singularity into the stratosphere.
   - **Multi-Layered Blastwave**:
     - **Core Epicenter (`0–120px`)**: Deals **420 True Damage** (bypasses barriers, shields, and defense buffs) with violent screen shake.
     - **Outer Shockwave (`120–260px`)**: Deals **260 True Damage** and launches surviving enemies against arena walls with massive wall-bounce impact.
     - **Arena Scorching**: Leaves a permanent smoldering crater decal on the arena floor with rising ember embers and smoke plumes.

4. **Phase 4: Total Exhaustion & Faceplant (Post-Blast Burnout — 360 frames)**:
   - Megumin's staff slips from her grasp and clatters to the ground.
   - She falls face-first onto the arena floor, completely drained with zero movement speed and no defensive capabilities for **6.0 seconds**.
   - If the opponent survived the blast, Megumin is at their mercy; if the blast wiped them out, Megumin claims victory from the floor!

---

## 🎵 Audio Sound Effects & Voicelines Mapping

| Event / Action | Audio File Path | Description |
| :--- | :--- | :--- |
| **Staff Twirl Parry** | `Assets/Sound Effects/Skills/parry.mp3` | Crisp wooden staff deflect chime |
| **Panic Hop** | `Assets/Sound Effects/Skills/dash1.mp3` | Quick cartoon evasive leap |
| **Eyepatch Flash** | `Assets/Sound Effects/Skills/enhance.mp3` | High-frequency magical shimmer flare |
| **Arcane Barrier** | `Assets/Sound Effects/Skills/shieldcharge.mp3` | Resonant crystalline barrier hum |
| **Incantation Chanting**| `Assets/Sound Effects/Skills/genos-ultimatecharging.mp3` | Rising high-pitch mana frequency drone |
| **Mana Vortex Pull** | `Assets/Sound Effects/Skills/gravitypull.mp3` | Deep gravitational spatial distortion whoosh |
| **EXPLOSION! Detonation**| `Assets/Sound Effects/Skills/fugaexplode.mp3` & `Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3` | Earth-shattering dual-layer nuclear explosion blast |
| **Staff Drop & Collapse**| `Assets/Sound Effects/Skills/johnwick-gundrop.mp3` | Comedic staff clatter on the floor |

---

## 🛠️ Engine Compliance & Technical Architecture

### 1. Freeze & Time-Stop Early Guard (Rule 1.1)
```javascript
const isFrozen = this._handleTimeStop();
if (isFrozen || this.isTargetOfAmbush) {
  this.interruptAttacks();
  return; // MANDATORY: Stop update execution when frozen
}
```

### 2. Committed Aim Lock During Incantation (Rule 1.4)
```javascript
// Snapshot angle at the beginning of Explosion channeling
if (this.isCastingExplosion) {
  this.gunAngle = this.committedCastAngle;
  this.angle = this.committedCastAngle;
  // Disable dynamic aim tracking during chanting
}
```

### 3. Offscreen Canvas Rasterization & Render Blit (Rule 3.5)
```javascript
// Rasterize once to offscreen canvas
if (!this._cachedFighterCanvas || this._cachedFighterR !== this.r) {
  this._renderMeguminPixelBodyToCanvas(this._offscreenCtx, this.r);
  this._cachedFighterR = this.r;
}
// Blit with zero anti-aliasing seams
ctx.imageSmoothingEnabled = false;
ctx.drawImage(this._cachedFighterCanvas, -width / 2, -height / 2);
```

### 4. Zero `shadowBlur` Prohibition (Rule 11)
All glowing runes, mana rings, and explosion blast fireballs are constructed with radial gradient math (`ctx.createRadialGradient`) and stepped concentric circles with zero CPU `shadowBlur` or `shadowColor` calls.

---

## 📁 Proposed Codebase File Structure

| Target File | Purpose |
| :--- | :--- |
| `docs/fighters/megumin.md` | Complete character design & technical specification document |
| `js/entities/fighters/megumin.js` | Megumin fighter class, state machine, chanting loop & faceplant state |
| `js/configs/characters/meguminConfig.js` | Config constants, chant timers, damage parameters & hitbox radii |
| `js/graphics/meguminGraphics.js` | Offscreen pixel art rasterizer, staff rendering, arcane rune magic circles & explosion VFX |

---
