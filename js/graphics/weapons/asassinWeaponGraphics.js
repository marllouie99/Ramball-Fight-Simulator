// asassinWeaponGraphics.js
//  - Use this file for Dark Slate Gray/Assassin-specific weapon graphics (shuriken and melee).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Assassin weapon visuals, edit the palette or functions below.

export const ASSASSIN_WEAPON_GRAPHICS = {
  shuriken: {
    bladeColor: '#3a3a3a',            // Main blade color
    bladeEdge: '#5a5a5a',             // Blade edge
    bladeHighlight: '#8a8a8a',        // Blade highlight
    centerColor: '#2a2a2a',           // Center hole color
  },
  positioning: {
    shurikenScale: 1.8,
    shurikenOffset: 12,               // Distance from fighter body edge
    meleeScale: 1.0,
    meleeOffset: 6,                   // Distance from fighter body edge
  },
  dimensions: {
    shurikenOuterRadius: 12,
    shurikenInnerRadius: 4,
    shurikenBladeWidth: 6,
    shurikenCenterRadius: 3,
    shurikenNotchRadius: 1.5,
  },
};

/**
 * Draws a shuriken weapon for the Dark Slate Gray fighter.
 * ★ POSITION ADJUST: Change this offset to move shuriken closer/farther from fighter
 * ★ SIZE ADJUST: Change shurikenScale to resize the entire weapon
 */
export function drawDarkSlateGrayShuriken(ctx, x, y, gunAngle, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);
  
  // ★ POSITION ADJUST: Change this offset to move shuriken closer/farther from fighter
  // Increase = farther away, Decrease = closer to body
  ctx.translate(r + ASSASSIN_WEAPON_GRAPHICS.positioning.shurikenOffset, 0);
  
  // ★ SIZE ADJUST: Change this scale to resize the entire shuriken
  const shurikenScale = ASSASSIN_WEAPON_GRAPHICS.positioning.shurikenScale;
  const shuriken = ASSASSIN_WEAPON_GRAPHICS.shuriken;
  const dim = ASSASSIN_WEAPON_GRAPHICS.dimensions;

  // Draw 4-pointed star shuriken
  const numPoints = 4;
  const outerRadius = dim.shurikenOuterRadius * shurikenScale;
  const innerRadius = dim.shurikenInnerRadius * shurikenScale;
  const bladeWidth = dim.shurikenBladeWidth * shurikenScale;

  for (let i = 0; i < numPoints; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / numPoints);
    
    // Main blade shape
    ctx.beginPath();
    ctx.moveTo(0, -bladeWidth / 2);
    ctx.lineTo(outerRadius, 0);
    ctx.lineTo(0, bladeWidth / 2);
    ctx.lineTo(innerRadius, 0);
    ctx.closePath();
    
    // Blade gradient for metallic effect
    const bladeGradient = ctx.createLinearGradient(0, -bladeWidth / 2, outerRadius, 0);
    bladeGradient.addColorStop(0, shuriken.bladeEdge);
    bladeGradient.addColorStop(0.5, shuriken.bladeColor);
    bladeGradient.addColorStop(1, shuriken.bladeHighlight);
    ctx.fillStyle = bladeGradient;
    ctx.fill();
    
    // Sharp edge highlight
    ctx.strokeStyle = shuriken.bladeHighlight;
    ctx.lineWidth = 1 * shurikenScale;
    ctx.stroke();
    
    ctx.restore();
  }

  // Center ring (the hole in the middle of the shuriken)
  ctx.beginPath();
  ctx.arc(0, 0, dim.shurikenCenterRadius * shurikenScale, 0, Math.PI * 2);
  ctx.fillStyle = shuriken.centerColor;
  ctx.fill();
  ctx.strokeStyle = shuriken.bladeEdge;
  ctx.lineWidth = 1.5 * shurikenScale;
  ctx.stroke();

  // Add small decorative notches on each blade
  for (let i = 0; i < numPoints; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / numPoints);
    
    ctx.beginPath();
    ctx.arc(outerRadius * 0.6, 0, dim.shurikenNotchRadius * shurikenScale, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    
    ctx.restore();
  }

  ctx.restore();
}

