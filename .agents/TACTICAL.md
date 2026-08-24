# Tactical Force — Repository Coding Rules & Standards

## 1. Unified Neon Theme Weapon Graphics Standard
- **Unified Visual Identity**: ALL firearms in Tactical Force (M4A1, SPAS-12, Desert Eagle, AWP, and all future firearms) MUST strictly adhere to the unified **Neon Tactical Cyberpunk Theme**:
  - **Base Chassis / Receiver**: Deep obsidian and cyber-slate matte body (`#0b0f19`, `#0f172a`, `#1e293b`).
  - **Luminous Neon Contours**: Razor-sharp glowing neon outline borders and energy conduit inlays (`lineWidth: 1.2px – 1.4px`) with high contrast against dark backdrops.
  - **Thematic Character & Weapon Neon Color Matrix**:
    - **M4A1 (Tactical Rifle)**: **Neon Electric Cyan** (`#00e5ff` / `#38bdf8`)
    - **SPAS-12 (Tactical Shotgun)**: **Neon Emerald / Matrix Mint** (`#10b981` / `#00ff88`)
    - **Desert Eagle (Magnum Pistol)**: **Neon Cyber Amber / Solar Gold** (`#f59e0b` / `#ffb703`)
    - **AWP (Bolt-Action Sniper)**: **Neon Hyper Plasma Blue / Cyan** (`#00f0ff` / `#38bdf8`)
  - **Holographic Optics & Sights**: Semi-transparent neon tinted glass (`rgba(neon, 0.65)`) with bright white center reticle dot.
  - **Muzzle Flashes**: Directional multi-spike flash polygons with white-hot core (`#ffffff`) and theme-matching neon outer petals.
  - **Prohibition of `shadowBlur`**: NEVER use `ctx.shadowBlur` or `ctx.shadowColor` for neon weapon glows (Rule 11 of core AGENTS.md). Simulate luminescence with concentric shapes and high-contrast neon vector fills.

---

## 2. Fighter Update Loop & Combat Method Signatures
- **Argument Propagation in `update()`**: Subclasses (`RifleFighter`, `ShotgunFighter`, `PistolFighter`, `SniperFighter`) MUST pass all parameters to `super.update(opponent, ownerIndex, arena)`. Failing to pass `opponent` causes base physics to drop target tracking and halt movement.
- **Top Freeze Guard (Rule 1)**:
  ```javascript
  const isFrozen = this._handleTimeStop();
  if (isFrozen || this.isTargetOfAmbush) {
    this.interruptAttacks();
    return; // MANDATORY: Stop update execution so fighter is frozen!
  }
  ```
- **Overloaded `shoot()` Signature Support**:
  ```javascript
  shoot(target, ownerIndex) {
    if (typeof target === 'number' && ownerIndex === undefined) {
      ownerIndex = target;
      target = null;
    }
    if (ownerIndex === undefined) {
      ownerIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : 0;
    }
    // ...
  }
  ```

---

## 3. Obstacle Physics & Collision Standards
- **Obstacle Penetration Resolution**: Rectangular cover barriers must resolve both perimeter and interior overlaps, reflecting velocity with restitution (`0.85 – 0.90`).
- **Natural Tangent Deflection**: Always apply a subtle tangential deflection jitter on bounce so fighters do not bounce back and forth along an identical straight line.
- **Velocity Normalization**: ALWAYS invoke `entity.normalizeSpeed()` on obstacle bounce so fighters immediately recover standard patrol velocity.
- **Projectile Interception**: Physical barriers intercept bullets, spawn sparks, and return projectiles to the pool without penetrating walls.

---

