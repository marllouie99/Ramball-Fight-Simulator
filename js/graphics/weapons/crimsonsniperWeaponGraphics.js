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

export function drawRedSniperGun(ctx, x, y, gunAngle, r, recoil = 0, ammo = 4, maxAmmo = 4, reloadTimer = 0, isReloading = false, flashTimer = 0) {
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
    [85, -4],
    85, 2,
    [10, 2],
    [10, -4]
  ], colors.darkMetal, colors.outline);

  // --- 2. Muzzle Brake ---
  drawPoly([
    [85, -6],
    [98, -6],
    [102, -2],
    [102, 2],
    [96, 6],
    [85, 6],
    [85, -6]
  ], colors.darkMetal, colors.outline);

  // Upper vent
  drawPoly([
    [88, -6],
    [92, -9],
    [96, -9],
    [94, -6],
    [88, -6]
  ], colors.darkMetal, colors.outline);

  // Lower vent
  drawPoly([
    [88, 6],
    [90, 8],
    [96, 8],
    [94, 6],
    [88, 6]
  ], colors.darkMetal, colors.outline);

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

  // Muzzle glow (inside the brake)
  ctx.fillStyle = colors.glowCore;
  ctx.beginPath();
  ctx.arc(86 * s, 0, 2 * s + pulse1 * 0.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // --- 13. DYNAMIC LASER SIGHT & ENERGY ---
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = 0; // Turn off shadow for lighter elements
  
  // Laser Sight Beam
  const beamLength = 200 * s;
  const beamAlpha = 0.2 + pulse1 * 0.15;
  const grad = ctx.createLinearGradient(102 * s, 0, 102 * s + beamLength, 0);
  grad.addColorStop(0, `rgba(255, 30, 30, ${beamAlpha})`);
  grad.addColorStop(1, 'rgba(255, 30, 30, 0)');
  
  ctx.beginPath();
  ctx.moveTo(102 * s, -0.6 * s);
  ctx.lineTo(102 * s + beamLength, -0.6 * s);
  ctx.lineTo(102 * s + beamLength, 0.6 * s);
  ctx.lineTo(102 * s, 0.6 * s);
  ctx.fillStyle = grad;
  ctx.fill();

  // Bright center of the laser sight
  const coreGrad = ctx.createLinearGradient(102 * s, 0, 102 * s + beamLength * 0.6, 0);
  coreGrad.addColorStop(0, `rgba(255, 200, 200, ${beamAlpha * 1.5})`);
  coreGrad.addColorStop(1, 'rgba(255, 200, 200, 0)');
  ctx.beginPath();
  ctx.moveTo(102 * s, -0.2 * s);
  ctx.lineTo(102 * s + beamLength * 0.6, -0.2 * s);
  ctx.lineTo(102 * s + beamLength * 0.6, 0.2 * s);
  ctx.lineTo(102 * s, 0.2 * s);
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
  
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
}
