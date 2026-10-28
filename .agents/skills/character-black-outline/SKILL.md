---
name: character-black-outline
description: Enforce a mandatory crisp black manga ink outline (#0E0F14 / #000000) on all fighter body circles, heads, and pixel hands whenever creating, scaffolding, or rendering any character skin.
---

# Mandatory Universal Character Black Outline Standard (Rule 32)

Whenever creating, scaffolding, designing, or rendering a new character or skin in Circle Mini-Battle, the agent **MUST ALWAYS add a crisp, bold black manga ink outline** (`#0E0F14` or `#000000`, 2.0px stroke) around the character's body circle and pixel hands.

---

## 1. Core Architectural Rationale & Why It Is Mandatory

1. **Arena Floor Contrast & Anti-Blend Standard**:
   - The canonical arena floor in Circle Mini-Battle is bright/white (`#FFFFFF` / `#F8FAFC`).
   - Characters with fair skin, white helmets (e.g. Bomber Man), blonde/white hair (Gojo, Denji, Uryu), or light clothing will bleed into the arena background and become visually invisible or borderless without a solid black outer contour.
2. **Signature Anime / Manga Ink Aesthetic**:
   - Circle Mini-Battle's visual identity relies on bold, clean, 2D circular manga ink outlines that crisply separate combatants from spells, projectiles, floor tiles, and explosion rings.
3. **Instant Hitbox & Silhouette Readability**:
   - A bold 2.0px black boundary clearly communicates the character's exact physical collision radius ($r = 25$) to players during chaotic 60 FPS combat.

---

## 2. Implementation Specifications

### A. Body Circle Black Outline (`Layer 1.5`)
Directly after rendering the fighter's pixel body circle (via offscreen buffer or procedural pass) and BEFORE drawing hair/hands, ALWAYS stroke the outer body outline:

```javascript
// Layer 1: Central Pixel Body Circle (Toji Baseline Standard)
drawCharacterPixelBody(ctx, r, fighter);

// Layer 1.5: Mandatory Universal Character Black Outline Standard (Rule 32)
// Guarantees circular body geometry & pale/white helmets sharply pop off the white arena floor
ctx.save();
ctx.beginPath();
ctx.arc(0, 0, r, 0, Math.PI * 2);
ctx.lineWidth = 2.0;
ctx.strokeStyle = '#0E0F14';
ctx.stroke();
ctx.restore();
```

### B. Canonical Pixel Hand Black Outlines (`Layer 2` / Rule 20)
Whenever calling `drawPixelHand` at the canonical lower flanks (`-r * 0.82, +r * 0.38` and `+r * 0.82, +r * 0.38`), ALWAYS pass `#0E0F14` or `#000000` as the `outlineColor`:

```javascript
// Layer 3: Canonical Default Symmetrical Hands (Rule 20) with Crisp Black Ink Outline
const handRadius = getHandSize(r * 0.30, fighter);
const handFill = fighter.color || '#FFE0BD';
const handOutline = '#0E0F14'; // MANDATORY: Crisp black manga ink border

// Left Hand
drawPixelHand(ctx, -r * 0.82, r * 0.38, handRadius, handFill, handOutline);

// Right Hand
drawPixelHand(ctx, +r * 0.82, r * 0.38, handRadius, handFill, handOutline);
```

### C. Offscreen Canvas 4-Neighbor Rasterization Outline
If using the Toji offscreen rasterizer (`_renderPixelBodyToCanvas`), the outer 4-neighbor boundary test MUST fill with `#0E0F14`:

```javascript
const isBorder = (
  Math.hypot((gx + 1) * P, gy * P) > r ||
  Math.hypot((gx - 1) * P, gy * P) > r ||
  Math.hypot(gx * P, (gy + 1) * P) > r ||
  Math.hypot(gx * P, (gy - 1) * P) > r
);

if (isBorder) {
  destCtx.fillStyle = '#0E0F14';
  destCtx.fillRect(px, py, P, P);
  continue;
}
```

---

## 3. Strict Prohibitions

1. **NO Borderless Characters**: Never render a fighter skin whose upper crown or outer perimeter has zero black outline.
2. **NO Tinted Hand Outlines**: Never use low-contrast tinted hand outlines (e.g. pink-on-pink, light maroon) that fail to define the fists against the body. Always use `#0E0F14`.
3. **NO shadowBlur CPU Filters**: Outlines must be crisp vector strokes (`ctx.stroke()`) or stepped raster pixels. Never use `ctx.shadowBlur` (Rule 2.2).

---

## 4. Verification Checklist for Every New Character

- [ ] Body circle calls `ctx.arc(0, 0, r, 0, Math.PI * 2)` with `strokeStyle = '#0E0F14'` and `lineWidth = 2.0`.
- [ ] Left hand calls `drawPixelHand` with `outlineColor = '#0E0F14'`.
- [ ] Right hand calls `drawPixelHand` with `outlineColor = '#0E0F14'`.
- [ ] Character is tested on a pure white background (`#FFFFFF`) to ensure 100% silhouette clarity.
- [ ] `npm run verify` runs cleanly with 0 stack depth leaks.
