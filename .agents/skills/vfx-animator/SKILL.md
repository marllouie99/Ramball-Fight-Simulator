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
