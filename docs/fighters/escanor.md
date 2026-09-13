# Escanor — The Lion's Sin of Pride

**Category:** Anime  
**Origin:** The Seven Deadly Sins (*Nanatsu no Taizai*)  
**Color:** Solar Gold / Radiant Amber (`#F59E0B` / `#FBBF24` / `#D97706`)  
**Role:** Colossal Burst Juggernaut, Sacred Treasure Executioner, Solar Brawler  

---

## Lore / Background

Escanor is the **Lion's Sin of Pride** of the Seven Deadly Sins, the former Second Prince of the Kingdom of Castellio, and the master of the tavern *My Sweet Glinia*. He possesses the Grace **"Sunshine"** (太陽 *Taiyō*), a divine gift originally bestowed by the Supreme Deity. 

During the night, Escanor is frail, timid, and polite. But as the sun rises in the morning sky, his physical frame expands into a towering monolith of muscle, his polite demeanor turns into absolute towering arrogance, and his magical power escalates boundlessly until high noon. At exact noon, for a single minute, Escanor transforms into **"The One"** — the invincible incarnation of limitless solar power, standing supreme at the pinnacle of all living beings.

> *"Apologize to me that you were born into my world."*  
> — Escanor, to Galand of the Ten Commandments

---

## Visual Design & Aesthetic Standards

- **Body Orientation:** Strictly adheres to **Rule 19 (Upright Front POV Camera Orientation)**. The character faces the camera upright with `-Y` pointing toward the hair crown and `+Y` pointing toward the torso and belt.
- **Facial Features:** Strictly adheres to **Rule 19 (Prohibition of Eyes, Mouth, and Nose)**. Character identity is expressed through his chiseled jawline, proud amber **handlebar mustache silhouette**, and noble features without any eyes, pupils, or mouths.
- **Hair Design:** Adheres to **Rule 19.1 (Discrete Lock Arrays & Proportional Bands)**. Features swept-back golden-blonde locks with discrete bangs and crown spikes extending past the circle boundary (`-r * 1.15` to `-r * 0.35`) in a 4-tone palette (highlights `#FEF08A`, base `#F59E0B`, warm amber `#D97706`, root shadow `#78350F`).
- **Attire (Day Form Holy Armor):** Escanor's iconic **Holy Knight Golden Armor**:
  - **Shoulder Pauldrons:** Brilliant curved Royal Blue / Azure pauldrons (`#2563EB` / `#1D4ED8`) with white heraldic sun crests and polished gold rims.
  - **Cuirass / Breastplate:** Tiered, segmented golden dragon-scale sun plates (`#FBBF24` / `#F59E0B`) with central specular highlight ridge and high protective golden gorget collar.
  - **Faulds & Tassets:** Articulated scalloped golden hip plates and groin tasset.
  - **Gauntlets:** Heavy polished golden plate gauntlets gripping the Sacred Treasure Rhitta.
- **Sacred Treasure Rhitta:** Giant curved golden crescent battleaxe with solar core and engraved filigree held in golden gauntlet hands.
- **Solar Aura:** Radiant concentric golden gradient rings and shimmering heat waves (Rule 11 compliant: **0% shadowBlur CPU filters**).

---

## Stats (Baseline)

| Stat | Value | Notes |
|---|---|---|
| **HP** | `390` | Heavy juggernaut vitality |
| **Move Speed** | `5.7` | Imposing, measured warrior stride |
| **Basic Attack Range** | `75 px` | 140° frontal arc reach with Rhitta |
| **Basic Damage** | `28 – 36` | Devastating single-hit physical cleave |
| **Armor / Damage Resistance** | `10%` | Enduring physical resilience |
| **Sacred Treasure** | *Divine Axe Rhitta* | One-handed colossal golden battleaxe |

---

## Abilities & Mechanics

### Passive: Sunshine & Pride Escalation (恩寵「太陽」)

Escanor constantly radiates a searing field of solar heat that scorches nearby enemies.

