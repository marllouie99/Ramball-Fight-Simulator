import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawGojoOrb, drawAnamorphicLensFlare } from './gojoWeaponGraphics.js';
import { drawRubbickPixelHand, drawRubbickArmSleeve } from '../fighters/rubbickSkin.js';
import { isInsideEnemyGojoDomain } from '../../entities/fighters/rubbick/rubbickThemes.js';

/**
 * Rubbick's Weapon: The Arcane Staff
 * A long, slender shaft with a complex, ornate, asymmetrical headpiece.
 * Features floating/segmented components, a glowing green magical crystal,
 * gold/bronze ornamentation, and arcane runes.
 */

export function drawRubbickStaff(ctx, fighter) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  const baseAlpha = ctx.globalAlpha;
  const r = fighter.r || 25;
  const P = 2.0; // Stepped pixel art grid size
  const snap = (v) => Math.round(v / P) * P;

  ctx.save();
  
  // Idle breathing/floating animation for the staff hand
  const idleHover = Math.sin(Date.now() / 300) * 2.5;
  
  // Attack wind-up and swing animation
  let swingAngle = 0;
  let thrustOffset = 0;
  
  if (fighter.attackCooldown > 0 && fighter.attackCooldown <= 15) {
    // Wind-up phase (pulling the staff back before casting)
    const progress = (15 - fighter.attackCooldown) / 15; // 0.0 to 1.0
    swingAngle = progress * 0.35; // Tilt backwards
    thrustOffset = progress * -5; // Pull backwards
  } else if (fighter.attackSwingTimer > 0) {
    // Follow-through phase (thrusting forward)
    const progress = fighter.attackSwingTimer / 15; // 1.0 down to 0.0
    swingAngle = Math.sin(progress * Math.PI) * -0.45; // staff head snaps forward
    thrustOffset = Math.sin(progress * Math.PI) * 12; // thrusts outward
  }
  
  if (fighter.isPreview) {
    // Standalone centered weapon preview in weapon arsenal / studio
    ctx.translate(fighter.x || 0, fighter.y || 0);
    const pAngle = (fighter.gunAngle !== undefined && fighter.gunAngle !== 0) ? (fighter.gunAngle + Math.PI / 2) : Math.PI * 0.25;
    ctx.rotate(pAngle);
  } else {
    // In-game fighter coordinate system aligned with body and gunAngle
    const angle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
    ctx.rotate(angle);
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(1, -1);
    }

    // Determine hand grip position and staff tilt angle in fighter local space
    let gripX = r * 0.70 + thrustOffset;
    let gripY = r * 0.20 + idleHover;
    let staffTilt = Math.PI / 2 - 0.22 + swingAngle; // pointing forward and ~12deg upward toward the enemy

    if ((fighter.stolenType === 'gojo' || fighter.stolenType === 'gojo_red' || fighter.stolenType === 'gojo_domain') && fighter.stolenWindUpTimer > 0) {
      const windupMax = 45;
      const progress = Math.min(1.0, Math.max(0, 1 - (fighter.stolenWindUpTimer / windupMax)));
      if (progress < 0.40) {
        const pNorm = progress / 0.40;
        gripX = r * 0.65 - Math.sin(pNorm * Math.PI) * 4;
        gripY = -r * 0.15 - Math.sin(pNorm * Math.PI) * 6;
        staffTilt = Math.PI / 2 - 0.45 - Math.sin(pNorm * Math.PI) * 0.20;
      } else if (progress < 0.75) {
        const pNorm = (progress - 0.40) / 0.35;
        gripX = r * 0.65 + pNorm * (r * 0.25);
        gripY = -r * 0.15 + pNorm * (r * 0.15);
        staffTilt = Math.PI / 2 - 0.45 + pNorm * 0.45;
      } else {
        const pNorm = (progress - 0.75) / 0.25;
        gripX = r * 0.90 + pNorm * 6;
        gripY = 0;
        staffTilt = Math.PI / 2; // horizontal pointing straight at the enemy
      }
    } else if (fighter.stolenWindUpTimer > 0 || fighter.beamCharge > 0 || fighter.beamTimer > 0) {
      gripX = r * 0.85 + thrustOffset;
      gripY = 0;
      staffTilt = Math.PI / 2; // horizontal pointing straight at the enemy
    } else if (fighter.tkTimer > 0) {
      gripX = r * 0.85;
      gripY = 0;
      staffTilt = Math.PI / 2; // forward pointing straight at the target during Telekinesis
    }

    // Draw robe sleeve connecting right shoulder to the hand grip
    const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || fighter._isWinnerReveal;
    if (!shouldHideHands && !fighter.hideFrontHand) {
      const handRadius = getHandSize(6.5, fighter);
      const shoulderX = r * 0.15;
      const shoulderY = gripY > 0 ? r * 0.22 : -r * 0.22;
      drawRubbickArmSleeve(ctx, shoulderX, shoulderY, gripX, gripY, handRadius);

      if ((fighter.stolenType === 'gojo' || fighter.stolenType === 'gojo_red' || fighter.stolenType === 'gojo_domain') && fighter.stolenWindUpTimer > 0) {
        // Dual-hand sleeve support for Gojo Purple / Red
        const rearShoulderX = r * 0.10;
        const rearShoulderY = r * 0.28;
        const rearGripX = gripX - 16;
        const rearGripY = gripY + 8;
        drawRubbickArmSleeve(ctx, rearShoulderX, rearShoulderY, rearGripX, rearGripY, handRadius);
      }
    }

    // Move to grip origin and orient staff
    ctx.translate(gripX, gripY);
    ctx.rotate(staffTilt);
  }

  // Staff dimensions
  const shaftLength = 76;
  const shaftThickness = 6;
  const topY = -shaftLength / 2 - 12;
  const bottomY = shaftLength / 2;

  // Apply Weapon Studio Customizations if available
  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.rubbick) ? state.weaponCustomizations.rubbick : null;
  if (custom) {
    if (custom.offsetX || custom.offsetY) {
      ctx.translate(custom.offsetX, custom.offsetY);
    }
    if (custom.angleOffset) {
      ctx.rotate(custom.angleOffset);
    }
    if (custom.scale && custom.scale !== 1.0) {
      ctx.scale(custom.scale, custom.scale);
    }
  }

  // Align the wrapped staff grip section (y = 8) with the hand position at (0, 0)
  ctx.translate(0, -8);

  // ─────────────────────────────────────────────
  // 1. DISCRETE PIXEL ART STAFF SHAFT (Dark Mahogany & Gold Wraps)
  // ─────────────────────────────────────────────
  const halfThick = shaftThickness / 2;
  const shaftTop = snap(topY);
  const shaftBot = snap(bottomY);
  const shaftH = shaftBot - shaftTop;

  // A. Stepped Dark Manga Ink Outer Shell (#0A0F0D)
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(snap(-halfThick - P), shaftTop - P, shaftThickness + P * 2, shaftH + P * 2);

  // B. Stepped Dark Mahogany Wood Base Fill
  ctx.fillStyle = '#1C1014';
  ctx.fillRect(snap(-halfThick), shaftTop, shaftThickness, shaftH);

  // C. Polished Center Wood Highlight
  ctx.fillStyle = '#4A2A2E';
  ctx.fillRect(snap(-P * 0.5), shaftTop, P, shaftH);

  // D. Stepped Golden Spiral Wrappings along the Shaft
  ctx.fillStyle = '#D4AF37';
  for (let y = shaftTop + 16; y < shaftBot - 8; y += 12) {
    const wy = snap(y);
    ctx.fillRect(snap(-halfThick), wy, P * 2, P);
    ctx.fillRect(snap(-halfThick + P), wy + P, P * 2, P);
    ctx.fillRect(snap(-halfThick + P * 2), wy + P * 2, P * 2, P);
    // Specular glint on gold wrap
    ctx.fillStyle = '#FFF275';
    ctx.fillRect(snap(-halfThick + P), wy + P, P, P);
    ctx.fillStyle = '#D4AF37';
  }

  // ─────────────────────────────────────────────
  // 2. DISCRETE PIXEL ART BASE POMMEL & SPEAR SPIKE
  // ─────────────────────────────────────────────
  const pommelY = shaftBot;
  // Pommel dark outline
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(snap(-8), pommelY, 16, P * 4);
  ctx.fillRect(snap(-4), pommelY + P * 4, 8, P * 3);
  ctx.fillRect(snap(-2), pommelY + P * 7, 4, P * 2);
  ctx.fillRect(0, pommelY + P * 9, P, P);

  // Pommel gold fill & highlights
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(snap(-6), pommelY + P, 12, P * 2);
  ctx.fillRect(snap(-2), pommelY + P * 3, 4, P * 4);
  ctx.fillRect(0, pommelY + P * 7, P, P * 2);

  ctx.fillStyle = '#FFF275'; // Top-left specular glint
  ctx.fillRect(snap(-4), pommelY + P, P * 2, P);
  ctx.fillRect(0, pommelY + P * 4, P, P);

  // ─────────────────────────────────────────────
  // 3. DISCRETE PIXEL ART ASYMMETRICAL CROWN HEADPIECE (Gold & Emerald Wings)
  // ─────────────────────────────────────────────
  const crownBaseY = shaftTop;

  // A. Golden Socket Collar
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(snap(-halfThick - P * 2), crownBaseY - P * 4, shaftThickness + P * 4, P * 5);
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(snap(-halfThick - P), crownBaseY - P * 3, shaftThickness + P * 2, P * 3);
  ctx.fillStyle = '#FFF275';
  ctx.fillRect(snap(-halfThick), crownBaseY - P * 3, P, P * 2);

  // B. Left Large Crescent Blade Wing (Stepped Pixel Rasterization)
  const drawLeftPixelWing = () => {
    const leftWingPixels = [
      // { x, y, col }
      { x: -6, y: -4, col: '#D4AF37' }, { x: -8, y: -6, col: '#D4AF37' }, { x: -10, y: -8, col: '#D4AF37' },
      { x: -14, y: -12, col: '#D4AF37' }, { x: -18, y: -16, col: '#D4AF37' }, { x: -22, y: -22, col: '#D4AF37' },
      { x: -24, y: -28, col: '#D4AF37' }, { x: -24, y: -34, col: '#D4AF37' }, { x: -20, y: -40, col: '#D4AF37' },
      { x: -14, y: -44, col: '#D4AF37' }, { x: -8, y: -46, col: '#D4AF37' }, // Tip
      // Inner fill & highlights
      { x: -12, y: -10, col: '#FFF275' }, { x: -16, y: -14, col: '#FFF275' }, { x: -20, y: -20, col: '#FFF275' },
      { x: -22, y: -26, col: '#FFF275' }, { x: -20, y: -34, col: '#8C6808' }, { x: -16, y: -38, col: '#8C6808' },
      { x: -10, y: -42, col: '#8C6808' }, { x: -6, y: -44, col: '#FFF275' }
    ];

    // Dark outline pass
    ctx.fillStyle = '#0A0F0D';
    leftWingPixels.forEach(pt => {
      const px = snap(pt.x);
      const py = snap(crownBaseY + pt.y);
      ctx.fillRect(px - P, py - P, P * 3, P * 3);
    });

    // Color fill pass
    leftWingPixels.forEach(pt => {
      ctx.fillStyle = pt.col;
      ctx.fillRect(snap(pt.x), snap(crownBaseY + pt.y), P * 2, P * 2);
    });
  };

  // C. Right Secondary Crescent Blade Wing (Asymmetrical Stepped Pixel Rasterization)
  const drawRightPixelWing = () => {
    const rightWingPixels = [
      { x: 6, y: -4, col: '#D4AF37' }, { x: 8, y: -6, col: '#D4AF37' }, { x: 12, y: -10, col: '#D4AF37' },
      { x: 16, y: -16, col: '#D4AF37' }, { x: 20, y: -22, col: '#D4AF37' }, { x: 18, y: -28, col: '#D4AF37' },
      { x: 12, y: -34, col: '#D4AF37' }, { x: 6, y: -36, col: '#D4AF37' }, // Tip
      // Highlights & shadows
      { x: 10, y: -8, col: '#FFF275' }, { x: 14, y: -14, col: '#FFF275' }, { x: 16, y: -20, col: '#FFF275' },
      { x: 14, y: -26, col: '#8C6808' }, { x: 8, y: -32, col: '#8C6808' }
    ];

    // Dark outline pass
    ctx.fillStyle = '#0A0F0D';
    rightWingPixels.forEach(pt => {
      const px = snap(pt.x);
      const py = snap(crownBaseY + pt.y);
      ctx.fillRect(px - P, py - P, P * 3, P * 3);
    });

    // Color fill pass
    rightWingPixels.forEach(pt => {
      ctx.fillStyle = pt.col;
      ctx.fillRect(snap(pt.x), snap(crownBaseY + pt.y), P * 2, P * 2);
    });
  };

  drawLeftPixelWing();
  drawRightPixelWing();

  // ─────────────────────────────────────────────
  // 4. FLOATING DISCRETE PIXEL MANA CRYSTAL (Energy Core)
  // ─────────────────────────────────────────────
  const coreColor = fighter.stolenType && fighter.stolenColor ? fighter.stolenColor : '#00FF64';
  const crystalCenterY = snap(topY - 24);
  const inEnemyGojoDomain = isInsideEnemyGojoDomain(fighter);

  // Stolen Skill Channeling Tension Auras
  if (fighter.stolenType === 'normal' && !inEnemyGojoDomain) {
    // Draw Rubbick Tension Aura for Stolen Execute (Green)
    const tensionIntensity = 1.0; 
    const time = Date.now() / 150;
    const s = 1.0; 
    
    ctx.save();
    ctx.translate(0, crystalCenterY); 
    
    const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 45 * s);
    auraGrad.addColorStop(0, `rgba(0, 180, 0, ${0.6 * tensionIntensity * baseAlpha})`);
    auraGrad.addColorStop(0.5, `rgba(0, 80, 0, ${0.3 * tensionIntensity * baseAlpha})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = auraGrad;
    for (let i = -1; i <= 2; i++) {
        const xOffset = i * 25 * s + Math.sin(time * 0.5 + i) * 10 * s;
        const yOffset = Math.cos(time * 0.5 + i * 2) * 8 * s;
        ctx.beginPath();
        ctx.ellipse(xOffset, yOffset, 40 * s, 25 * s, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
  }

  if ((fighter.stolenType === 'gojo' || fighter.stolenType === 'gojo_red' || fighter.stolenType === 'gojo_domain') && fighter.stolenWindUpTimer > 0 && !inEnemyGojoDomain) {
    const windupMax = (fighter.stolenType === 'gojo_domain' ? 60 : 45);
    const progress = Math.min(1.0, Math.max(0, 1 - (fighter.stolenWindUpTimer / windupMax)));
    const time = Date.now();
    
    ctx.save();
    ctx.translate(0, crystalCenterY - 15);
    
    // Sacred Arcane Fusion Seal (Stepped Pixel Ring)
    const sealAlpha = Math.min(1.0, progress * 1.6) * baseAlpha * 0.90;
    const sealRadius = snap(24 + progress * 16);
    const sealRot = (time * 0.0035) * (1 + progress * 3.0);
    const sGrid = Math.max(4, Math.round(sealRadius / P));
    const sSize = sGrid + 2;
    
    ctx.save();
    ctx.rotate(sealRot);
    ctx.globalAlpha = sealAlpha;
    
    // Solid emerald stepped pixel ring
    ctx.fillStyle = '#00FF64';
    for (let gy = -sSize; gy <= sSize; gy++) {
      for (let gx = -sSize; gx <= sSize; gx++) {
        const d = Math.hypot(gx, gy);
        if (Math.abs(d - sGrid) <= 0.65) {
          ctx.fillRect(gx * P, gy * P, P, P);
        }
      }
    }
    ctx.restore();

    if (progress >= 0.35) {
      const hollowProg = (progress - 0.35) / 0.65;
      const chargeR = 19 * Math.pow(hollowProg, 1.15);
      if (chargeR > 1) {
        drawGojoOrb(ctx, 0, 0, chargeR, time, 'green', hollowProg * 6);
      }
    }
    ctx.restore();
  } else if ((fighter.stolenDomainActive || (fighter.domainActive && fighter.stolenType === 'gojo_domain')) && (fighter.stolenDomainTimer || 0) > 0 && !inEnemyGojoDomain) {
    // Active Stolen Unlimited Void: Radiant Emerald Core Aura atop staff
    const time = Date.now();
    ctx.save();
    ctx.translate(0, crystalCenterY - 12);

    const pulse = 1.0 + Math.sin(time * 0.008) * 0.15;
    const sealRadius = snap(22 * pulse);
    const sealRot = time * 0.004;
    const sGrid = Math.max(4, Math.round(sealRadius / P));
    const sSize = sGrid + 2;

    ctx.save();
    ctx.rotate(sealRot);
    ctx.globalAlpha = 0.85 * baseAlpha;
    ctx.fillStyle = '#00FF64';
    for (let gy = -sSize; gy <= sSize; gy++) {
      for (let gx = -sSize; gx <= sSize; gx++) {
        const d = Math.hypot(gx, gy);
        if (Math.abs(d - sGrid) <= 0.65) {
          ctx.fillRect(gx * P, gy * P, P, P);
        }
      }
    }
    ctx.restore();

    drawGojoOrb(ctx, 0, 0, 16 * pulse, time, 'green', 4);
    ctx.restore();
  }

  // Stepped Pixel Diamond Crystal Core (Grid Size: 10px wide x 16px high)
  const cryW = 10;
  const cryH = 16;
  const cSteps = Math.ceil(cryH / P);

  // Stepped Outer Dark Ink Shell
  ctx.fillStyle = '#0A0F0D';
  for (let gy = -cSteps; gy <= cSteps; gy++) {
    for (let gx = -cSteps; gx <= cSteps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = (Math.abs(rx) / (cryW * 0.5)) + (Math.abs(ry) / (cryH * 0.5));
      if (d <= 1.35) {
        ctx.fillRect(snap(rx), snap(crystalCenterY + ry), P, P);
      }
    }
  }

  // Stepped Emerald Facets & Specular Highlight
  for (let gy = -cSteps; gy <= cSteps; gy++) {
    for (let gx = -cSteps; gx <= cSteps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = (Math.abs(rx) / (cryW * 0.5)) + (Math.abs(ry) / (cryH * 0.5));
      if (d > 1.0) continue;

      const px = snap(rx);
      const py = snap(crystalCenterY + ry);

      // Specular bright white core glint
      if (Math.abs(rx) <= P && Math.abs(ry + P) <= P) {
        ctx.fillStyle = '#FFFFFF';
      }
      // Top-left facet highlight
      else if (rx < 0 && ry < 0) {
        ctx.fillStyle = '#70FFAB';
      }
      // Center neon-green crystal body
      else if (d <= 0.65) {
        ctx.fillStyle = coreColor;
      }
      // Bottom/right shadow facet
      else {
        ctx.fillStyle = '#007A33';
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // ─────────────────────────────────────────────
  // 5. ROTATING DISCRETE PIXEL ENERGY RING AROUND CRYSTAL
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(0, crystalCenterY);
  const ringRot = (Date.now() / -450);
  ctx.rotate(ringRot);

  // Stepped pixel ring nodes
  const ringNodes = [
    { a: 0, r: 16 }, { a: Math.PI * 0.5, r: 8 },
    { a: Math.PI, r: 16 }, { a: Math.PI * 1.5, r: 8 }
  ];

  ctx.fillStyle = '#00FF64';
  ringNodes.forEach(node => {
    const nx = snap(Math.cos(node.a) * node.r);
    const ny = snap(Math.sin(node.a) * node.r);
    ctx.fillRect(nx, ny, P, P);
  });

  // Orbiting specular white pixel
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(Math.cos(ringRot * 2) * 16), snap(Math.sin(ringRot * 2) * 6), P, P);
  ctx.restore();

  // ─────────────────────────────────────────────
  // 6. GLOWING ARCANE RUNES ETCHED ON SHAFT (Pixel Inlay)
  // ─────────────────────────────────────────────
  ctx.fillStyle = coreColor;
  // Diamond Rune Pixels
  const rune1Y = snap(topY + 32);
  ctx.fillRect(0, rune1Y, P, P);
  ctx.fillRect(-P, rune1Y + P, P, P);
  ctx.fillRect(P, rune1Y + P, P, P);
  ctx.fillRect(0, rune1Y + P * 2, P, P);

  // Crescent Rune Pixels
  const rune2Y = snap(topY + 46);
  ctx.fillRect(-P, rune2Y, P, P);
  ctx.fillRect(0, rune2Y - P, P, P);
  ctx.fillRect(P, rune2Y, P, P);
  ctx.fillRect(P, rune2Y + P, P, P);
  ctx.fillRect(0, rune2Y + P * 2, P, P);
  ctx.fillRect(-P, rune2Y + P, P, P);

  // ─────────────────────────────────────────────
  // 7. MAGUS HANDS GRIPPING THE STAFF (Pixel Art Magus Glove)
  // ─────────────────────────────────────────────
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || fighter._isWinnerReveal;
  if (!shouldHideHands && !fighter.hideFrontHand) {
    const handR = getHandSize(6.5, fighter);
    if ((fighter.stolenType === 'gojo' || fighter.stolenType === 'gojo_red' || fighter.stolenType === 'gojo_domain') && fighter.stolenWindUpTimer > 0) {
      // 2-Handed Channeling Grip:
      // Front hand near upper crystal collar
      drawRubbickPixelHand(ctx, snap(-halfThick - 3), snap(-4), handR, baseAlpha);
      // Rear hand on lower shaft
      drawRubbickPixelHand(ctx, snap(halfThick + 3), snap(20), handR, baseAlpha);
    } else {
      // Single hand firmly gripping the staff at the middle grip wrap (y = 8)
      drawRubbickPixelHand(ctx, 0, 8, handR, baseAlpha);
    }
  }

  ctx.restore();
}

export function drawRubbickBolt(ctx, p) {
  if (!p || Number.isNaN(p.x) || Number.isNaN(p.y)) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  
  // Fade alpha if projectile is expiring / fading out
  if (p.fadingAlpha !== undefined) {
    ctx.globalAlpha *= Math.max(0, Math.min(1, p.fadingAlpha));
  }

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const isFrozen = Boolean(p.isFrozenByInfinity || (p.infinityFreezeTimer && p.infinityFreezeTimer > 0));

  // 1. ── CONTINUOUS PIXEL ART SOLID TRAIL ALONG FLIGHT HISTORY ──
  if (p.history && p.history.length > 1) {
    const histLen = p.history.length;
    
    // Draw connected continuous solid pixel segments
    for (let i = 0; i < histLen - 1; i++) {
      const pt = p.history[i];
      const nextPt = p.history[i + 1];
      if (!pt || !nextPt || Number.isNaN(pt.x) || Number.isNaN(nextPt.x)) continue;
      
      const progress = (i + 1) / histLen;
      const alpha = progress * 0.95;
      const currentWidth = snap(Math.max(P, p.r * 2.4 * progress));

      // 1. Dark Outer Border (Deep Navy Obsidian when frozen, Dark Forest Obsidian when normal)
      ctx.beginPath();
      ctx.moveTo(snap(pt.x), snap(pt.y));
      ctx.lineTo(snap(nextPt.x), snap(nextPt.y));
      ctx.strokeStyle = isFrozen 
        ? `rgba(4, 18, 32, ${(alpha * 0.85).toFixed(2)})` 
        : `rgba(5, 25, 12, ${(alpha * 0.85).toFixed(2)})`;
      ctx.lineWidth = currentWidth + P * 2;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.stroke();

      // 2. Main Body (Frozen Cyan / Emerald Green)
      ctx.beginPath();
      ctx.moveTo(snap(pt.x), snap(pt.y));
      ctx.lineTo(snap(nextPt.x), snap(nextPt.y));
      ctx.strokeStyle = isFrozen 
        ? `rgba(0, 229, 255, ${alpha.toFixed(2)})` 
        : `rgba(0, 255, 100, ${alpha.toFixed(2)})`;
      ctx.lineWidth = currentWidth;
      ctx.stroke();

      // 3. Bright Mint / Ice Blue / White Core on recent segments
      if (progress > 0.4) {
        ctx.beginPath();
        ctx.moveTo(snap(pt.x), snap(pt.y));
        ctx.lineTo(snap(nextPt.x), snap(nextPt.y));
        if (progress > 0.75) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        } else {
          ctx.strokeStyle = isFrozen 
            ? `rgba(180, 240, 255, ${alpha.toFixed(2)})` 
            : `rgba(180, 255, 210, ${alpha.toFixed(2)})`;
        }
        ctx.lineWidth = Math.max(1, currentWidth * 0.4);
        ctx.stroke();
      }

      // Discrete floating pixel ember dust along trail
      if (i % 3 === 0) {
        const sSeed = pt.x * 3.14 + pt.y * 7.28 + i;
        const randOx = snap(Math.sin(sSeed) * p.r * 2.2);
        const randOy = snap(Math.cos(sSeed * 1.5) * p.r * 2.2);
        const sparkCol = (i % 2 === 0) 
          ? `rgba(255, 255, 255, ${(alpha * 0.85).toFixed(2)})` 
          : (isFrozen ? `rgba(0, 210, 255, ${(alpha * 0.85).toFixed(2)})` : `rgba(0, 255, 160, ${(alpha * 0.85).toFixed(2)})`);
        ctx.fillStyle = sparkCol;
        ctx.fillRect(snap(pt.x + randOx), snap(pt.y + randOy), P, P);
      }
    }
  }

  // 2. ── CHUNKY PIXEL ART ARCANE DIAMOND CRYSTAL (PROJECTILE HEAD) ──
  ctx.translate(snap(p.x), snap(p.y));
  const angle = (p.vx !== 0 || p.vy !== 0) 
    ? Math.atan2(p.vy, p.vx) 
    : (p.angle !== undefined ? p.angle : (p.rotation || 0));
  ctx.rotate(angle);

  // Discrete 8-bit / 16-bit Arcane Diamond Core
  const pr = Math.max(P * 2, snap(p.r || 6));

  // A. Outer Obsidian Outline Pixels
  ctx.fillStyle = isFrozen ? '#041628' : '#05180B';
  // Leading nose
  ctx.fillRect(snap(pr * 3.0), snap(-P), P * 2, P * 2);
  ctx.fillRect(snap(pr * 2.2), snap(-P * 2), P * 2, P);
  ctx.fillRect(snap(pr * 2.2), snap(P), P * 2, P);
  // Upper wing
  ctx.fillRect(snap(pr * 0.8), snap(-pr * 1.6 - P), P * 3, P);
  ctx.fillRect(snap(-P), snap(-pr * 1.6), P * 2, P * 2);
  // Lower wing
  ctx.fillRect(snap(pr * 0.8), snap(pr * 1.6), P * 3, P);
  ctx.fillRect(snap(-P), snap(pr * 1.6 - P), P * 2, P * 2);
  // Rear tail
  ctx.fillRect(snap(-pr * 2.0), snap(-P), P * 2, P * 2);
  ctx.fillRect(snap(-pr * 1.2), snap(-P * 2), P * 2, P);
  ctx.fillRect(snap(-pr * 1.2), snap(P), P * 2, P);

  // B. Shaded Dark Facet (Sapphire Blue when frozen, Dark Emerald when normal)
  ctx.fillStyle = isFrozen ? '#0066AA' : '#007A33';
  ctx.beginPath();
  ctx.moveTo(snap(pr * 2.6), 0);
  ctx.lineTo(snap(pr * 0.5), snap(pr * 1.4));
  ctx.lineTo(snap(-pr * 1.4), 0);
  ctx.closePath();
  ctx.fill();

  // C. Vibrant Upper Body Facet (Limitless Cyan when frozen, Arcane Emerald when normal)
  ctx.fillStyle = isFrozen ? '#00E5FF' : '#00FF64';
  ctx.beginPath();
  ctx.moveTo(snap(pr * 2.6), 0);
  ctx.lineTo(snap(pr * 0.5), snap(-pr * 1.4));
  ctx.lineTo(snap(-pr * 1.4), 0);
  ctx.closePath();
  ctx.fill();

  // D. Highlight Rim (Ice Cyan when frozen, Mint/Seafoam when normal)
  ctx.fillStyle = isFrozen ? '#80E5FF' : '#80FFB0';
  ctx.fillRect(snap(pr * 0.8), snap(-pr * 0.8), snap(pr * 1.2), P);
  ctx.fillRect(snap(pr * 0.2), snap(-pr * 1.1), snap(pr * 0.8), P);

  // E. Pure White-Hot Specular Center Diamond Core
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(pr * 0.2), snap(-P), snap(pr * 1.0), P * 2);
  ctx.fillRect(snap(pr * 0.6), snap(-P * 2), P, P * 4);

  // F. 4 Orbiting Arcane Pixel Glints
  const glintT = performance.now() * 0.01;
  const glintDist = snap(pr * 2.0);
  const glintColors = isFrozen 
    ? ['#FFFFFF', '#00E5FF', '#80E5FF', '#38BDF8'] 
    : ['#FFFFFF', '#00FF88', '#80FFD0', '#00E5FF'];
  for (let g = 0; g < 4; g++) {
    const gAng = glintT + (g * Math.PI / 2);
    const gx = snap(Math.cos(gAng) * glintDist);
    const gy = snap(Math.sin(gAng) * (glintDist * 0.7));
    ctx.fillStyle = glintColors[g];
    ctx.fillRect(gx, gy, P, P);
  }

  // G. Additional subtle frozen crystal frost pixels when caught by Infinity
  if (isFrozen) {
    const frostT = performance.now() * 0.005;
    ctx.fillStyle = '#E0F7FF';
    ctx.fillRect(snap(Math.sin(frostT * 2.1) * (pr * 2.4)), snap(Math.cos(frostT * 2.1) * (pr * 1.8)), P, P);
    ctx.fillRect(snap(-Math.sin(frostT * 1.7) * (pr * 2.2)), snap(-Math.cos(frostT * 1.7) * (pr * 1.6)), P, P);
    ctx.fillStyle = '#00B4D8';
    ctx.fillRect(snap(Math.cos(frostT * 3.0) * (pr * 1.9)), snap(Math.sin(frostT * 3.0) * (pr * 1.5)), P, P);
  }

  ctx.restore();
}

export function drawRubbickChargeEffect(ctx, x, y, gunAngle, beamCharge, r, fighter) {
  if (beamCharge <= 0 || (fighter && isInsideEnemyGojoDomain(fighter))) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // Position at the staff crystal tip (roughly r + 75)
  const tipDist = snap(r + 75);
  const windupDuration = (typeof CONFIG !== 'undefined' && CONFIG.laser) ? CONFIG.laser.windupDuration : 60;
  const chargeNorm = Math.min(1, beamCharge / windupDuration);
  const glowRadius = snap(14 + chargeNorm * 36);
  const alpha = Math.min(1.0, 0.25 + chargeNorm * 0.75);
  const time = performance.now() / 80;

  // 1. ── CENTRAL PULSING PIXEL ENERGY CORE ──
  const coreSize = snap(3 + chargeNorm * 6);
  // Outer obsidian border
  ctx.fillStyle = '#05180B';
  ctx.fillRect(tipDist - coreSize - P, -coreSize - P, (coreSize + P) * 2, (coreSize + P) * 2);
  // Emerald middle
  ctx.fillStyle = '#00FF64';
  ctx.fillRect(tipDist - coreSize, -coreSize, coreSize * 2, coreSize * 2);
  // White-hot center
  ctx.fillStyle = '#FFFFFF';
  const innerSize = Math.max(P, snap(coreSize * 0.5));
  ctx.fillRect(tipDist - innerSize, -innerSize, innerSize * 2, innerSize * 2);

  // 2. ── EXPANDING STEPPED PIXEL CONCENTRIC RINGS ──
  for (let ringIdx = 0; ringIdx < 3; ringIdx++) {
    const ringPhase = ((time * 0.4 + ringIdx * 0.33) % 1);
    const ringR = Math.max(P * 2, snap(glowRadius * ringPhase));
    const ringAlpha = (1 - ringPhase) * alpha;
    if (ringAlpha <= 0.05) continue;

    const steps = Math.max(16, Math.min(36, Math.round((Math.PI * 2 * ringR) / (P * 2))));
    
    // Draw stepped pixel ring circumference
    for (let st = 0; st < steps; st++) {
      const ang = (st / steps) * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const px = snap(tipDist + cosA * ringR);
      const py = snap(sinA * ringR);

      // Primary emerald pixel
      ctx.fillStyle = `rgba(0, 255, 100, ${ringAlpha.toFixed(2)})`;
      ctx.fillRect(px, py, P, P);

      // Inner white glint
      if (st % 2 === 0 && ringPhase < 0.6) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(ringAlpha * 0.9).toFixed(2)})`;
        ctx.fillRect(px - P, py - P, P, P);
      }
    }
  }

  // 3. ── INWARD-SUCKING STEPPED PIXEL ENERGY STREAKS ──
  const particleCount = 18 + Math.floor(chargeNorm * 12);
  for (let i = 0; i < particleCount; i++) {
    const pPhase = ((time * 1.2 + i * 0.618) % 1);
    const angleOffset = i * (Math.PI * 2 / particleCount) + (time * 0.15);
    const inwardProgress = Math.pow(pPhase, 2.5);

    const maxDist = 160;
    const currentDist = snap(maxDist * (1 - inwardProgress));
    if (currentDist < P * 2) continue;

    const streakX = snap(tipDist + Math.cos(angleOffset) * currentDist);
    const streakY = snap(Math.sin(angleOffset) * currentDist);
    const streakAlpha = Math.min(1.0, inwardProgress * 2.2);

    // Render leading pixel dot
    ctx.fillStyle = (inwardProgress > 0.75) 
      ? `rgba(255, 255, 255, ${streakAlpha.toFixed(2)})`
      : `rgba(0, 255, 80, ${streakAlpha.toFixed(2)})`;
    ctx.fillRect(streakX, streakY, P, P);

    // Trailing pixel streak step
    const tailDist = snap(currentDist + (8 + chargeNorm * 12) * (1 - inwardProgress));
    const tailX = snap(tipDist + Math.cos(angleOffset) * tailDist);
    const tailY = snap(Math.sin(angleOffset) * tailDist);
    ctx.fillStyle = `rgba(0, 200, 70, ${(streakAlpha * 0.6).toFixed(2)})`;
    ctx.fillRect(tailX, tailY, P, P);
  }

  ctx.restore();
}

