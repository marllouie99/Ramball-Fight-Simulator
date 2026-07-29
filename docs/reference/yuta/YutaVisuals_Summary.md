# Yuta Okkotsu — Visual & Graphics Implementation Summary

This document details all visual rendering logic, color palettes, and particle effects for Yuta Okkotsu.

---

## 🎨 Color Palette
- **Body Skin / Color:** `#EEEEEE` (Soft Silver / White)
- **Cursed Energy Aura:** `#32CD32` (Bright Green / Lime Green)
- **Cursed Energy Liquid Core:** `rgba(50, 205, 50, 0.75)`
- **Katana Swing Crescent Trail:** 
  - Outer Volumetric Glow: `rgba(230, 0, 120, 0.25)` (Saturated Hot Pink)
  - Crescent Body Fill: `rgba(255, 20, 147, 0.45)` (Deep Hot Pink)
  - Blade Core Spine: `rgba(255, 220, 235, 0.85)` (Searing White-Pink)
  - Ink Stroke Contours: `rgba(0, 0, 0, 0.85)` (JJK Calligraphy Ink Lines)
- **RCT Revival Aura:** `#00FF7F` (Spring Green)
- **Domain Expansion Ring:** `#8A2BE2` (Blue Violet) & `#00E5FF` (Cyan)

---

## 🖌️ Visual Components & Render Hooks

### 1. Viscous Liquid Cursed Energy Aura (`_drawYutaCursedEnergyAura`)
- **Render Mode:** Multi-layered Bezier contour points (`numPoints = 28`) flowing with upward fluid drift.
- **Blending:** `screen` composite operation for luminous back-glow, layered over solid ink-hatched contours.
- **Countdown Display:** Forces `combatAuraOpacity = 1.0` during the countdown phase to display Yuta's green cursed energy immediately upon spawn.

### 2. Dynamic Katana Blade & Tip Trail (`_drawKatanaTrail`)
- **Smooth Curves:** Quadratic Bezier smoothing (`smoothPath`) through historical world-space tip coordinates.
- **Ink Speed Lines:** Interior calligraphy speed lines running along the centerline of the swing arc.
- **Katana Chest Strap:** Real-time rendered diagonal leather chest strap overlaying Yuta's body (`_drawYutaSwordStrap`).

### 3. Rika Orimoto Manifestation (`rikaLogic.js`)
- Autonomous companion sphere (`radius = 30`) with dark purple/cyan energy aura, chasing targets and delivering heavy physical punches.

### 4. Reverse Cursed Technique (RCT) Revival (`triggerRCTRevival`)
- Triggers a 2.5-second stop-and-heal sequence.
- Displays an ascending green energy spiral and glowing RCT health aura while frozen.

### 5. Copied Techniques (`yutaCopyLogic.js`)
- **Cursed Speech:** "DON'T MOVE!" text floating above Yuta's head, spawning an expanding shockwave ring that freezes enemies in time.
- **Thin Ice Breaker:** Spatial distortion projectile that warps background space and blasts targets back.

### 6. Domain Expansion: Authentic Mutual Love
- Renders isometric void ground ring with scattered katana blades and floating header text.

---

## 📁 Packaged Files in `YutaImplementation/`
- [YutaFighter.js](file:///C:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/YutaImplementation/YutaFighter.js)
- [rikaLogic.js](file:///C:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/YutaImplementation/rikaLogic.js)
- [yutaCopyLogic.js](file:///C:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/YutaImplementation/yutaCopyLogic.js)
- [yuta.md](file:///C:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/YutaImplementation/yuta.md)
