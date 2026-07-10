import { state } from '../state.js';

// gunSlingerWeaponGraphics.js
//  - Use this file for Gun Slinger-specific weapon graphics (dual revolvers).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Gun Slinger weapon visuals, edit the palette or drawGunSlingerDualRevolver() below.

// ─────────────────────────────────────────────
// GUNSLINGER BULLET GRAPHICS CONFIG
// ─────────────────────────────────────────────
export const GUNSLINGER_BULLET_GRAPHICS = {
  // Bullet casing colors (brass/copper revolver bullets)
  casingColor: '#d4a84b',        // Brass casing
  casingHighlight: '#f0c060',    // Bright brass highlight
  casingShadow: '#8b6914',       // Dark brass shadow
  tipColor: '#c0c0c0',           // Silver bullet tip
  tipHighlight: '#e8e8e8',      // Bright silver
  trailColor: 'rgba(255, 200, 100, 0.4)',  // Hot muzzle trail
  glowColor: 'rgba(255, 180, 80, 0.6)',    // Bullet glow
  // Bullet dimensions (relative to base radius)
  lengthRatio: 2.8,              // Length relative to width
  tipRatio: 0.35,                // Tip length relative to total length
  // Animation
  pulseSpeed: 0.15,              // Trail pulse speed
  trailLength: 3.5,              // Trail length in bullet widths
};

