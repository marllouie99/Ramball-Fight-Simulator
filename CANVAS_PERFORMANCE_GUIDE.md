# ⚡ HTML5 Canvas 2D Performance & High-Fidelity Visual Guide

A developer guide on how to render high-quality, anime-grade visual effects, complex fighter models, and domain expansions in HTML5 Canvas 2D while maintaining a **locked 60 FPS**.

---

## 🚀 1. Complete Elimination of Native `ctx.shadowBlur`

### ❌ The Problem:
Native `ctx.shadowBlur` forces the browser's 2D canvas context out of GPU hardware acceleration into CPU-side software gaussian blurring. Calling `shadowBlur` even once inside a 60 FPS animation loop drops frame rates to ~30 FPS.

```javascript
// ❌ SLOW: CPU software blur (drops FPS)
ctx.shadowBlur = 20;
ctx.shadowColor = '#00E5FF';
ctx.stroke();
```

### ✅ The Solution (Additive Composite Blending):
Use `globalCompositeOperation = 'lighter'` or `'screen'` combined with multi-layered transparent path strokes. GPU rasterizers blend additive colors instantly.

```javascript
// ✅ FAST: Additive bloom effect on GPU (100% 60 FPS)
ctx.save();
ctx.globalCompositeOperation = 'lighter';

// Outer soft bloom stroke
ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
ctx.lineWidth = 10;
ctx.stroke();

// Inner crisp core stroke
ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
ctx.lineWidth = 3;
ctx.stroke();

ctx.restore();
```

---

## 🎨 2. Offscreen Canvas Caching for Complex Vector Constructs

