---
name: character-black-outline
description: Enforce mandatory crisp black manga ink outlines (#0E0F14 / #000000) on all fighter body circles, heads, and pixel hands, as well as the canonical world-space coordinate translation contract for global in-game manga ink outline generation whenever creating, scaffolding, or rendering any character skin.
---

# Mandatory Universal Character Black Outline Standard (Rule 32)

Whenever creating, scaffolding, designing, or rendering a new character or skin in Circle Mini-Battle, the agent **MUST ALWAYS add a crisp, bold black manga ink outline** (`#0E0F14` or `#000000`, 2.0px stroke) around the character's body circle and pixel hands, and **MUST ALWAYS adhere to the Canonical World-Space Coordinate Translation Contract** to ensure the global in-game manga ink outline (`drawFighterInkOutline`) functions seamlessly.

---

## 1. Core Architectural Rationale & Why It Is Mandatory

1. **Arena Floor Contrast & Anti-Blend Standard**:
   - The canonical arena floor in Circle Mini-Battle is bright/white (`#FFFFFF` / `#F8FAFC`).
   - Characters with fair skin, white helmets (e.g. Bomber Man), blonde/white hair (Gojo, Denji, Uryu), or light clothing will bleed into the arena background and become visually invisible or borderless without a solid black outer contour.
2. **Signature Anime / Manga Ink Aesthetic**:
   - Circle Mini-Battle's visual identity relies on bold, clean, 2D circular manga ink outlines that crisply separate combatants from spells, projectiles, floor tiles, and explosion rings.
3. **Instant Hitbox & Silhouette Readability**:
   - A bold 2.0px black boundary clearly communicates the character's exact physical collision radius ($r = 25$) to players during chaotic 60 FPS combat.
4. **Global In-Game Manga Ink Outline Pipeline Compatibility**:
   - In live gameplay, `EntityRenderer.js` automatically renders a 2.2px solid manga ink outline (`#050609`) via `drawFighterInkOutline` behind every hero fighter. This pipeline depends strictly on the fighter's `drawBody()` method translating to world-space coordinates `(fighter.x, fighter.y)`.

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

### B. Canonical Pixel Hand Black Outlines (`Layer 3` / Rule 20)
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

## 3. Mandatory Canonical World-Space Coordinate Translation Contract

### The Rule:
- **`draw[Name]Skin(ctx, fighter)` MUST ALWAYS translate to `(fighter.x, fighter.y - (fighter.z || 0))` internally** at the very top of the function immediately after `ctx.save()`.
- **`fighter.draw(ctx, opponent)` MUST ALWAYS call `this.drawBody(ctx);` directly in world space**, without wrapping it in an ad-hoc `ctx.translate(this.x, this.y)`.

```javascript
// CORRECT SKIN IMPLEMENTATION:
export function drawCharacterSkin(ctx, fighter) {
  if (!ctx || !fighter) return;
  const r = fighter.r || 25;

  ctx.save();
  // MANDATORY: Internal translation to world space
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // Orientation & local drawing relative to (0, 0)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  ...
  ctx.restore();
}

// CORRECT FIGHTER CLASS DRAW IMPLEMENTATION:
draw(ctx, opponent) {
  if (!ctx) return;
  // World-space visual effects, projectiles, and planted objects
  ...
  // MANDATORY: Call drawBody directly in world space (NO outer ctx.translate(this.x, this.y)!)
  this.drawBody(ctx);

  this.drawHealth(ctx);
  this.drawFreezeTimer(ctx);
}
```

### Why This Is Architecturally Critical:
1. `EntityRenderer.js` invokes `drawFighterInkOutline(ctx, fighter)` to generate the 2.2px manga ink outline for every character.
2. Inside `fighterOutlineRenderer.js`, the engine sets up an offscreen $160 \times 160$ silhouette buffer and translates by:
   $$\text{translate}(\text{HALF\_BUFFER} - \text{fighter.x}, \text{HALF\_BUFFER} - \text{fighter.y})$$
3. When `fighter.drawBody(_sourceCtx)` is called, the internal translation $\text{translate}(\text{fighter.x}, \text{fighter.y})$ cancels out the offset:
   $$(\text{HALF\_BUFFER} - \text{fighter.x}) + \text{fighter.x} = \text{HALF\_BUFFER} = 80$$
   This perfectly centers the character at $(80, 80)$ inside the offscreen buffer!
4. **The Failure Mode If Omitted**: If `draw[Name]Skin` does not translate internally to `(fighter.x, fighter.y)`, the character is drawn at:
   $$(\text{HALF\_BUFFER} - \text{fighter.x}, \text{HALF\_BUFFER} - \text{fighter.y})$$
   When the fighter is at $(240, 465)$, the character is drawn at $(-160, -385)$—**completely outside the $160 \times 160$ buffer**! The buffer remains 100% transparent, and the fighter receives **ZERO global black outline** on screen during gameplay!

---

## 4. Silhouette Pass Filtering (`_isSilhouettePass` & `state.showSkinOnly`)

During the outline generation pass, `fighterOutlineRenderer.js` flags `fighter._isSilhouettePass = true` and `state.showSkinOnly = true`.

To prevent glowing auras, energy bubbles, shield domes, and projectile sparks from creating giant solid black boxes or discs in the silhouette outline, **always gate non-body visual effects**:

```javascript
// Suppress glowing visual auras during silhouette pass
if (!fighter._isSilhouettePass) {
  _drawCharacterAuraOrShield(ctx, r, fighter);
}

// Suppress transient attack shimmer rings during silhouette pass
if (fighter.attackAnimTimer > 0 && !fighter._isSilhouettePass) {
  _drawAttackShimmerRing(ctx, r);
}

// Suppress held weapons from silhouette if weapons are suppressed
if (!fighter._isSilhouettePass && !fighter.hideWeapon && !(typeof state !== 'undefined' && state.showSkinOnly)) {
  _drawHeldWeapon(ctx, fighter);
}
```

---

## 5. Strict Prohibitions

1. **NO Borderless Characters**: Never render a fighter skin whose upper crown or outer perimeter has zero black outline.
2. **NO Tinted Hand Outlines**: Never use low-contrast tinted hand outlines (e.g. pink-on-pink, light maroon) that fail to define the fists against the body. Always use `#0E0F14` or `#000000`.
3. **NO External Translation Wrappers in `draw()`**: Never wrap `this.drawBody(ctx)` in `ctx.translate(this.x, this.y)` inside `fighter.draw()`. Translation belongs strictly inside `draw[Name]Skin`.
4. **NO shadowBlur CPU Filters**: Outlines must be crisp vector strokes (`ctx.stroke()`) or stepped raster pixels. Never use `ctx.shadowBlur` (Rule 11).

---

## 6. Verification Checklist for Every New Character

- [ ] `draw[Name]Skin(ctx, fighter)` starts with `ctx.save(); ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));`.
- [ ] Fighter class `draw(ctx, opponent)` calls `this.drawBody(ctx)` directly without an outer `ctx.translate(this.x, this.y)`.
- [ ] Body circle calls `ctx.arc(0, 0, r, 0, Math.PI * 2)` with `strokeStyle = '#0E0F14'` and `lineWidth = 2.0` (Layer 1.5).
- [ ] Left hand calls `drawPixelHand` with `outlineColor = '#0E0F14'`.
- [ ] Right hand calls `drawPixelHand` with `outlineColor = '#0E0F14'`.
- [ ] Glowing auras, shields, and combat VFX are guarded with `if (!fighter._isSilhouettePass)`.
- [ ] Character is tested on a pure white arena floor (`#FFFFFF`) to ensure 100% silhouette clarity and confirm the 2.2px global in-game manga ink outline renders around the character.
- [ ] `npm run verify` runs cleanly with 0 stack depth leaks.
