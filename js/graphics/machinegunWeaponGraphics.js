// ─────────────────────────────────────────────
// MACHINEGUN WEAPON GRAPHICS (Storm Commando)
// ─────────────────────────────────────────────
// Tactical futuristic minigun with rotating barrel assembly.
// Keep gameplay/tuning values in js/config.js; only visual details here.

import { state } from '../core/state.js';

// ─────────────────────────────────────────────
// GRAPHICS CONFIGURATION
// ─────────────────────────────────────────────
export const MACHINEGUN_WEAPON_GRAPHICS = {
  // Color palette
  colors: {
    darkMetal: '#1a1a1e',
    mediumMetal: '#2d2d32',
    lightMetal: '#4a4a52',
    accent: '#b8860b',        // Goldenrod accent (matches fighter color)
    accentDark: '#7a5a00',
    barrelHoles: '#0a0a0c',
    heatGlow: '#ff4400',
    muzzleFlash: '#ffaa00',
    outline: '#000000',
  },
  
  // Dimensions (relative to fighter radius)
  positioning: {
    receiverOffset: 0,        // Offset from fighter edge
    receiverWidth: 16,
    receiverHeight: 18,
    barrelAssemblyWidth: 22,
    barrelAssemblyHeight: 14,
    barrelLength: 24,
    muzzleLength: 8,
    muzzleFlare: 4,
  },
  
  // Animation
  barrelSpinSpeed: 0.4,       // Radians per frame when firing
  barrelDecaySpeed: 0.05,     // How fast barrels slow when not firing
  flashDuration: 4,           // Frames for muzzle flash
  shakeIntensity: 2,          // Max shake when firing
};

