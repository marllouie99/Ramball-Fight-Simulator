---
name: combat-balancer
description: Audit and tune fighter combat stats, damage scaling, attack cooldowns, knockback impulse, and hitstun to maintain competitive fight balance.
---

# Combat Balancer Skill

Use this skill when auditing, tuning, or balancing fighter performance, damage outputs, cooldowns, and ability interactions in Ramball Fight Simulator.

## Workflow

### 1. Identify Target Fighter & Current Stats
- Locate the fighter's class definition in `js/` or `src/fighters/`.
- Inspect key parameters:
  - Base HP / Max HP (`this.maxHp`, `this.hp`)
  - Movement speed & dash velocity
  - Attack cooldowns & charge timers
  - Hitbox radii and melee blade/punch reach

### 2. Compare Against Baseline Archetypes
- **Brawlers** (Gojo, Sukuna, Todo): Check 90° punch arc (65px reach) and ensure punch animations cleanly separate from blade swings.
- **Weapon Specialists** (Toji, Nanami, Yuta): Check 120°-160° frontal blade arc reach.
- **Ranged Blasters** (Genos, Megumi): Check projectile speed, blast radius, and cooldowns.

### 3. Check Stasis & Freeze Safety
- Ensure multi-strike flurries do not call `applyTimeStop` on `this` (attacker).
- Ensure high-frequency domain or hazard hits do not refresh perma-hitstun on trapped targets.
- Verify that minion/companion entities update independently of owner's hitstun.

### 4. Verification Checklist
- Run test match or verify in-browser.
- Observe FPS stability (no shadowBlur on projectiles, WebGL hybrid container for heavy effects).
- Verify HUD skill bars share the character's unified `themeColor`.
