# Fighter Concept: Zilong (MLBB)

> [!NOTE]
> This document outlines the proposed mechanics for bringing Zilong from Mobile Legends: Bang Bang (MLBB) into the Ramball-Fight-Simulator. It adheres strictly to the game's established engine rules and conventions.

## 1. Overview
Zilong is an aggressive, fast-paced spear fighter focused on gap-closing, rapid strikes, and enemy displacement. His kit relies on high attack speed and mobility to overwhelm targets.

## 2. Core Mechanics

### Basic Attacks (Spear Master)
- **Rule Adherence**: **Frontal Arc Radius AOE**.
- **Mechanic**: As a melee weapon user with a spear, his basic attacks have an extended reach compared to brawlers.
- **Implementation**: Attacks strike in a wide frontal cone (e.g., 120°–160° arc). Any valid enemy target (fighters & illusions) within the blade reach and angle takes physical damage, hit stun, and physical knockback push.

### Passive: Dragon Flurry
- **Mechanic**: After every 3 basic attacks, his next attack is a rapid flurry that strikes multiple times.
- **Rule Adherence**: **Multi-Strike & Flurry Ability Rules**.
- **Implementation**: 
  - `this.applyTimeStop` is **NEVER** called on Zilong during this combo.
  - Hit-pause is repeatedly applied exclusively to the target(s) caught in the flurry to simulate rapid impacts.

### Skill 1: Spear Flip
- **Mechanic**: Displaces an enemy by lifting them and slamming them behind Zilong.
- **Implementation**:
  - Teleports the target's `x` and `y` coordinates to a calculated position behind Zilong based on his current facing angle.
  - **Rule Adherence**: Immediately after displacement, `this.aim(target)` MUST be called so Zilong snaps his facing direction to where the enemy landed, ensuring alignment for follow-up attacks.

### Skill 2: Spear Strike
- **Mechanic**: A rapid dash that closes the distance to a target instantly, followed by a piercing strike.
- **Implementation**:
  - Rapidly interpolates `this.x` and `this.y` towards the target.
  - **Rule Adherence**: After the dash completes, `this.aim(target)` must be updated immediately so the ensuing spear swing is properly aligned.

### Ultimate: Supreme Warrior
- **Mechanic**: A massive self-buff granting movement speed, attack speed, and slow immunity.
- **Implementation**:
  - Activates a buff state (`this.isSupremeWarrior = true`) and resets slow debuffs.
  - Increases base movement speed and reduces attack cooldowns.
  - **Rule Adherence**: **WebGL / PixiJS Rendering Guidelines**. The fiery/glowing aura effect must be rendered via the Hybrid Container Pattern using a `PIXI.Sprite` with `PIXI.BLEND_MODES.ADD` to avoid CPU-intensive `shadowBlur` and maintain 60 FPS.

## 3. Mandatory Engine Guards

### Update Loop Integrity
At the top of his `update()` method, Zilong must implement the standard freeze guard:
```javascript
const isFrozen = this._handleTimeStop();
if (isFrozen || this.isTargetOfAmbush) {
  this.interruptAttacks();
  return; // Stop execution so fighter is frozen
}
```

### Gojo Infinity Interaction
If Zilong attempts to strike Gojo while Limitless Infinity is active, he will be frozen. A deep electric cyan blue fill overlay (`rgba(0, 229, 255, 0.65)`) must be rendered over his body to visually indicate the freeze.
