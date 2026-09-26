---
name: baseline-ui
description: Enforce core UI design tokens, component architecture, CSS variables, and layout consistency across menus, HUD overlays, and tool panels.
---

# Baseline UI Architecture & Design Standards

Use this skill when creating new UI components, refactoring menu CSS, structuring modal dialogs, or establishing consistent design tokens.

## Phase 1: Core Design System Tokens

Maintain and utilize central CSS variables for visual consistency across all styles:

```css
:root {
  /* Surface Layers */
  --bg-app: #080b12;
  --bg-card: rgba(16, 22, 36, 0.85);
  --bg-card-hover: rgba(24, 33, 54, 0.95);
  --bg-elevated: #1a233a;

  /* Text & Typography */
  --text-primary: #f0f4fc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  /* Theme Accents */
  --accent-cyan: #00f3ff;
  --accent-emerald: #00ff88;
  --accent-amber: #ffb800;
  --accent-crimson: #ff3366;
  --accent-purple: #9933ff;

  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(0, 243, 255, 0.4);

  /* Radii & Shadows */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 16px rgba(0, 243, 255, 0.25);
}
```

---

## Phase 2: Component Constraints & Structure

1. **Card Component Baseline**:
   - Must use `--bg-card` with `backdrop-filter: blur(10px)`.
   - Border: `1px solid var(--border-subtle)`.
   - Radius: `var(--radius-md)`.
   - Hover transition: `transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease`.

2. **Buttons & Interactive Controls**:
   - Minimum tap/click target: `36px` height.
   - Text styling: uppercase, medium weight (`600`), slight letter spacing (`0.05em`).
   - Focus outline: `2px solid var(--accent-cyan)` with `outline-offset: 2px` for accessibility.
   - Disabled state: `opacity: 0.45; pointer-events: none; cursor: not-allowed;`.

3. **Modal Dialogs & Panels**:
   - Backdrop overlay: `rgba(0, 0, 0, 0.75)` with `backdrop-filter: blur(6px)`.
   - Center alignment with flexbox or CSS grid.
   - Clear close action (`ESC` key listener and visible `✕` button with aria-label).

---

## Phase 3: Anti-Patterns to Avoid

1. **No Ad-Hoc Inline Colors**: Avoid hardcoding raw hex values across random element styles; use the semantic `--accent-*` or `--bg-*` tokens.
2. **No Layout Overflow**: Always enforce `box-sizing: border-box;` and contain flex/grid children with `min-width: 0;` to prevent unwanted horizontal scrolling.
3. **No Unscaled Text**: Never use tiny unreadable text (< 11px) on desktop UI viewports.
