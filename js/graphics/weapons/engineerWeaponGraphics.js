// ─────────────────────────────────────────────
// Engineer WEAPON GRAPHICS (Shotgun, Wrench, Turret)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG, getHandSize } from '../../core/config.js';

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

export function drawEngineer(ctx, options = {}) {
  const {
    x = 0,
    y = 0,
    gunAngle = 0,
    r = 20,
    facingRight = true,
    wrenchActive = false,
    wrenchTimer = 0,
    wrenchAngle = 0,
    wrenchSlashFadeTimer = 0,
    shotgunRecoilTimer = 0,
    lastWeaponUsed = 'shotgun',
    color = '#ffcc00',
    hideHands = false,
    isWinnerReveal = false
  } = options;

  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || hideHands;
  
  if (lastWeaponUsed === 'wrench') {
    // Shotgun is stowed on back
    drawEngineerShotgun(ctx, x, y, gunAngle, r, facingRight, 0, true, color, shouldHideHands, isWinnerReveal);
    // Wrench is active
    drawEngineerWrench(ctx, x, y, wrenchActive ? wrenchAngle : gunAngle, r, facingRight, wrenchActive ? wrenchTimer : 0, false, color, wrenchSlashFadeTimer, shouldHideHands, isWinnerReveal);
  } else {
    // Wrench is stowed on back
    drawEngineerWrench(ctx, x, y, gunAngle, r, facingRight, 0, true, color, 0, shouldHideHands, isWinnerReveal);
    // Shotgun is active
    drawEngineerShotgun(ctx, x, y, gunAngle, r, facingRight, shotgunRecoilTimer, false, color, shouldHideHands, isWinnerReveal);
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

/**
 * Renders the explosive muzzle blast flash and smoke wisps at the shotgun barrel tip
 */
function drawEngineerMuzzleBlast(ctx, x, y, blastP) {
  ctx.save();
  ctx.translate(x, y);

  const alpha = Math.max(0, 1.0 - blastP);
  const flashScale = 1.0 + blastP * 0.5;

  // 1. Expanding translucent powder smoke puffs
  const smokeAlpha = alpha * 0.45;
  ctx.fillStyle = `rgba(180, 185, 195, ${smokeAlpha})`;
  ctx.beginPath();
  ctx.arc(8 * flashScale, -2, 7 * flashScale, 0, Math.PI * 2);
  ctx.arc(14 * flashScale, 1, 9 * flashScale, 0, Math.PI * 2);
  ctx.arc(18 * flashScale, -3, 6 * flashScale, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer fiery orange starburst / expanding flame petals
  ctx.fillStyle = `rgba(255, 90, 0, ${alpha * 0.90})`;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(16 * flashScale, -9 * flashScale);
  ctx.lineTo(24 * flashScale, -2);
  ctx.lineTo(18 * flashScale, 6 * flashScale);
  ctx.lineTo(26 * flashScale, 3 * flashScale);
  ctx.lineTo(14 * flashScale, 10 * flashScale);
  ctx.lineTo(0, 4);
  ctx.closePath();
  ctx.fill();

  // 3. Middle bright golden-yellow flare
  ctx.fillStyle = `rgba(255, 200, 30, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(12 * flashScale, -5 * flashScale);
  ctx.lineTo(18 * flashScale, -1);
  ctx.lineTo(13 * flashScale, 4 * flashScale);
  ctx.lineTo(0, 3);
  ctx.closePath();
  ctx.fill();

  // 4. Inner white-hot diamond blast core
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, -1.5);
  ctx.lineTo(8 * flashScale, 0);
  ctx.lineTo(0, 1.5);
  ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.fill();

  // 5. Four sharp supersonic radial blast needles
  ctx.strokeStyle = `rgba(255, 240, 180, ${alpha * 0.95})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(28 * flashScale, -4 * flashScale);
  ctx.moveTo(0, 0); ctx.lineTo(32 * flashScale, 0);
  ctx.moveTo(0, 0); ctx.lineTo(28 * flashScale, 5 * flashScale);
  ctx.moveTo(0, 0); ctx.lineTo(20 * flashScale, -8 * flashScale);
  ctx.stroke();

  ctx.restore();
}

export function drawEngineerShotgun(ctx, x, y, gunAngle, r, facingRight, recoilTimer = 0, isStowed = false, color = '#ffcc00', shouldHideHands = false, isWinnerReveal = false) {
  ctx.save();
  ctx.translate(x, y);

  const maxRecoil = (CONFIG.Engineer && CONFIG.Engineer.shotgunRecoilDuration) || 28;
  const p = (recoilTimer > 0) ? Math.max(0, Math.min(1.0, 1.0 - (recoilTimer / maxRecoil))) : 1.0;

  let recoilX = 0;
  let muzzleRiseAngle = 0;
  let pumpOffset = 0;
  let ejectionPortOpen = 0;

  if (recoilTimer > 0 && !isStowed) {
    if (p < 0.15) {
      // Phase 1: Explosive Kickback & Muzzle Rise (0.0 -> 0.15)
      const kickP = p / 0.15;
      const easeKick = Math.sin(kickP * Math.PI * 0.5);
      recoilX = -easeKick * 11.0;
      muzzleRiseAngle = -easeKick * 0.13;
    } else if (p < 0.52) {
      // Phase 2: Pump Slide Back & Shell Extraction (0.15 -> 0.52)
      const pumpP = (p - 0.15) / 0.37;
      const easePump = Math.sin(pumpP * Math.PI * 0.5);
      recoilX = -11.0 + pumpP * 4.5;
      muzzleRiseAngle = -0.13 * (1.0 - pumpP * 0.35);
      pumpOffset = -easePump * 10.0;
      ejectionPortOpen = easePump;
    } else if (p < 0.80) {
      // Phase 3: Pump Slam Forward Chambering (0.52 -> 0.80)
      const fwdP = (p - 0.52) / 0.28;
      const powerFwd = Math.pow(fwdP, 1.6);
      recoilX = -6.5 * (1.0 - powerFwd);
      muzzleRiseAngle = -0.084 * (1.0 - powerFwd);
      pumpOffset = -10.0 * (1.0 - powerFwd);
      ejectionPortOpen = 1.0 - powerFwd;
    } else {
      // Phase 4: Settle & Idle Damping (0.80 -> 1.0)
      const setP = (p - 0.80) / 0.20;
      recoilX = Math.sin(setP * Math.PI) * 0.8;
      muzzleRiseAngle = 0;
      pumpOffset = 0;
      ejectionPortOpen = 0;
    }
  }

  if (isWinnerReveal) {
    if (isStowed) {
      // Slung cleanly on the left back hip
      ctx.translate(-r * 0.45, r * 0.35);
      ctx.rotate(Math.PI * 0.28);
      ctx.scale(0.95, 0.95);
    } else {
      // Held proudly forward in right hand with heroic slight upward angle (-9 deg)
      ctx.translate(r * 0.95, r * 0.12);
      ctx.rotate(-0.16);
      ctx.scale(1.22, 1.22);
    }
  } else if (isStowed) {
    ctx.rotate(gunAngle + Math.PI); // Point to the back
    ctx.translate(r * 0.4, 0); // Position on the back
    ctx.rotate(Math.PI / 4); // Slung diagonally
    ctx.scale(0.95, 0.95); // Slightly smaller when stowed
  } else {
    ctx.rotate(gunAngle + (facingRight ? muzzleRiseAngle : -muzzleRiseAngle));
    ctx.translate(r + 6 + recoilX, 0); // Hold in front with kickback
  }

  if (!facingRight && !isWinnerReveal) {
    ctx.scale(1, -1);
  }

  const defaultShotgunScale = isStowed ? 1.0 : (isWinnerReveal ? 1.0 : 1.25);
  ctx.scale(defaultShotgunScale, defaultShotgunScale);

  drawEngineerShotgunModel(ctx, recoilTimer, isStowed, color, shouldHideHands, pumpOffset, ejectionPortOpen);

  // Render the explosive muzzle blast at the barrel tip during initial firing frames
  if (!isStowed && recoilTimer > (maxRecoil - 5) && !isWinnerReveal) {
    const blastP = (maxRecoil - recoilTimer) / 5;
    drawEngineerMuzzleBlast(ctx, 45, -2, blastP);
  }

  ctx.restore();
}

export function drawEngineerShotgunModel(ctx, recoilTimer, isStowed = false, color = '#ffcc00', shouldHideHands = false, pumpOffset = 0, ejectionPortOpen = 0) {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;

  // Rich TF2-inspired Palette
  const darkWalnut = '#5B2C0D';
  const midWalnut = '#78350F';
  const lightWalnut = '#9A4514';
  const gunmetalDark = '#232428';
  const gunmetalMid = '#3A3B40';
  const gunmetalLight = '#5B5C64';
  const steelBright = '#D1D5DB';
  const brassGold = '#D97706';

  // 1. Curved Pistol Grip & Stock (Rich Walnut Wood)
  ctx.fillStyle = midWalnut;
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-20, -2, -26, 12);
  ctx.lineTo(-21, 15);
  ctx.quadraticCurveTo(-14, 7, -6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wood Grain Highlights on Stock
  ctx.strokeStyle = lightWalnut;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-12, 1);
  ctx.quadraticCurveTo(-18, 2, -23, 11);
  ctx.stroke();

  // Dark shadow on grip underside
  ctx.strokeStyle = darkWalnut;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.quadraticCurveTo(-15, 7, -7, 4.5);
  ctx.stroke();

  // Metal Grip End-Cap
  ctx.fillStyle = gunmetalDark;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(-24, 12, 4.5, 3.5);
  ctx.fill();
  ctx.stroke();

  // 2. Trigger Guard & Trigger
  ctx.beginPath();
  ctx.arc(-1, 4, 3.2, 0, Math.PI);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Trigger Lever
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.quadraticCurveTo(-3, 4.5, -0.8, 5.2);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. Main Receiver (Beveled Gunmetal Steel)
  ctx.fillStyle = gunmetalMid;
  ctx.beginPath();
  ctx.moveTo(-12, -4.5); // top left
  ctx.lineTo(10, -4.5);  // top right
  ctx.lineTo(10, 4.2);   // bottom right
  ctx.lineTo(-6, 4.2);   // bottom left near trigger
  ctx.lineTo(-12, -1.5); // sloped back
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top Receiver Highlight Chamfer
  ctx.fillStyle = gunmetalLight;
  ctx.fillRect(-11, -4.5, 20, 1.2);

  // Ejection Port Cutout (Opens dynamically when pump is racked back!)
  const openW = 6.5 * (ejectionPortOpen || 0);
  ctx.fillStyle = '#141517'; // Deep internal receiver slot
  ctx.fillRect(0, -3.2, 8, 3.0);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(0, -3.2, 8, 3.0);

  if (ejectionPortOpen > 0.08) {
    // Visible silver bolt & brass chamber inside open ejection port
    ctx.fillStyle = steelBright;
    ctx.fillRect(0 + openW * 0.4, -2.8, 4.5, 2.2); // Silver bolt carrier
    ctx.fillStyle = brassGold;
    ctx.fillRect(0, -2.5, Math.max(1, openW * 0.6), 1.8); // Brass 12-gauge rim
  } else {
    // Closed silver bolt extractor plate
    ctx.fillStyle = steelBright;
    ctx.fillRect(1, -2.8, 6.5, 2.2);
  }

  // Receiver Assembly Pins & Safety Switch
  ctx.fillStyle = '#18191B';
  ctx.beginPath(); ctx.arc(7, -2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, 2.2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-8, -1.2, 1.1, 0, Math.PI * 2); ctx.fill();

  // 4. Barrels (Main Barrel & Under-Barrel Magazine Tube)
  ctx.fillStyle = gunmetalDark;

  // Main Top Barrel
  ctx.beginPath();
  ctx.rect(10, -4.2, 33, 4.5);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top Barrel Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(10, -4.2, 32, 1.0);

  // Heat Shield / Ventilation Rib Slats on top of barrel
  ctx.fillStyle = gunmetalLight;
  for (let rx = 14; rx <= 38; rx += 5) {
    ctx.fillRect(rx, -5.2, 2.5, 1.2);
  }

  // Under-Barrel Magazine Tube
  ctx.fillStyle = '#1D1E22';
  ctx.beginPath();
  ctx.rect(10, 0.5, 24, 3.6);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Barrel Clamp Bracket (Connects top barrel & magazine tube)
  ctx.fillStyle = gunmetalLight;
  ctx.fillRect(32, -4.5, 2.5, 8.8);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(32, -4.5, 2.5, 8.8);

  // Brass Bead Front Sight on muzzle
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(41, -5.2, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Reinforced Muzzle Choke Ring (TF2 Blaze Orange & Brass Band)
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(42.5, -4.2, 2.5, 4.5);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(42.5, -4.2, 2.5, 4.5);

  // 5. Pump Handle (Sliding Walnut Forend with Finger Grooves)
  const pumpX = 11 + pumpOffset;
  ctx.fillStyle = midWalnut;
  ctx.beginPath();
  ctx.moveTo(pumpX, 0.2);
  ctx.lineTo(pumpX + 17, 0.2);
  ctx.lineTo(pumpX + 15, 5.8);
  ctx.lineTo(pumpX + 2, 5.8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Pump Ribbed Grip Notches (Tactical Finger Grooves)
  ctx.strokeStyle = '#271202';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let gx = 4; gx <= 13; gx += 2.2) {
    ctx.moveTo(pumpX + gx, 0.6);
    ctx.lineTo(pumpX + gx - 0.6, 5.2);
  }
  ctx.stroke();

  // 6. Proportional Hands on Shotgun Grip & Pump
  if (!isStowed && !shouldHideHands) {
    // Rear Grip Hand (firmly wrapped on pistol grip)
    ctx.save();
    ctx.beginPath();
    ctx.arc(-8, 3, getHandSize(6.8), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // Finger crease shading
    ctx.beginPath();
    ctx.arc(-8, 1.8, getHandSize(4.8), 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

    // Front Support Hand (holding and sliding with the wooden pump forend!)
    ctx.save();
    ctx.beginPath();
    ctx.arc(pumpX + 8.5, 3.2, getHandSize(6.5), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // Finger crease shading
    ctx.beginPath();
    ctx.arc(pumpX + 8.5, 2.0, getHandSize(4.6), 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function drawEngineerWrench(ctx, x, y, gunAngle, r, facingRight, timer, isStowed = false, color = '#ffcc00', slashFadeTimer = 0, shouldHideHands = false, isWinnerReveal = false) {
  ctx.save();
  ctx.translate(x, y);
  
  const swipeArc = (150 * Math.PI) / 180; // 150° wide kinetic swing arc
  
  if (isWinnerReveal) {
    if (isStowed) {
      // Holstered cleanly on left back hip well below the hard hat
      ctx.translate(-r * 0.50, r * 0.35);
      ctx.rotate(-Math.PI * 0.32);
      ctx.scale(0.85, 0.85);
    } else {
      // Held forward in right hand
      ctx.translate(r * 0.95, r * 0.12);
      ctx.rotate(-0.20);
      ctx.scale(1.0, 1.0);
    }
  } else if (isStowed) {
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
    
    let showSlash = false;
    let slashProgress = 1.0;
    let slashAlpha = 0.0;
    
    if (timer > 0) {
      const maxTimer = CONFIG.Engineer?.wrenchSwipeDuration || 16;
      const p = Math.min(1.0, Math.max(0.0, 1.0 - (timer / maxTimer)));
      
      let swingT = 0;
      let wristOffset = 0;
      
      if (p < 0.20) {
        // Phase 1: Windup & Tension (Pull arm back with anticipation)
        const wP = p / 0.20;
        const easeW = Math.sin(wP * Math.PI * 0.5);
        swingT = -easeW * 0.18; // Pulls back -18%
        wristOffset = -0.60 * easeW;
      } else if (p < 0.65) {
        // Phase 2: High-Speed Violent Downward Chop
        const sP = (p - 0.20) / 0.45;
        const powerCurve = Math.pow(sP, 1.75);
        swingT = -0.18 + 1.18 * powerCurve; // Violent accelerated arc
        wristOffset = -0.60 + 1.10 * Math.sin(sP * Math.PI); // Snapping whip
      } else if (p < 0.82) {
        // Phase 3: Heavy Impact Shudder & Mechanical Clank Deceleration
        const hP = (p - 0.65) / 0.17;
        swingT = 1.0 + Math.sin(hP * Math.PI * 4) * 0.025; // Clank shudder
        wristOffset = 0.50 * (1 - hP);
      } else {
        // Phase 4: Follow-Through Recovery Ease
        const rP = (p - 0.82) / 0.18;
        const easeR = Math.sin(rP * Math.PI * 0.5);
        swingT = 1.0 * (1 - easeR);
        wristOffset = 0;
      }
      
      armAngleOffset = (-swipeArc * 0.5 + swipeArc * swingT) * flipDir;
      wristAngleOffset = wristOffset * flipDir;
      
      showSlash = true;
      slashProgress = Math.min(1.0, Math.max(0.0, (swingT + 0.18) / 1.18));
      slashAlpha = (p < 0.20) ? (p / 0.20) : (p > 0.82 ? (1 - (p - 0.82) / 0.18) : 1.0);
    } else {
      // Idle/Resting position — held forward pointed at target
      armAngleOffset = 0;
      wristAngleOffset = 0;
      
      if (slashFadeTimer > 0) {
        showSlash = true;
        slashProgress = 1.0; // Fully extended
        slashAlpha = Math.pow(slashFadeTimer / 12, 1.4); // Smooth power fade
      }
    }
    
    // ── Dynamic Needle-Sharp Double-Tapered Industrial Crescent Slash Arc ──
    if (showSlash && slashAlpha > 0.01) {
      ctx.save();
      const startAngle = gunAngle + (-swipeArc * 0.5) * flipDir;
      const sweepAngle = (swipeArc * slashProgress) * flipDir;
      const endAngle = startAngle + sweepAngle;
      
      const outerR = r + 5 + 46;
      const innerR = r + 5 + 14;
      const midR = (outerR + innerR) * 0.5;
      const halfThick = (outerR - innerR) * 0.5;
      
      const steps = 24;
      const stepAngle = sweepAngle / steps;
      
      // 1. Broad Outer Ambient Industrial Heat Shockwave
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + i * stepAngle;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
        const rad = midR + (halfThick + 8) * taper;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAngle + i * stepAngle;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
        const rad = midR - (halfThick + 8) * taper;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(234, 88, 12, ${(0.30 * slashAlpha).toFixed(3)})`;
      ctx.fill();
      ctx.restore();
      
      // 2. Intense Golden-Amber Industrial Crescent Body
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + i * stepAngle;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
        const rad = midR + halfThick * taper;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAngle + i * stepAngle;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
        const rad = midR - halfThick * taper;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      
      const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
      grad.addColorStop(0,   `rgba(245, 158, 11, 0)`);
      grad.addColorStop(0.3, `rgba(245, 158, 11, ${(0.80 * slashAlpha).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${(0.95 * slashAlpha).toFixed(3)})`);
      grad.addColorStop(0.7, `rgba(245, 158, 11, ${(0.85 * slashAlpha).toFixed(3)})`);
      grad.addColorStop(1,   `rgba(234, 88, 12, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      
      // 3. Razor White Cutting Core Centerline
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + i * stepAngle;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.25);
        const rad = midR + 2.2 * taper;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAngle + i * stepAngle;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.25);
        const rad = midR - 2.2 * taper;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.95 * slashAlpha).toFixed(3)})`;
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }
    
    // Rotate arm from shoulder
    ctx.rotate(gunAngle + armAngleOffset);
    
    // Move to hand grip position
    ctx.translate(r + 5, 0);

    // Draw proportional Hand circle holding wrench handle base (scaled similar to John Wick getHandSize(6.8))
    if (!shouldHideHands) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, getHandSize(6.8), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Subtle finger crease shading
      ctx.beginPath();
      ctx.arc(0, -1.2, getHandSize(4.8), 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    // Apply wrist rotation
    ctx.rotate(wristAngleOffset);
    
    if (!facingRight) {
      ctx.scale(1, -1);
    }
  }
  
  const colors = Engineer_WEAPON_GRAPHICS.colors;
  
  // Scale wrench to match weapon proportions
  ctx.scale(1.5, 1.5);
  
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1;
  
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
  
  ctx.restore();
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
  const { x, y, r, gunAngle, isBuilding, buildProgress, owner, level = 1 } = turret;
  
  let zOffset = turret.z || 0;
  if (isBuilding) {
    const engineer = state.fighters && state.fighters[owner];
    if (engineer && engineer.z) {
      zOffset = engineer.z;
    }
  }

  ctx.save();
  ctx.translate(x, y - zOffset);

  const bp = (isBuilding && buildProgress !== undefined) ? buildProgress : 1;

  function pieceAlpha(threshold) {
    if (bp >= threshold + 0.08) return 1;
    if (bp < threshold) return 0;
    return (bp - threshold) / 0.08;
  }

  const s = r / 20;
  ctx.scale(s, s);

  const isHit = turret.hitFlashTimer > 0;

  // ═══════════════════════════════════════════
  // BUILD ASSEMBLY EFFECTS (during construction)
  // ═══════════════════════════════════════════
  if (isBuilding && bp < 1) {
    const now = performance.now();

    // Welding sparks spraying from build center
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
      ctx.fillStyle = Math.random() > 0.3 ? '#FFAA00' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 170, 0, ${sparkAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Pulsing orange construction glow at center
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

    // Floating metal shards / debris around build site
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
  }

  // ═══════════════════════════════════════════
  // PHASE 1: TRIPOD LEGS & REINFORCEMENTS
  // ═══════════════════════════════════════════
  const legColor = isHit ? '#999' : '#2A2A2E';
  const legStroke = '#111';

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

    // Leg body (longer and reinforced on higher levels)
    const legLen = (level === 3) ? 25 : ((level === 2) ? 23 : 21);
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(4.5, legLen);
    ctx.lineTo(-4.5, legLen);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hydraulic strut on Level 2 and Level 3
    if (level >= 2) {
      ctx.fillStyle = isHit ? '#CCC' : '#5A5E6B';
      ctx.fillRect(-1.5, 4, 3, legLen - 9);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-1.5, 4, 3, legLen - 9);
    }

    // Foot pad
    const padW = (level === 3) ? 8 : 6;
    ctx.fillStyle = isHit ? '#AAA' : '#1A1A1E';
    ctx.beginPath();
    ctx.ellipse(0, legLen + 1, padW, 3.5, 0, 0, Math.PI * 2);
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

    // Central hub
    const hubR = (level === 3) ? 8.5 : ((level === 2) ? 7.5 : 6.5);
    ctx.fillStyle = isHit ? '#BBB' : '#333';
    ctx.beginPath();
    ctx.arc(0, 0, hubR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pivot collar ring
    ctx.fillStyle = isHit ? '#CCC' : '#555';
    ctx.beginPath();
    ctx.arc(0, 0, hubR - 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // ROTATING TURRET HEAD
  // ═══════════════════════════════════════════
  ctx.rotate(gunAngle);

  const recoilTimer = turret.recoilTimer || 0;
  let recoilOffset = 0;
  if (recoilTimer > 0) {
    recoilOffset = -(recoilTimer / 10) * ((level === 3) ? 8 : 6);
  }

  // ═══════════════════════════════════════════
  // PHASE 3: AMMO CASING & DRUMS
  // ═══════════════════════════════════════════
  const drumAlpha = pieceAlpha(0.35);
  if (drumAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = drumAlpha;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;

    if (level === 1) {
      // ── Level 1: Compact Rear Cylindrical Ammo Drum ──
      const drumR = 12;
      ctx.fillStyle = isHit ? '#888' : '#2A2A2E';
      ctx.beginPath();
      ctx.arc(-4, 0, drumR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blue / Team color top dome
      ctx.fillStyle = isHit ? '#99BBEE' : '#1D4ED8';
      ctx.beginPath();
      ctx.arc(-4, 0, drumR - 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center pivot bolt
      ctx.fillStyle = isHit ? '#DDD' : '#111';
      ctx.beginPath();
      ctx.arc(-4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (level === 2) {
      // ── Level 2: Dual Ammo Drums with Side C-Arms ──
      const armColor = isHit ? '#AA8888' : '#5A3030';
      ctx.strokeStyle = armColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-4, 0, 18, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-4, 0, 18, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;

      // Large Ammo Drum
      ctx.fillStyle = isHit ? '#888' : '#2A2A2E';
      ctx.beginPath();
      ctx.arc(-4, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Drum segmented ridges
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
    } else {
      // ── Level 3: Heavy Bottom-Slung Ammo Drum + Belt Chute ──
      const drumR = 17;
      ctx.fillStyle = isHit ? '#888' : '#1F2024';
      ctx.beginPath();
      ctx.arc(-5, 0, drumR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Heavy ammo link feed belt entering gun
      ctx.fillStyle = isHit ? '#DDD' : '#4B5563';
      ctx.fillRect(4, -3, 8, 6);
      ctx.strokeRect(4, -3, 8, 6);

      // Inner metallic blue drum core
      ctx.fillStyle = isHit ? '#99CCFF' : '#1E40AF';
      ctx.beginPath();
      ctx.arc(-5, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center heavy hub
      ctx.fillStyle = isHit ? '#EEE' : '#111';
      ctx.beginPath();
      ctx.arc(-5, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // PHASE 4: GUN MOUNT & BARRELS
  // ═══════════════════════════════════════════
  const barrelAlpha = pieceAlpha(0.55);
  if (barrelAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = barrelAlpha;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.translate(recoilOffset, 0);

    if (level === 1) {
      // ── Level 1: Single Center Barrel Cannon ──
      ctx.fillStyle = isHit ? '#999' : '#333';
      ctx.fillRect(4, -5, 10, 10);
      ctx.strokeRect(4, -5, 10, 10);

      const barrelStartX = 14;
      const barrelLen = 16;
      const barrelH = 5;

      // Single centered barrel
      ctx.fillStyle = isHit ? '#AAA' : '#3A3A3E';
      ctx.fillRect(barrelStartX, -barrelH / 2, barrelLen, barrelH);
      ctx.strokeRect(barrelStartX, -barrelH / 2, barrelLen, barrelH);

      // Barrel clamp ring
      ctx.fillStyle = isHit ? '#BB8888' : '#8B2020';
      ctx.fillRect(barrelStartX + 5, -barrelH / 2 - 1, 3, barrelH + 2);
      ctx.strokeRect(barrelStartX + 5, -barrelH / 2 - 1, 3, barrelH + 2);

      // Muzzle bore tip
      const muzzleX = barrelStartX + barrelLen;
      ctx.fillStyle = isHit ? '#777' : '#111';
      ctx.beginPath();
      ctx.arc(muzzleX, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (level === 2) {
      // ── Level 2: Dual Rotary Gatling Barrels ──
      ctx.fillStyle = isHit ? '#999' : '#333';
      ctx.fillRect(6, -6, 12, 12);
      ctx.strokeRect(6, -6, 12, 12);

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
      ctx.fillStyle = isHit ? '#BB8888' : '#8B2020';
      ctx.fillRect(barrelStartX + 4, -barrelSpacing - 4, 3, 7);
      ctx.strokeRect(barrelStartX + 4, -barrelSpacing - 4, 3, 7);
      ctx.fillRect(barrelStartX + 12, -barrelSpacing - 4, 3, 7);
      ctx.strokeRect(barrelStartX + 12, -barrelSpacing - 4, 3, 7);

      ctx.fillRect(barrelStartX + 4, barrelSpacing - 3, 3, 7);
      ctx.strokeRect(barrelStartX + 4, barrelSpacing - 3, 3, 7);
      ctx.fillRect(barrelStartX + 12, barrelSpacing - 3, 3, 7);
      ctx.strokeRect(barrelStartX + 12, barrelSpacing - 3, 3, 7);

      // Muzzle bore tips
      const muzzleX = barrelStartX + barrelLen;
      ctx.fillStyle = isHit ? '#777' : '#111';
      ctx.beginPath();
      ctx.arc(muzzleX, -barrelSpacing - 1.5, 1.5, 0, Math.PI * 2);
      ctx.arc(muzzleX, -barrelSpacing + 1.5, 1.5, 0, Math.PI * 2);
      ctx.arc(muzzleX, barrelSpacing - 1.5, 1.5, 0, Math.PI * 2);
      ctx.arc(muzzleX, barrelSpacing + 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ── Level 3: Dual Heavy Extended Gatling Miniguns ──
      ctx.fillStyle = isHit ? '#999' : '#26282E';
      ctx.fillRect(6, -7, 14, 14);
      ctx.strokeRect(6, -7, 14, 14);

      const barrelStartX = 20;
      const barrelLen = 24;
      const barrelSpacing = 5.5;

      // Heavy Minigun Tubes
      ctx.fillStyle = isHit ? '#CCC' : '#33353C';
      ctx.fillRect(barrelStartX, -barrelSpacing - 3.5, barrelLen, 3.5);
      ctx.strokeRect(barrelStartX, -barrelSpacing - 3.5, barrelLen, 3.5);
      ctx.fillRect(barrelStartX, -barrelSpacing, barrelLen, 3.5);
      ctx.strokeRect(barrelStartX, -barrelSpacing, barrelLen, 3.5);

      ctx.fillRect(barrelStartX, barrelSpacing - 3.5, barrelLen, 3.5);
      ctx.strokeRect(barrelStartX, barrelSpacing - 3.5, barrelLen, 3.5);
      ctx.fillRect(barrelStartX, barrelSpacing, barrelLen, 3.5);
      ctx.strokeRect(barrelStartX, barrelSpacing, barrelLen, 3.5);

      // Reinforced Steel Clamps
      ctx.fillStyle = isHit ? '#DDD' : '#4B4D56';
      ctx.fillRect(barrelStartX + 5, -barrelSpacing - 4.5, 3.5, 8);
      ctx.strokeRect(barrelStartX + 5, -barrelSpacing - 4.5, 3.5, 8);
      ctx.fillRect(barrelStartX + 15, -barrelSpacing - 4.5, 3.5, 8);
      ctx.strokeRect(barrelStartX + 15, -barrelSpacing - 4.5, 3.5, 8);

      ctx.fillRect(barrelStartX + 5, barrelSpacing - 3.5, 3.5, 8);
      ctx.strokeRect(barrelStartX + 5, barrelSpacing - 3.5, 3.5, 8);
      ctx.fillRect(barrelStartX + 15, barrelSpacing - 3.5, 3.5, 8);
      ctx.strokeRect(barrelStartX + 15, barrelSpacing - 3.5, 3.5, 8);

      // Heavy Flash Hiders / Muzzle Brakes
      const muzzleX = barrelStartX + barrelLen;
      ctx.fillStyle = isHit ? '#EEE' : '#111';
      ctx.beginPath();
      ctx.arc(muzzleX, -barrelSpacing - 1.7, 1.8, 0, Math.PI * 2);
      ctx.arc(muzzleX, -barrelSpacing + 1.7, 1.8, 0, Math.PI * 2);
      ctx.arc(muzzleX, barrelSpacing - 1.7, 1.8, 0, Math.PI * 2);
      ctx.arc(muzzleX, barrelSpacing + 1.7, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // PHASE 5: SENSOR HEAD / TOP ROCKET POD
  // ═══════════════════════════════════════════
  const topModuleAlpha = pieceAlpha(0.75);
  if (topModuleAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = topModuleAlpha;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.translate(recoilOffset, 0);

    if (level === 1) {
      // ── Level 1: Compact Single Sensor Optic ──
      const headX = -2, headY = -12, headW = 10, headH = 8;
      ctx.fillStyle = isHit ? '#FF8888' : '#8B2020';
      ctx.fillRect(headX, headY, headW, headH);
      ctx.strokeRect(headX, headY, headW, headH);

      // Single lens optic
      ctx.fillStyle = isHit ? '#555' : '#0A0A0A';
      ctx.beginPath();
      ctx.arc(headX + 5, headY + 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red laser beam
      ctx.beginPath();
      ctx.moveTo(headX + headW + 22, 0);
      ctx.lineTo(headX + headW + 70, 0);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (level === 2) {
      // ── Level 2: 2x2 Sensor Lens Head & Orange Cables ──
      const headX = 0, headY = -14, headW = 14, headH = 10;
      ctx.fillStyle = isHit ? '#FF8888' : '#8B2020';
      ctx.fillRect(headX, headY, headW, headH);
      ctx.strokeRect(headX, headY, headW, headH);

      // 4 sensor lenses (2x2 grid)
      ctx.fillStyle = isHit ? '#555' : '#0A0A0A';
      ctx.beginPath();
      ctx.arc(headX + 4, headY + 3.5, 2, 0, Math.PI * 2);
      ctx.arc(headX + 10, headY + 3.5, 2, 0, Math.PI * 2);
      ctx.arc(headX + 4, headY + 7.5, 2, 0, Math.PI * 2);
      ctx.arc(headX + 10, headY + 7.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Orange Cables
      ctx.strokeStyle = isHit ? '#FFCC66' : '#CC7722';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headX + 2, headY + headH);
      ctx.quadraticCurveTo(-8, -6, -10, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(headX + headW - 2, headY + headH);
      ctx.quadraticCurveTo(14, -4, 12, 4);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#111';

      // Laser
      ctx.beginPath();
      ctx.moveTo(38, 0);
      ctx.lineTo(100, 0);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      // ── Level 3: Heavy Quad Rocket Pod / Missile Launcher Housing ──
      const podX = -3;
      const podY = -24;
      const podW = 22;
      const podH = 15;

      // Rocket Pod Swivel Mount Bracket
      ctx.fillStyle = '#2A2B30';
      ctx.fillRect(podX + 4, podY + podH, 8, 5);
      ctx.strokeRect(podX + 4, podY + podH, 8, 5);

      // Main Missile Box Housing (Dark Heavy Gunmetal)
      ctx.fillStyle = isHit ? '#AAA' : '#222328';
      ctx.fillRect(podX, podY, podW, podH);
      ctx.strokeRect(podX, podY, podW, podH);

      // Top beveled visor edge
      ctx.fillStyle = isHit ? '#CCC' : '#3E4048';
      ctx.fillRect(podX, podY, podW, 2.5);

      // Stenciled white warning label plate on side
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(podX + 2, podY + 5, 5, 4);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(podX + 2, podY + 5, 5, 4);

      // 4 Circular Rocket Launch Tubes (2x2 Quad Pod)
      const tubeStartX = podX + 13;
      const tubeY1 = podY + 4.5;
      const tubeY2 = podY + 10.5;

      // Tube 1 (Top Left) & Tube 2 (Top Right)
      ctx.fillStyle = '#0F1012';
      ctx.beginPath();
      ctx.arc(tubeStartX, tubeY1, 2.6, 0, Math.PI * 2);
      ctx.arc(tubeStartX + 5.5, tubeY1, 2.6, 0, Math.PI * 2);
      ctx.arc(tubeStartX, tubeY2, 2.6, 0, Math.PI * 2);
      ctx.arc(tubeStartX + 5.5, tubeY2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Red Rocket Warhead Cones inside tubes
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(tubeStartX, tubeY1, 1.4, 0, Math.PI * 2);
      ctx.arc(tubeStartX + 5.5, tubeY1, 1.4, 0, Math.PI * 2);
      ctx.arc(tubeStartX, tubeY2, 1.4, 0, Math.PI * 2);
      ctx.arc(tubeStartX + 5.5, tubeY2, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Heavy black wiring cables from Rocket Pod down to chassis
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(podX + 1, podY + podH - 2);
      ctx.quadraticCurveTo(-12, -8, -6, 0);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // PHASE 6: HIGH-INTENSITY SENTRY TARGETING LASER
  // ═══════════════════════════════════════════
  if (!isBuilding || bp >= 0.85) {
    const laserAlpha = pieceAlpha(0.80);
    if (laserAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = laserAlpha;
      ctx.translate(recoilOffset, 0);

      const startX = (level === 3) ? 44 : ((level === 2) ? 38 : 30);
      const targetDist = (turret.laserTargetDist || 350) / s;
      const laserLen = Math.max(80, targetDist - startX);
      const isLocked = Boolean(turret._hasDetectedTarget);

      // 1. Wide Diffused Atmospheric Laser Halo
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + laserLen, 0);
      ctx.strokeStyle = isLocked ? 'rgba(255, 10, 40, 0.35)' : 'rgba(255, 30, 60, 0.22)';
      ctx.lineWidth = (level === 3) ? 6.0 : ((level === 2) ? 4.8 : 3.6);
      ctx.stroke();

      // 2. High-Saturation Crimson Laser Beam Core
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + laserLen, 0);
      ctx.strokeStyle = isLocked ? 'rgba(255, 30, 60, 0.95)' : 'rgba(255, 50, 80, 0.80)';
      ctx.lineWidth = (level === 3) ? 2.4 : ((level === 2) ? 2.0 : 1.6);
      ctx.stroke();

      // 3. White-Hot Intense Inner Specular Core
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + laserLen, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = (level === 3) ? 1.1 : 0.8;
      ctx.stroke();

      // 4. Optical Emitter Flare at the Lens/Muzzle
      ctx.fillStyle = 'rgba(255, 40, 70, 0.65)';
      ctx.beginPath();
      ctx.arc(startX, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(startX, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 5. Target Laser Dot & Reticle Brackets at beam endpoint
      const endX = startX + laserLen;
      ctx.fillStyle = 'rgba(255, 20, 50, 0.40)';
      ctx.beginPath();
      ctx.arc(endX, 0, 6.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 40, 70, 0.95)';
      ctx.beginPath();
      ctx.arc(endX, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(endX, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Target lock pulse brackets
      if (isLocked) {
        const now = performance.now();
        const pulse = 1.0 + Math.sin(now / 70) * 0.22;
        const crossR = 7.5 * pulse;
        ctx.strokeStyle = 'rgba(255, 50, 80, 0.90)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Crosshair reticle ticks
        ctx.moveTo(endX - crossR, 0);
        ctx.lineTo(endX - crossR + 3, 0);
        ctx.moveTo(endX + crossR - 3, 0);
        ctx.lineTo(endX + crossR, 0);
        ctx.moveTo(endX, -crossR);
        ctx.lineTo(endX, -crossR + 3);
        ctx.moveTo(endX, crossR - 3);
        ctx.lineTo(endX, crossR);
        ctx.stroke();
      }

      ctx.restore();
    }
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

// ─────────────────────────────────────────────
// TF2 DISPENSER SUPPORT BUILDING RENDERING
// ─────────────────────────────────────────────

export function drawDispenser(ctx, dispenser) {
  const { x, y, r = 20, isBuilding, buildProgress, owner, hp, maxHp = 160 } = dispenser;

  let zOffset = dispenser.z || 0;
  if (isBuilding) {
    const engineer = state.fighters && state.fighters[owner];
    if (engineer && engineer.z) {
      zOffset = engineer.z;
    }
  }

  ctx.save();
  ctx.translate(x, y - zOffset);

  const bp = (isBuilding && buildProgress !== undefined) ? buildProgress : 1;

  function pieceAlpha(threshold) {
    if (bp >= threshold + 0.08) return 1;
    if (bp < threshold) return 0;
    return (bp - threshold) / 0.08;
  }

  const s = r / 20;
  ctx.scale(s, s);

  const isHit = dispenser.hitFlashTimer > 0;
  const isDispensing = Boolean(dispenser.tetheredTargets && dispenser.tetheredTargets.length > 0);
  const now = performance.now();

  // ═══════════════════════════════════════════
  // BUILD ASSEMBLY EFFECTS (during construction)
  // ═══════════════════════════════════════════
  if (isBuilding && bp < 1) {
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
      ctx.fillStyle = Math.random() > 0.3 ? '#FFAA00' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 170, 0, ${sparkAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

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
  }

  // ═══════════════════════════════════════════
  // AMBIENT HEALING FLOOR RING (when active)
  // ═══════════════════════════════════════════
  if (bp >= 1 && isDispensing) {
    const pulseT = (now % 1600) / 1600;
    const ringRadius = 24 + pulseT * 14;
    const ringAlpha = (1 - pulseT) * 0.45;

    ctx.save();
    ctx.strokeStyle = `rgba(0, 255, 150, ${ringAlpha})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Floor aura glow
    const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 26);
    aura.addColorStop(0, 'rgba(0, 255, 160, 0.18)');
    aura.addColorStop(1, 'rgba(0, 255, 160, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TF2 RED TEAM DISPENSER — DETAILED REPRODUCTION (PROVISIONS STATION)
  // ═══════════════════════════════════════════════════════════════════════════

  // Shared TF2 RED Palette
  const redMain = isHit ? '#D08888' : '#B8383B';
  const redLight = isHit ? '#E8AAAA' : '#D94B4E';
  const redDark = isHit ? '#9A5555' : '#781D20';
  const steelDark = isHit ? '#888888' : '#2A2B30';
  const steelMid = isHit ? '#AAAAAA' : '#4B4D56';
  const steelLight = isHit ? '#CCCCCC' : '#8B8E98';
  const copperMain = isHit ? '#DDBB99' : '#C05621';
  const copperLight = isHit ? '#FFCCAA' : '#EA580C';
  const copperDark = isHit ? '#995533' : '#7C2D12';

  // ── PHASE 1: BASE FRAME & CAST IRON FEET (0%+) ──
  const baseAlpha = pieceAlpha(0.0);
  if (baseAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = baseAlpha;

    // Heavy cast iron base footprint
    ctx.fillStyle = steelDark;
    ctx.fillRect(-17, 18, 34, 8);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-17, 18, 34, 8);

    // 4 Corner rubber/steel anchor footings
    ctx.fillStyle = '#18191C';
    ctx.fillRect(-19, 22, 6, 5);
    ctx.strokeRect(-19, 22, 6, 5);
    ctx.fillRect(13, 22, 6, 5);
    ctx.strokeRect(13, 22, 6, 5);

    ctx.restore();
  }

  // ── PHASE 2: LEFT SIDE COPPER GAS TANK & ROUND PRESSURE GAUGE (15%+) ──
  const tankAlpha = pieceAlpha(0.15);
  if (tankAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = tankAlpha;

    // 1. Copper Cylinder Tank (Left side)
    const tankGrad = ctx.createLinearGradient(-23, 0, -14, 0);
    tankGrad.addColorStop(0, copperDark);
    tankGrad.addColorStop(0.35, copperLight);
    tankGrad.addColorStop(0.75, copperMain);
    tankGrad.addColorStop(1, copperDark);

    ctx.fillStyle = tankGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -6);
    ctx.lineTo(-14, -6);
    ctx.lineTo(-14, 15);
    ctx.lineTo(-22, 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Rounded tank dome top
    ctx.beginPath();
    ctx.ellipse(-18, -6, 4, 3, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Tank mounting brackets (dark steel straps)
    ctx.fillStyle = steelMid;
    ctx.fillRect(-23, -2, 9.5, 2.2);
    ctx.strokeRect(-23, -2, 9.5, 2.2);
    ctx.fillRect(-23, 9, 9.5, 2.2);
    ctx.strokeRect(-23, 9, 9.5, 2.2);

    // 2. High-Pressure Analog Dial Gauge (Above copper tank)
    const dialX = -19;
    const dialY = -17;
    const dialR = 6.8;

    // Outer metal gauge casing
    ctx.fillStyle = steelDark;
    ctx.beginPath();
    ctx.arc(dialX, dialY, dialR + 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // White porcelain dial face
    ctx.fillStyle = '#F3F4F6';
    ctx.beginPath();
    ctx.arc(dialX, dialY, dialR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Dial tick marks
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.8;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(dialX + Math.cos(a) * (dialR - 2.2), dialY + Math.sin(a) * (dialR - 2.2));
      ctx.lineTo(dialX + Math.cos(a) * (dialR - 0.6), dialY + Math.sin(a) * (dialR - 0.6));
      ctx.stroke();
    }

    // Black needle pointing to ~10 o'clock with quiver
    const needleRot = -2.1 + (isDispensing ? Math.sin(now / 150) * 0.1 : 0);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(dialX, dialY);
    ctx.lineTo(dialX + Math.cos(needleRot) * (dialR - 1.2), dialY + Math.sin(needleRot) * (dialR - 1.2));
    ctx.stroke();

    // Connector pipe into main chassis
    ctx.fillStyle = steelMid;
    ctx.fillRect(-17, -10, 4, 4.5);
    ctx.strokeRect(-17, -10, 4, 4.5);

    ctx.restore();
  }

  // ── PHASE 3: RIGHT SIDE AMMO FEEDER LINK CHAIN CHUTE (25%+) ──
  const chainAlpha = pieceAlpha(0.25);
  if (chainAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = chainAlpha;

    // Flexible ammo link chain links winding down right side
    const linkNodes = [
      { x: 15, y: -19 },
      { x: 17, y: -14 },
      { x: 19, y: -9 },
      { x: 19.5, y: -4 },
      { x: 18, y: 1 },
      { x: 21, y: 6 },
      { x: 20, y: 11 },
      { x: 17, y: 16 }
    ];

    // Metallic guide bracket holding chain
    ctx.fillStyle = steelMid;
    ctx.fillRect(14, -6, 8, 3.5);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(14, -6, 8, 3.5);

    // Draw individual hexagonal ammo chain links
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.0;
    for (let i = 0; i < linkNodes.length; i++) {
      const node = linkNodes[i];
      ctx.fillStyle = (i % 2 === 0) ? '#1E2024' : '#374151';
      ctx.beginPath();
      ctx.rect(node.x - 2.5, node.y - 2.5, 5, 5);
      ctx.fill();
      ctx.stroke();

      // Inner link hole
      ctx.fillStyle = '#0F1012';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── PHASE 4: MAIN RED TOWER CASING & LOWER HOPPER (35%+) ──
  const towerAlpha = pieceAlpha(0.35);
  if (towerAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = towerAlpha;

    // 1. Main RED Industrial Body Tower
    const bodyGrad = ctx.createLinearGradient(-15, 0, 15, 0);
    bodyGrad.addColorStop(0, redDark);
    bodyGrad.addColorStop(0.25, redLight);
    bodyGrad.addColorStop(0.65, redMain);
    bodyGrad.addColorStop(1, redDark);

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-15, -28, 30, 48);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-15, -28, 30, 48);

    // Beveled highlight line on left edge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(-14, -27, 2, 46);

    // 2. Lower Open Scrap / Ammo Hopper Bin
    const hopperGrad = ctx.createLinearGradient(-15, 11, 15, 21);
    hopperGrad.addColorStop(0, '#8E2225');
    hopperGrad.addColorStop(0.5, '#B23235');
    hopperGrad.addColorStop(1, '#6B171A');

    // Angled forward hopper flap
    ctx.fillStyle = hopperGrad;
    ctx.beginPath();
    ctx.moveTo(-16, 11);
    ctx.lineTo(16, 11);
    ctx.lineTo(15, 23);
    ctx.lineTo(-15, 23);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Scrap tools & pipes poking out of the hopper
    ctx.fillStyle = '#2D3037';
    // Left angled pipe
    ctx.beginPath();
    ctx.moveTo(-16, 11);
    ctx.lineTo(-21, 6);
    ctx.lineTo(-18, 4);
    ctx.lineTo(-13, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right metal chunk / rocket shell tip
    ctx.fillStyle = '#3E424B';
    ctx.beginPath();
    ctx.moveTo(9, 11);
    ctx.lineTo(12, 5);
    ctx.lineTo(15, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center wrench head
    ctx.fillStyle = '#5A5E6B';
    ctx.beginPath();
    ctx.moveTo(-4, 11);
    ctx.lineTo(-2, 7);
    ctx.lineTo(2, 7);
    ctx.lineTo(4, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Stenciled RED Bomb Emblem on lower hopper
    ctx.save();
    ctx.translate(0, 17.5);
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.8;

    // Small cartoon bomb circle
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bomb fuse & spark
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -3.8);
    ctx.lineTo(1.5, -5.5);
    ctx.stroke();

    // "RED" text inside bomb
    ctx.fillStyle = '#B8383B';
    ctx.font = 'bold 3.2px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RED', 0, 0.2);
    ctx.restore();

    ctx.restore();
  }

  // ── PHASE 5: MIDDLE CONTROL CONSOLE & MEDICAL SYRINGE TRAY (55%+) ──
  const midAlpha = pieceAlpha(0.55);
  if (midAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = midAlpha;

    // 1. Protruding Middle Control Box
    ctx.fillStyle = redMain;
    ctx.fillRect(-15, -2, 30, 13);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-15, -2, 30, 13);

    // Right half: Dark gray ventilation grille with 4 horizontal cooling slats
    ctx.fillStyle = '#1A1C20';
    ctx.fillRect(-3, 0, 16, 8.5);
    ctx.strokeRect(-3, 0, 16, 8.5);

    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 0.9;
    for (let vy = 2; vy <= 7; vy += 1.8) {
      ctx.beginPath();
      ctx.moveTo(-1.5, vy);
      ctx.lineTo(11.5, vy);
      ctx.stroke();
    }

    // Left half: Big Round RED Emergency Power Dome Button
    const btnX = -9;
    const btnY = 4.2;
    // Chrome ring bezel
    ctx.fillStyle = steelLight;
    ctx.beginPath();
    ctx.arc(btnX, btnY, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Red dome with light glint
    ctx.fillStyle = isHit ? '#FFF' : '#DC2626';
    ctx.beginPath();
    ctx.arc(btnX, btnY, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(btnX - 0.7, btnY - 0.7, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // 2. Pull-Out Medical Syringe / Vial Tray (Overhanging front)
    ctx.fillStyle = '#71757E';
    ctx.fillRect(-16, 6, 26, 6.5);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-16, 6, 26, 6.5);

    // Medical items inside tray:
    // A. Glass Medical Syringe (Left)
    ctx.fillStyle = 'rgba(240, 248, 255, 0.85)';
    ctx.fillRect(-14, 8, 9, 2.4);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-14, 8, 9, 2.4);

    // Syringe plunger rod & thumb ring
    ctx.fillStyle = '#D1D5DB';
    ctx.fillRect(-17, 8.6, 3, 1.2);
    ctx.beginPath();
    ctx.arc(-17.5, 9.2, 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // B. Amber Medicine Bottle / Vial (Right)
    const vialGrad = ctx.createLinearGradient(-3, 0, 3, 0);
    vialGrad.addColorStop(0, '#92400E');
    vialGrad.addColorStop(0.5, '#F59E0B');
    vialGrad.addColorStop(1, '#78350F');

    ctx.fillStyle = vialGrad;
    ctx.beginPath();
    ctx.ellipse(0, 9.2, 3.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vial white stopper cap
    ctx.fillStyle = '#F3F4F6';
    ctx.beginPath();
    ctx.arc(2.8, 9.2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ── PHASE 6: CENTRAL LEVEL GAUGE DISPLAY (PROVISIONS METER) (70%+) ──
  const gaugeAlpha = pieceAlpha(0.70);
  if (gaugeAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = gaugeAlpha;

    // 1. Recessed Red Display Screen
    ctx.fillStyle = '#A3282B';
    ctx.fillRect(-13, -20, 26, 17);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-13, -20, 26, 17);

    // Fine horizontal CRT scanline texture
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.8;
    for (let gy = -19; gy <= -4; gy += 2) {
      ctx.beginPath();
      ctx.moveTo(-12, gy);
      ctx.lineTo(12, gy);
      ctx.stroke();
    }

    // 2. White Semi-Circular Gauge Scale
    const gCenterX = 0;
    const gCenterY = -5;
    const gRadius = 11;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(gCenterX, gCenterY, gRadius, Math.PI, 0);
    ctx.stroke();

    // Dividing gauge sectors (lines to center)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(gCenterX, gCenterY);
    ctx.lineTo(gCenterX + Math.cos(Math.PI * 0.75) * gRadius, gCenterY - Math.sin(Math.PI * 0.75) * gRadius);
    ctx.moveTo(gCenterX, gCenterY);
    ctx.lineTo(gCenterX + Math.cos(Math.PI * 0.25) * gRadius, gCenterY - Math.sin(Math.PI * 0.25) * gRadius);
    ctx.stroke();

    // "E" (Empty) and "F" (Full) Letters
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 4.0px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', -10, -6);
    ctx.fillText('F', 10, -6);

    // 3. Black Pointer Arrow Needle pointing toward "F"
    const hpRatio = Math.max(0, Math.min(1.0, hp / maxHp));
    const needleTarget = (Math.PI * (1 - hpRatio)) + (isDispensing ? Math.sin(now / 110) * 0.06 : 0);
    const needleX = gCenterX + Math.cos(needleTarget) * (gRadius - 1.5);
    const needleY = gCenterY - Math.sin(needleTarget) * (gRadius - 1.5);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gCenterX, gCenterY);
    ctx.lineTo(needleX, needleY);
    ctx.stroke();

    // Needle arrow head
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(needleX, needleY, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Center pivot point
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(gCenterX, gCenterY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 4. Shelf with 3 White Cylindrical Tuning Knobs
    const knobY = -3.2;
    const knobXPositions = [-6, 0, 6];
    for (const kx of knobXPositions) {
      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(kx - 1.2, knobY, 2.4, 2.2);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(kx - 1.2, knobY, 2.4, 2.2);
    }

    ctx.restore();
  }

  // ── PHASE 7: "PROVISIONS" PORCELAIN SIGNBOARD (85%+) ──
  const signAlpha = pieceAlpha(0.85);
  if (signAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = signAlpha;

    // Ivory/cream rounded porcelain plate
    ctx.fillStyle = '#FBF8F2';
    ctx.beginPath();
    ctx.roundRect(-13, -26.5, 26, 6.0, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Two small cyan/blue stars (★★)
    ctx.fillStyle = '#0284C7';
    ctx.font = '3.2px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ ★', 0, -25.2);

    // Cursive "Provisions" script text in red
    ctx.fillStyle = '#B91C1C';
    ctx.font = 'italic bold 3.8px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Provisions', 0, -22.4);

    ctx.restore();
  }

  // ── PHASE 8: TOP OSCILLOSCOPE MODULE, ECG SCREEN & KEYPAD (95%+) ──
  const topAlpha = pieceAlpha(0.95);
  if (topAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = topAlpha;

    // 1. Top Red Console Box with Overhanging Roof Cap
    ctx.fillStyle = redDark;
    ctx.fillRect(-12, -37, 24, 10.5);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-12, -37, 24, 10.5);

    // Dark overhanging roof visor
    ctx.fillStyle = '#451012';
    ctx.fillRect(-14, -38.5, 28, 2.5);
    ctx.strokeRect(-14, -38.5, 28, 2.5);

    // 2. Left: CRT ECG Heartbeat Monitor Screen
    ctx.fillStyle = '#08120C';
    ctx.fillRect(-10, -35.5, 8.5, 7.5);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-10, -35.5, 8.5, 7.5);

    // Animated Neon Green ECG Heartbeat Line
    const ecgPhase = (now % 1000) / 1000;
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-9.5, -31.8);
    ctx.lineTo(-7.5, -31.8);
    // Heartbeat spike
    if (ecgPhase > 0.35 && ecgPhase < 0.65) {
      ctx.lineTo(-6.8, -34.5); // high Q-R peak
      ctx.lineTo(-6.0, -29.5); // S dip
      ctx.lineTo(-5.2, -31.8);
    } else {
      ctx.lineTo(-6.8, -33.0);
      ctx.lineTo(-6.0, -30.8);
      ctx.lineTo(-5.2, -31.8);
    }
    ctx.lineTo(-2.0, -31.8);
    ctx.stroke();

    // 3. Center: Rotary Dial / Knob
    const knobCenterX = 0.5;
    const knobCenterY = -31.8;
    ctx.fillStyle = steelDark;
    ctx.beginPath();
    ctx.arc(knobCenterX, knobCenterY, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Dial notch
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(knobCenterX, knobCenterY);
    ctx.lineTo(knobCenterX + 1.6, knobCenterY - 1.2);
    ctx.stroke();

    // 4. Right: Industrial Numeric Keypad & Amber LEDs
    // Top amber status LED bar
    ctx.fillStyle = '#F97316';
    ctx.fillRect(4.5, -35.5, 6, 2.0);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(4.5, -35.5, 6, 2.0);

    // 2x3 numeric keypad grid
    ctx.fillStyle = '#1A1C22';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const bx = 4.5 + c * 2.2;
        const by = -32.5 + r * 2.2;
        ctx.fillRect(bx, by, 1.8, 1.8);
        ctx.strokeRect(bx, by, 1.8, 1.8);
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Animated Healing / Ammo Tether Beam connecting Dispenser to targets
 */
export function drawDispenserTetherBeam(ctx, fromX, fromY, toX, toY, isAmmo = false) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return;

  const now = performance.now();
  const segments = 16;
  const beamAngle = Math.atan2(dy, dx);
  const perpX = -Math.sin(beamAngle);
  const perpY = Math.cos(beamAngle);

  ctx.save();

  const baseHue = isAmmo ? '255, 185, 30' : '0, 240, 140';
  const coreColor = isAmmo ? '#FFFDE0' : '#E8FFF5';

  // 1. Soft Outer Flowing Envelope
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = fromX + dx * t;
    const py = fromY + dy * t;
    // Spiral oscillation wave
    const wave = Math.sin((now / 90) + t * Math.PI * 4) * 4.5 * Math.sin(t * Math.PI);
    const sx = px + perpX * wave;
    const sy = py + perpY * wave;

    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = `rgba(${baseHue}, 0.35)`;
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 2. Main Helix Core Stream
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = fromX + dx * t;
    const py = fromY + dy * t;
    const wave = Math.sin((now / 90) + t * Math.PI * 4) * 3.5 * Math.sin(t * Math.PI);
    const sx = px + perpX * wave;
    const sy = py + perpY * wave;

    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = `rgba(${baseHue}, 0.85)`;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // 3. Bright White-Hot Energy Core
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = fromX + dx * t;
    const py = fromY + dy * t;
    const wave = Math.sin((now / 90) + t * Math.PI * 4) * 2.0 * Math.sin(t * Math.PI);
    const sx = px + perpX * wave;
    const sy = py + perpY * wave;

    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 4. Traveling Healing Energy Pulses (+)
  const pulseCount = 3;
  for (let p = 0; p < pulseCount; p++) {
    const pT = ((now * 0.0018 + p / pulseCount) % 1.0);
    const px = fromX + dx * pT;
    const py = fromY + dy * pT;
    const pWave = Math.sin((now / 90) + pT * Math.PI * 4) * 3.5 * Math.sin(pT * Math.PI);
    const pulseX = px + perpX * pWave;
    const pulseY = py + perpY * pWave;

    ctx.save();
    ctx.translate(pulseX, pulseY);
    ctx.fillStyle = coreColor;

    if (isAmmo) {
      // Golden ammo diamond
      ctx.beginPath();
      ctx.moveTo(0, -3.5);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-3.5, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      // Green medical cross (+)
      ctx.fillRect(-1, -3.5, 2, 7);
      ctx.fillRect(-3.5, -1, 7, 2);
    }
    ctx.restore();
  }

  // 5. Target Absorption Halo
  const haloT = (now % 600) / 600;
  const haloRadius = 14 + haloT * 8;
  const haloAlpha = (1 - haloT) * 0.6;
  ctx.strokeStyle = `rgba(${baseHue}, ${haloAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(toX, toY, haloRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural Holographic Healing Field Ring Radius for Dispenser
 */
export function drawDispenserHealingRing(ctx, dispenser) {
  if (!dispenser || dispenser.hp <= 0) return;

  const range = CONFIG.Engineer?.dispenserRange || 260;
  const now = performance.now();

  let currentRadius = range;
  let ringAlpha = 0.75;

  if (dispenser.isBuilding) {
    const buildP = dispenser.buildProgress || 0.05;
    currentRadius = range * buildP;
    ringAlpha = buildP * 0.55;
  }

  const isOccupied = dispenser.tetheredTargets && dispenser.tetheredTargets.length > 0;
  const activeAlpha = isOccupied ? 1.0 : 0.65;
  const totalAlpha = ringAlpha * activeAlpha;

  ctx.save();

  // 1. Translucent Radial Gradient Ambient Floor Fill
  const grad = ctx.createRadialGradient(dispenser.x, dispenser.y, 8, dispenser.x, dispenser.y, currentRadius);
  grad.addColorStop(0, `rgba(0, 255, 136, ${0.07 * totalAlpha})`);
  grad.addColorStop(0.65, `rgba(0, 255, 136, ${0.03 * totalAlpha})`);
  grad.addColorStop(1, 'rgba(0, 255, 136, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(dispenser.x, dispenser.y, currentRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Concentric Expanding Breathing Ripple Pulse
  const waveP = (now % 2400) / 2400;
  const waveRadius = currentRadius * waveP;
  const waveAlpha = (1 - waveP) * 0.35 * totalAlpha;
  ctx.strokeStyle = `rgba(0, 255, 136, ${waveAlpha})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(dispenser.x, dispenser.y, waveRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Multi-Layered Perimeter Boundary Rings (No shadowBlur CPU cost)
  // Outer soft glow band
  ctx.strokeStyle = `rgba(0, 255, 136, ${0.18 * totalAlpha})`;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(dispenser.x, dispenser.y, currentRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Middle tactical perimeter line
  ctx.strokeStyle = `rgba(0, 255, 136, ${0.70 * totalAlpha})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(dispenser.x, dispenser.y, currentRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner bright core hairline
  ctx.strokeStyle = `rgba(230, 255, 245, ${0.90 * totalAlpha})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(dispenser.x, dispenser.y, currentRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Rotating Tech Markers & Medical Crosses along Perimeter
  const crossCount = 6;
  const rotAngle = now * 0.00035;

  for (let i = 0; i < crossCount; i++) {
    const angle = rotAngle + (i * Math.PI * 2) / crossCount;
    const px = dispenser.x + Math.cos(angle) * currentRadius;
    const py = dispenser.y + Math.sin(angle) * currentRadius;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    // Mini green medical cross (+)
    ctx.fillStyle = `rgba(0, 255, 136, ${0.85 * totalAlpha})`;
    ctx.fillRect(-1, -3.5, 2, 7);
    ctx.fillRect(-3.5, -1, 7, 2);

    // White-hot center dot
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * totalAlpha})`;
    ctx.fillRect(-0.75, -0.75, 1.5, 1.5);

    ctx.restore();
  }

  // 5. Cardinal Corner Bracket Pips (Counter-rotating)
  const bracketCount = 4;
  const counterRot = -rotAngle * 0.75;
  ctx.strokeStyle = `rgba(0, 255, 136, ${0.80 * totalAlpha})`;
  ctx.lineWidth = 1.4;

  for (let i = 0; i < bracketCount; i++) {
    const angle = counterRot + (i * Math.PI * 2) / bracketCount;
    const px = dispenser.x + Math.cos(angle) * currentRadius;
    const py = dispenser.y + Math.sin(angle) * currentRadius;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(0, 2);
    ctx.lineTo(6, -2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

