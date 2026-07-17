import { CONFIG } from '../../core/config.js';

// ivoryWeaponGraphics.js
//  - Solar Champion weapon graphics (railgun and charge effect).
//  - Accurately modeled after the sci-fi reference: massive angular stock, 
//    lower front prong assembly, complex scope, and central orange energy mechanism.

export const IVORY_WEAPON_GRAPHICS = {
  positioning: {
    scale: 0.35,
    baseX: -5,
  },
  chargeEffect: {
    baseColor: 'rgba(255, 140, 0, 0.6)',
    particleColor: 'rgba(255, 100, 0, 0.8)',
    streakColor: 'rgba(255, 160, 0, 0.24)',
    shimmerColor: 'rgba(255, 200, 100, 0.8)',
  },
};

export function drawWhiteRailgun(ctx, x, y, gunAngle, r, beamCharge = 0, beamTimer = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  const cfg = IVORY_WEAPON_GRAPHICS;
  const s = cfg.positioning.scale;

  // Visual Effects Math
  let recoilX = 0;
  let recoilY = 0;
  let isFiring = beamTimer > 0;
  let chargeNorm = beamCharge > 0 ? Math.min(1, beamCharge / CONFIG.laser.windupDuration) : 0;
  let glowPulse = 0;

  if (isFiring) {
    recoilX = -6 * s + (Math.random() - 0.5) * 8 * s; // Pushed back and shaking
    recoilY = (Math.random() - 0.5) * 6 * s;
    glowPulse = 1.0;
  } else if (chargeNorm > 0) {
    recoilX = (Math.random() - 0.5) * (chargeNorm * 5) * s;
    recoilY = (Math.random() - 0.5) * (chargeNorm * 5) * s;
    glowPulse = chargeNorm;
  }

  const bx = r + cfg.positioning.baseX + recoilX;
  ctx.translate(bx, recoilY);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * s;

  // ── Color Palette ─────────────────────────────────────────
  const white       = '#f4f6f9';
  const whiteBright = '#ffffff';
  const lightGrey   = '#c0c5ce';
  const midGrey     = '#808793';
  const darkGrey    = '#4f5764';
  const charcoal    = '#2d333b';
  const veryDark    = '#1a1f26';
  const black       = '#0f1217';
  
  // Dynamic orange colors based on charge/fire state
  const pulseSpeed = isFiring ? 40 : (chargeNorm > 0 ? 80 : 150);
  const pulse = Math.sin(Date.now() / pulseSpeed) * 0.5 + 0.5;
  
  const baseOrange = '#ff8c00';
  const hotOrange = '#ffcc66';
  const coreOrange = '#ff6600';
  const hotCore = '#ffffff';
  const yellowHazard = '#ffcc00';
  const outline = '#090a0c';

  // Lerp function for colors (simplified for hex swapping or rgba)
  const orange = isFiring ? hotOrange : (chargeNorm > 0.8 && Math.random() > 0.5 ? hotOrange : baseOrange);
  const orangeGlow = isFiring ? hotCore : (chargeNorm > 0.8 && Math.random() > 0.5 ? hotCore : coreOrange);

  const drawPoly = (pts, fill, stroke) => {
    ctx.beginPath();
    let first = true;
    for (const pt of pts) {
      if (first) { ctx.moveTo(pt[0] * s, pt[1] * s); first = false; }
      else { ctx.lineTo(pt[0] * s, pt[1] * s); }
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, 1.5 * s); ctx.stroke(); }
  };

  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 2;

  // 1. Stock Dark Base
  drawPoly([
    [-20, -2], [-20, 15], [-35, 25], [-45, 55], [-110, 30], [-110, -2]
  ], charcoal, outline);
  // Cutout in stock base
  drawPoly([
    [-100, 20], [-60, 35], [-60, 25], [-100, 10]
  ], veryDark, outline);

  // 2. Grip
  drawPoly([
    [-20, 15], [-10, 50], [-25, 50], [-30, 25]
  ], black, outline);
  // Grip texture panel
  drawPoly([
    [-18, 20], [-13, 45], [-22, 45], [-26, 25]
  ], veryDark, null);

  // 3. Trigger & Guard
  ctx.lineWidth = 2 * s;
  drawPoly([
    [-20, 15], [5, 15], [5, 30], [-10, 30]
  ], null, charcoal);
  ctx.lineWidth = 1.5 * s;
  ctx.fillStyle = orange;
  ctx.fillRect(-8 * s, 15 * s, 3 * s, 8 * s);

  // 4. Lower Receiver
  drawPoly([
    [-20, -2], [45, -2], [50, 15], [10, 15], [-5, 25], [-20, 15]
  ], darkGrey, outline);

  // 5. Lower Front Prong Assembly (Mirrored to face forward)
  drawPoly([
    [100, 30], // Top Right (under barrel)
    [120, 60], // Bottom Right vertex (extends forward and down)
    [110, 65], // Bottom Right outer thickness
    [35, 35],  // Top Left (connects to lower receiver)
    [40, 25],  // Top Left inner thickness
    [90, 45]   // Inner corner
  ], charcoal, outline);
  ctx.strokeStyle = darkGrey;
  ctx.beginPath(); ctx.moveTo(110 * s, 60 * s); ctx.lineTo(45 * s, 35 * s); ctx.stroke();

  // 6. Lower Barrel
  drawPoly([
    [80, -2], [145, -2], [145, 10], [80, 10]
  ], darkGrey, outline);

  // 7. Upper Receiver & Upper Barrel (White)
  const bodyGrad = ctx.createLinearGradient(0, -25 * s, 0, 2 * s);
  bodyGrad.addColorStop(0, whiteBright);
  bodyGrad.addColorStop(1, lightGrey);
  drawPoly([
    [-20, -14], [30, -14], [35, -25], [60, -25], [65, -14], [140, -14], [150, -4], [150, -2], [65, -2], [60, 2], [-20, 2]
  ], bodyGrad, outline);
  
  // Neon glow lines (Sci-fi Orange) on the upper receiver
  ctx.save();
  // If firing or charging, the neon pulses aggressively, otherwise it pulses slowly
  const neonPulse = glowPulse > 0 ? (Math.random() * 0.5 + 0.5) : (Math.sin(Date.now() / 300) * 0.3 + 0.7);
  
  // Outer Glow Layer (Large, soft orange)
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Helper to draw the neon paths
  const drawNeonPaths = () => {
    // Front barrel neon rail
    ctx.beginPath(); ctx.moveTo(68 * s, -8 * s); ctx.lineTo(138 * s, -8 * s); ctx.stroke();
    // Top receiver detail
    ctx.beginPath(); ctx.moveTo(38 * s, -19 * s); ctx.lineTo(58 * s, -19 * s); ctx.stroke();
    // Rear stock neon rail
    ctx.beginPath(); ctx.moveTo(-35 * s, -8 * s); ctx.lineTo(-105 * s, -8 * s); ctx.stroke();
  };

  // 8. Stock White Top (draw here so neon can bleed over it)
  drawPoly([
    [-20, -14], [-110, -14], [-115, -2], [-20, -2]
  ], white, outline);

  // --- NEON GLOW PASSES ---
  
  // Layer 1: Massive Ambient Bloom (Wide and soft)
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#ff3300';
  ctx.shadowBlur = 40 * neonPulse * s;
  ctx.strokeStyle = `rgba(255, 60, 0, ${0.5 * neonPulse})`;
  ctx.lineWidth = 14 * s;
  drawNeonPaths();

  // Layer 2: Secondary Hot Glow (Medium width)
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 20 * neonPulse * s;
  ctx.strokeStyle = `rgba(255, 120, 0, ${0.7 * neonPulse})`;
  ctx.lineWidth = 6 * s;
  drawNeonPaths();

  // Layer 3: Tight Brilliant Edge
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 10 * neonPulse * s;
  ctx.strokeStyle = `rgba(255, 200, 50, ${0.9 * neonPulse})`;
  ctx.lineWidth = 3 * s;
  drawNeonPaths();

  // Layer 4: Razor Thin Pure White Core
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 * neonPulse})`;
  ctx.lineWidth = 1.2 * s;
  drawNeonPaths();

  ctx.restore();

  // 9. Orange Side Panel
  // Dynamic intense shadow when firing/charging
  if (glowPulse > 0) {
    ctx.shadowBlur = 10 * glowPulse;
    ctx.shadowColor = orangeGlow;
  }
  drawPoly([
    [-5, 2], [35, 2], [40, 10], [-5, 10]
  ], orange, outline);
  ctx.shadowBlur = 0; // reset
  
  // Joint detail
  ctx.beginPath(); ctx.arc(0, 6 * s, 3 * s, 0, Math.PI*2);
  ctx.fillStyle = charcoal; ctx.fill(); ctx.stroke();

  // 10. Central Circular Mechanism
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const cx = 65, cy = 10;
  ctx.beginPath(); ctx.arc(cx * s, cy * s, 22 * s, 0, Math.PI*2);
  ctx.fillStyle = charcoal; ctx.fill(); ctx.stroke();
  
  ctx.beginPath(); ctx.arc(cx * s, cy * s, 16 * s, 0, Math.PI*2);
  ctx.fillStyle = black; ctx.fill(); ctx.stroke();

  if (glowPulse > 0) {
    ctx.shadowBlur = 15 * glowPulse;
    ctx.shadowColor = orangeGlow;
  }
  ctx.beginPath(); ctx.arc(cx * s, cy * s, 12 * s, 0, Math.PI*2);
  ctx.strokeStyle = isFiring ? hotCore : `rgba(255, 140, 0, ${0.6 + pulse * 0.4})`; 
  ctx.lineWidth = (isFiring ? 4 : 2.5) * s; ctx.stroke();

  ctx.beginPath(); ctx.arc(cx * s, cy * s, (isFiring ? 6 : 4) * s, 0, Math.PI*2);
  ctx.fillStyle = orange; ctx.fill();
  ctx.shadowBlur = 0; // reset

  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowOffsetY = 2;

  // 11. Complex Scope
  // Bracket
  drawPoly([
    [0, -14], [0, -35], [25, -35], [25, -14]
  ], charcoal, outline);
  // Main Body
  drawPoly([
    [-10, -35], [40, -35], [40, -50], [-10, -50]
  ], white, outline);
  // Front Angled Lens Housing
  drawPoly([
    [40, -35], [55, -35], [45, -50], [40, -50]
  ], black, outline);
  // Orange Lens
  drawPoly([
    [42, -37], [50, -37], [45, -48], [42, -48]
  ], orange, null);

  // 12. Orange Barrel Rings
  if (glowPulse > 0) {
    ctx.shadowBlur = 12 * glowPulse;
    ctx.shadowColor = orangeGlow;
  }
  ctx.fillStyle = orange;
  ctx.strokeStyle = outline;
  ctx.fillRect(100 * s, -4 * s, 6 * s, 16 * s);
  ctx.fillRect(115 * s, -4 * s, 6 * s, 16 * s);
  ctx.strokeRect(100 * s, -4 * s, 6 * s, 16 * s);
  ctx.strokeRect(115 * s, -4 * s, 6 * s, 16 * s);
  ctx.shadowBlur = 0; // reset

  // 13. Muzzle Tip
  drawPoly([
    [145, -6], [160, -2], [160, 6], [145, 10]
  ], charcoal, outline);
  
  // Glowing Emitter Opening
  ctx.shadowBlur = (glowPulse > 0) ? 20 * glowPulse : 0;
  ctx.shadowColor = orangeGlow;
  ctx.shadowOffsetY = 0;
  ctx.beginPath(); ctx.arc(160 * s, 2 * s, (isFiring ? 6 : 4) * s, 0, Math.PI*2);
  ctx.fillStyle = isFiring ? hotCore : `rgba(255, 100, 0, ${0.6 + pulse * 0.4})`; ctx.fill();
  ctx.beginPath(); ctx.arc(160 * s, 2 * s, 2 * s, 0, Math.PI*2);
  ctx.fillStyle = whiteBright; ctx.fill();
  ctx.shadowBlur = 0; // reset

  // 14. Details & Text
  ctx.save();
  ctx.translate(100 * s, -9 * s);
  ctx.font = `bold ${5 * s}px sans-serif`;
  ctx.fillStyle = midGrey;
  ctx.fillText('ACCIPITER', 0, 0);
  ctx.restore();

  const drawHazard = (hx, hy) => {
    ctx.fillStyle = yellowHazard;
    ctx.beginPath();
    ctx.moveTo(hx * s, (hy - 3) * s);
    ctx.lineTo((hx + 3.5) * s, (hy + 3) * s);
    ctx.lineTo((hx - 3.5) * s, (hy + 3) * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.5 * s;
    ctx.stroke();
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.moveTo(hx * s, (hy - 1) * s);
    ctx.lineTo((hx + 1.5) * s, (hy + 2) * s);
    ctx.lineTo((hx - 1.5) * s, (hy + 2) * s);
    ctx.closePath();
    ctx.fill();
  };

  drawHazard(-80, 5);  // Stock
  drawHazard(25, 6);   // Near orange panel
  drawHazard(90, 55);  // Lower prong

  // 15. Global Weapon Bloom / Ambient Light Cast
  // When firing, the sheer brightness of the laser bathes the entire front of the weapon in light
  if (isFiring) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const muzzleGlow = ctx.createRadialGradient(160 * s, 0, 0, 160 * s, 0, 180 * s);
    // Flickering core
    muzzleGlow.addColorStop(0, `rgba(255, 220, 150, ${0.5 + Math.random() * 0.3})`);
    muzzleGlow.addColorStop(0.3, `rgba(255, 120, 0, ${0.3 + Math.random() * 0.2})`);
    muzzleGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = muzzleGlow;
    ctx.beginPath();
    ctx.arc(160 * s, 0, 180 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function drawWhiteChargeEffect(ctx, x, y, gunAngle, beamCharge, r) {
  if (beamCharge <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Position at the muzzle tip (160 * 0.35 = 56)
  const tipDist = r - 5 + 56;
  const chargeNorm = Math.min(1, beamCharge / CONFIG.laser.windupDuration);
  const glowRadius = 15 + chargeNorm * 35;
  const alpha = 0.2 + chargeNorm * 0.6;
  const time = Date.now() / 80;
  
  // Central concentrated energy core
  ctx.shadowBlur = 0;
  ctx.shadowColor = '#ff6600';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(tipDist, 0, 3 + chargeNorm * 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Expanding pulsing energy rings (Shockwaves at the tip)
  for (let i = 0; i < 3; i++) {
    const ringPhase = ((time * 0.5 + i * 0.33) % 1);
    ctx.beginPath();
    ctx.arc(tipDist, 0, glowRadius * ringPhase, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 120, 0, ${(1 - ringPhase) * alpha})`;
    ctx.lineWidth = 2 * (1 - ringPhase);
    ctx.stroke();
  }

  // ── NEW: Massive Sucking Particles Effect ──
  // Pulls in energy streaks from a wide radius towards the muzzle
  const particleCount = 25 + Math.floor(chargeNorm * 15); // More particles as charge increases
  for (let i = 0; i < particleCount; i++) {
    // Unique phase for each particle based on golden ratio for even pseudo-random distribution
    const pPhase = ((time * 1.5 + i * 0.618) % 1); // 0 (start) to 1 (at muzzle)
    
    // Spread angle: 360 degrees around the tip
    const angleOffset = i * (Math.PI * 2 / particleCount) + (time * 0.2); 
    
    // Accelerate inward: starts slow far away, snaps quickly into the muzzle
    const inwardProgress = Math.pow(pPhase, 3); // Ease-in cubic curve
    
    // Suck from up to 180 pixels away
    const maxDist = 180;
    const currentDist = maxDist * (1 - inwardProgress);
    
    const xPos = tipDist + Math.cos(angleOffset) * currentDist;
    const yPos = Math.sin(angleOffset) * currentDist;
    
    // Draw streak tail
    // Tail shrinks in length as it gets sucked into the muzzle (1 - inwardProgress)
    const tailLength = (10 + chargeNorm * 15) * (1 - inwardProgress);
    const tailDist = currentDist + tailLength;
    const xTail = tipDist + Math.cos(angleOffset) * tailDist;
    const yTail = Math.sin(angleOffset) * tailDist;

    ctx.beginPath();
    ctx.moveTo(xPos, yPos);
    ctx.lineTo(xTail, yTail);
    
    // Color fades in as it approaches the muzzle, turns white hot right at the end
    let streakAlpha = Math.min(1, inwardProgress * 2); 
    let color = (inwardProgress > 0.8) ? `rgba(255, 255, 255, ${streakAlpha})` : `rgba(255, 160, 0, ${streakAlpha})`;
    
    ctx.strokeStyle = color;
    // Shrink thickness rapidly at the very end so it compresses into the core
    ctx.lineWidth = (1 + chargeNorm * 1.5) * (1 - Math.pow(inwardProgress, 8));
    ctx.stroke();
  }

  ctx.restore();
}

