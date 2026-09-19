---
name: ai-combat-tuner
description: Program and tune fighter combat AI behavior trees, spacing, melee combos, parry timing, and skill decision matrices.
---

# Combat AI & Decision Engine Playbook

Use this skill when developing, tuning, or balancing autonomous fighter combat AI, spacing steering, combo chains, and counter-play.

## Phase 1: Archetype Spacing & Distance Steering
1. **Melee Brawler (Gojo, Sukuna, Yuji, Todo)**:
   - Target distance: `40px – 70px`.
   - Aggressive forward lunge with lateral weaves.
   - Triggers basic punch combos and parry checks when within 65px frontal cone.
2. **Mid-Range Weapon Master (Toji, Ichigo, Nanami, Yuta)**:
   - Target distance: `75px – 140px`.
   - Maintains spacing at blade tip reach for max frontal arc AOE coverage.
   - Slashes on entry and retreats to reset cooldowns.
3. **Ranged Sniper / Blaster (Megumi, Reze, Laser, Zeus)**:
   - Target distance: `200px – 320px`.
   - Backpedals / kites away when enemies close in; circles arena perimeter while channeling ranged spells.

## Phase 2: Skill Channeling & Committed Aim Locks (Rule 19.3)
1. **Committed Aim Lock**:
   - When triggering a skill (e.g. Getsuga, Pure Love Beam, Purple, Fuga), snapshot `this.skillCastAngle` once.
   - Disable auto-aim rotation during channeling/firing so the fighter does not snap-track dodging opponents.
2. **Time-Stop & Stasis Guard (Rule 1)**:
   - At the top of `update()`, check `this._handleTimeStop()` and return immediately if frozen.

## Phase 3: Combo Sequencing & Reaction Timers
1. **Human-like Reaction Variance**:
   - Add a small reaction window (e.g. 6–12 frames) before AI reacts to incoming projectiles or domain activations.
2. **Combo Follow-Ups**:
   - Sequence skills conditionally (e.g. execute Shunpo or gap-closer only when the target is knocked back into a wall).