// ─────────────────────────────────────────────
// MAIN DRAWING FUNCTION
// ─────────────────────────────────────────────
export function drawMachineGun(ctx, options) {
  const {
    x = 0,
    y = 0,
    gunAngle = 0,
    r = 20,
    barrelRotation = 0,
    heat = 0,
    isOverheated = false,
    isFiring = false,
    recoil = 0,
    facingRight = true
  } = options;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);
  
  const cfg = MACHINEGUN_WEAPON_GRAPHICS;
  const pos = cfg.positioning;
  const colors = cfg.colors;
  
  // Calculate positions based on fighter radius
  const baseOffset = r + pos.receiverOffset;
  
  // Apply recoil kickback
  const kickback = Math.sin(recoil * Math.PI / 2) * 6;
  ctx.translate(baseOffset - kickback, 0);
  
  // Flip if facing left
  if (!facingRight) {
    ctx.scale(1, -1);
  }
  
  // ── 1. RECEIVER / HOUSING ─────────────────────────────
  // Main body - blocky tactical housing
  ctx.fillStyle = colors.darkMetal;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.5;
  
  // Main receiver block
  ctx.beginPath();
  ctx.rect(-4, -pos.receiverHeight / 2, pos.receiverWidth, pos.receiverHeight);
  ctx.fill();
  ctx.stroke();
  
  // Top rail mount
  ctx.fillStyle = colors.mediumMetal;
  ctx.fillRect(0, -pos.receiverHeight / 2 - 3, pos.receiverWidth - 6, 4);
  ctx.strokeRect(0, -pos.receiverHeight / 2 - 3, pos.receiverWidth - 6, 4);
  
  // Side panels / tactical rails
  ctx.fillStyle = colors.lightMetal;
  ctx.fillRect(-2, -pos.receiverHeight / 2 + 2, 3, pos.receiverHeight - 4);
  ctx.fillRect(pos.receiverWidth - 8, -pos.receiverHeight / 2 + 2, 3, pos.receiverHeight - 4);
  
  // Ammo box hint on bottom
  ctx.fillStyle = colors.darkMetal;
  ctx.fillRect(-2, pos.receiverHeight / 2 - 2, pos.receiverWidth - 4, 4);
  
  // ── 2. ROTATING BARREL ASSEMBLY ──────────────────────
  // Barrel housing cylinder
  ctx.fillStyle = colors.mediumMetal;
  ctx.strokeStyle = colors.outline;
  ctx.beginPath();
  ctx.rect(pos.receiverWidth - 6, -pos.barrelAssemblyHeight / 2, pos.barrelAssemblyWidth, pos.barrelAssemblyHeight);
  ctx.fill();
  ctx.stroke();
  
  // Individual barrels (rotating)
  const numBarrels = 6;
  const barrelSpacing = pos.barrelAssemblyHeight / (numBarrels / 2);
  
  ctx.fillStyle = colors.barrelHoles;
  for (let i = 0; i < numBarrels; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const bx = pos.receiverWidth - 4 + col * 10;
    const by = -pos.barrelAssemblyHeight / 2 + 2 + row * barrelSpacing;
    
    // Barrel hole
    ctx.beginPath();
    ctx.arc(bx + 4, by + barrelSpacing / 2 - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.darkMetal;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Barrel line extending forward
    const wobble = Math.sin(barrelRotation + i * 0.8) * 1.5;
    ctx.fillStyle = colors.darkMetal;
    ctx.fillRect(bx + 2, by + barrelSpacing / 2 - 1 + wobble, pos.barrelLength, 2);
  }
  
  // Barrel rotation indicator ring
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pos.receiverWidth + pos.barrelAssemblyWidth / 2 - 2, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  
  // ── 3. MUZZLE / FLASH HIDER ──────────────────────────
  // Main muzzle body
  ctx.fillStyle = colors.darkMetal;
  ctx.beginPath();
  ctx.moveTo(pos.receiverWidth + pos.barrelAssemblyWidth - 4, -pos.barrelAssemblyHeight / 2 + 2);
  ctx.lineTo(pos.receiverWidth + pos.barrelAssemblyWidth + pos.muzzleLength, -pos.barrelAssemblyHeight / 2 + 4);
  ctx.lineTo(pos.receiverWidth + pos.barrelAssemblyWidth + pos.muzzleLength + pos.muzzleFlare, -pos.barrelAssemblyHeight / 2 + 6);
  ctx.lineTo(pos.receiverWidth + pos.barrelAssemblyWidth + pos.muzzleLength + pos.muzzleFlare, pos.barrelAssemblyHeight / 2 - 6);
  ctx.lineTo(pos.receiverWidth + pos.barrelAssemblyWidth + pos.muzzleLength, pos.barrelAssemblyHeight / 2 - 4);
  ctx.lineTo(pos.receiverWidth + pos.barrelAssemblyWidth - 4, pos.barrelAssemblyHeight / 2 - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Muzzle crown / blast guard
  ctx.fillStyle = colors.mediumMetal;
  for (let i = 0; i < 3; i++) {
    const mx = pos.receiverWidth + pos.barrelAssemblyWidth + pos.muzzleLength + i * 2;
    ctx.fillRect(mx, -pos.barrelAssemblyHeight / 2 + 4 + i, 1, pos.barrelAssemblyHeight - 8 - i * 2);
  }
  
  // ── 4. HEAT GLOW EFFECTS ─────────────────────────────
  if (heat > 20 || isOverheated) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const heatIntensity = isOverheated ? 1.0 : heat / 100;
    const glowColor = isOverheated ? colors.heatGlow : `rgba(255, ${150 - heatIntensity * 100}, 0, ${heatIntensity * 0.6})`;
    
    // Heat glow from barrel vents (OPTIMIZED: removed shadowBlur - expensive operation)
    ctx.fillStyle = glowColor;
    ctx.shadowColor = colors.heatGlow;
    ctx.shadowBlur = 0;
    ctx.fillRect(pos.receiverWidth - 2, -pos.barrelAssemblyHeight / 2 + 2, 8, pos.barrelAssemblyHeight - 4);
    
    // Steam/vapor particles when hot
    if (heat > 50) {
      const time = Date.now() / 100;
      for (let i = 0; i < 3; i++) {
        const px = pos.receiverWidth + pos.barrelAssemblyWidth / 2 + Math.sin(time + i * 2) * 5;
        const py = -pos.barrelAssemblyHeight / 2 - 5 - i * 4 - (time % 10);
        const size = 2 + Math.random() * 2;
        ctx.globalAlpha = 0.3 * heatIntensity;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
  
  // ── 5. MUZZLE FLASH ───────────────────────────────────
  if (isFiring && state.frameSingleStep % 2 === 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const flashSize = 8 + Math.random() * 6;
    const flashX = pos.receiverWidth + pos.barrelAssemblyWidth + pos.muzzleLength + pos.muzzleFlare + 2;
    
    // Main flash (OPTIMIZED: removed shadowBlur - expensive operation)
    ctx.fillStyle = colors.muzzleFlash;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(flashX, 0, flashSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Flash spikes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + barrelRotation * 0.5;
      ctx.beginPath();
      ctx.moveTo(flashX, 0);
      ctx.lineTo(flashX + Math.cos(angle) * flashSize * 1.5, Math.sin(angle) * flashSize * 0.8);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  // ── 6. ACCENT DETAILS ─────────────────────────────────
  // Goldenrod accent stripes
  ctx.fillStyle = colors.accent;
  ctx.fillRect(-2, -pos.receiverHeight / 2 + 1, pos.receiverWidth, 2);
  ctx.fillRect(-2, pos.receiverHeight / 2 - 3, pos.receiverWidth, 2);
  
  ctx.restore();
}

// ─────────────────────────────────────────────
// BULLET TRAIL EFFECT
// ─────────────────────────────────────────────
export function drawMachineGunBullet(ctx, x, y, angle, scale = 1, lifeRatio = 1) {
  const bulletLength = 12 * scale;
  const bulletWidth = 3 * scale;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // Motion trail
  const trailGradient = ctx.createLinearGradient(-bulletLength * 3, 0, 0, 0);
  trailGradient.addColorStop(0, 'rgba(255, 200, 100, 0)');
  trailGradient.addColorStop(0.7, `rgba(255, 180, 80, ${0.3 * lifeRatio})`);
  trailGradient.addColorStop(1, `rgba(255, 220, 150, ${0.6 * lifeRatio})`);
  
  ctx.beginPath();
  ctx.moveTo(-bulletLength * 3, 0);
  ctx.lineTo(0, -bulletWidth * 0.5);
  ctx.lineTo(0, bulletWidth * 0.5);
  ctx.closePath();
  ctx.fillStyle = trailGradient;
  ctx.fill();
  
  // Bullet body (OPTIMIZED: removed shadowBlur - expensive operation)
  ctx.fillStyle = '#c0c0c0';
  ctx.shadowColor = 'rgba(255, 200, 100, 0.5)';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(0, 0, bulletLength / 2, bulletWidth / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Bullet tip highlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(bulletLength / 3, 0, bulletLength / 4, bulletWidth / 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// ─────────────────────────────────────────────
// SPENT CASING EFFECT
// ─────────────────────────────────────────────
export function spawnMachineGunCasing(x, y, angle, vx, vy) {
  // Create ejected casing particle
  const casing = {
    x: x,
    y: y,
    vx: vx + (Math.random() - 0.5) * 3,
    vy: vy + (Math.random() - 0.5) * 3 - 2,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.5,
    life: 30,
    maxLife: 30,
    type: 'casing',
  };
  
  if (!state.effects) state.effects = [];
  state.effects.push(casing);
}