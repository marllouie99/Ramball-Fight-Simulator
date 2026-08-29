# Ulquiorra Cifer (Cuatro Espada)

**Category:** Anime & Fantasy  
**Color:** Emerald Green / Abyssal Black (`#00FF88`, `#0B0E14`)  
**Role:** High-Mobility Tactical Zoner, High-Attrition Executioner, Multi-Stage Transformer  

---

## Lore / Background

The 4th Espada in Sōsuke Aizen's Arrancar army, Ulquiorra Cifer represents the **Aspect of Death: Emptiness / Nihility (虚無 - Kyomu)**. Cold, calculating, and seemingly devoid of emotion, Ulquiorra views the world strictly through what his eyes can perceive, questioning the existence of the intangible human "heart." 

Unlike other Espada who traded regenerative capability for raw destructive power, Ulquiorra preserved the rare hollow trait of **High-Speed Regeneration (超速再生)**. In battle, he overwhelms adversaries with ruthless composure, instantaneous *Sonído* displacement, razor-sharp *Murciélago* slashes, and devastating emerald *Cero* blasts. Beyond his formidable first release, Ulquiorra possesses an unprecedented **Second Release (Segunda Etapa)**—a monstrous evolution unseen even by Aizen himself.

---

## Abilities & Mechanics

```
                             [ BASE FORM ]
                     (High-Speed Regen / Hierro / Bala / Cero)
                                   │
                     (Full Ultimate Bar or < 60% HP)
                                   ▼
                   [ STAGE 1: RESURRECCIÓN (MURCIÉLAGO) ]
               (Bat Wings, Double Sonído, Cero Oscuras, +35% Spd)
                                   │
                     (Re-activate or Fall < 30% HP)
                                   ▼
                 [ STAGE 2: RESURRECCIÓN (SEGUNDA ETAPA) ]
            (Devil Claws & Whip Tail, Lanza del Relámpago Nuclear Spear)
```

---

### 🛡️ Passive 1: Hierro (鋼皮 — Steel Skin)
The Arrancar's signature hardened spiritual outer layer.
* **Innate Damage Mitigation:** Ulquiorra possesses an innate **15% flat damage reduction** against incoming melee strikes, bullets, and light projectile hits.
* **Hyper-Armor Recovery:** Flinch hit-stun durations decay 25% faster, preventing opponents from easily locking him into uninterrupted stun chains.

---

### 💚 Passive 2: High-Speed Regeneration (超速再生 — Chōsoku Saisei)
Ulquiorra sacrificed maximum destructive stat scaling to preserve the ancient Hollow ability of biological flesh recovery.
* **Autonomous Cellular Healing:** When out of heavy combat for 1.5s or whenever his health falls below 50%, Ulquiorra continuously recovers **2.5% max HP per second**, accompanied by faint floating emerald cellular particles (`#00FF88`).
* **Limb & Wing Regeneration:** If his bat wings or limbs take critical structural damage during Resurrección, they regenerate rapidly once out of hit-stun, ensuring long-term battle attrition superiority.

---

### 🖤 Passive 3: Solitud Aura (虚無の威圧 — Aspect of Nihility)
The overwhelming, cold heaviness of his dense spiritual pressure (*Reiatsu*).
* **Atmospheric Suppression:** Enemies within close proximity (120px) suffer a **15% reduction in movement speed** and slightly slowed stamina/cooldown regeneration, visualised by subtle dripping black mist rising from the arena floor.

---

### 🗡️ Basic Attack: Murciélago Slashes & Piercing Hand Thrust
Ulquiorra dynamically shifts between precise blade swings and lethal bare-handed strikes.

* **Zanpakutō Cleave (Frontal Arc Reach):**
  * Slashes in a crisp **120° frontal arc** with his green-hilted Zanpakutō *Murciélago*, striking all enemies and illusions within blade reach with emerald slicing arcs and solid physical knockback ([Rule 7](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L48-L53)).
* **Lethal Heart Thrust:**
  * Every 3rd basic attack executes a lightning-fast forward piercing hand thrust aimed at the opponent's chest collarbone, dealing bonus shield-shredding damage.

---

