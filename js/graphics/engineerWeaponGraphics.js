// ─────────────────────────────────────────────
// Engineer WEAPON GRAPHICS (Shotgun, Wrench, Turret)
// ─────────────────────────────────────────────

import { state } from '../core/state.js';

export const Engineer_WEAPON_GRAPHICS = {
  colors: {
    darkMetal: '#2A2A2E',
    mediumMetal: '#4A4A52',
    lightMetal: '#7A7A82',
    wood: '#5C4033',          // Shotgun pump/stock
    wrench: '#A0A0A0',        // Silver wrench
    accent: '#b8860b',        // Goldenrod accent
    outline: '#000000',
    turretBase: '#333333',
    turretBody: '#555555',
    turretLens: '#00ffff'
  }
};

export function drawEngineer(ctx, options) {
  const {
    x = 0,
    y = 0,
    gunAngle = 0,
    r = 20,
    facingRight = true,
    wrenchActive = false,
    wrenchTimer = 0,
    wrenchAngle = 0,
    shotgunRecoilTimer = 0,
    lastWeaponUsed = 'shotgun'
  } = options;
  
  if (lastWeaponUsed === 'wrench') {
    // Shotgun is stowed on back
    drawEngineerShotgun(ctx, x, y, gunAngle, r, facingRight, 0, true);
    // Wrench is active
    drawEngineerWrench(ctx, x, y, wrenchActive ? wrenchAngle : gunAngle, r, facingRight, wrenchActive ? wrenchTimer : 0, false);
  } else {
    // Wrench is stowed on back
    drawEngineerWrench(ctx, x, y, gunAngle, r, facingRight, 0, true);
    // Shotgun is active
    drawEngineerShotgun(ctx, x, y, gunAngle, r, facingRight, shotgunRecoilTimer, false);
  }
  
  // Draw the iconic yellow engineer hard hat on top of the body
  drawEngineerCap(ctx, x, y, gunAngle, r);
}

