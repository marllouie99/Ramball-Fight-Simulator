---
name: patch-notes-generator
description: Generate structured, esports-grade patch notes and balance changelogs by analyzing fighter config modifications, balance manager sheets, git diffs, and skill parameter changes.
---

# Patch Notes & Balance Changelog Generator Playbook

Use this skill when publishing new fighter releases, balance passes, engine optimizations, or bug fixes in *Ramball Fight Simulator*.

## Phase 1: Stat Diff & Configuration Extraction

1. **Scan Configuration & Source Diffs**:
   - Inspect modified files in `js/configs/characters/*Config.js` and `js/configs/fighter-balance-sheet.json`.
   - Identify parameter shifts across:
     - **Vitals & Mobility**: Base HP, speed multipliers, dash distances, collision radii.
     - **Combat Parameters**: Melee reach, arc angles, projectile speed, explosion radius, knockback impulse.
     - **Timing & Frames**: Startup wind-up, active hitbox duration, recovery lag, cooldown frames.
     - **Crowd Control & Stasis**: Hit-stun duration, paralyze duration, time-stop frames.

2. **Calculate Precise Deltas**:
   - Format exact quantitative changes:
     - `Stat Name: OldValue ➔ NewValue (±Delta%)`
     - Example: `Fuga Fire Trail Damage: 45 ➔ 52 (+15.6%)`
     - Example: `Thunderclap Cooldown: 360f ➔ 300f (-16.7%)`

---

## Phase 2: Classification & Structure Standard

Group all changes strictly into four standardized competitive categories:

```markdown
# ⚔️ Ramball Fight Simulator — Patch Notes [vX.Y.Z]

## 🌟 Highlights
- Summary of major additions, new fighter launches, or system overhauls.

---

## 🥊 Fighter Balance & Mechanics

### [Fighter Name] (Archetype / Role)
* **[Developer Context]**: Brief explanation of the gameplay intent behind this tuning pass.
* 🟢 **Buff**: [Ability/Stat Name] — [Detailed description and delta].
* 🔴 **Nerf**: [Ability/Stat Name] — [Detailed description and delta].
* 🔄 **Adjustment**: [Mechanic/Behavior] — [Refined telegraph, committed aim lock, or physics change].

---

## ⚙️ Engine, UI & Performance
* 🚀 **Performance**: [Layout thrashing elimination, WebGL optimizations, GC reductions].
* 🎨 **Visuals & HUD**: [Speed lines, crescent slashes, glassmorphic UI updates].
* 🔊 **Audio**: [SFX normalization, Web Audio dynamic ducking, BGM loops].
* 🐛 **Bug Fixes**: [Specific regression or collision fixes].

---

## 📊 Balance Manager Verification
- [ ] Confirmed `CONFIG.<fighter>` fallback matches default constants.
- [ ] Centralized balance manager sheet integrity verified.
- [ ] `npm run verify` passed with zero errors and balanced Canvas 2D stacks.
```

---

## Phase 3: Developer Notes & Meta Commentary Guidelines

1. **Clear Competitive Intent**:
   - Explain *why* a nerf or buff occurred (e.g. "Gojo's Hollow Purple cooldown was increased to prevent perma-lockdown in team battles").
2. **Anti-Spam & Counterplay Focus**:
   - Highlight counterplay windows, parry opportunities, and spacing considerations.
3. **Zero Magic Numbers**:
   - Ensure all cited values directly correspond to entries in `CONFIG.<character>` or `BalanceManager`.