### ❌ The Problem:
Redrawing complex procedural graphics (e.g. Yuta's 36 katanas, Malevolent Shrine, Unlimited Void rings) requires executing hundreds of `ellipse`, `quadraticCurveTo`, and `fill` operations on every single frame.

```javascript
// ❌ SLOW: Re-drawing 36 detailed vector katanas every frame
swords.forEach(sword => {
  ctx.ellipse(...);
  ctx.fill();
  ctx.stroke();
});
```

### ✅ The Solution (Hardware Offscreen Caching):
Pre-render static or semi-static vector structures onto an offscreen `<canvas>` buffer **once** when summoned or created. Then, render the pre-built buffer using `ctx.drawImage()`, which is hardware-accelerated by the GPU.

```javascript
// ✅ FAST: Pre-render to offscreen canvas once, draw in 1 call
if (!this._cachedBufferCanvas) {
  this._cachedBufferCanvas = document.createElement('canvas');
  this._cachedBufferCanvas.width = canvasWidth;
  this._cachedBufferCanvas.height = canvasHeight;
  const offCtx = this._cachedBufferCanvas.getContext('2d');

  // Draw 36 complex vector shapes onto offCtx ONCE...
  swords.forEach(s => drawComplexSword(offCtx, s));
}

// Per-frame tick: 1 instant hardware-accelerated GPU draw call!
ctx.drawImage(this._cachedBufferCanvas, 0, 0);
```

---

## 🎬 3. Sakuga 30 FPS Stepped Geometry Caching

### ❌ The Problem:
Calculating 28-point trigonometric procedural curves (`Math.sin`, `Math.cos`, `Math.pow`) on every frame tick (60 times/second) consumes excessive CPU calculation budget.

### ✅ The Solution:
Quantize geometry recalculation to **30 FPS stepped frame intervals** (matching authentic anime Sakuga frame rates). Alternate 60 FPS render ticks reuse the cached path coordinates without re-running trigonometric loops.

```javascript
// ✅ FAST: 30 FPS Sakuga geometry stepping
const frameRate = 30;
const frameIndex = Math.floor((Date.now() / 1000) * frameRate);

if (this._lastAuraFrame !== frameIndex) {
  this._lastAuraFrame = frameIndex;
  this._cachedAuraPoints = calculateFlameContourPoints(28); // Calculate 30 times/sec
}

// 60 FPS render pass uses cached geometry points directly!
drawPathFromPoints(ctx, this._cachedAuraPoints);
```

---

## 🖌️ 4. Path Batching (1 Stroke per Path, Not N Strokes per Segment)

### ❌ The Problem:
Executing `ctx.stroke()` or `ctx.fill()` inside a loop over individual path segments creates heavy draw-call overhead.

```javascript
// ❌ SLOW: 140 individual stroke calls per frame
for (let i = 0; i < points.length; i++) {
  ctx.beginPath();
  ctx.moveTo(...);
  ctx.lineTo(...);
  ctx.stroke(); // 140 draw calls!
}
```

### ✅ The Solution (Single Continuous Path Batching):
Build the entire continuous path using `moveTo` and `quadraticCurveTo`, then call `ctx.stroke()` **once** at the end.

```javascript
// ✅ FAST: 1 continuous path stroke (28x draw call reduction)
ctx.beginPath();
ctx.moveTo(midX, midY);
for (let i = 0; i < points.length; i++) {
  ctx.quadraticCurveTo(points[i].x, points[i].y, nextMidX, nextMidY);
}
ctx.closePath();
ctx.stroke(); // 1 single stroke call!
```

---

## ♻️ 5. Object Pooling & Memory Management (Zero GC Stutters)

### ❌ The Problem:
Allocating temporary object literals (`{ x: 10, y: 20 }`) and using `array.push()` / `array.splice()` during rapid skill attacks triggers periodic browser Garbage Collection (GC) micro-stutters.

```javascript
// ❌ SLOW: Allocating new object literals every frame tick
afterImages.push({ x: fighter.x, y: fighter.y, timer: 10 });
```

### ✅ The Solution (Pre-allocated Object Pools):
Pre-allocate fixed object pools and mutate existing properties in-place.

```javascript
// ✅ FAST: Reusing pooled objects without allocations or array splices
let img = afterImages.find(a => a.timer <= 0);
if (!img && afterImages.length < maxLimit) {
  img = { x: 0, y: 0, timer: 0 };
  afterImages.push(img);
}
if (img) {
  img.x = fighter.x;
  img.y = fighter.y;
  img.timer = 10;
}
```

---

## 🌅 6. Gradient Instantiation Optimization

### ❌ The Problem:
Creating new `ctx.createRadialGradient` or `ctx.createLinearGradient` instances inside a per-particle loop (e.g. 100 particles) allocates thousands of gradient objects per second.

```javascript
// ❌ SLOW: 100 radial gradient instantiations per frame tick
particles.forEach(p => {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
  ctx.fillStyle = g;
  ctx.fill();
});
```

### ✅ The Solution:
For high-density particle streams (flames, sparks, embers), use simple `rgba()` fill styles with `globalCompositeOperation = 'lighter'`. Reserve radial gradients for single macro overlays (like full-screen domain backgrounds).

```javascript
// ✅ FAST: Simple color fill with GPU additive blending
ctx.globalCompositeOperation = 'lighter';
particles.forEach(p => {
  ctx.fillStyle = `rgba(255, 140, 20, ${p.alpha})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
});
```

---

## 🏞️ 7. Viewport & Domain Spatial Culling

### ❌ The Problem:
Repainting the full-screen white canvas background (`fillRect(0, 0, width, height)`) when a dark Domain Expansion is active causes double screen fill work on every frame.

### ✅ The Solution:
Detect active Domain Expansions before running standard background fills, and skip repainting covered layers.

```javascript
// ✅ FAST: Skip white background fill during domain expansions
const hasActiveDomain = state.fighters && state.fighters.some(f => f && f.domainActive);

if (!hasActiveDomain) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
```

---

## Summary Checklist for New Fighter & Skill Visuals

- [ ] Does the renderer avoid `ctx.shadowBlur` completely?
- [ ] Are static/semi-static vector graphics pre-rendered to an offscreen `<canvas>` buffer?
- [ ] Are flame contour calculations stepped on 30 FPS Sakuga intervals?
- [ ] Are segment strokes batched into continuous paths (`1 stroke per path`)?
- [ ] Are particle systems using pre-allocated object pools without `array.splice()`?
- [ ] Is `globalCompositeOperation = 'lighter'` used for luminous glow effects instead of radial gradients in loops?
