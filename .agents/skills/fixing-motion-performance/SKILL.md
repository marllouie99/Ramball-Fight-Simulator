---
name: fixing-motion-performance
description: Audit and eliminate UI animation jank, layout thrashing, DOM reflows, and GPU stalls to maintain a locked 60 FPS.
---

# 60 FPS Motion Performance & Anti-Jank Playbook

Use this skill when implementing, debugging, or optimizing animations, screen shakes, UI transitions, floating combat text, or HUD state updates.

## Phase 1: Zero Layout Thrashing Standard

1. **Strict DOM Read/Write Separation**:
   - NEVER query layout geometry (`element.offsetHeight`, `element.offsetWidth`, `element.getBoundingClientRect()`, `window.getComputedStyle()`) inside per-frame update loops (`update()`, `draw()`, `requestAnimationFrame`).
   - Cache static dimensions during initialization or window resize events.
   - Batch DOM writes at the end of the frame outside physics calculations.

2. **Prohibited CSS Animated Properties**:
   - **NEVER animate**: `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `border-width`. These trigger full reflow/layout tree recalculations.
   - **ONLY animate GPU-composited properties**:
     - Position / Motion: `transform: translate3d(x, y, 0)` or `transform: translate(x, y)`
     - Scale / Pulse: `transform: scale(s)`
     - Rotation: `transform: rotate(deg)`
     - Transparency: `opacity`
     - Backdrop: `backdrop-filter` (use sparingly)

---

## Phase 2: Hardware Acceleration & GPU Layer Promotion

1. **Compositor Promotion**:
   - For elements undergoing continuous dynamic motion (screen shakes, floating combat numbers, damage counters), promote to an independent GPU layer:
     ```css
     will-change: transform, opacity;
     transform: translateZ(0);
     ```
   - **Caution**: Remove `will-change` when animations complete to prevent GPU memory bloat.

2. **Screen Shake & Dynamic Canvas Transforms**:
   - Screen shake must be applied via Canvas 2D matrix translation (`ctx.translate(shakeX, shakeY)`) inside the render loop or via CSS `transform: translate3d(x, y, 0)` on the canvas wrapper.
   - NEVER shake the viewport by modifying `document.body.style.top` or `margin`.

---

## Phase 3: High-Frequency Floating Numbers & Particles

1. **Canvas 2D Routing for Combat Text**:
   - Floating damage numbers (`-45`, `CRIT!`, `+120 HP`) must render directly to the Canvas 2D layer (`ctx.fillText`) rather than spawning DOM nodes.
   - Spawning DOM elements on hit causes severe garbage collection pauses and frame drops during multi-hit combos (e.g., Genos flurries, Sukuna Malevolent Shrine).

2. **RAF Lifecycle & Cleanup**:
   - Every CSS animation or JS-driven timer must cleanly terminate. Never leave orphan interval timers running when navigating between battle, tournament, and menu states.