function drawEngineerCap(ctx, x, y, gunAngle, r) {
  ctx.save();
  // Translate to place the hat on the top portion of the body circle
  ctx.translate(x, y - r * 0.45);
  
  // Notice we do NOT rotate by gunAngle!
  // The hat is drawn purely facing the camera (front-view)
  
  const hatColor = '#FFC107'; // Bright construction yellow
  const hatShadow = '#D4A000';
  const outline = '#000000';
  
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = outline;

  // Brim (wide ellipse at the bottom)
  ctx.beginPath();
  // ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
  ctx.ellipse(0, r * 0.3, r * 1.05, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = hatShadow;
  ctx.fill();
  ctx.stroke();

  // Main dome of the hard hat
  ctx.beginPath();
  // Top half of the dome (left to right over the top)
  ctx.arc(0, 0, r * 0.85, Math.PI, 2 * Math.PI); 
  // Straight lines down to the brim's vertical level
  ctx.lineTo(r * 0.85, r * 0.2);
  // Curve along the bottom to connect back to the left side
  ctx.quadraticCurveTo(0, r * 0.5, -r * 0.85, r * 0.2);
  ctx.closePath();
  
  ctx.fillStyle = hatColor;
  ctx.fill();
  ctx.stroke();

  // Top center ridge (highlight)
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(0, r * 0.35);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  
  // Side indents/ridges
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.5);
  ctx.quadraticCurveTo(-r * 0.4, -r * 0.1, -r * 0.3, r * 0.2);
  
  ctx.moveTo(r * 0.4, -r * 0.5);
  ctx.quadraticCurveTo(r * 0.4, -r * 0.1, r * 0.3, r * 0.2);
  
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawEngineerShotgun(ctx, x, y, gunAngle, r, facingRight, recoilTimer = 0, isStowed = false) {
  ctx.save();
  ctx.translate(x, y);
  
  if (isStowed) {
    ctx.rotate(gunAngle + Math.PI); // Point to the back
    ctx.translate(r * 0.4, 0); // Position on the back
    ctx.rotate(Math.PI / 4); // Slung diagonally
    ctx.scale(0.8, 0.8); // Slightly smaller when stowed
  } else {
    ctx.rotate(gunAngle);
    ctx.translate(r + 5, 0); // Hold in front
  }

  if (!facingRight) {
    ctx.scale(1, -1);
  }
  
  drawEngineerShotgunModel(ctx, recoilTimer);
  ctx.restore();
}

function drawEngineerShotgunModel(ctx, recoilTimer) {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  
  // Recoil offset (moves gun backward briefly)
  const recoilOffset = (recoilTimer > 0) ? -3 * (recoilTimer / 15) : 0;
  // Pump offset (moves pump backward then forward)
  let pumpOffset = 0;
  if (recoilTimer > 0) {
    const pumpPhase = Math.max(0, (recoilTimer - 5) / 10);
    pumpOffset = Math.sin(pumpPhase * Math.PI) * -6; // Slides back 6 pixels
  }
  
  ctx.translate(recoilOffset, 0);
  
  // Common Colors
  const brownGrip = '#8B5A2B';
  const grayReceiver = '#9AA0A6';
  const blackBarrel = '#222324';
  
  // 1. Curved Pistol Grip (Brown stock)
  ctx.fillStyle = brownGrip;
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  // Curve back and down
  ctx.quadraticCurveTo(-20, -2, -26, 12);
  // Flat bottom of the grip
  ctx.lineTo(-21, 15);
  // Inner curve back to the receiver base
  ctx.quadraticCurveTo(-14, 7, -6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Trigger & Trigger Guard
  ctx.beginPath();
  ctx.arc(-1, 4, 3, 0, Math.PI);
  ctx.stroke();
  // Trigger
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.quadraticCurveTo(-3, 4, -1, 5);
  ctx.stroke();

  // 3. Main Receiver (Gray)
  ctx.fillStyle = grayReceiver;
  ctx.beginPath();
  ctx.moveTo(-12, -4); // top left (slanted slightly)
  ctx.lineTo(10, -4);  // top right
  ctx.lineTo(10, 4);   // bottom right
  ctx.lineTo(-6, 4);   // bottom left near trigger
  ctx.lineTo(-12, -1); // sloped back
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Receiver Pins (Details)
  ctx.fillStyle = '#444';
  ctx.beginPath(); ctx.arc(6, -2, 1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, 2, 1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-8, -1, 1, 0, Math.PI*2); ctx.fill();

  // 4. Barrels (Main Barrel & Magazine Tube)
  ctx.fillStyle = blackBarrel;
  
  // Main Barrel (Top)
  ctx.beginPath();
  ctx.rect(10, -4, 32, 4.5);
  ctx.fill();
  ctx.stroke();
  
  // Magazine Tube (Bottom, shorter)
  ctx.beginPath();
  ctx.rect(10, 0.5, 22, 3.5);
  ctx.fill();
  ctx.stroke();
  
  // Barrel Clamp (Connects barrel and tube)
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.rect(30, -4, 2, 8);
  ctx.fill();
  ctx.stroke();

  // Orange Tip
  ctx.fillStyle = '#FF7F00';
  ctx.beginPath();
  ctx.rect(42, -4, 3, 4.5);
  ctx.fill();
  ctx.stroke();

  // 5. Pump Handle (Brown Forend)
  const pumpX = 12 + pumpOffset;
  ctx.fillStyle = brownGrip;
  ctx.beginPath();
  ctx.moveTo(pumpX, 0.5);
  ctx.lineTo(pumpX + 16, 0.5);
  // Sloped front
  ctx.lineTo(pumpX + 14, 5.5);
  // Sloped back
  ctx.lineTo(pumpX + 2, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Pump Grip Ridges
  ctx.beginPath();
  for (let i = 4; i <= 12; i += 2) {
    ctx.moveTo(pumpX + i, 1);
    ctx.lineTo(pumpX + i - 0.5, 5); // slight angle
  }
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

export function drawEngineerWrench(ctx, x, y, gunAngle, r, facingRight, timer, isStowed = false) {
  ctx.save();
  ctx.translate(x, y);
  
  const swipeArc = Math.PI * 0.8; // 144 degrees swipe
  
  if (isStowed) {
    ctx.rotate(gunAngle + Math.PI); // Point to the back
    ctx.translate(r * 0.4, 0); // Position on the back
    ctx.rotate(-Math.PI / 4); // Slung diagonally (opposite of shotgun)
    ctx.scale(0.8, 0.8); // Slightly smaller when stowed
    
    if (!facingRight) {
      ctx.scale(1, -1);
    }
  } else {
    const flipDir = facingRight ? 1 : -1;
    let armAngleOffset = 0;
    let wristAngleOffset = 0;
    
    if (timer > 0) {
      // Max timer is 10 (from config)
      const progress = 1 - (timer / 10);
      
      // Arm swings from -72 deg to +72 deg
      armAngleOffset = (-swipeArc / 2 + swipeArc * progress) * flipDir;
      
      // Wrist flicks from -90 deg to 0 deg during the first half of the swing
      if (progress < 0.5) {
        wristAngleOffset = (-Math.PI / 2 + (progress * 2) * (Math.PI / 2)) * flipDir;
      } else {
        wristAngleOffset = 0; // Follow through straight
      }
    } else {
      // Idle/Resting position — held forward like a sword, pointed at the target
      armAngleOffset = 0;
      wristAngleOffset = 0;
    }
    
    // Rotate arm from shoulder
    ctx.rotate(gunAngle + armAngleOffset);
    
    // Move to hand
    ctx.translate(r + 5, 0);

    // Apply wrist rotation
    ctx.rotate(wristAngleOffset);
    
    if (!facingRight) {
      ctx.scale(1, -1);
    }
  }
  
  const colors = Engineer_WEAPON_GRAPHICS.colors;
  
  // Scale wrench to match shotgun size
  ctx.scale(1.5, 1.5);
  
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1;
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // ── Long Tapered Handle (Red) ──────────────────────────
  // The handle tapers: thinner at the grip end, wider near the head
  const handleGrad = ctx.createLinearGradient(0, -4, 0, 4);
  handleGrad.addColorStop(0, '#FF4444');
  handleGrad.addColorStop(0.25, '#FF6666'); // highlight
  handleGrad.addColorStop(0.6, '#DD1111');
  handleGrad.addColorStop(1, '#880000');

  ctx.fillStyle = handleGrad;
  ctx.beginPath();
  // Grip end (thin, rounded)
  ctx.moveTo(-2, -2);
  ctx.quadraticCurveTo(-4, -2, -4, 0);
  ctx.quadraticCurveTo(-4, 2, -2, 2);
  // Bottom edge (tapers wider toward head)
  ctx.lineTo(28, 4);
  // Head connection
  ctx.lineTo(28, -4);
  // Top edge
  ctx.lineTo(-2, -2);
  ctx.closePath();
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();
  
  // ── Elongated Slot/Hole in handle ──────────────────────
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(2, -0.5);
  ctx.lineTo(12, -1);
  ctx.quadraticCurveTo(14, -1, 14, 0);
  ctx.quadraticCurveTo(14, 1, 12, 1);
  ctx.lineTo(2, 0.5);
  ctx.quadraticCurveTo(0, 0.5, 0, 0);
  ctx.quadraticCurveTo(0, -0.5, 2, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#660000';
  ctx.stroke();
  ctx.strokeStyle = colors.outline;
  
  // ── Bottom Fixed Jaw (Red, curves upward like a hook) ──
  const jawBottomGrad = ctx.createLinearGradient(26, -4, 26, -12);
  jawBottomGrad.addColorStop(0, '#DD1111');
  jawBottomGrad.addColorStop(0.5, '#FF4444');
  jawBottomGrad.addColorStop(1, '#CC2222');
  
  ctx.fillStyle = jawBottomGrad;
  ctx.beginPath();
  ctx.moveTo(26, -4);
  ctx.lineTo(26, -10);
  // Curved hook tip
  ctx.quadraticCurveTo(26, -14, 30, -15);
  ctx.quadraticCurveTo(34, -15.5, 35, -13);
  ctx.quadraticCurveTo(35, -11, 32, -10);
  ctx.lineTo(32, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Teeth on bottom jaw inner edge
  ctx.beginPath();
  ctx.strokeStyle = '#880000';
  ctx.lineWidth = 0.8;
  for(let i = -5; i > -13; i -= 2) {
    ctx.moveTo(32, i);
    ctx.lineTo(34, i);
  }
  ctx.stroke();
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1;
  
  // ── Adjustment Nut (Dark, between jaws) ────────────────
  const nutGrad = ctx.createLinearGradient(18, -8, 18, 2);
  nutGrad.addColorStop(0, '#555');
  nutGrad.addColorStop(0.5, '#333');
  nutGrad.addColorStop(1, '#1a1a1a');
  
  ctx.fillStyle = nutGrad;
  ctx.beginPath();
  ctx.rect(20, -8, 6, 10);
  ctx.fill();
  ctx.stroke();
  
  // Nut ridges (horizontal grooves)
  ctx.beginPath();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 0.7;
  for(let i = -7; i < 2; i += 1.5) {
    ctx.moveTo(20, i);
    ctx.lineTo(26, i);
  }
  ctx.stroke();
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1;

  // ── Top Adjustable Jaw (Silver/Gray, hooks downward) ───
  const jawTopGrad = ctx.createLinearGradient(0, -16, 0, -8);
  jawTopGrad.addColorStop(0, '#D0D0D0');
  jawTopGrad.addColorStop(0.3, '#E8E8E8'); // highlight
  jawTopGrad.addColorStop(0.7, '#909090');
  jawTopGrad.addColorStop(1, '#555555');

  ctx.fillStyle = jawTopGrad;
  ctx.beginPath();
  // Stem rises from nut area
  ctx.moveTo(22, -8);
  ctx.lineTo(22, -14);
  // Curved hook going right and downward
  ctx.quadraticCurveTo(22, -18, 26, -19);
  ctx.quadraticCurveTo(32, -20, 36, -18);
  ctx.quadraticCurveTo(39, -16, 38, -13);
  ctx.lineTo(36, -13);
  ctx.quadraticCurveTo(36, -15, 34, -16);
  ctx.quadraticCurveTo(30, -17, 27, -15);
  ctx.lineTo(27, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Teeth on top jaw inner edge
  ctx.beginPath();
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 0.8;
  for(let i = -9; i > -15; i -= 2) {
    ctx.moveTo(36, i);
    ctx.lineTo(38, i);
  }
  ctx.stroke();
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1;
  
  // Swipe effect (motion blur trail)
  ctx.restore();
  
  if (timer > 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(gunAngle);
    ctx.beginPath();
    ctx.arc(0, 0, r + 25, -swipeArc/2, swipeArc/2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawEngineerBullet(ctx, x, y, angle, scale, lifeRatio) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const isHot = lifeRatio > 0.3;
  
  // Dynamic trail length based on speed and life
  const trailLen = isHot ? 25 : 10;
  
  // 1. Outer Glow / Flame
  if (isHot) {
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(-trailLen, -3 * lifeRatio);
    ctx.lineTo(-trailLen - 5, 0);
    ctx.lineTo(-trailLen, 3 * lifeRatio);
    ctx.closePath();
    
    const grad = ctx.createLinearGradient(3, 0, -trailLen - 5, 0);
    grad.addColorStop(0, `rgba(255, 200, 50, ${lifeRatio})`);
    grad.addColorStop(0.3, `rgba(255, 80, 0, ${lifeRatio * 0.8})`);
    grad.addColorStop(1, 'rgba(100, 20, 0, 0)');
    
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // 2. Thick fiery core trail
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-trailLen * 0.7, 0);
  
  if (isHot) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${lifeRatio})`;
    ctx.lineWidth = 2.5;
  } else {
    ctx.strokeStyle = `rgba(100, 100, 100, ${lifeRatio * 0.5})`;
    ctx.lineWidth = 1.5;
  }
  ctx.stroke();

  // 3. The actual pellet (buckshot)
  ctx.beginPath();
  const pelletRadius = isHot ? 2.5 : 1.5;
  // A slightly elongated pellet to show motion blur
  ctx.ellipse(0, 0, pelletRadius * 1.5, pelletRadius, 0, 0, Math.PI * 2);
  
  if (isHot) {
    ctx.fillStyle = '#FFFFFF'; // White-hot core
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#FF8800'; // Orange halo
    ctx.stroke();
  } else {
    ctx.fillStyle = '#444444'; // Cooled down lead
    ctx.fill();
  }
  
  ctx.restore();
}

export function drawTurret(ctx, turret) {
  const { x, y, r, gunAngle, isBuilding, buildProgress, owner } = turret;
  
  let zOffset = turret.z || 0;
  if (isBuilding) {
    // If the engineer is airborne while building, visually lift the turret and its debris
    const engineer = state.fighters && state.fighters[owner];
    if (engineer && engineer.z) {
      zOffset = engineer.z;
    }
  }

  ctx.save();
  ctx.translate(x, y - zOffset);

  // Build progress thresholds for each piece
  // Phase 1 (0.00–0.20): Tripod legs appear one by one
  // Phase 2 (0.20–0.35): Central hub + pivot ring
  // Phase 3 (0.35–0.55): C-arms + ammo drum
  // Phase 4 (0.55–0.75): Gun mount + barrels
  // Phase 5 (0.75–1.00): Sensor head + cables + laser
  const bp = (isBuilding && buildProgress !== undefined) ? buildProgress : 1;

  // Helper: returns alpha for a piece based on its threshold
  // Fades in over ~0.08 progress for a quick "pop in"
  function pieceAlpha(threshold) {
    if (bp >= threshold + 0.08) return 1;
    if (bp < threshold) return 0;
    return (bp - threshold) / 0.08;
  }

  const s = r / 20;
  ctx.scale(s, s);

  // Hit flash color swapping (no expensive ctx.filter)
  const isHit = turret.hitFlashTimer > 0;

  // ═══════════════════════════════════════════
  // BUILD ASSEMBLY EFFECTS (only during construction)
  // ═══════════════════════════════════════════
  if (isBuilding && bp < 1) {
    const now = performance.now();

    // --- Welding sparks spraying from build center ---
    const sparkCount = 6;
    for (let i = 0; i < sparkCount; i++) {
      const sparkAngle = (now / 80 + i * (Math.PI * 2 / sparkCount)) % (Math.PI * 2);
      const sparkDist = 8 + Math.sin(now / 60 + i * 1.7) * 18;
      const sparkX = Math.cos(sparkAngle) * sparkDist;
      const sparkY = Math.sin(sparkAngle) * sparkDist;
      const sparkSize = 1.2 + Math.random() * 1.5;
      const sparkAlpha = 0.5 + Math.sin(now / 30 + i * 2) * 0.4;

      ctx.save();
      ctx.globalAlpha = sparkAlpha;
      // Bright orange-yellow welding sparks
      ctx.fillStyle = Math.random() > 0.3 ? '#FFAA00' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
      ctx.fill();

      // Spark glow
      ctx.fillStyle = `rgba(255, 170, 0, ${sparkAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- Pulsing orange construction glow at center ---
    const glowPulse = 0.15 + Math.sin(now / 200) * 0.1;
    const glowRadius = 20 + bp * 10;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glow.addColorStop(0, `rgba(255, 170, 50, ${glowPulse})`);
    glow.addColorStop(0.5, `rgba(255, 120, 0, ${glowPulse * 0.4})`);
    glow.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // --- Floating metal shards / debris around build site ---
    const shardCount = 5;
    for (let i = 0; i < shardCount; i++) {
      const shardAngle = (now / 500 + i * (Math.PI * 2 / shardCount));
      const shardDist = 22 + Math.sin(now / 300 + i * 3) * 8;
      const shardX = Math.cos(shardAngle) * shardDist;
      const shardY = Math.sin(shardAngle) * shardDist;
      const shardRot = now / 200 + i * 1.5;

      ctx.save();
      ctx.translate(shardX, shardY);
      ctx.rotate(shardRot);
      ctx.globalAlpha = 0.6 + Math.sin(now / 150 + i) * 0.3;
      ctx.fillStyle = '#888';
      ctx.fillRect(-2, -1, 4, 2);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-2, -1, 4, 2);
      ctx.restore();
    }

    // --- Bright flash when a piece locks in (at each threshold) ---
    const thresholds = [0.0, 0.07, 0.14, 0.20, 0.35, 0.55, 0.75];
    for (const t of thresholds) {
      const flashProgress = (bp - t) / 0.08;
      if (flashProgress > 0 && flashProgress < 1) {
        // Quick bright white flash that fades out
        const flashAlpha = (1 - flashProgress) * 0.7;
        const flashRadius = 12 + flashProgress * 20;
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, flashRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break; // Only show one flash at a time
      }
    }
  }

  // ═══════════════════════════════════════════
  // PHASE 1: TRIPOD LEGS (staggered)
  // ═══════════════════════════════════════════
  const legColor = isHit ? '#999' : '#2A2A2E';
  const legStroke = '#111';

  // Three tripod legs appear at progress 0.0, 0.07, 0.14
  for (let i = 0; i < 3; i++) {
    const legThreshold = i * 0.07;
    const legAlpha = pieceAlpha(legThreshold);
    if (legAlpha <= 0) continue;

    const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
    ctx.save();
    ctx.globalAlpha = legAlpha;
    ctx.fillStyle = legColor;
    ctx.strokeStyle = legStroke;
    ctx.lineWidth = 1.5;
    ctx.rotate(a);
    // Leg body
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.lineTo(4, 22);
    ctx.lineTo(-4, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Foot pad
    ctx.fillStyle = isHit ? '#AAA' : '#1A1A1E';
    ctx.beginPath();
    ctx.ellipse(0, 23, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // PHASE 2: CENTRAL HUB + PIVOT RING
  // ═══════════════════════════════════════════
  const hubAlpha = pieceAlpha(0.20);
  if (hubAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = hubAlpha;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    // Central hub (tripod meeting point)
    ctx.fillStyle = isHit ? '#BBB' : '#333';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pivot ring
    ctx.fillStyle = isHit ? '#CCC' : '#555';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // ROTATING HEAD (Everything below rotates)
  // ═══════════════════════════════════════════
  ctx.rotate(gunAngle);

  // Recoil
  const recoilTimer = turret.recoilTimer || 0;
  let recoilOffset = 0;
  if (recoilTimer > 0) {
    recoilOffset = -(recoilTimer / 10) * 6;
  }

  // ═══════════════════════════════════════════
  // PHASE 3: C-ARMS + AMMO DRUM
  // ═══════════════════════════════════════════
  const drumAlpha = pieceAlpha(0.35);
  if (drumAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = drumAlpha;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    // ── C-Shaped Side Arms (behind ammo drum) ──
    const armColor = isHit ? '#AA8888' : '#5A3030';
    ctx.strokeStyle = armColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    // Left C-arm
    ctx.beginPath();
    ctx.arc(-4, 0, 18, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();
    // Right C-arm
    ctx.beginPath();
    ctx.arc(-4, 0, 18, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    // ── Large Ammo Drum ──
    ctx.fillStyle = isHit ? '#888' : '#2A2A2E';
    ctx.beginPath();
    ctx.arc(-4, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Drum segments (ridges)
    ctx.strokeStyle = isHit ? '#666' : '#1A1A1E';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(-4 + Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(-4 + Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.stroke();
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    // Inner red ring
    ctx.fillStyle = isHit ? '#FF9999' : '#8B2020';
    ctx.beginPath();
    ctx.arc(-4, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner dark hub
    ctx.fillStyle = isHit ? '#AAA' : '#222';
    ctx.beginPath();
    ctx.arc(-4, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hub bolt
    ctx.fillStyle = isHit ? '#DDD' : '#555';
    ctx.beginPath();
    ctx.arc(-4, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // PHASE 4: GUN MOUNT + BARRELS
  // ═══════════════════════════════════════════
  const barrelAlpha = pieceAlpha(0.55);
  if (barrelAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = barrelAlpha;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    // ── Central Gun Mount ──
    ctx.translate(recoilOffset, 0);

    ctx.fillStyle = isHit ? '#999' : '#333';
    ctx.fillRect(6, -6, 12, 12);
    ctx.strokeRect(6, -6, 12, 12);

    // Mount details - bolts
    ctx.fillStyle = isHit ? '#CCC' : '#555';
    ctx.beginPath();
    ctx.arc(8, -4, 1, 0, Math.PI * 2);
    ctx.arc(8, 4, 1, 0, Math.PI * 2);
    ctx.arc(16, -4, 1, 0, Math.PI * 2);
    ctx.arc(16, 4, 1, 0, Math.PI * 2);
    ctx.fill();

    // ── Dual Gatling Barrels ──
    const barrelStartX = 18;
    const barrelLen = 20;
    const barrelSpacing = 5;

    // Upper barrel cluster
    ctx.fillStyle = isHit ? '#AAA' : '#3A3A3E';
    ctx.fillRect(barrelStartX, -barrelSpacing - 3, barrelLen, 3);
    ctx.strokeRect(barrelStartX, -barrelSpacing - 3, barrelLen, 3);
    ctx.fillRect(barrelStartX, -barrelSpacing, barrelLen, 3);
    ctx.strokeRect(barrelStartX, -barrelSpacing, barrelLen, 3);

    // Lower barrel cluster
    ctx.fillRect(barrelStartX, barrelSpacing - 3, barrelLen, 3);
    ctx.strokeRect(barrelStartX, barrelSpacing - 3, barrelLen, 3);
    ctx.fillRect(barrelStartX, barrelSpacing, barrelLen, 3);
    ctx.strokeRect(barrelStartX, barrelSpacing, barrelLen, 3);

    // Barrel clamps
    ctx.fillStyle = isHit ? '#BB8888' : '#5A3030';
    ctx.fillRect(barrelStartX + 4, -barrelSpacing - 4, 3, 7);
    ctx.strokeRect(barrelStartX + 4, -barrelSpacing - 4, 3, 7);
    ctx.fillRect(barrelStartX + 12, -barrelSpacing - 4, 3, 7);
    ctx.strokeRect(barrelStartX + 12, -barrelSpacing - 4, 3, 7);

    ctx.fillRect(barrelStartX + 4, barrelSpacing - 3, 3, 7);
    ctx.strokeRect(barrelStartX + 4, barrelSpacing - 3, 3, 7);
    ctx.fillRect(barrelStartX + 12, barrelSpacing - 3, 3, 7);
    ctx.strokeRect(barrelStartX + 12, barrelSpacing - 3, 3, 7);

    // Muzzle ends (bore holes) - upper
    const muzzleX = barrelStartX + barrelLen;
    ctx.fillStyle = isHit ? '#777' : '#111';
    ctx.beginPath();
    ctx.arc(muzzleX, -barrelSpacing - 1.5, 1.5, 0, Math.PI * 2);
    ctx.arc(muzzleX, -barrelSpacing + 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Muzzle ends - lower
    ctx.beginPath();
    ctx.arc(muzzleX, barrelSpacing - 1.5, 1.5, 0, Math.PI * 2);
    ctx.arc(muzzleX, barrelSpacing + 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // PHASE 5: SENSOR HEAD + CABLES + LASER
  // ═══════════════════════════════════════════
  const headAlpha = pieceAlpha(0.75);
  if (headAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = headAlpha;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.translate(recoilOffset, 0);

    const barrelStartX = 18;
    const barrelLen = 20;
    const muzzleX = barrelStartX + barrelLen;

    // ── Red Sensor Head (on top/behind barrels) ──
    const headX = 0, headY = -14, headW = 14, headH = 10;
    ctx.fillStyle = isHit ? '#FF8888' : '#8B2020';
    ctx.fillRect(headX, headY, headW, headH);
    ctx.strokeRect(headX, headY, headW, headH);

    // Weathered edge highlight
    ctx.fillStyle = isHit ? '#FFAAAA' : '#A03030';
    ctx.fillRect(headX, headY, headW, 1.5);

    // 4 sensor lenses (2x2 grid)
    ctx.fillStyle = isHit ? '#555' : '#0A0A0A';
    ctx.beginPath();
    ctx.arc(headX + 4, headY + 3.5, 2, 0, Math.PI * 2);
    ctx.arc(headX + 10, headY + 3.5, 2, 0, Math.PI * 2);
    ctx.arc(headX + 4, headY + 7.5, 2, 0, Math.PI * 2);
    ctx.arc(headX + 10, headY + 7.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Lens reflections
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(headX + 3.5, headY + 3, 0.8, 0, Math.PI * 2);
    ctx.arc(headX + 9.5, headY + 3, 0.8, 0, Math.PI * 2);
    ctx.arc(headX + 3.5, headY + 7, 0.8, 0, Math.PI * 2);
    ctx.arc(headX + 9.5, headY + 7, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // DANGER label
    ctx.fillStyle = isHit ? '#FFFF00' : '#DDAA00';
    ctx.fillRect(headX + 1, headY + 1, 2, 1.5);

    // ── Orange Cables ──
    ctx.strokeStyle = isHit ? '#FFCC66' : '#CC7722';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    // Cable from sensor head to ammo drum (left)
    ctx.beginPath();
    ctx.moveTo(headX + 2, headY + headH);
    ctx.quadraticCurveTo(-8, -6, -10, 2);
    ctx.stroke();
    // Cable from sensor head to mount (right)
    ctx.beginPath();
    ctx.moveTo(headX + headW - 2, headY + headH);
    ctx.quadraticCurveTo(14, -4, 12, 4);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    // ── Targeting Laser ──
    ctx.beginPath();
    ctx.moveTo(muzzleX, 0);
    ctx.lineTo(muzzleX + 60, 0);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

export function drawTurretBullet(ctx, x, y, angle, scale, lifeRatio) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const isHot = lifeRatio > 0.2;
  const trailLen = isHot ? 30 : 15;

  // 1. Outer Glow (Orange / Yellow)
  if (isHot) {
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-trailLen, -4 * lifeRatio);
    ctx.lineTo(-trailLen - 6, 0);
    ctx.lineTo(-trailLen, 4 * lifeRatio);
    ctx.closePath();
    
    const grad = ctx.createLinearGradient(4, 0, -trailLen - 6, 0);
    grad.addColorStop(0, `rgba(255, 200, 50, ${lifeRatio})`);
    grad.addColorStop(0.4, `rgba(255, 100, 0, ${lifeRatio * 0.7})`);
    grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // 2. Bright Core (Yellow-White)
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.lineTo(-trailLen * 0.8, -1.5);
  ctx.lineTo(-trailLen - 2, 0);
  ctx.lineTo(-trailLen * 0.8, 1.5);
  ctx.closePath();
  ctx.fillStyle = '#FFFFCC';
  ctx.fill();

  // 3. Heavy sparks around the bullet
  if (isHot && Math.random() < 0.6) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, (Math.random() - 0.5) * 8);
    ctx.lineTo(-20, (Math.random() - 0.5) * 12);
    ctx.strokeStyle = 'rgba(255, 150, 0, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}