export const drawTricksterStaff = drawRubbickStaff;
export const drawTricksterBolt = drawRubbickBolt;
export const drawTricksterChargeEffect = drawRubbickChargeEffect;

/**
 * Calculates the exact world-space coordinates (x, y) of the crystal core at the tip of Rubbick's staff.
 * @param {Object} fighter - Rubbick fighter instance
 * @returns {{x: number, y: number}} World coordinates of staff crystal tip
 */
export function getRubbickStaffTip(fighter) {
  if (!fighter) return { x: 0, y: 0 };
  const r = fighter.r || 25;
  const angle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const zOffset = fighter.z || 0;
  const facingLeft = Math.abs(angle) > Math.PI / 2;

  let gripX = r * 0.70;
  let gripY = r * 0.20;
  let staffTilt = Math.PI / 2 - 0.22;

  if ((fighter.stolenType === 'gojo' || fighter.stolenType === 'gojo_red' || fighter.stolenType === 'gojo_domain') && fighter.stolenWindUpTimer > 0) {
    const windupMax = 45;
    const progress = Math.min(1.0, Math.max(0, 1 - (fighter.stolenWindUpTimer / windupMax)));
    if (progress < 0.40) {
      const pNorm = progress / 0.40;
      gripX = r * 0.65 - Math.sin(pNorm * Math.PI) * 4;
      gripY = -r * 0.15 - Math.sin(pNorm * Math.PI) * 6;
      staffTilt = Math.PI / 2 - 0.45 - Math.sin(pNorm * Math.PI) * 0.20;
    } else if (progress < 0.75) {
      const pNorm = (progress - 0.40) / 0.35;
      gripX = r * 0.65 + pNorm * (r * 0.25);
      gripY = -r * 0.15 + pNorm * (r * 0.15);
      staffTilt = Math.PI / 2 - 0.45 + pNorm * 0.45;
    } else {
      const pNorm = (progress - 0.75) / 0.25;
      gripX = r * 0.90 + pNorm * 6;
      gripY = 0;
      staffTilt = Math.PI / 2;
    }
  } else if (fighter.stolenWindUpTimer > 0 || fighter.beamCharge > 0 || fighter.beamTimer > 0 || fighter.tkTimer > 0) {
    gripX = r * 0.85;
    gripY = 0;
    staffTilt = Math.PI / 2;
  }

  // Shaft top is at y = -50, with grip wrap offset y = -8, crystal is at y = -74.
  // In grip local frame, crystal center is at localStaffX = 0, localStaffY = -82.
  const localStaffX = 0;
  let localStaffY = -82;

  // Custom weapon studio offsets if any
  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.rubbick) ? state.weaponCustomizations.rubbick : null;
  if (custom) {
    if (custom.scale && custom.scale !== 1.0) {
      localStaffY *= custom.scale;
    }
    if (custom.angleOffset) {
      staffTilt += custom.angleOffset;
    }
  }

  // Rotate by staffTilt in hand coordinate frame
  const handX = gripX - localStaffY * Math.sin(staffTilt) + localStaffX * Math.cos(staffTilt);
  const handY = gripY + localStaffY * Math.cos(staffTilt) + localStaffX * Math.sin(staffTilt);

  // Apply facingLeft Y-axis vertical flip (ctx.scale(1, -1))
  const localX = handX;
  const localY = facingLeft ? -handY : handY;

  // Transform to world coordinates using fighter's gunAngle and hovering zOffset
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  return {
    x: fighter.x + (cosA * localX - sinA * localY),
    y: (fighter.y - zOffset) + (sinA * localX + cosA * localY)
  };
}

export const getTricksterStaffTip = getRubbickStaffTip;


