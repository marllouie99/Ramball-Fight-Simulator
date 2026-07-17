// crimsonsniperWeaponGraphics.js
//  - Use this file for Crimson Sniper-specific weapon graphics (red sniper rifle).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Crimson Sniper weapon visuals, edit the palette or drawRedSniperGun() below.

export const CRIMSON_SNIPER_WEAPON_GRAPHICS = {
  colors: {
    whiteMetal: '#e8e8eb',     // Main body
    greyMetal: '#9a9ca1',      // Darker metal accents
    darkMetal: '#26272b',      // Barrel and scope parts
    blackPolymer: '#151518',   // Stock and grip
    glowCore: '#ffffff',       // Center of glows
    glowRed: '#ff1111',        // Red glows
    glowRedDark: '#990000',    // Darker red for borders
    outline: '#080808',        // General outline
    trigger: '#cc3300'         // Trigger color
  },
  positioning: {
    scale: 0.55,
    baseX: -5,
  }
};

export function drawRedSniperGun(ctx, x, y, gunAngle, r, recoil = 0, ammo = 4, maxAmmo = 4, reloadTimer = 0, isReloading = false, flashTimer = 0, tensionIntensity = 0, fighterColor = '#ff1111') {
  ctx.save();
  ctx.translate(x, y);
  
  // Apply visual recoil rotation kick (upwards)
  const kickAngle = Math.sin(recoil * Math.PI / 2) * -0.15;
  ctx.rotate(gunAngle + kickAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  const cfg = CRIMSON_SNIPER_WEAPON_GRAPHICS;
  const s = cfg.positioning.scale;
  const bx = r + cfg.positioning.baseX;

  // Apply visual recoil translation kick (backwards)
  const kickback = Math.sin(recoil * Math.PI / 2) * 12;
  ctx.translate(bx - kickback, 0);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * s;

  const colors = cfg.colors;

  const drawPoly = (pts, fill, stroke, evenodd = false) => {
    ctx.beginPath();
    let isFirst = true;
    for (const pt of pts) {
      if (pt === null) {
        isFirst = true;
        continue;
      }
      if (isFirst) {
        ctx.moveTo(pt[0] * s, pt[1] * s);
        isFirst = false;
      } else {
        ctx.lineTo(pt[0] * s, pt[1] * s);
      }
    }
    if (fill) {
      ctx.fillStyle = fill;
      if (evenodd) ctx.fill('evenodd');
      else ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };

  // Add shadow for depth (OPTIMIZED: using shadowOffsetY only, removed shadowBlur)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 2;
  
  // --- 1. Long Dark Barrel ---
  drawPoly([
    [10, -4],
    [125, -4],
    [125, 2],
    [10, 2],
    [10, -4]
  ], colors.darkMetal, colors.outline);

  // --- 2. Muzzle Brake ---
  // (Removed bulky muzzle brake to make the barrel sleek and straight)

  // --- 3. Main Black Polymer (Stock + Grip + Lower Receiver) ---
  drawPoly([
    // Outer contour
    [10, -3],
    [-15, -3],
    [-22, -10],
    [-38, -10],
    [-46, 2],
    [-40, 16],
    [-30, 16],
    [-18, 30],
    [-6, 30],
    [6, 16],
    [6, 4],
    [10, -3],
    null, // start hole 1 (thumbhole)
    [-12, 4],
    [-22, 12],
    [-28, 12],
    [-22, -2],
    [-12, 4],
    null, // start hole 2 (trigger area)
    [-1, 4],
    [3, 8],
    [3, 11],
    [-3, 11],
    [-1, 4]
  ], colors.blackPolymer, colors.outline, true);

  // --- 4. Trigger ---
  drawPoly([
    [1, 4],
    [-1, 8],
    [1, 10],
    [2, 10],
    [2, 4],
    [1, 4]
  ], colors.trigger, null);

  // --- 5. Light Metal Stock Accents ---
  drawPoly([
    [-28, -12],
    [-42, -12],
    [-50, 2],
    [-44, 18],
    [-34, 18],
    [-40, 4],
    [-34, -6],
    [-28, -12]
  ], colors.whiteMetal, colors.outline);

  // --- 6. Main Light Metal Body ---
  drawPoly([
    [-2, -7],
    [16, -7],
    [20, -10],
    [36, -10],
    [36, -2],
    [58, -2],
    [52, 6],
    [26, 6],
    [24, 12],
    [12, 12],
    [6, 18],
    [-2, 14],
    [4, 8],
    [-6, 8],
    [-12, -2],
    [-2, -7]
  ], colors.whiteMetal, colors.outline);

  // Panel lines / Details on Main Body
  ctx.shadowBlur = 0; 
  drawPoly([
    [24, 6],
    [28, -2],
    [34, -2],
    [34, -6]
  ], null, colors.greyMetal);
  
  drawPoly([
    [12, -2],
    [12, 4],
    [18, 4]
  ], null, colors.greyMetal);

  // --- 6.5. DYNAMIC MAGAZINE ---
  // The magazine hangs below the gun body, drops down when reloading
  let magDropY = 0;
  if (isReloading) {
     const progress = 1 - (reloadTimer / 120); // roughly 0 to 1
     if (progress < 0.2) {
       magDropY = progress * 5 * 20; // drops down
     } else if (progress > 0.8) {
       magDropY = (1 - progress) * 5 * 20; // snaps back up
     } else {
       magDropY = 20; // stays dropped below
     }
  }

  // Draw magazine AFTER gun body so it appears on top
  // Position it below the gun body (gun ends at ~Y=18, magazine starts at Y=20)
  ctx.save();
  ctx.translate(0, (20 + magDropY) * s);
  
  // Magazine body - rectangular box hanging below
  drawPoly([
    [12, 0],
    [26, 0],
    [28, 18],
    [20, 22],
    [10, 22],
    [8, 18],
    [12, 0]
  ], colors.blackPolymer, colors.outline);
  
  // Magazine follower/top plate
  drawPoly([
    [12, 0],
    [26, 0],
    [26, 4],
    [12, 4]
  ], colors.greyMetal, colors.outline);
  
  // Ammo Indicator lights on magazine (glowing pips)
  for (let i = 0; i < maxAmmo; i++) {
    const pipY = 12 - i * 3;
    const isFilled = i < ammo;
    ctx.fillStyle = isFilled ? colors.glowRed : colors.darkMetal;
    // OPTIMIZED: Removed shadowBlur (expensive operation)
    ctx.beginPath();
    ctx.arc(17 * s, pipY * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.shadowBlur = 0;

  // --- 6.8 RELOAD FINISH FLASH ---
  if (flashTimer > 0) {
    const flashProgress = flashTimer / 20; // 1 to 0
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 100, 100, ${flashProgress})`;
    // OPTIMIZED: Removed shadowBlur (expensive operation)
    
    // Core glow at the magazine port
    ctx.beginPath();
    ctx.arc(18 * s, 10 * s, 12 * flashProgress * s, 0, Math.PI * 2);
    ctx.fill();

    // Vents discharging excess heat (white hot center)
    ctx.fillStyle = `rgba(255, 255, 255, ${flashProgress})`;
    ctx.beginPath();
    ctx.arc(18 * s, 10 * s, 5 * flashProgress * s, 0, Math.PI * 2);
    ctx.fill();

    // Side vent lines lighting up
    ctx.strokeStyle = `rgba(255, 100, 100, ${flashProgress * 0.8})`;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(28 * s, 0);
    ctx.lineTo(34 * s, 0);
    ctx.moveTo(34 * s, 0);
    ctx.lineTo(36 * s, -4 * s);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
  }

  // --- 7. Underbarrel Foregrip (Light Metal) ---
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  drawPoly([
    [26, 12],
    [46, 12],
    [48, 6],
    [68, 6],
    [72, 10],
    [48, 10],
    [44, 16],
    [22, 16],
    [26, 12]
  ], colors.whiteMetal, colors.outline);

  // --- 8. Scope Mount ---
  drawPoly([
    [6, -7],
    [10, -18],
    [20, -18],
    [24, -10],
    [6, -7]
  ], colors.darkMetal, colors.outline);

  // --- 9. Scope Main Body ---
  drawPoly([
    [-4, -24],
    [28, -24],
    [34, -18],
    [34, -12],
    [-8, -12],
    [-4, -24]
  ], colors.whiteMetal, colors.outline);

  // --- 10. Scope Front End (Dark Metal) ---
  drawPoly([
    [28, -26],
    [42, -26],
    [34, -12],
    [32, -12],
    [28, -26]
  ], colors.blackPolymer, colors.outline);

  // --- 11. Scope Back End (Dark Metal) ---
  drawPoly([
    [-14, -22],
    [-4, -22],
    [-2, -12],
    [-10, -12],
    [-14, -22]
  ], colors.blackPolymer, colors.outline);


  // --- 12. GLOWING ACCENTS (Red) ---
  const now = Date.now();
  const pulse1 = Math.sin(now / 150) * 0.5 + 0.5; // 0 to 1
  const pulse2 = Math.sin(now / 200 + Math.PI) * 0.5 + 0.2;

  // OPTIMIZED: Removed shadowBlur (expensive operation)
  
  // Outer glow and red areas
  ctx.fillStyle = `rgba(255, ${60 + pulse1 * 40}, ${60 + pulse1 * 40}, ${0.8 + pulse1 * 0.2})`; 
  
  // Barrel Glowing Slots
  ctx.fillRect(48 * s, -3 * s, 6 * s, 2 * s);
  ctx.fillStyle = `rgba(255, ${60 + pulse2 * 40}, ${60 + pulse2 * 40}, ${0.8 + pulse2 * 0.2})`;
  ctx.fillRect(56 * s, -3 * s, 10 * s, 2 * s);
  ctx.fillStyle = `rgba(255, ${60 + pulse1 * 40}, ${60 + pulse1 * 40}, ${0.8 + pulse1 * 0.2})`;
  ctx.fillRect(68 * s, -3 * s, 6 * s, 2 * s);

  ctx.fillStyle = '#ff6666'; // Reset for remaining parts
  
  // Glowing slit on main body above trigger
  ctx.beginPath();
  ctx.moveTo(18 * s, 2 * s);
  ctx.lineTo(26 * s, 2 * s);
  ctx.lineTo(24 * s, 3 * s);
  ctx.lineTo(16 * s, 3 * s);
  ctx.fill();

  // Circle glow on main body
  ctx.beginPath();
  ctx.arc(8 * s, 3 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Scope Glow Details
  ctx.lineWidth = 1.5 * s;
  ctx.strokeStyle = colors.glowRed;
  
  // Connecting line on scope
  ctx.beginPath();
  ctx.moveTo(4 * s, -18 * s);
  ctx.lineTo(12 * s, -18 * s);
  ctx.lineTo(16 * s, -15 * s);
  ctx.lineTo(22 * s, -15 * s);
  ctx.stroke();

  // Scope Dials
  ctx.lineWidth = 1 * s;
  ctx.fillStyle = colors.darkMetal;
  
  // Dial 1
  ctx.beginPath();
  ctx.arc(10 * s, -18 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  
  // Dial 2
  ctx.beginPath();
  ctx.arc(18 * s, -15 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Highlight Cores
  ctx.fillStyle = colors.glowCore;
  ctx.beginPath(); ctx.arc(10 * s, -18 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(18 * s, -15 * s, 1 * s, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#ff6666';
  // Red glow on dark scope tip
  ctx.beginPath();
  ctx.moveTo(34 * s, -24 * s);
  ctx.lineTo(38 * s, -24 * s);
  ctx.lineTo(34 * s, -18 * s);
  ctx.lineTo(32 * s, -18 * s);
  ctx.fill();

  // Red lens
  ctx.fillStyle = colors.glowRed;
  ctx.beginPath();
  ctx.moveTo(40 * s, -24 * s);
  ctx.lineTo(41 * s, -24 * s);
  ctx.lineTo(35 * s, -13 * s);
  ctx.lineTo(34 * s, -13 * s);
  ctx.fill();

  // Muzzle glow (at the tip of the barrel)
  ctx.fillStyle = colors.glowCore;
  ctx.beginPath();
  ctx.arc(125 * s, 0, 2 * s + pulse1 * 0.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // --- 13. DYNAMIC LASER SIGHT & ENERGY ---
  ctx.globalCompositeOperation = 'source-over'; // Changed from 'lighter' so it is visible on white backgrounds
  ctx.shadowBlur = 0; // Turn off shadow for lighter elements
  
  // Laser Sight Beam
  const beamLength = 1200 * s; // Extended to stretch across the arena
  const beamAlpha = 0.2 + pulse1 * 0.15;
  const grad = ctx.createLinearGradient(125 * s, 0, 125 * s + beamLength, 0);
  grad.addColorStop(0, `rgba(255, 30, 30, ${beamAlpha})`);
  grad.addColorStop(1, 'rgba(255, 30, 30, 0)');
  
  ctx.beginPath();
  ctx.moveTo(125 * s, -0.6 * s);
  ctx.lineTo(125 * s + beamLength, -0.6 * s);
  ctx.lineTo(125 * s + beamLength, 0.6 * s);
  ctx.lineTo(125 * s, 0.6 * s);
  ctx.fillStyle = grad;
  ctx.fill();

  // Bright center of the laser sight
  const coreGrad = ctx.createLinearGradient(125 * s, 0, 125 * s + beamLength * 0.6, 0);
  coreGrad.addColorStop(0, `rgba(255, 200, 200, ${beamAlpha * 1.5})`);
  coreGrad.addColorStop(1, 'rgba(255, 200, 200, 0)');
  ctx.beginPath();
  ctx.moveTo(125 * s, -0.2 * s);
  ctx.lineTo(125 * s + beamLength * 0.6, -0.2 * s);
  ctx.lineTo(125 * s + beamLength * 0.6, 0.2 * s);
  ctx.lineTo(125 * s, 0.2 * s);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Floating Energy Particles near muzzle
  ctx.fillStyle = '#ff6666';
  for (let i = 0; i < 4; i++) {
    const pX = 90 * s + Math.sin(now / (100 + i * 50)) * 18 * s;
    const pY = Math.cos(now / (120 + i * 40)) * 6 * s;
    const pSize = (0.5 + Math.sin(now / 100 + i) * 0.5) * 1.5 * s;
    ctx.beginPath();
    ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Energy rings along the barrel
  ctx.strokeStyle = `rgba(255, 60, 40, ${0.4 + pulse2 * 0.5})`;
  ctx.lineWidth = 1 * s;
  for (let i = 0; i < 3; i++) {
    const ringX = 50 * s + i * 11 * s + Math.sin(now / 150 + i) * 3 * s;
    ctx.beginPath();
    ctx.ellipse(ringX, 0, 1.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // --- 14. ANIME SHOCKWAVE (WOOSH) ON FIRE ---
  if (recoil > 0) {
    const shockProgress = 1.0 - recoil; // 0.0 to 1.0
    // The shockwave blasts forward and expands massively
    const shockX = 102 * s + shockProgress * 80 * s; 
    const shockHeight = 40 * s + Math.pow(shockProgress, 0.5) * 180 * s; 
    const shockWidth = 10 * s + Math.pow(shockProgress, 0.5) * 40 * s;
    const shockThickness = Math.pow(recoil, 1.5) * 12; // Thins out quickly
    
    ctx.save();
    // Do NOT use 'lighter' since the arena background is white/light.
    // Use 'source-over' with dark/contrasting colors so it's highly visible!
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(shockX, 0); // Moves forward from muzzle
    
    // Draw an anime-style sharp crescent / shock ring (Dark Crimson)
    ctx.beginPath();
    ctx.ellipse(0, 0, shockWidth, shockHeight, 0, -Math.PI/2.5, Math.PI/2.5);
    ctx.lineWidth = shockThickness * s;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(180, 0, 0, ${recoil})`; // Deep red blast
    ctx.stroke();
    
    // An inner, sharper black ring trailing slightly behind
    ctx.beginPath();
    ctx.ellipse(-5 * s, 0, shockWidth * 0.8, shockHeight * 0.8, 0, -Math.PI/2.5, Math.PI/2.5);
    ctx.lineWidth = (shockThickness * 0.5) * s;
    ctx.strokeStyle = `rgba(0, 0, 0, ${recoil * 0.8})`; // Black pressure ring
    ctx.stroke();

    // A horizontal blast line (the 'woosh' wind line) piercing through the center
    const lineLength = 100 * s + shockProgress * 300 * s;
    ctx.beginPath();
    ctx.moveTo(-lineLength * 0.3, 0);
    ctx.lineTo(lineLength * 0.7, 0);
    ctx.lineWidth = Math.pow(recoil, 2) * 6 * s;
    ctx.strokeStyle = `rgba(30, 30, 35, ${recoil * 0.7})`; // Dark gray/black wind streak
    ctx.stroke();

    ctx.restore();
  }

  // --- 15. TENSION AURA: ENHANCED SHOT READY ---
  // The intensity smooths in as ammo drops to 2 and fully surges at 1
  if (tensionIntensity > 0) {
    const time = Date.now() / 150;
    
    ctx.save();
    // Center the aura around the middle of the long barrel
    ctx.translate(60 * s, 0);
    
    // 1. Smooth Fade-in Dark Red Smoke
    const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 45 * s);
    auraGrad.addColorStop(0, `rgba(180, 0, 0, ${0.6 * tensionIntensity})`);
    auraGrad.addColorStop(0.5, `rgba(80, 0, 0, ${0.3 * tensionIntensity})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = auraGrad;
    for (let i = -1; i <= 2; i++) {
        // Smoke clouds smoothly drifting
        const xOffset = i * 25 * s + Math.sin(time * 0.5 + i) * 10 * s;
        const yOffset = Math.cos(time * 0.5 + i * 2) * 8 * s;
        ctx.beginPath();
        ctx.ellipse(xOffset, yOffset, 40 * s, 25 * s, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 2. Smoke-red Lightning Ascending (converging) to the gun
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fewer sparks at lower intensities
    const baseSparks = tensionIntensity > 0.5 ? 4 : 1; 
    const numSparks = baseSparks + Math.floor(Math.random() * (tensionIntensity > 0.5 ? 3 : 2));
    for (let i = 0; i < numSparks; i++) {
        const isDark = Math.random() > 0.8;
        ctx.strokeStyle = isDark ? `rgba(30, 0, 0, ${0.9 * tensionIntensity})` : `rgba(255, ${Math.random() * 50}, 50, ${0.8 * tensionIntensity})`;
        ctx.lineWidth = (isDark ? 2 : 1.5) * s;
        
        // Pick a point along the barrel
        const barrelX = (Math.random() - 0.5) * 110 * s;
        
        // Start the spark OUTSIDE the gun (ascending from the smoke aura)
        const startY = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 25) * s;
        const startX = barrelX + (Math.random() - 0.5) * 20 * s;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        let curX = startX;
        let curY = startY;
        const segments = 3;
        
        for (let j = 1; j <= segments; j++) {
            const t = j / segments;
            // Interpolate towards the barrel center
            const targetX = startX + (barrelX - startX) * t;
            const targetY = startY + (0 - startY) * t;
            
            // Add jaggedness
            curX = targetX + (Math.random() - 0.5) * 12 * s;
            curY = targetY + (Math.random() - 0.5) * 8 * s;
            
            // Force the final point to hit the barrel exactly
            if (j === segments) {
                curX = barrelX;
                curY = 0;
            }
            
            ctx.lineTo(curX, curY);
        }
        ctx.stroke();
    }
    
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'source-over';

  // ── Hand ──
  ctx.save();
  ctx.translate(3 * s, 10 * s); // Position hand near the trigger grip
  ctx.fillStyle = fighterColor;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Draws a Crimson Sniper's sci-fi energy projectile with a laser trail effect.
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} p - The projectile object
 * @param {boolean} isEnhanced - Whether this is the final, massively boosted execute shot
 * @param {boolean} isTrickster - Whether this is stolen by the trickster (turns green)
 */
export function drawCrimsonSniperBullet(ctx, p, isEnhanced = false, isTrickster = false) {
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;
  const prevGlobalAlpha = ctx.globalAlpha;
  const prevCompositeOperation = ctx.globalCompositeOperation;

  // Calculate direction for elongated shape
  let angle = 0;
  if (p.history && p.history.length > 0) {
    const prev = p.history[p.history.length - 1];
    angle = Math.atan2(p.y - prev.y, p.x - prev.x);
  }

  // Draw high-speed wind/smoke trail using history array
  if (p.history && p.history.length > 1) {
    ctx.save();
    
    // Use last few points for the trail
    const startIdx = Math.max(0, p.history.length - (isEnhanced ? 12 : 8));
    
    // Create gradient for trail (dark red to black/transparent)
    const lastPt = p.history[p.history.length - 1];
    const gradient = ctx.createLinearGradient(
      p.history[startIdx].x, p.history[startIdx].y,
      lastPt.x, lastPt.y
    );
    
    if (isEnhanced) {
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
      gradient.addColorStop(0.7, isTrickster ? 'rgba(0, 150, 0, 0.9)' : 'rgba(150, 0, 0, 0.9)');
      gradient.addColorStop(1, isTrickster ? 'rgba(0, 255, 0, 1)' : 'rgba(255, 0, 0, 1)');
    } else {
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.5, 'rgba(100, 0, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(180, 0, 0, 0.8)');
    }
    
    // Draw thick trail line
    ctx.beginPath();
    ctx.moveTo(p.history[startIdx].x, p.history[startIdx].y);
    for (let i = startIdx + 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = p.r * (isEnhanced ? 3.0 : 1.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // If enhanced, draw chaotic lightning trails
    if (isEnhanced) {
      ctx.beginPath();
      ctx.moveTo(p.history[startIdx].x, p.history[startIdx].y);
      for (let i = startIdx + 1; i < p.history.length; i++) {
        const offset = (Math.random() - 0.5) * p.r * 5;
        ctx.lineTo(p.history[i].x + offset, p.history[i].y - offset);
      }
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // Draw the main projectile
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  
  if (isEnhanced) {
    // ═══════════════════════════════════════════════════════
    // ENHANCED EXECUTE SHOT — Crackling Crimson Energy Bolt
    // Inspired by violent lightning: jagged, branching, alive
    // ═══════════════════════════════════════════════════════
    const s = p.r * 0.8;
    
    // 1. Dark smoky haze removed per user request
    
    // Helper: draw a single jagged lightning tendril
    const drawLightningBranch = (startX, startY, endX, endY, width, color, segments) => {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const dx = (endX - startX) / segments;
      const dy = (endY - startY) / segments;
      for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * s * 6;
        const jitterY = (Math.random() - 0.5) * s * 8;
        ctx.lineTo(startX + dx * i + jitterX, startY + dy * i + jitterY);
      }
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    
    // 1.5 Flowing dark & white realistic flames
    // Using bezier curves for an organic, wavy fire look
    for (let i = 0; i < 7; i++) {
      const startX = -s * 10 + Math.random() * s * 25;
      const startY = (Math.random() - 0.5) * s * 4;
      const length = s * 15 + Math.random() * s * 25;
      const width = s * 4 + Math.random() * s * 6;
      
      // Control points for the flowing flame curves
      const cp1X = startX - length * 0.3;
      const cp1Y = startY - width * 1.5;
      const cp2X = startX - length * 0.7;
      const cp2Y = startY + width * 0.5;
      
      const cp3X = startX - length * 0.6;
      const cp3Y = startY + width * 1.5;
      const cp4X = startX - length * 0.2;
      const cp4Y = startY - width * 0.2;
      
      // Draw smooth flowing dark/black outer flame
      ctx.fillStyle = `rgba(${Math.random() * 20}, ${Math.random() * 20}, ${Math.random() * 20}, ${0.8 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Top curve backwards
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, startX - length, startY);
      // Bottom curve coming back to start
      ctx.bezierCurveTo(cp3X, cp3Y, cp4X, cp4Y, startX, startY);
      ctx.closePath();
      ctx.fill();
      
      // Draw smooth white/grey inner core flame
      const innerLength = length * 0.7;
      const innerWidth = width * 0.5;
      
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${0.7 + Math.random() * 0.3})` : `rgba(200, 200, 200, ${0.6 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(startX + s * 2, startY);
      ctx.bezierCurveTo(
        startX - innerLength * 0.3, startY - innerWidth * 1.5,
        startX - innerLength * 0.7, startY + innerWidth * 0.5,
        startX - innerLength, startY
      );
      ctx.bezierCurveTo(
        startX - innerLength * 0.6, startY + innerWidth * 1.5,
        startX - innerLength * 0.2, startY - innerWidth * 0.2,
        startX + s * 2, startY
      );
      ctx.closePath();
      ctx.fill();
    }
    
    // 2. Outer dark crimson lightning tendrils (many, chaotic, thin)
    for (let i = 0; i < 8; i++) {
      const spreadY = (Math.random() - 0.5) * s * 5;
      const r = isTrickster ? 0 : 120 + Math.random() * 60;
      const g = isTrickster ? 120 + Math.random() * 60 : 0;
      drawLightningBranch(
        -s * 35 + Math.random() * s * 6, spreadY,
        s * 18 + Math.random() * s * 5, (Math.random() - 0.5) * s * 4,
        1 + Math.random() * 1.5,
        `rgba(${r}, ${g}, 0, ${0.5 + Math.random() * 0.4})`,
        8 + Math.floor(Math.random() * 5)
      );
    }
    
    // 3. Mid-layer: Bright crimson main bolt branches
    for (let i = 0; i < 5; i++) {
      const spreadY = (Math.random() - 0.5) * s * 2;
      const r = isTrickster ? Math.random() * 30 : 255;
      const g = isTrickster ? 255 : 20 + Math.random() * 40;
      const b = isTrickster ? 20 + Math.random() * 40 : Math.random() * 30;
      drawLightningBranch(
        -s * 30, spreadY,
        s * 15, (Math.random() - 0.5) * s * 1.5,
        2 + Math.random() * 2.5,
        `rgba(${r}, ${g}, ${b}, ${0.7 + Math.random() * 0.3})`,
        10 + Math.floor(Math.random() * 4)
      );
    }
    
    // 4. Forking side branches (perpendicular tendrils splitting off the main bolt)
    for (let i = 0; i < 7; i++) {
      const branchX = -s * 25 + Math.random() * s * 38;
      const branchY = (Math.random() - 0.5) * s * 2;
      const forkEndY = branchY + (Math.random() > 0.5 ? 1 : -1) * (s * 5 + Math.random() * s * 10);
      const forkEndX = branchX + (Math.random() - 0.5) * s * 8;
      const r = isTrickster ? Math.random() * 20 : 200;
      const g = isTrickster ? 200 : Math.random() * 30;
      const b = isTrickster ? Math.random() * 30 : Math.random() * 20;
      drawLightningBranch(
        branchX, branchY,
        forkEndX, forkEndY,
        0.8 + Math.random(),
        `rgba(${r}, ${g}, ${b}, ${0.4 + Math.random() * 0.4})`,
        3 + Math.floor(Math.random() * 3)
      );
    }
    
    // 5. Inner core glow (bright crimson-white hottest center)
    const coreGrad = ctx.createLinearGradient(-s * 28, 0, s * 15, 0);
    if (isTrickster) {
      coreGrad.addColorStop(0, 'rgba(80, 255, 80, 0)');
      coreGrad.addColorStop(0.15, 'rgba(120, 255, 120, 0.6)');
      coreGrad.addColorStop(0.5, 'rgba(200, 255, 200, 0.9)');
      coreGrad.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
      coreGrad.addColorStop(1, 'rgba(200, 255, 200, 0.5)');
    } else {
      coreGrad.addColorStop(0, 'rgba(255, 80, 80, 0)');
      coreGrad.addColorStop(0.15, 'rgba(255, 120, 120, 0.6)');
      coreGrad.addColorStop(0.5, 'rgba(255, 200, 200, 0.9)');
      coreGrad.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
      coreGrad.addColorStop(1, 'rgba(255, 200, 200, 0.5)');
    }
    drawLightningBranch(
      -s * 28, 0,
      s * 15, 0,
      3.5 + Math.random() * 2,
      coreGrad,
      14
    );
    
    // 6. White-hot piercing core (the absolute brightest center line)
    drawLightningBranch(
      -s * 24, 0,
      s * 13, 0,
      1.5 + Math.random(),
      `rgba(255, 255, 255, ${0.8 + Math.random() * 0.2})`,
      16
    );
    
    // 7. Leading tip flash (sharp bright point at the front)
    const tipGrad = ctx.createRadialGradient(s * 12, 0, 0, s * 12, 0, s * 6);
    tipGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    tipGrad.addColorStop(0.3, isTrickster ? 'rgba(80, 255, 80, 0.6)' : 'rgba(255, 80, 80, 0.6)');
    tipGrad.addColorStop(1, isTrickster ? 'rgba(0, 150, 0, 0)' : 'rgba(150, 0, 0, 0)');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.arc(s * 12, 0, s * 6, 0, Math.PI * 2);
    ctx.fill();
    
  } else {
    // ═══════════════════════════════════════════════════════
    // NORMAL BULLET — Sleek armor-piercing tracer slug
    // ═══════════════════════════════════════════════════════
    const scale = p.r * 0.55;
    
    // Aerodynamic shock cone / red blast front
    ctx.beginPath();
    ctx.moveTo(scale * 5, 0);
    ctx.lineTo(-scale * 8, scale * 2.5);
    ctx.lineTo(-scale * 5, 0);
    ctx.lineTo(-scale * 8, -scale * 2.5);
    ctx.fillStyle = 'rgba(200, 20, 20, 0.8)';
    ctx.fill();

    // Elongated thick tracer body (Deep red) - Smooth tapered ellipse
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.ellipse(-scale * 3, 0, scale * 7, scale * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Solid black inner core - Sleek aerodynamic shape
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(-scale * 2, 0, scale * 6, scale * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Blinding white piercing needle - Sharp thin ellipse
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-scale * 1, 0, scale * 5, scale * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Mach rings (shock diamonds) traveling with the bullet
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-scale * 2 - i * (scale * 3.5), 0, scale * 0.5, scale * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();

  // Restore context state
  ctx.shadowColor = prevShadowColor;
  ctx.shadowBlur = prevShadowBlur;
  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
  ctx.globalAlpha = prevGlobalAlpha;
  ctx.globalCompositeOperation = prevCompositeOperation;
}