export function drawDarkSlateGrayMelee(ctx, x, y, gunAngle, r, animationOffsetScale = 1.0, flashIntensity = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle + Math.PI / 2);
  ctx.translate((r + ASSASSIN_WEAPON_GRAPHICS.positioning.meleeOffset) * animationOffsetScale, 0);
  ctx.rotate(-Math.PI / 2);

  const kunaiScale = 1.2;
  const bladeLength = r * 1.2 * kunaiScale;
  const bladeWidth = r * 0.45 * kunaiScale;
  const hiltLength = r * 0.6 * kunaiScale;
  const ringRadius = 3 * kunaiScale;

  // Kunai Ring (pommel)
  ctx.beginPath();
  ctx.arc(-hiltLength - ringRadius, 0, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Handle (wrapped)
  ctx.fillStyle = '#6e2b2b'; // Dark red wrap
  ctx.fillRect(-hiltLength, -bladeWidth * 0.15, hiltLength, bladeWidth * 0.3);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(-hiltLength, -bladeWidth * 0.15, hiltLength, bladeWidth * 0.3);
  
  // Wrap lines for detail
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const lx = -hiltLength + (hiltLength * i / 4);
    ctx.moveTo(lx, -bladeWidth * 0.15);
    ctx.lineTo(lx, bladeWidth * 0.15);
  }
  ctx.strokeStyle = '#3d1616';
  ctx.stroke();

  // Guard / Base of Blade
  ctx.beginPath();
  ctx.moveTo(0, -bladeWidth * 0.25);
  ctx.lineTo(0, bladeWidth * 0.25);
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Kunai Blade (Diamond leaf shape)
  const bladeGradient = ctx.createLinearGradient(0, -bladeWidth / 2, bladeLength, 0);
  bladeGradient.addColorStop(0, '#5a5a5a');
  bladeGradient.addColorStop(0.5, '#7a7a7a');
  bladeGradient.addColorStop(1, '#a0a0a0');
  
  ctx.fillStyle = bladeGradient;
  ctx.beginPath();
  ctx.moveTo(0, -bladeWidth * 0.25); // base top
  ctx.lineTo(bladeLength * 0.25, -bladeWidth * 0.5); // widest top
  ctx.lineTo(bladeLength, 0); // tip
  ctx.lineTo(bladeLength * 0.25, bladeWidth * 0.5); // widest bottom
  ctx.lineTo(0, bladeWidth * 0.25); // base bottom
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center ridge line
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(bladeLength * 0.95, 0);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Flash effect during attack - bright white glow
  if (flashIntensity > 0.1) {
    ctx.beginPath();
    ctx.moveTo(0, -bladeWidth * 0.25);
    ctx.lineTo(bladeLength * 0.25, -bladeWidth * 0.5);
    ctx.lineTo(bladeLength, 0);
    ctx.lineTo(bladeLength * 0.25, bladeWidth * 0.5);
    ctx.lineTo(0, bladeWidth * 0.25);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.7})`;
    ctx.fill();
  }

  // Edge highlight
  ctx.beginPath();
  ctx.moveTo(bladeLength * 0.25, -bladeWidth * 0.5 + 1.5);
  ctx.lineTo(bladeLength * 0.96, 0);
  ctx.lineTo(bladeLength * 0.25, bladeWidth * 0.5 - 1.5);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + flashIntensity * 0.6})`;
  ctx.lineWidth = 1 + flashIntensity * 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a shuriken projectile in flight.
 * Used by the projectile system to render shuriken as detailed spinning stars.
 * ★ SIZE ADJUST: Change scale parameter to resize projectile
 */
export function drawShurikenProjectile(ctx, x, y, angle, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Increase the base scale of the projectile to match the held weapon
  const shurikenScale = Math.max(0.5, scale * 1.8);
  const shuriken = ASSASSIN_WEAPON_GRAPHICS.shuriken;
  const dim = ASSASSIN_WEAPON_GRAPHICS.dimensions;

  const numPoints = 4;
  const outerRadius = 10 * shurikenScale;
  const innerRadius = 3 * shurikenScale;
  const bladeWidth = 5 * shurikenScale;

  for (let i = 0; i < numPoints; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / numPoints);
    
    ctx.beginPath();
    ctx.moveTo(0, -bladeWidth / 2);
    ctx.lineTo(outerRadius, 0);
    ctx.lineTo(0, bladeWidth / 2);
    ctx.lineTo(innerRadius, 0);
    ctx.closePath();
    
    const bladeGradient = ctx.createLinearGradient(0, -bladeWidth / 2, outerRadius, 0);
    bladeGradient.addColorStop(0, shuriken.bladeEdge);
    bladeGradient.addColorStop(0.5, shuriken.bladeColor);
    bladeGradient.addColorStop(1, shuriken.bladeHighlight);
    ctx.fillStyle = bladeGradient;
    ctx.fill();
    
    ctx.strokeStyle = shuriken.bladeHighlight;
    ctx.lineWidth = 1 * shurikenScale;
    ctx.stroke();
    
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * shurikenScale, 0, Math.PI * 2);
  ctx.fillStyle = shuriken.centerColor;
  ctx.fill();
  ctx.strokeStyle = shuriken.bladeEdge;
  ctx.lineWidth = 1.2 * shurikenScale;
  ctx.stroke();

  ctx.restore();
}