## 4. Ultra-Simple Persistent Tactical HUD Architecture
- **In-Place DOM Mutation**: NEVER re-assign `innerHTML = ...` inside recurring update ticks.
- **Persistent Card Caching**: Cache card element references (`_tacticalCards = { top: [], bottom: [] }`) and update properties in-place.
- **Ultra-Simple Minimalist Layout**:
  - Top HUD (Team 1 CT): 2 compact side-by-side cards.
  - Bottom HUD (Team 2 T): 2 compact side-by-side cards.
  - Minimal elements: Operative name on the left, current HP / `KIA` on the right, and a clean 6px solid health bar underneath.
  - Zero bloated paddings, zero drop-shadow blur filters, zero nested sub-bars or clutter.

---

## 5. Tactical Map Geometry & Arena Dark Mode Standards
- **Clean Minimalist Geometry**: Solid slate walls (`#1e293b` fill, `#475569` border) and solid dark arena floor (`#0d1117`).
- **Pitch Black Canvas Background**: Outer canvas space MUST be deep pure black (`#000000`) for high-contrast neon readability.

---

## 6. Unified Tactical Projectiles Standard (Dynamic Character Color Theme)
- **Unified Streamlined Geometry**: All tactical projectiles share a sleek, aerodynamic tracer capsule (`drawTacticalBullet`) with a brilliant white-hot kinetic core and a tapered trailing speed streak.
- **Dynamic Character Theme Color**: The outer neon tracer glow and motion streak MUST dynamically reflect the firing character's color theme (`p.color || shooter.color || shooter.themeColor`), ensuring visual harmony across all operatives (M4A1 Cyan, SPAS-12 Emerald, Desert Eagle Amber, AWP Plasma Blue).
- **Proportional Caliber Scaling**: Caliber differences (shotgun pellets vs. magnum pistol slugs vs. sniper match rounds) are represented via `bulletLength`, `bulletWidth`, and `tacticalCaliberScale` while strictly preserving the unified capsule geometry.

---

## 7. Tactical AI Line-of-Sight (LOS) & Wall Occlusion Standards
- **Line-of-Sight Raycasting**: All tactical AI fighters MUST evaluate `hasLineOfSight(x1, y1, x2, y2, obstacles)` before aiming and shooting.
- **No Wall Auto-Aim Lock**: When an opponent is occluded behind a wall (`hasLineOfSight === false`), AI fighters MUST NOT lock their guns through the wall. Instead, they aim forward in the direction of their movement velocity, slicing corners naturally.
- **Hold Fire on Blocked Sightlines**: AI fighters MUST NOT discharge weapons into solid cover obstacles (`if (!hasLineOfSight) return;`), saving ammunition until clear line-of-sight is established.
- **LOS Target Prioritization**: `getClosestOpponent()` prioritizes engaging enemies with unobstructed sightlines over occluded targets.
- **Obstacle-Clipped Laser Sight**: Sniper laser aimlines must raycast against obstacles (`raycastToObstacles()`) and terminate directly on the wall surface with a laser point.
- **Prohibition of Clutter**: No flashy glowing ground rings, crosshairs, shipping container graffiti, or noisy decals.

---

## 8. Tactical Game Mode Configuration Standards
- **Centralized Mode Config**: All Tactical Shooter match rules, team structures, rounds, health pools, and HUD layouts are defined in `Tactical Force/tacticalModeConfig.js` (`TACTICAL_GAME_MODES`, `TACTICAL_MODE_SETTINGS`, `TACTICAL_SYSTEM_CONFIG`).
- **Standardized Modes**:
  - `Tactical 2v2`: 2v2 CT (M4A1, SPAS-12) vs T (Desert Eagle, AWP), 3 rounds, 500 HP, Sector 01 map.
  - `Tactical 1v1`: 1v1 duel, 3 rounds, 500 HP.
  - `Tactical Stand Off`: 1 round sudden death, 1500 HP.
  - `Tactical FFA`: 4-player deathmatch, 3 rounds, 500 HP.
  - `Tactical 4v4`: 4v4 full squad encounter, 5 rounds, 500 HP.
  - `Tactical Random`: Random firearm loadout round rotations.
- **System Rules**: Always enforce dark arena theme, 2D line of sight, and unified projectile visuals across all tactical modes.
