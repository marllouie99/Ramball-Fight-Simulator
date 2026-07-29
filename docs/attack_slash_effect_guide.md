# How to Implement a Dynamic Attack Slash Effect

This guide explains how to build the dynamic, anime-style attack slash effect (seen on fighters like Cronos and Berserker) using HTML5 Canvas. The effect features a sword trail that smoothly "grows" behind the blade, lingers in the air, and fades out dynamically.

## 1. State Variables

To decouple the physical attack logic from the visual linger effect, your fighter class needs two distinct timers:

```javascript
this.swingTimer = 24;      // Tracks the physical weapon swing
this.slashFadeTimer = 0;   // Tracks the visual lingering of the trail
```

When updating the fighter state, trigger the fade timer exactly when the physical swing ends:

```javascript
if (this.swingActive) {
  this.swingTimer--;
  if (this.swingTimer <= 0) {
    this.swingActive = false;
    this.slashFadeTimer = 15; // Linger for 15 frames
  }
} else if (this.slashFadeTimer > 0) {
  this.slashFadeTimer--;
}
```

## 2. Drawing the Effect

The drawing logic relies heavily on `ctx.clip()` to reveal the trail dynamically, and `ctx.createLinearGradient()` to create the fading tail. 

### A. Calculate Progress and Alpha
First, determine how far along the swing the weapon is.
```javascript
let progress = 1.0;
let fade = this.slashFadeTimer / 15;

if (this.swingActive) {
  progress = 1 - (this.swingTimer / SWING_DURATION);
  fade = 1.0;
}

// Optional: Apply an easing curve to the fade for a punchier flash
const glowAlpha = Math.pow(fade, 0.8);
```

### B. Define the Angles
Define the maximum start and end angles of your swing, then interpolate the current end angle based on the `progress`.
```javascript
const fullStartAngle = -Math.PI * 0.4;
const fullEndAngle = Math.PI * 0.4;
const currentEndAngle = fullStartAngle + (fullEndAngle - fullStartAngle) * progress;
```

### C. The Growing Clip Region
By clipping the canvas to a pie slice that spans from the `fullStartAngle` to the `currentEndAngle`, the slash trail will appear to dynamically follow right behind the weapon!

```javascript
ctx.save();
ctx.rotate(weaponFacingAngle);

// Clip the canvas to only draw up to the weapon's current position
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.arc(0, 0, arcRadius + 20, fullStartAngle - 0.1, currentEndAngle);
ctx.closePath();
ctx.clip();
```

### D. The Fading Tail Gradient
To prevent the trail from looking like a solid block of color, use a linear gradient from the tail (transparent) to the head (opaque).
```javascript
// Calculate Y coordinates for the gradient
const fullStartY = Math.sin(fullStartAngle) * arcRadius;
const currentY = Math.sin(currentEndAngle) * arcRadius;
const gradEndY = Math.max(fullStartY + 0.1, currentY); 

const tailGrad = ctx.createLinearGradient(0, fullStartY, 0, gradEndY);

// Make sure Stop 0 is fully transparent (alpha 0)
tailGrad.addColorStop(0, 'rgba(0, 243, 255, 0.0)'); 
tailGrad.addColorStop(1, 'rgba(0, 243, 255, 1.0)');

ctx.strokeStyle = tailGrad;
```

### E. Draw the Trail
Finally, draw the *full* arc shape. Thanks to our clipping path from Step C, only the generated portion of the trail is drawn.

```javascript
ctx.globalCompositeOperation = 'screen';
ctx.globalAlpha = glowAlpha;

ctx.beginPath();
ctx.arc(0, 0, arcRadius, fullStartAngle, fullEndAngle);
ctx.stroke();

ctx.restore();
```

> **Texture Overlays**
> If you want to add a texture to the slash (like a honeycomb grid), wrap the texture drawing code inside the *exact same* clipping block so it maps perfectly to the crescent. You can also reuse the same `tailGrad` gradient for the texture strokes so they smoothly fade away with the tail!
