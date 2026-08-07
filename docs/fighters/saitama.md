# Saitama — The Caped Baldy

**Category:** Anime  
**Color:** Bright Yellow / Safety Yellow (`#F5C400`)  
**Role:** Unstoppable One-Hit Juggernaut, Overpowered Brawler  

---

## Lore / Background

The hero who trained so hard he lost all his hair — and all sense of challenge. Saitama of the Hero Association (C-Class → Rank: Above God) enters the Circle Mini-Battle arena expecting, as usual, to be deeply underwhelmed. One punch. That is all it ever takes. His absurd strength is not a technique he learned, not a cursed energy — it is simply the result of **three years of relentless, unremarkable training.** He is invincible not because of a special power, but because the universe simply has not caught up with him yet.

---

## Visual Design

- **Body Color:** Bright Safety Yellow (`#F5C400`) with a white cape flowing behind  
- **Cape Visual:** A torn white rectangle that streams backward, reacting to movement speed  
- **Expression:** Perpetually bored — blank, dead-fish eyes even mid-combat  
- **Gloves:** White oversized boxing/martial gloves rendered as large white circles over his fists  
- **Suit Details:** White trim/collar outline at the neck visible on the circle body  
- **Signature Pose (Idle):** Standing with arms loosely at his sides, cape barely moving — no combat stance at all  

---

## Core Philosophy & Design Challenge

Saitama is canonically **undefeatable in one punch**. In a multiplayer game this must be balanced cleverly:

- His **basic attack damage is massive but slow** — the challenge is that opponents *know* it is coming and must dodge  
- His **ultimate is a genuine one-shot kill** but has an enormous cooldown and very obvious tell  
- He has **no defensive abilities** — he simply does not need them (no shields, no dodges, no healing)  
- His weakness is **deceptive simplicity**: he has no combo tools, no mobility skills, no stuns — just raw, telegraphed, devastating power  
- His **Serious Punch** ultimate costs him significant wind-up time — skilled opponents can punish him during the charge  

---

## Stats (Baseline)

| Stat | Value | Notes |
|---|---|---|
| HP | 420 | High but not extreme — he just does not care about being hit |
| Speed | 3.8 | Moderate — he is not trying hard |
| Attack Range | Melee only | 65-75 px punch reach |
| Armor / DR | 0% | No damage reduction — he takes full hits but has HP to absorb them |

---

## Abilities

### Passive: Hero for Fun

Saitama does not take combat seriously. This translates into two passive effects:

- **No Sell:** When Saitama receives a hit, **he does not flinch**. All hit-stun, knockback, stagger, and time-stop effects from basic attacks are completely **ignored**. He simply keeps walking forward, unfazed. Skills and ultimates still push him back slightly (he acknowledges those, barely), but basic attacks bounce off him like nothing.
- **Boredom Threshold (Passive Power Creep):** Saitama gains a hidden `boredomTimer`. Every **5 seconds** that Saitama goes **without dealing damage**, his next hit receives a stacking +15% damage bonus (max 5 stacks, +75%). This represents him starting to actually try when bored. The stacks reset after he lands any damage. Visual cue: a faint yellow aura ring pulses around him, growing more intense with each stack.

---

### Basic Attack: Normal Punch

The most ordinary-looking punch imaginable — and completely devastating.

- **Mechanic:** Saitama slowly winds up (very short 8-frame telegraph) then throws a single, straight punch at the closest enemy in a **frontal 90 degree arc, 70px reach**.
- **Multi-target:** Hits all enemies in the arc (fighters and illusions, per rule on frontal arc brawler AOE).
- **Damage:** `38` per punch — high single-hit impact.
- **Shockwave:** Each punch creates a small (40px radius) **pressure shockwave** that pushes enemies adjacent to the primary target. The shockwave does not deal extra damage — it is pure momentum.
- **Cooldown:** ~0.65 seconds between punches — slower than other brawlers, but each hit lands heavier.
- **Impact Visual:** No blood splatter or fire. Instead, a clean **white star-shaped impact flash** followed by a sharp concussive ring (a thin expanding circle that fades out in 10 frames) — clinical, precise, almost boring.
- **Audio:** A single loud, dry thwack — no flashy energy sounds.

---

### Skill 1: Consecutive Normal Punches

Saitama decides to throw more than one punch. The horror.

- **Activation:** Saitama targets the nearest enemy and dashes to melee range (instant teleport blink, no visual trail — he is just *there*).
- **Mechanic:** Delivers a rapid **6-hit punch flurry** over ~1.2 seconds. Each hit:
  - `22` damage per flurry punch (lower per-hit than basic to balance speed)
  - Applies minor knockback accumulation — by the 6th hit, the target is staggered backward
  - Each punch creates the same white star impact flash (smaller scale)
- **Final Slam:** The 6th hit is an **overhead double-fist slam** dealing `55` damage with a large concussive ring (80px radius) that knocks nearby enemies back.
- **No Freeze on Self:** Hit-pause is applied only to the **target**, never to Saitama. Saitama's update loop must never be interrupted during the flurry.
- **Cooldown:** 9 seconds
- **Visual:** No energy effects. Just extremely fast white gloves blurring in front of him. Speed lines radiate from his fist position (simple straight lines, not particle fire).

---

### Skill 2: Serious Side Hops

Saitama decides to actually try moving. Just a little.