export function drawGunSlingerBullet(ctx, x, y, angle, scale = 1, lifeRatio = 1) {
  const g = GUNSLINGER_BULLET_GRAPHICS;
  
  // Calculate bullet dimensions based on scale
  const bulletWidth = 5 * scale;
  const bulletLength = bulletWidth * g.lengthRatio;
  const tipLength = bulletLength * g.tipRatio;
  const casingLength = bulletLength - tipLength;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // ── Motion Trail ──────────────────────────────────────────────
  const trailPulse = 0.7 + Math.sin(Date.now() * g.pulseSpeed) * 0.3;
  const trailAlpha = 0.5 * lifeRatio * trailPulse;
  
  // Outer trail glow
  const trailGradient = ctx.createLinearGradient(-bulletLength * g.trailLength, 0, 0, 0);
  trailGradient.addColorStop(0, 'rgba(255, 180, 80, 0)');
  trailGradient.addColorStop(0.5, `rgba(255, 160, 60, ${trailAlpha * 0.5})`);
  trailGradient.addColorStop(1, `rgba(255, 200, 100, ${trailAlpha})`);
  
  ctx.beginPath();
  ctx.moveTo(-bulletLength * g.trailLength, 0);
  ctx.lineTo(0, -bulletWidth * 0.4);
  ctx.lineTo(0, bulletWidth * 0.4);
  ctx.closePath();
  ctx.fillStyle = trailGradient;
  ctx.fill();
  
  // ── Bullet Glow ────────────────────────────────────────────────
  ctx.shadowColor = g.glowColor;
  ctx.shadowBlur = 8 * scale * lifeRatio;
  
  // ── Bullet Casing (brass body) ────────────────────────────────
  // Main casing body
  ctx.beginPath();
  ctx.roundRect(-casingLength, -bulletWidth * 0.45, casingLength, bulletWidth * 0.9, bulletWidth * 0.2);
  ctx.fillStyle = g.casingColor;
  ctx.fill();
  
  // Disable shadow for internal details to improve performance
  ctx.shadowBlur = 0;

  // Casing highlight (top edge)
  ctx.beginPath();
  ctx.roundRect(-casingLength + bulletWidth * 0.1, -bulletWidth * 0.45, casingLength * 0.6, bulletWidth * 0.25, bulletWidth * 0.1);
  ctx.fillStyle = g.casingHighlight;
  ctx.fill();
  
  // Casing shadow (bottom edge)
  ctx.beginPath();
  ctx.roundRect(-casingLength + bulletWidth * 0.1, bulletWidth * 0.2, casingLength * 0.6, bulletWidth * 0.2, bulletWidth * 0.1);
  ctx.fillStyle = g.casingShadow;
  ctx.fill();
  
  // Casing groove detail (circular groove around casing)
  ctx.strokeStyle = g.casingShadow;
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.arc(-casingLength * 0.3, 0, bulletWidth * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  
  // ── Bullet Tip (silver pointed tip) ───────────────────────────
  // Tip base
  ctx.beginPath();
  ctx.moveTo(0, -bulletWidth * 0.45);
  ctx.lineTo(tipLength * 0.3, -bulletWidth * 0.45);
  ctx.lineTo(tipLength * 0.3, bulletWidth * 0.45);
  ctx.lineTo(0, bulletWidth * 0.45);
  ctx.closePath();
  ctx.fillStyle = g.tipColor;
  ctx.fill();
  
  // Pointed tip
  ctx.beginPath();
  ctx.moveTo(tipLength * 0.3, -bulletWidth * 0.45);
  ctx.lineTo(tipLength, 0);
  ctx.lineTo(tipLength * 0.3, bulletWidth * 0.45);
  ctx.closePath();
  ctx.fillStyle = g.tipColor;
  ctx.fill();
  
  // Tip highlight
  ctx.beginPath();
  ctx.moveTo(tipLength * 0.3, -bulletWidth * 0.45);
  ctx.lineTo(tipLength * 0.5, -bulletWidth * 0.15);
  ctx.lineTo(tipLength * 0.3, -bulletWidth * 0.1);
  ctx.closePath();
  ctx.fillStyle = g.tipHighlight;
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─────────────────────────────────────────────
// GUNSLINGER MUZZLE FLASH GRAPHICS
// ─────────────────────────────────────────────
export function drawGunSlingerMuzzleFlash(ctx, x, y, angle, scale = 1, intensity = 1) {
  const g = GUNSLINGER_BULLET_GRAPHICS;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  const flashSize = 15 * scale * intensity;
  const alpha = intensity;
  
  // Multiple flash layers for realistic effect
  // Outer glow
  const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, flashSize * 2);
  outerGlow.addColorStop(0, `rgba(255, 200, 100, ${0.6 * alpha})`);
  outerGlow.addColorStop(0.4, `rgba(255, 150, 50, ${0.3 * alpha})`);
  outerGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
  
  ctx.beginPath();
  ctx.arc(0, 0, flashSize * 2, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow;
  ctx.fill();
  
  // Inner bright core
  ctx.beginPath();
  ctx.arc(0, 0, flashSize * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 200, ${0.9 * alpha})`;
  ctx.fill();
  
  // Flash spokes
  ctx.strokeStyle = `rgba(255, 220, 150, ${0.7 * alpha})`;
  ctx.lineWidth = 2 * scale;
  for (let i = 0; i < 6; i++) {
    const spokeAngle = (i / 6) * Math.PI * 2 + Date.now() * 0.01;
    const innerR = flashSize * 0.3;
    const outerR = flashSize * (0.8 + Math.random() * 0.4);
    ctx.beginPath();
    ctx.moveTo(Math.cos(spokeAngle) * innerR, Math.sin(spokeAngle) * innerR);
    ctx.lineTo(Math.cos(spokeAngle) * outerR, Math.sin(spokeAngle) * outerR);
    ctx.stroke();
  }
  
  ctx.restore();
}

export const GUNSLINGER_WEAPON_GRAPHICS = {
  revolver: {
    bodyColor: '#63707e',        // Brighter metallic silver-grey
    bodyHighlight: '#b0bcc7',    // Bright glossy silver reflection
    bodyShadow: '#222831',       // Deep shadow for contrast
    barrelColor: '#4a5562',      // Lighter steel barrel
    cylinderColor: '#3f4955',    // Brighter cylinder body
    cylinderDetail: '#161a21',   // Cylinder grooves
    gripColor: '#5c3d2e',        // Brighter reddish-brown wood
    gripHighlight: '#7a5643',    // Lighter wood highlight
    medallion: '#e3c16f',        // Brighter gold/brass medallion
    triggerColor: '#a9b3c4',     // Bright metallic trigger
    muzzleGlow: '#ffcc00',       // Bright muzzle flash
    muzzleShadow: '#ff6600',     // Muzzle shadow glow
  },
  positioning: {
    scale: 0.9,
    gunOffset: 2,                // Distance from fighter body edge
    leftGunOffset: 50,           // Left gun offset (same as right for symmetry)
  },
  muzzleFlash: {
    glowColor: '#ffaa00',
    glowBlur: 10,
    coreColor: '#ffffcc',
    coreRadius: 3,
    maxBlur: 20,
    maxCoreRadius: 6,
  },
  recoil: {
    maxRecoil: 8,                 // Maximum recoil offset in pixels
    recoilDecay: 0.15,            // How fast recoil recovers
    maxTilt: 0.6,                 // Maximum tilt angle in radians
    tiltDecay: 0.05,              // How fast tilt recovers
  },
};

export function drawGunSlingerDualRevolver(x, y, rightGunAngle, leftGunAngle, r, isFiring = false, flashFrame = 0, rightRecoilOffset = 0, rightRecoilTilt = 0, leftRecoilOffset = 0, leftRecoilTilt = 0, gunSpinAngle = 0) {
  const ctx = state.ctx;
  const scale = GUNSLINGER_WEAPON_GRAPHICS.positioning.scale;
  const gunOffset = r + GUNSLINGER_WEAPON_GRAPHICS.positioning.gunOffset;
  const p = GUNSLINGER_WEAPON_GRAPHICS.revolver;
  const mf = GUNSLINGER_WEAPON_GRAPHICS.muzzleFlash;

  function drawRevolver() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Apply a slight shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // --- 1. Grip ---
    ctx.fillStyle = p.gripColor; 
    ctx.beginPath();
    ctx.moveTo(-5 * scale, 5 * scale);
    ctx.lineTo(-11 * scale, 5 * scale);
    // Curve down and back
    ctx.bezierCurveTo(-14 * scale, 10 * scale, -18 * scale, 20 * scale, -19 * scale, 26 * scale);
    // Bottom flat edge
    ctx.lineTo(-10 * scale, 26 * scale);
    // Front edge of grip, curving back up to trigger guard
    ctx.bezierCurveTo(-8 * scale, 18 * scale, -3 * scale, 12 * scale, 0 * scale, 8 * scale);
    ctx.closePath();
    ctx.fill();

    // Disable shadow for internal details
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Grip texture (checkering indication)
    ctx.strokeStyle = '#1e110b';
    ctx.lineWidth = 0.5 * scale;
    ctx.beginPath();
    for(let i=0; i<6; i++) {
        const offset = i * 1.5 * scale;
        ctx.moveTo((-14 + offset) * scale, 8 * scale);
        ctx.lineTo((-17 + offset) * scale, 24 * scale);
        
        ctx.moveTo((-17 + offset) * scale, 8 * scale);
        ctx.lineTo((-14 + offset) * scale, 24 * scale);
    }
    ctx.stroke();

    // Colt Medallion
    ctx.fillStyle = p.medallion; 
    ctx.beginPath();
    ctx.arc(-9 * scale, 8 * scale, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#221100';
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();

    // --- 2. Frame Body ---
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-11 * scale, -2 * scale); // top back
    ctx.lineTo(-5 * scale, 5 * scale);   // down to grip
    ctx.lineTo(0 * scale, 8 * scale);    // back of trigger guard
    ctx.lineTo(13 * scale, 8 * scale);   // under cylinder
    ctx.lineTo(15 * scale, 3 * scale);   // curve up to barrel
    ctx.lineTo(15 * scale, -3 * scale);  // up front of cylinder
    ctx.lineTo(0 * scale, -3 * scale);   // top strap
    ctx.quadraticCurveTo(-5 * scale, -3 * scale, -11 * scale, -2 * scale); // curve to back
    ctx.closePath();
    ctx.fill();

    // Frame Highlight
    ctx.fillStyle = p.bodyHighlight;
    ctx.beginPath();
    ctx.moveTo(-10 * scale, -1.5 * scale);
    ctx.lineTo(14 * scale, -2.5 * scale);
    ctx.lineTo(14 * scale, -1.5 * scale);
    ctx.lineTo(-10 * scale, -0.5 * scale);
    ctx.fill();

    // --- 3. Cylinder ---
    // Background for cylinder area
    ctx.fillStyle = p.cylinderColor;
    ctx.fillRect(0 * scale, -2 * scale, 14 * scale, 9 * scale);
    
    // Glossy metallic gradient for cylinder
    const cylGrad = ctx.createLinearGradient(0, -2 * scale, 0, 7 * scale);
    cylGrad.addColorStop(0, p.bodyShadow);
    cylGrad.addColorStop(0.2, p.bodyHighlight);
    cylGrad.addColorStop(0.5, p.cylinderColor);
    cylGrad.addColorStop(0.8, p.bodyHighlight);
    cylGrad.addColorStop(1, p.bodyShadow);
    ctx.fillStyle = cylGrad;
    ctx.fillRect(0 * scale, -2 * scale, 14 * scale, 9 * scale);

    // Cylinder Flutes (horizontal grooves)
    ctx.fillStyle = p.cylinderDetail;
    ctx.fillRect(1 * scale, -0.5 * scale, 12 * scale, 1.5 * scale);
    ctx.fillRect(1 * scale, 2.5 * scale, 12 * scale, 2 * scale);
    ctx.fillRect(1 * scale, 6 * scale, 12 * scale, 1.5 * scale);

    // Cylinder Notches (back edge)
    ctx.fillStyle = p.bodyShadow;
    for(let i=0; i<3; i++) {
        ctx.fillRect(-0.5 * scale, (-1 + i*3.5) * scale, 1.5 * scale, 1.5 * scale);
    }
    
    // Frame boundary over cylinder
    ctx.strokeStyle = p.bodyShadow;
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(0 * scale, -2 * scale, 14 * scale, 9 * scale);

    // --- 4. Barrel ---
    ctx.fillStyle = p.barrelColor;
    ctx.beginPath();
    ctx.moveTo(15 * scale, -3 * scale);
    ctx.lineTo(45 * scale, -2.5 * scale); // slightly thinner at tip
    ctx.lineTo(45 * scale, 1.5 * scale);
    ctx.lineTo(15 * scale, 2 * scale);
    ctx.closePath();
    ctx.fill();

    // Barrel Gloss Highlight
    ctx.fillStyle = p.bodyHighlight;
    ctx.fillRect(15 * scale, -2.5 * scale, 29 * scale, 0.8 * scale);
    ctx.fillStyle = p.bodyShadow;
    ctx.fillRect(15 * scale, 1 * scale, 30 * scale, 0.8 * scale);

    // Front Sight (semi-circle)
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.moveTo(41 * scale, -2.5 * scale);
    ctx.quadraticCurveTo(42.5 * scale, -5 * scale, 44 * scale, -2.5 * scale);
    ctx.fill();

    // --- 5. Ejector Rod ---
    ctx.fillStyle = p.bodyShadow;
    ctx.fillRect(15 * scale, 2.5 * scale, 18 * scale, 1.2 * scale);
    // Ejector rod tip
    ctx.fillStyle = p.bodyColor;
    ctx.fillRect(32 * scale, 2 * scale, 2 * scale, 2 * scale);

    // --- 6. Trigger Guard & Trigger ---
    ctx.strokeStyle = p.bodyColor;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(2 * scale, 7.5 * scale);
    ctx.quadraticCurveTo(5 * scale, 16 * scale, 10 * scale, 14 * scale);
    ctx.quadraticCurveTo(12 * scale, 10 * scale, 12 * scale, 8 * scale);
    ctx.stroke();

    // Trigger
    ctx.strokeStyle = p.triggerColor; 
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(8 * scale, 8 * scale);
    ctx.quadraticCurveTo(6 * scale, 11 * scale, 8.5 * scale, 12.5 * scale);
    ctx.stroke();

    // --- 7. Hammer ---
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-10 * scale, -2 * scale);
    ctx.lineTo(-13 * scale, -6 * scale);
    ctx.lineTo(-10 * scale, -7 * scale);
    ctx.lineTo(-7 * scale, -3 * scale);
    ctx.fill();
    // Spurr (thumb grip)
    ctx.fillStyle = p.bodyShadow;
    ctx.fillRect(-14 * scale, -6.5 * scale, 2 * scale, 1 * scale);

    // --- 8. Screws / Pins ---
    ctx.fillStyle = p.bodyHighlight;
    ctx.beginPath();
    ctx.arc(-2 * scale, 2 * scale, 0.8 * scale, 0, Math.PI*2);
    ctx.arc(3 * scale, 6 * scale, 0.6 * scale, 0, Math.PI*2);
    ctx.fill();

    // --- Muzzle Flash ---
    if (isFiring) {
      const flashScale = Math.max(0, 1 - flashFrame / 5);
      ctx.shadowColor = mf.glowColor;
      ctx.shadowBlur = mf.maxBlur * flashScale;
      ctx.fillStyle = mf.coreColor;
      ctx.beginPath();
      ctx.arc(48 * scale, -0.5 * scale, mf.maxCoreRadius * scale * flashScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Define ideal offsets for dual-wielding
  const forwardOffset = r * 0.8;
  const sideOffset = r * 1.1;

  // ── Draw right revolver ──
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rightGunAngle);
  
  // Position front-right
  ctx.translate(forwardOffset, sideOffset);
  
  // Apply recoil
  ctx.translate(-rightRecoilOffset, 0);
  // Kick outward (positive angle means down/away from center on the right side)
  ctx.rotate(rightRecoilTilt);
  
  // Spin animation after reload
  ctx.rotate(gunSpinAngle);
  
  // Mirror the right gun so its grip points inward (towards center)
  ctx.scale(1, -1);
  
  drawRevolver();
  ctx.restore();

  // ── Draw left revolver ──
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(leftGunAngle);
  
  // Position front-left
  ctx.translate(forwardOffset, -sideOffset);
  
  // Apply recoil
  ctx.translate(-leftRecoilOffset, 0);
  // Kick outward (negative angle means up/away from center on the left side)
  ctx.rotate(-leftRecoilTilt);
  
  // Spin animation after reload
  ctx.rotate(-gunSpinAngle);
  
  // Left gun grip naturally points inward (positive Y is towards center from -sideOffset)
  
  drawRevolver();
  ctx.restore();
}
