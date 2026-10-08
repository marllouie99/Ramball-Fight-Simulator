---
name: vfx-animator
description: Design and implement high-performance 60 FPS visual effects, domain expansions, laser beams, anime slashes, and WebGL hybrid particles.
---

# Anime VFX & High-Performance Particle Engine Playbook

Use this skill when creating or optimizing visual effects, particle bursts, blade slashes, laser beams, auras, or Domain Expansions.

## Phase 1: Performance & Rendering Pipeline
1. **Hybrid Container Pattern (WebGL Acceleration)**:
   - For continuous or full-screen heavy effects (e.g. Domain Expansions, Fuga flames, Hollow Purple orbs), render off-screen and bind as a WebGL texture in `state.pixiLayers.environment` or `state.pixiLayers.projectiles`.
   - Use `PIXI.BLEND_MODES.ADD` for glowing elements and `PIXI.BLEND_MODES.NORMAL` for elements with dark outlines.
2. **Zero `shadowBlur` Constraint (Rule 11)**:
   - NEVER use `ctx.shadowBlur` or `ctx.shadowColor`.
   - Simulate glowing auras using concentric gradient arcs or semi-transparent layered radial circles.
3. **Canvas 2D Transient Bursts**:
   - Short bursts (< 30 frames) like Black Flash sparks, blood splatters, and hit sparks should render directly on Canvas 2D for pixel fidelity.

## Phase 2: Action Speed Lines & Slash Crescent Standards
1. **Manga Action Speed Lines (Rule 16)**:
   - Draw speed lines as **4-point filled needle polygons** (trapezoidal/diamond needle shapes) — NEVER use basic `ctx.stroke()` lines.
   - Align speed lines strictly behind the fighter along `-cos(aimAngle)` / `-sin(aimAngle)`.
   - Use 4-slot theme palettes: `[Primary Theme, Secondary Accent, White Core, Dark Ink Line]`.
2. **Blade Slashes & Crescent Trails (Rule 15)**:
   - Construct sharp, double-tapered crescent polygons using sinusoidal tapering:
     ```javascript
     const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
     const thick = maxThick * taper;
     ```
   - During recovery phase, tip locks in place while trailing tail edge decays to zero (chasing eraser wipe).

## Phase 3: Screen Shake, Dimming & Stack Safety
1. **Screen Dimming (Rule 14)**:
   - Draw screen dimming overlays strictly on the game canvas (`state.ctx`) or within `.game-box`. NEVER alter `document.body.style.backgroundColor`.
2. **Canvas Stack Balance**:
   - Every `ctx.save()` MUST have a matching `ctx.restore()` in the exact same branch.

## Phase 4: Non-Freezing Active Visual Effects Lifecycle (Rule 25)
1. **Top-of-Update Processing**:
   - All active visual effects, explosion rings, slashes, and particle bursts MUST decay at the top of the fighter's `update()` loop BEFORE the `_handleTimeStop()` freeze guard exit.
   - This guarantees effects never freeze mid-air or get stuck on screen when character movement is stopped by CC, hit-pause, or time-stop.
2. **Interruption & Defeat Safety**:
   - Flush fighter-bound effect arrays or detach them to world-space on `interruptAttacks(forceCancelAll = true)` or fighter death.

## Phase 5: Clean Concentric Shockwaves (Rule 26 — Anti-Cobweb & Anti-Mesh Rule)
1. **Sequential Water-Ripple Wavefront Staggering ("Dipping Fingers in Steady Water")**:
   - Shockwave rings MUST ALWAYS animate with sequential, staggered wave propagation where concentric compression rings pop out 1-by-1 from the detonation center with progressive time offsets ($t_0 = 0.00, t_1 = 0.12, t_2 = 0.24, \dots$) and extend outward smoothly along a decelerating power curve ($R_k = R_{\max} \cdot \text{lp}_k^{\text{speedPow}}$).
   - NEVER spawn all concentric rings at full radius simultaneously with fixed static multiplier fractions.
2. **Expanding Translucent Interior Wash**:
   - The interior of expanding shockwaves must be filled with semi-transparent warm color washes (e.g. `rgba(255, 107, 26, 0.18 * waveAlpha)`) that expand dynamically with each active wave disc.
3. **Wavefront Opacity & Dissipation**:
   - Each individual ring starts at $R = 0$, blooms in rapidly as it pops out ($\text{popIn} \le 0.10$), maintains crisp line weight during travel, and smoothly dissipates as it disperses at the perimeter ($\text{fadeOut} = (1 - \text{lp})^{1.25}$).
4. **Unbroken Compression Bands**:
   - Shockwaves must be drawn as clean, smooth, concentric circular or crescent bands.
5. **Strict Prohibition of Spiderweb / Radial Spokes**:
   - NEVER draw connecting radial ray lines, spoke needles, or intersecting meshes across shockwave rings.
6. **No Spinning Line Ticks**:
   - Never draw rotating line segments around shockwaves. Use standalone point particles/embers without radial lines.