- **Solar Heat Aura:** Enemies within `60px` of Escanor take continuous burn ticks (`3` true damage per second) and have their projectile speed reduced by `15%` due to intense thermal updrafts.
- **Pride Escalation (Solar Power Charge):** Escanor gains **Solar Pride** over time (1 stack every 2.5 seconds) and whenever he lands attacks. Each stack (up to 5 stacks) increases his attack damage by `+8%` and widens his solar aura radius.
- **Unflinching Nobility:** When above 50% HP, Escanor's pride prevents him from being staggered by minor hits, reducing all incoming knockback by `40%`.

---

### Basic Attack: Divine Axe Rhitta — Sacred Cleave (神斧 リッタ)

Escanor delivers a mighty one-handed swing with the Sacred Treasure *Divine Axe Rhitta*.

- **Mechanic:** Sweeps the massive golden battleaxe in a **140° frontal arc cone** with a `75px` blade reach.
- **Multi-Target AOE (Rule 7 Standard):** Hits all enemy fighters and illusions in the frontal arc.
- **Damage:** `28 – 36` physical slashing damage + `6` solar burn damage.
- **Shockwave & Heat Trail:** Spawns a golden solar crescent trail and a concussive golden shockwave that pushes enemies back by `6.5px`.
- **Cooldown:** `0.58s` (28 frames) between swings.

---

### Skill 1: Cruel Sun (無慈悲な太陽 - Mujahi na Taiyō)

Escanor condenses pure radiant solar energy into a miniature, searing star above his palm and hurls it across the battlefield.

- **Activation:** Escanor raises his hand/Rhitta, forming a blazing golden miniature sun orb over `16 frames`.
- **Projectile Trajectory:** Launches the Cruel Sun forward at high velocity (`10.5` speed).
- **Target Impact:** On contact with an enemy or arena wall, the sun erupts into a violent **Solar Flare Explosion** (radius `80px`):
  - Primary target takes `65` solar damage.
  - Surrounding enemies caught in the blast take `38` AOE thermal damage + `4` second burning debuff (`4` dmg/sec).
  - Massive concussive outward knockback (`14` impulse force).
- **Cooldown:** `8.5` seconds.

---

### Skill 2: Pride Flare (プライド・フレア - Puraido Furea)

Escanor commands all solar heat energy in the area and within Rhitta to detonate instantaneously with the command: *"Pride Flare!"*

- **Mechanic:** Escanor slams the ground or snaps his fingers, causing all existing Cruel Sun orbs and his own solar aura to detonate simultaneously in a colossal spherical thermal nova (radius `110px`).
- **Damage:** `52` instant burst damage to all enemies in radius.
- **Disruption:** Paralyzes enemies caught in the epicenter for `0.6s` with blinding solar glare and applies strong radial knockback pushing them against the arena walls.
- **Cooldown:** `11.0` seconds.

---

### Ultimate: "THE ONE" — Divine Sword Escanor (天上天下唯我独尊 / 聖剣エスカノール)

At the zenith of combat, Escanor taps into the pinnacle state of high noon: **"The One"**.

- **Transformation:** For `8` seconds, Escanor ascends to the invincible incarnation of power:
  - His body circle expands slightly (`radius + 4px`) surrounded by a blazing solar corona.
  - Immune to all crowd control, hit stun, time stop, and slow debuffs.
  - Attack damage increased by `+45%`.
- **Divine Sword Escanor (Finisher Cleave):** During *The One*, Escanor lunges forward and delivers a simple, unadorned downward vertical chop with his bare hand or Rhitta:
  - Deals `115` unmitigated true damage to enemies in a direct line ahead (`120px` length).
  - Splits the arena ground with a blazing golden solar fissure.
  - Blasts surviving enemies across the arena into wall ricochets.
- **Cooldown:** `26` seconds.

---

## Weapon Review & Menu Specifications

- **Weapon Name:** `DIVINE AXE RHITTA`
- **Category:** `SACRED TREASURE // SOLAR HEAT`
- **Description:** *"Legendary giant golden battleaxe capable of storing and releasing Escanor's boundless solar heat. Channels 140° Divine Slashes, Cruel Sun blazing orbs, Pride Flare solar bursts, and the invincible 'The One' form."*
- **Visual Features:** Ornate golden crescent blade, ruby solar gem core, spiked golden pommel, and animated golden thermal heat trails.