### 🟢 Mid-Range Poke: Bala (虚弾 — Hollow Bullet)
A high-velocity projectile twenty times faster than a standard Cero, fired directly from his fingertip.
* **Rapid Suppression:** Fires a burst of 3 high-speed emerald Reishi spheres in rapid succession (Cooldown: 2.2s).
* **Usage:** Used to disrupt enemy channeling, pop incoming light projectiles, and keep aggro fighters at mid-range distance.

---

### 💨 Skill 1: Sonído: Aceleración (響転 — Resonating Sound Burst)
Instantaneous high-speed spatial step that surpasses visual perception.

* **Mechanic:** Ulquiorra vanishes with the authentic high-pitch Sonído audio shutter, teleporting instantly across 160–240px to the target's flank or rear.
* **Tactical Strike:** Upon reappearing, he instantly executes a high-speed downward slash or gut-kick that inflicts momentary hit-pause on the victim.
* **Manga Speed Lines ([Rule 16](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L182-L245)):** Employs 4-point filled needle polygons trailing directly behind his departure point using the 4-slot theme:
  `[#00FF88 (Emerald Reishi), #00CC66 (Dark Jade), #FFFFFF (White Core), #0B0E14 (Abyssal Ink)]`.
* **Stage 1/2 Upgrade:** In Resurrección form, Sonído gains a **second consecutive charge**, allowing him to perform double-blink feints across the arena.

---

### 💥 Skill 2: Cero / Cero Oscuras (黒虚閃 — Black Hollow Flash)
Ulquiorra's signature emerald beam cannon.

* **Base Form: Emerald Cero**
  * Ulquiorra extends his index finger, charging for 18 frames before releasing a piercing emerald energy beam across the arena that pierces all targets and illusions in its trajectory with steady knockback push.
* **Resurrección Form: Cero Oscuras (黒虚閃)**
  * Available only during Resurrección. Ulquiorra fires the colossal **Pitch-Black Cero with glowing emerald flame borders**.
  * Spans a massive width across the entire arena, dealing devastating damage, heavy screen shake, and launching caught targets into arena walls.
  * Rendered using the **Hybrid WebGL Container Pattern** ([Rule 10](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L83-L107)) with `PIXI.BLEND_MODES.NORMAL` for the pitch-black core and `PIXI.BLEND_MODES.ADD` for the outer emerald flame halo.

---

### 🦇 Ultimate: Two-Stage Resurrección Engine

Ulquiorra features the game's first **two-tier progressive transformation system**:

```
[ Base Form ] ──(Full Ultimate Meter or HP < 60%)──> [ Stage 1: Murciélago ] ──(Trigger / HP < 30%)──> [ Stage 2: Segunda Etapa ]
```

#### Stage 1: "Enclose, Murciélago" (封鎖せよ、黒翼大魔)
* **Transformation Eruption:** Ulquiorra draws his sword downwards and unleashes a towering green Reishi rain pillar, physically blowing back all surrounding fighters and clearing projectiles.
* **Form Enhancements:**
  * Two massive black bat wings sprout from his back with dynamic flight physics.
  * Complete horned helmet wraps symmetrically around both sides of his head.
  * **+35% Movement Speed**, flight hovering over ground hazards.
  * Standard Cero permanently upgrades into **Cero Oscuras**.
  * Sonído acquires a 2nd consecutive dash charge.

#### Stage 2: "Resurrección: Segunda Etapa" (第二階層 — The Unseen Form)
The dark, demonic form that represents pure, unadulterated Despair.
* **Activation:** Triggered by reactivating the Ultimate during Stage 1 or automatically when taking near-fatal damage below 30% HP.
* **Visual Metamorphosis:**
  * Arms and legs turn into pitch-black claws with dripping dark energy.
  * A long, prehensile black whip tail extends from his waist, automatically whipping nearby enemies for reactive knockback.
  * His Hollow hole expands with black Reishi tears dripping down his chest.
  * The battlefield undergoes a localized arena-clipped dark letterbox dim ([Rule 14](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L125-L135)).

* **Cataclysmic Finisher: Lanza del Relámpago (雷火の槍 — Spear of Lightning)**
  1. Ulquiorra floats into the air, manifesting an unstable, dual-pointed javelin of pure, crackling green plasma that sparks violently in his grip.
  2. Aims and hurls the spear at extreme supersonic velocity toward the target.
  3. **Nuclear Reishi Detonation:** Upon striking a target or the arena wall, the spear unleashes a **gigantic green mushroom cloud explosion** spanning over half the arena:
     * Deals massive multi-stage damage to all caught entities.
     * Applies severe radial knockback and maximum screen shake.
     * Leaves behind a persistent radioactive Reishi field that continues to tick burn damage on anyone standing within it for 4.0 seconds.

