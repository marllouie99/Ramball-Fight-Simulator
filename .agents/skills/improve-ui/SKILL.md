---
name: improve-ui
description: Audit and refine game user interfaces, HUD cards, menus, and modals with high-end dark aesthetics, visual hierarchy, and micro-interactions.
---

# UI Polish & Visual Engineering Playbook

Use this skill when designing, refining, or modernizing DOM menus, Fighter Selection cards, HUD overlays, Weapon Studio panels, and modal dialogs.

## Phase 1: Visual Hierarchy & Design System Tokens

1. **Dark Mode & Cyber-Esports Aesthetics**:
   - Backgrounds: Use deep obsidian and charcoal layers (`#0b0f19`, `#111625`, `#161f36`) rather than pure `#000000`.
   - Borders & Accents: Use 1px subtle neon/cyber borders (`rgba(0, 243, 255, 0.2)` or `rgba(255, 255, 255, 0.08)`) with dynamic hover accents.
   - Glassmorphism: Utilize `backdrop-filter: blur(12px)` and semi-transparent RGBA card backgrounds for floating HUDs and modals.

2. **Typography & Contrast Tokens**:
   - Headers: Clean uppercase tracking (`letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700`).
   - Numerical Data & Stats: Monospace or tabular figures for stat bars, health counters, and DPS values to prevent jitter.
   - Contrast: Ensure minimum 4.5:1 text-to-background contrast ratio for readability over dynamic canvas backdrops.

3. **Consistent Spacing Scale**:
   - Layout grids and card padding must adhere to an 8px/4px modular scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).

---

## Phase 2: Interactive States & Micro-Interactions

1. **3-State Feedback Loop**:
   - **Default**: Grounded, clean contrast, subtle border.
   - **Hover**: Elevation lift (`transform: translateY(-2px)`), radiant accent glow (`border-color: var(--accent)`), and micro-shine highlight.
   - **Active/Pressed**: Rapid tactile feedback (`transform: translateY(1px) scale(0.98)`).

2. **Smooth State Transitions**:
   - Standard interactive transitions: `transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.15s ease, box-shadow 0.15s ease;`.
   - Never transition layout-affecting properties like `width`, `height`, `margin`, `top`, or `left`.

3. **Tactile Button & Card Polish**:
   - Active tabs, selected fighter cards, and toggled buttons should feature a high-visibility active indicator (neon bottom bar, bright border stroke, or glowing badge).

---

## Phase 3: In-Game HUD & Overlay Guidelines

1. **HUD Anchoring & Viewport Scaling**:
   - Keep in-game combat HUD elements fixed or absolute-positioned relative to `#gameContainer` / `.game-box`.
   - Use `pointer-events: none` on HUD overlay containers, enabling `pointer-events: auto` only on clickable interactive buttons (pause, sound toggles, restart).

2. **Dynamic Bar Meters (Health, Energy, Ultimate)**:
   - Use dual-layer bars:
     - Top Layer: Fast primary fill transition (`transition: width 0.1s ease-out`).
     - Under Layer: Trailing white/red ghost decay bar (`transition: width 0.4s ease-out 0.15s`) to highlight recent damage.
