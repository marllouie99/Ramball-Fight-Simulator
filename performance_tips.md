# Canvas Performance Optimization Strategies

Since your game uses complex procedural vector drawings (like Cronos's blades and Doppelganger's auras), here are the most effective techniques to maintain those gorgeous visuals without destroying the frame rate.

## 1. Pre-rendering with Offscreen Canvas (Caching)
This is the **#1 most impactful change** you can make for 2D Canvas games. 

Right now, your game recalculates gradients, math (like `Math.sin`), and complex path strokes (`ctx.arc`, `ctx.bezierCurveTo`) every single frame for every fighter.
Instead of drawing complex shapes frame-by-frame:
1. Create a hidden, offscreen `canvas` element in memory.
2. Draw your complex weapon/aura onto this offscreen canvas **once** when the object is created.
3. In your main `update()` or `draw()` loop, use `ctx.drawImage(cachedCanvas, x, y)` to copy the pixels directly.

`drawImage` is hardware-accelerated and incredibly fast. For animated elements, you can pre-render a "sprite sheet" of the animation frames on an offscreen canvas and cycle through them.

## 2. Implement Object Pooling for Particles
Currently, when a fighter dies or dashes, effects are pushed to arrays (e.g., `state.doppelgangerDeathEffects.push({...})`) and later removed using `splice()`.
- **The Problem:** Creating and destroying hundreds of objects per second triggers the JavaScript Garbage Collector (GC). When the GC runs, the game stutters (frame drops).
- **The Solution:** Create an **Object Pool**. Pre-allocate a large array of reusable particle objects when the game starts. When an effect spawns, grab an inactive particle from the pool, reset its values, and mark it active. When it dies, just mark it inactive instead of deleting it.

## 3. Limit Expensive Context State Changes
The Canvas API functions `ctx.save()` and `ctx.restore()` are surprisingly slow because they push the entire canvas state (transforms, styles, alpha, filters) onto a stack. 
- Avoid wrapping every single particle draw in `save/restore`. 
- Instead, manually reverse transforms (e.g., `ctx.translate(x, y)` then `ctx.translate(-x, -y)`) or reset alpha (`ctx.globalAlpha = 1.0`).
- Group identical drawing operations together. If 50 particles share the same color and blend mode, set `ctx.fillStyle` and `ctx.globalCompositeOperation` once, then draw all 50 inside a single `beginPath()`.

## 4. Minimize Costly Operations
Certain Canvas features force the CPU/GPU to work much harder:
- **`ctx.shadowBlur` and `ctx.filter`**: These are notoriously slow. If you need a glow effect, it is often faster to draw a semi-transparent radial gradient underneath the object than to use `shadowBlur`.
- **`globalCompositeOperation`**: Modes like `'lighter'`, `'screen'`, or `'multiply'` require the browser to read the background pixels and calculate new colors. Use them sparingly, or cache the result.

## 5. Separate Rendering from Logic (Fixed Timestep)
Ensure your physics/logic loop runs at a fixed rate (e.g., 60 times a second), but your render loop runs as fast as `requestAnimationFrame` allows. If the game drops frames, the physics shouldn't slow down. This prevents the "sluggish" feeling during heavy visual moments.

## 6. The Ultimate Fix: WebGL / PixiJS
If you want to push the graphics even further (thousands of glowing particles, complex shaders, lighting), the 2D Canvas API has a hard ceiling because it's largely CPU-bound. 
Migrating the rendering pipeline to a WebGL wrapper like **Pixi.js** would offload all that rendering to the GPU. You could maintain 10x the current visual complexity without dipping below 60 FPS.