- **Mechanic:** Saitama performs **3 rapid sideways hops** (left, right, left — or mirrored) relative to the target, repositioning himself in a triangle around the target. Each hop covers ~100px and happens in ~12 frames.
- **Purpose:** Pure mobility / gap-closer / dodge. No damage on its own.
- **Hop Trail:** Each landing creates a small **dust cloud puff** (3-4 grey/white particles) where his foot contacts the ground.
- **Counter Strike:** If an enemy projectile or basic attack passes through his path during the side hops, the attack is **automatically dodged** — Saitama simply is not there. This is purely positional: his position changes fast enough that projectile collision naturally misses.
- **Cooldown:** 7 seconds
- **Design Note:** This is Saitama's *only* mobility tool. Without it, he is slow and linear — opponents who understand this will kite him until Serious Side Hops is on cooldown.

---

### Ultimate: Serious Punch

The one that ended Boros. The one that split the clouds. The single most terrifying thing Saitama can do.

- **Activation Condition:** Can be activated at any HP (no threshold required).
- **Cooldown:** 45 seconds (extremely long — this is a match-defining moment button).

#### Phase 1 — Wind-Up (1.5 seconds)

- Saitama **plants his feet** and stops moving entirely.
- He pulls his right arm back slowly, almost lazily. The extended arm goes far behind him.
- A deep, building **low hum** audio begins (no energy glow — no light effects at all during wind-up, which makes it eerily quiet and threatening).
- A faint **pressure distortion ripple** emanates from his fist outward (a simple expanding circle with 5% opacity, just enough to be visible).
- **Vulnerable Phase:** During this 1.5s wind-up, Saitama takes **double damage** from all incoming hits (he is committed to the punch). Skilled opponents should punish this hard.

#### Phase 2 — SERIOUS PUNCH

- Saitama throws the punch forward.
- **Impact Effect:** A massive **white horizontal beam / pressure wave** erupts from his fist, traveling across the **entire arena width** in ~8 frames (near-instant). The beam is ~80px tall.
- **Beam Visual:** The beam is stark white with sharp jagged edges — not a smooth orb, but a concentrated wall of compressed air. It splits and shreds the sky behind it (simple angular white streaks extending past the arena edge).
- **Screen Effect:** A **full-canvas white flash** (100% opacity, lasting 6 frames) followed by a **massive screen shake** (12-15 frame duration, high amplitude).
- **Damage:** `999` True Damage — **always a one-hit kill**. No shields, no barriers, no damage reduction protects against this. Infinity (Gojo) does **not** stop this — compressed air and sheer physical force, not cursed energy. Mahoraga adaptation does **not** reduce this.
- **AOE:** The beam is a full-width horizontal sweep — hits **all enemies** on the horizontal axis directly in front of Saitama.
- **Knockback:** Targets hit by the beam are launched horizontally at extreme velocity, bouncing off the far arena wall before dying.
- **Floating Text:** `SERIOUS PUNCH` appears in large bold yellow text above Saitama as the beam fires, fading out over 2 seconds.

#### Special Interaction Table

| Fighter | Interaction |
|---|---|
| Gojo (Infinity) | Infinity does **NOT** block Serious Punch — it is pure physical force, not a cursed technique. Infinity collapses on contact. |
| Mahoraga (Adaptation) | Wheel clicks once (registers the hit), but **damage is NOT reduced** — Mahoraga adaptation has no ceiling high enough. Mahoraga dies. |
| Toji (Heavenly Restriction) | Toji is hit normally — no special immunity, this is not cursed energy. |
| Sukuna (RCT Passive) | RCT triggers but is instantly overwritten by the fatal damage — 999 exceeds any possible RCT heal. |
| All others | One-shot. No exceptions. |

---

## AI Behavior Notes

- **Default AI:** Saitama walks directly toward the nearest enemy. No complex pathfinding — he just goes straight at them.
- **Skill 1 Priority:** Used when within 150px of target and off cooldown.
- **Skill 2 Priority:** Used when being kited (target has been out of melee range for more than 2 seconds) to close the gap.
- **Ultimate Priority:** Used when 2+ enemies are lined up horizontally in front of him, OR when HP drops below 25% (he gets mildly motivated).
- **Passive Stack Awareness:** AI increases aggression (speed toward target) as Boredom Threshold stacks grow.

---

## Sound Design

| Event | Audio Direction |
|---|---|
| Basic Punch | Heavy dry thwack — no reverb, no energy |
| Consecutive Normal Punches | Rapid staccato dry thwacks, slight pitch-up each hit |
| Serious Side Hops | Light footstep dust puffs — airy whoosh |
| Serious Punch Wind-Up | Low, ominous sub-bass hum building |
| Serious Punch FIRE | Massive concussive boom + wind shear — like a sonic boom |
| No Sell (hit ignored) | Faint dull thud — minimally audible |
| Boredom Stack +1 | Faint internal sigh (barely audible) |

---

## Implementation Notes

- **File:** `js/entities/fighters/SaitamaFighter.js`
- **Character ID:** `saitama`
- **Extends:** Base `Fighter` class
- **No Sell Mechanic:** Override `applyTimeStop()` to be a no-op for basic attack hit-pauses; only allow it for skills/ultimates flagged as `isSkill` or `isUltimate`.
- **Serious Punch Beam:** Render on main Canvas 2D (transient burst effect — transient effects stay on Canvas 2D per hybrid rendering guidelines). Use a simple fillRect + jagged-edge polygon for the beam body.
- **No shadowBlur:** All glow effects for the Boredom aura MUST use concentric semi-transparent rings, NOT `ctx.shadowBlur`.
- **Frontal Arc AOE:** Both Normal Punch and Consecutive Normal Punches MUST check both `state.fighters` AND `state.illusions` within the 90 degree frontal arc.
- **Freeze Guard:** The `update()` method must open with the standard `_handleTimeStop()` / `isTargetOfAmbush` freeze guard before any movement or combat logic.
- **No Sell Override Detail:** Saitama No Sell passive should work by checking the damage source `opts` flags — if `!opts.isSkill && !opts.isUltimate`, suppress the timeStop call passed to him but still process HP loss.