---

## Fighter Interactions & Lore Synergy

### ⚔️ vs Ichigo Kurosaki (The Fated Las Noches Duel)
* **Matchup Dynamic:** The ultimate clash of rivals. Ichigo's *Bankai Shunpo* flurries clash at supersonic speeds with Ulquiorra's *Sonído*. 
* **Special Clash:** If Ichigo's *Black Getsuga Tensho* collides head-on with Ulquiorra's *Cero Oscuras*, a massive energy clash shockwave spawns at the collision point with mutual screen shake. When Ichigo activates *Vasto Lorde*, it triggers Ulquiorra's *Segunda Etapa* for a legendary final showdown.

### 🕶️ vs Satoru Gojo (Nihility vs Limitless Infinity)
* **Matchup Dynamic:** Ulquiorra's basic strikes and standard Bala are suspended by Gojo's **Limitless Infinity barrier**. However, the sheer catastrophic energy output of **Cero Oscuras** and **Lanza del Relámpago's** nuclear blast radius forces Gojo to deploy *Unlimited Void* or teleport with *Blue* to avoid lethal splash damage.

### 👿 vs Ryomen Sukuna (King of Curses vs Cuatro Espada)
* **Matchup Dynamic:** Sukuna's *Malevolent Shrine* tests Ulquiorra's **Hierro** and **High-Speed Regeneration** to their absolute limits. In return, Ulquiorra's *Lanza del Relámpago* clashes evenly with Sukuna's *Fuga (Divine Flame Arrow)*, creating a monumental dual-elemental explosion of crimson fire and emerald lightning.

### 🏹 vs Uryu Ishida (Arrancar Master vs Quincy Prodigy)
* **Matchup Dynamic:** A high-speed battle of long-range calculations. Uryu's *Seele Schneider* cuts into Ulquiorra's *Hierro*, while Ulquiorra's *Sonído* is designed to flank Uryu's *Hirenkyaku* glide paths. If Uryu survives *Lanza del Relámpago* using *The Antithesis*, he can reverse the catastrophic damage back onto Ulquiorra.

### 🗡️ vs Toji Fushiguro (Zero Cursed Energy vs High Spiritual Pressure)
* **Matchup Dynamic:** Toji's stealth ambush and Inverted Spear of Heaven pierce through Reishi barriers and disrupt channeling. However, Ulquiorra's **High-Speed Regeneration** allows him to recover from Toji's lethal ambushes, forcing Toji into an endurance war against an unyielding opponent.

### ☸️ vs Mahoraga (The Adaptation Threshold)
* **Matchup Dynamic:** Mahoraga rapidly adapts to Ulquiorra's basic green Cero and standard slashes after 2–3 cycles. To win, Ulquiorra must escalate immediately to *Segunda Etapa* and execute a single-hit kill with **Lanza del Relámpago** before Mahoraga's wheel completes its adaptation.

---

## Technical & Visual Implementation Standards

* **Skin Orientation ([Rule 19](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L457-L490)):** Rendered strictly upright facing the camera/front POV. Jet-black jagged hair and left-side bone helmet horn on top (`-Y`), emerald green tear stripes on the cheeks (`Y ~ 0`, strictly no eyes/mouth), Hollow hole at the collarbone, and white Arrancar jacket on torso (`+Y`).
* **Hand & Weapon Visibility ([Rule 20](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L491-L509)):** Respects `state.showSkinOnly` and fighter hand visibility flags. Relaxed hands in guard stance, drawing *Murciélago* dynamically on attack.
* **Manga Speed Lines ([Rule 16](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L182-L245)):** 4-point filled needle polygons aligned with the dash aim angle trailing strictly behind the body during *Sonído*.
* **HUD Consistency ([Rule 18](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L446-L456)):** All skill progress bars in the HUD share the unified Emerald Green theme (`#00FF88`).
* **Rendering & Performance ([Rules 10 & 11](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/AGENTS.md#L83-L124)):** Cero Oscuras beam visuals and Lanza del Relámpago nuclear detonation are handled via the WebGL PixiJS Hybrid Container pattern, strictly avoiding CPU-heavy `ctx.shadowBlur`.
