import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';

/**
 * Visual Skin Renderer for Genos (The Demon Cyborg)
 * Clean, sleek circle color-theme based on Genos's signature outfit:
 * Golden wheat hair, dark navy tank top, metallic chrome cybernetic shoulder accents, gold belt, black pants, and metallic silver fists with palm ports.
 */
/**
 * Renders Rocket Dash after-images using Genos's full model skin with fading opacity
 * and energetic thruster aura, optimized for performance.
 */
export function drawGenosAfterImages(ctx, fighter) {
  return; // Model afterimages replaced with manga speed lines on dash
}

export function drawGenosFlameTrail(ctx, fighter) {
  return; // Rocket flame visual removed on dash
}

function _drawRocketThrusterFlames(ctx, x, y, vx, vy, r, isBoosting, fadeMult = 1.0) {
  return; // Rocket flame visual removed on dash
}

export function drawGenosSkin(ctx, fighter, isPreTranslated = false) {
  if (!fighter._isAfterImage) {
    drawGenosAfterImages(ctx, fighter);
  }

  const r = fighter.r || 25;
  const vx = fighter.vx || 0;
  const vy = fighter.vy || 0;
  const isBoosting = (fighter.speedBoostTimer && fighter.speedBoostTimer > 0) || fighter.isDashing;

  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();

  // Movement & state flags
  const isPunching = (fighter.punchAnimTimer && fighter.punchAnimTimer > 0) || fighter.isFlurrying;
  const isBasicAttacking = fighter.basicBlastAnimTimer && fighter.basicBlastAnimTimer > 0;
  const isChargingUlt = fighter.isChargingUlt || fighter.isFiringUlt;
  const isAttacking = isPunching || isChargingUlt || isBasicAttacking;
  const isMoving = Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.5;

  ctx.save();
  if (!isPreTranslated) {
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

    // Rotate entire body circle based on movement or aiming direction
    const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);

    ctx.rotate(angle);
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) ctx.scale(1, -1);
  }

  // -------------------------------------------------------------------------
  // 1. THRUSTER BOOST & SELF-DESTRUCT AURA (No shadowBlur - Rule #11)
  // -------------------------------------------------------------------------
  const isDashing = fighter.isDashing;
  const isSelfDestructing = fighter.isSelfDestructing;

  if ((isMoving || isDashing || isChargingUlt || isSelfDestructing) && !isLowQuality) {
    ctx.save();
    const auraColor = isSelfDestructing ? 'rgba(0, 229, 255, ' : 'rgba(255, 100, 0, ';
    const pulseR = r + 3 + Math.sin(now * 0.01) * 2.5;
    const pulseCount = isSelfDestructing ? 3 : 2;
    for (let i = 0; i < pulseCount; i++) {
      const alpha = (0.45 - i * 0.12) * (isSelfDestructing ? 0.9 : 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, pulseR + i * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `${auraColor}${alpha})`;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
    ctx.restore();
  }
  // ─────────────────────────────────────────────
  // 1b. SHATTERED CYBERNETIC REASSEMBLY ANIMATION
  // ─────────────────────────────────────────────
  if (fighter.shatteredPieces && fighter.shatteredPieces.length > 0) {
    _drawShatteredGenosSkin(ctx, fighter, r, now);
    ctx.restore();
    return;
  }

  // ─────────────────────────────────────────────
  // 2. MAIN CIRCLE BODY (SLEEK COLOR THEME & HIGH-DETAIL CYBORG SUIT)
  // ─────────────────────────────────────────────
  ctx.save();

  // Clip inside main body circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Opaque Base Body Fill (ensures zero background bleeding/transparency)
  ctx.fillStyle = '#232832';
  ctx.fill();

  // 2a. Top Section — Golden Wheat Hair (#E5CC82)
  ctx.fillStyle = '#E5CC82';
  ctx.fillRect(-r, -r, r * 2, r * 0.75);

  // Layered Spiky Hair Bangs (#D4B964)
  ctx.fillStyle = '#D4B964';
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.35);
  ctx.lineTo(-r * 0.65, -r * 0.18);
  ctx.lineTo(-r * 0.40, -r * 0.30);
  ctx.lineTo(-r * 0.18, -r * 0.12);
  ctx.lineTo(0, -r * 0.28);
  ctx.lineTo(r * 0.18, -r * 0.12);
  ctx.lineTo(r * 0.40, -r * 0.30);
  ctx.lineTo(r * 0.65, -r * 0.18);
  ctx.lineTo(r, -r * 0.35);
  ctx.lineTo(r, -r * 0.75);
  ctx.lineTo(-r, -r * 0.75);
  ctx.closePath();
  ctx.fill();

  // Golden Hair Sheen Highlights (#FAF0BE)
  ctx.fillStyle = '#FAF0BE';
  ctx.beginPath();
  ctx.moveTo(-r * 0.50, -r * 0.55);
  ctx.lineTo(-r * 0.30, -r * 0.38);
  ctx.lineTo(-r * 0.20, -r * 0.55);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.20, -r * 0.55);
  ctx.lineTo(r * 0.35, -r * 0.38);
  ctx.lineTo(r * 0.50, -r * 0.55);
  ctx.fill();

  // 2b. Middle Section — Dark Charcoal Tactical Vest (#1A1D24)
  ctx.fillStyle = '#1A1D24';
  ctx.fillRect(-r, -r * 0.22, r * 2, r * 0.62);

  // Vest Armor Panel Seam Lines (Left & Right)
  ctx.strokeStyle = '#101217';
  ctx.lineWidth = 1.8;

  ctx.beginPath();
  ctx.moveTo(-r * 0.42, -r * 0.22);
  ctx.lineTo(-r * 0.42, r * 0.38);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(r * 0.42, -r * 0.22);
  ctx.lineTo(r * 0.42, r * 0.38);
  ctx.stroke();

  // Center Zipper Line
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.22);
  ctx.lineTo(0, -r * 0.10);
  ctx.stroke();

  // 2c. Metallic Silver Cybernetic Shoulders & Joint Bolts
  // Left Shoulder Armor Plate
  ctx.fillStyle = '#C2CCD6';
  ctx.beginPath();
  ctx.ellipse(-r * 0.75, -r * 0.02, r * 0.28, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22262E';
  ctx.beginPath();
  ctx.arc(-r * 0.75, -r * 0.02, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E6ECF2';
  ctx.beginPath();
  ctx.arc(-r * 0.75, -r * 0.02, r * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Right Shoulder Armor Plate
  ctx.fillStyle = '#C2CCD6';
  ctx.beginPath();
  ctx.ellipse(r * 0.75, -r * 0.02, r * 0.28, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22262E';
  ctx.beginPath();
  ctx.arc(r * 0.75, -r * 0.02, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E6ECF2';
  ctx.beginPath();
  ctx.arc(r * 0.75, -r * 0.02, r * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // V-Neck Metallic Trim Collar
  ctx.strokeStyle = '#B0B8C2';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, -r * 0.22);
  ctx.lineTo(0, -r * 0.10);
  ctx.lineTo(r * 0.28, -r * 0.22);
  ctx.stroke();

  // 2d. Incineration Chest Energy Core & Bezel Frame (Pulsing Glowing Cyan Core)
  const coreY = -r * 0.02;
  const coreR = r * 0.16;
  const bloomR = r * 0.46;

  // Dynamic cyan pulse math (faster, hyper-intense throb during self-destruction!)
  const pulseFreq = isSelfDestructing ? 0.03 : 0.008;
  const cyanPulse = 0.5 + Math.sin(now * pulseFreq) * 0.5;
  const activeCoreR = isSelfDestructing ? coreR * (1.25 + cyanPulse * 0.4) : coreR;
  const dynamicBloomR = isSelfDestructing ? r * (0.70 + cyanPulse * 0.45) : bloomR * (0.85 + cyanPulse * 0.4);

  // Radial Bloom Gradient (Pulsing glowing cyan core!)
  const bloomGrad = ctx.createRadialGradient(0, coreY, 0, 0, coreY, dynamicBloomR);
  if (isSelfDestructing) {
    bloomGrad.addColorStop(0, '#FFFFFF');
    bloomGrad.addColorStop(0.2, 'rgba(0, 255, 255, 1.0)');
    bloomGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.85)');
    bloomGrad.addColorStop(0.8, 'rgba(0, 180, 255, 0.45)');
    bloomGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
  } else if (isChargingUlt) {
    bloomGrad.addColorStop(0, '#FFFFFF');
    bloomGrad.addColorStop(0.25, 'rgba(0, 255, 255, 0.95)');
    bloomGrad.addColorStop(0.6, 'rgba(0, 200, 255, 0.55)');
    bloomGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
  } else {
    bloomGrad.addColorStop(0, '#FFFFFF');
    bloomGrad.addColorStop(0.25, `rgba(0, 229, 255, ${0.85 + cyanPulse * 0.15})`);
    bloomGrad.addColorStop(0.6, `rgba(0, 200, 255, ${0.45 + cyanPulse * 0.3})`);
    bloomGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
  }

  ctx.fillStyle = bloomGrad;
  ctx.beginPath();
  ctx.arc(0, coreY, dynamicBloomR, 0, Math.PI * 2);
  ctx.fill();

  // Self-Destruct Concentric Cyan Overload Pulse Rings radiating from core
  if (isSelfDestructing) {
    ctx.save();
    for (let c = 1; c <= 3; c++) {
      const ringR = activeCoreR + ((now * 0.08 + c * 8) % (r * 0.65));
      const ringAlpha = Math.max(0, 1.0 - (ringR / (r * 0.65)));
      ctx.beginPath();
      ctx.arc(0, coreY, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${ringAlpha * 0.9})`;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Central Cyan Core Disc
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.arc(0, coreY, activeCoreR, 0, Math.PI * 2);
  ctx.fill();

  // Inner White Core Center
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, coreY, activeCoreR * 0.60, 0, Math.PI * 2);
  ctx.fill();

  // Glowing Cyan Ring
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.85 + cyanPulse * 0.15})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, coreY, activeCoreR, 0, Math.PI * 2);
  ctx.stroke();

  // Metallic Gold Bezel Frame around Chest Core
  ctx.strokeStyle = isSelfDestructing ? '#00FFFF' : '#D4AF37';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, coreY, activeCoreR + 2, 0, Math.PI * 2);
  ctx.stroke();

  // 4 Thermal Exhaust Slits around Bezel Frame
  ctx.strokeStyle = '#1A1D24';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const ventAngle = (i * Math.PI) / 2 + Math.PI / 4;
    const vx1 = Math.cos(ventAngle) * (coreR + 3);
    const vy1 = coreY + Math.sin(ventAngle) * (coreR + 3);
    const vx2 = Math.cos(ventAngle) * (coreR + 7);
    const vy2 = coreY + Math.sin(ventAngle) * (coreR + 7);
    ctx.beginPath();
    ctx.moveTo(vx1, vy1);
    ctx.lineTo(vx2, vy2);
    ctx.stroke();
  }

  // 2e. Tactical Belt & Gold Buckle
  // Belt Strap (#101216)
  ctx.fillStyle = '#101216';
  ctx.fillRect(-r, r * 0.38, r * 2, r * 0.12);

  // Gold Buckle (#D4AF37) with Silver Loop Details
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(-r * 0.28, r * 0.37, r * 0.56, r * 0.14);

  // Buckle Inner Slot Notch (#241D09)
  ctx.fillStyle = '#241D09';
  ctx.fillRect(-r * 0.14, r * 0.40, r * 0.28, r * 0.08);

  // Silver Belt Loops (#A0AAB5)
  ctx.fillStyle = '#A0AAB5';
  ctx.fillRect(-r * 0.40, r * 0.37, r * 0.06, r * 0.14);
  ctx.fillRect(r * 0.34, r * 0.37, r * 0.06, r * 0.14);

  // 2f. Bottom Section — Black Combat Pants (#16181C)
  ctx.fillStyle = '#16181C';
  ctx.fillRect(-r, r * 0.51, r * 2, r * 0.50);

  // Pants Fly & Pocket Seam Lines
  ctx.strokeStyle = '#262A32';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, r * 0.51);
  ctx.lineTo(0, r * 0.90);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.60, r * 0.51);
  ctx.lineTo(-r * 0.35, r * 0.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(r * 0.60, r * 0.51);
  ctx.lineTo(r * 0.35, r * 0.85);
  ctx.stroke();

  // 2g. CUSTOM DEMON CYBORG BODY STROKE & ARMOR PERIMETER RING
  // Draw stroke INSIDE clip boundary so it outlines the body perfectly without obscuring interior details!
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.0, 0, Math.PI * 2);
  ctx.strokeStyle = '#121418';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r - 2.2, 0, Math.PI * 2);
  ctx.strokeStyle = '#3A404D';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Dynamic Incineration Core Energy Notches & Overdrive Glow
  const isMeleeStance = fighter.isMeleeStance;

  if (isChargingUlt || isSelfDestructing || isMeleeStance) {
    const now = Date.now();
    const pulseAlpha = 0.5 + Math.sin(now * 0.012) * 0.35;
    const energyColor = isSelfDestructing 
      ? `rgba(0, 229, 255, ${pulseAlpha})` 
      : (isChargingUlt ? `rgba(255, 120, 0, ${pulseAlpha})` : `rgba(255, 85, 0, ${pulseAlpha * 0.7})`);

    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.arc(0, 0, r - 1.0, -Math.PI * 0.35, -Math.PI * 0.05);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r - 1.0, Math.PI * 0.65, Math.PI * 0.95);
    ctx.stroke();
  }

  // 4 Segmented Cybernetic Joint Clamps (12, 3, 6, 9 o'clock)
  const clampSize = 2.8;
  ctx.fillStyle = '#4A5260';
  for (let i = 0; i < 4; i++) {
    const clampAngle = (i * Math.PI) / 2;
    const cx = Math.cos(clampAngle) * (r - 1.0);
    const cy = Math.sin(clampAngle) * (r - 1.0);
    ctx.beginPath();
    ctx.arc(cx, cy, clampSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#121418';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  ctx.restore(); // Undo body clip
  ctx.restore(); // Undo body translate
}

/**
 * Hand Renderer for Genos — High-tech multi-layered mechanical arms with segmented armor,
 * panel lines, energy conduit grooves, joint bolts, and a glowing palm blast port cannon.
 */
export function drawGenosHands(ctx, fighter, isPreTranslated = false) {
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  if (isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands) return;

  const isPunching = (fighter.punchAnimTimer && fighter.punchAnimTimer > 0) || fighter.isFlurrying;
  const isBasicAttacking = fighter.basicBlastAnimTimer && fighter.basicBlastAnimTimer > 0;
  const isChargingUlt = fighter.isChargingUlt || fighter.isFiringUlt;
  const isSelfDestructing = fighter.isSelfDestructing;
  const r = fighter.r;
  const hr = Math.max(r * 0.32, getHandSize(7.5)); // hand radius

  const isAttacking = isPunching || isChargingUlt || isBasicAttacking;
  const isMoving = Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.5;

  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  const facingLeft = Math.abs(angle) > Math.PI / 2;

  ctx.save();
  if (!isPreTranslated) {
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
    ctx.rotate(angle);
    if (facingLeft) ctx.scale(1, -1);
  }

  // Butter-smooth punch animation using sinusoidal easing & arc curves
  let rawProgress = 0;
  if (isPunching) {
    if (fighter.isFlurrying) {
      // Flurry cycle is 5 frames. Use flurryTimer modulo 5.
      const cycleFrame = (fighter.flurryTimer || 0) % 5;
      rawProgress = cycleFrame / 5;
    } else {
      const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 16;
      rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
    }
  }

  // Butter-smooth sine-wave arc (0 -> 1 -> 0)
  const easePunch = Math.sin(rawProgress * Math.PI);
  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;
  const oppositeRecoil = isPunching ? -Math.sin(rawProgress * Math.PI * 0.8) * (r * 0.25) : 0;

  let frontHandX, frontHandY, backHandX, backHandY;
  let hideFront = fighter.hideFrontHand || (typeof state !== 'undefined' && state.showSkinOnly) || false;
  let hideBack  = fighter.hideBackHand || (typeof state !== 'undefined' && state.showSkinOnly) || false;

  const isUltRecovering = fighter.isUltRecovering;

  if (isChargingUlt) {
    frontHandX = r * 1.15; frontHandY = -r * 0.12;
    backHandX  = r * 1.15; backHandY  =  r * 0.12;
  } else if (isUltRecovering) {
    // Smoothly ease hands from extended blast position (r * 1.15) back to idle fighting stance
    const recProgress = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.ultRecoveryTimer || 0) / 45)));
    const ease = Math.sin(recProgress * Math.PI * 0.5); // Smooth ease-out curve
    frontHandX = r * 1.15 - (r * 0.30) * ease;
    frontHandY = -r * 0.12 + (r * 0.27) * ease;
    backHandX  = r * 1.15 - (r * 1.15) * ease;
    backHandY  =  r * 0.12 - (r * 0.27) * ease;
  } else if (isPunching) {
    if (fighter.isFlurrying) {
      // Machine Gun Blows (Skill 1): Continuous high-speed alternating Gatling cybernetic fists
      const t = fighter.flurryTimer || 0;
      const wave = Math.sin(t * Math.PI / 2.5); // Smooth 5-frame alternating cycle wave (-1 to +1)
      
      const rightReach = Math.max(0, wave);  // 0 -> 1 when Right arm punches
      const leftReach  = Math.max(0, -wave); // 0 -> 1 when Left arm punches

      backHandX  = r * 0.30 + rightReach * (r * 1.85);
      backHandY  = -r * 0.18;

      frontHandX = r * 0.30 + leftReach  * (r * 1.85);
      frontHandY = r * 0.18;
    } else {
      // Melee Punches: Single cybernetic front hand punch from right edge
      frontHandX = r * 0.95 + lungeExtension * 1.5;
      frontHandY = Math.sin(rawProgress * Math.PI) * (r * 0.15);
      backHandX  = 0;
      backHandY  = 0;
      hideBack   = true;
    }
  } else if (isBasicAttacking) {
    // Mode B: Side Profile (Basic Attack) - in pre-rotated local space
    const blastMaxT = 30;
    const blastProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.basicBlastAnimTimer / blastMaxT)));
    const primaryLunge = Math.sin(blastProgress * Math.PI) * (r * 0.95);

    frontHandX = r * 0.95 + primaryLunge;
    frontHandY = 0;
    backHandX  = 0;
    backHandY  = 0;
    hideBack   = true;
  } else {
    // Mode B: Side Profile (Idle) - Front hand at right edge of body
    frontHandX = r * 0.95;
    frontHandY = 0;
    backHandX  = 0;
    backHandY  = 0;
    hideBack   = true;
  }

  const palmColor = isSelfDestructing ? '#FF2200' : '#FF5500';

  const blastProgress = isBasicAttacking ? Math.min(1.0, Math.max(0.0, 1.0 - (fighter.basicBlastAnimTimer / 30))) : 0;
  const isBackFiring  = isBasicAttacking &&  fighter.isRightBlast;
  const isFrontFiring = isBasicAttacking && !fighter.isRightBlast;

  // Punch glow intensity: peaks at sinusoidal mid-swing, active on punching arm ONLY when hitting an enemy target
  let punchGlowFront = 0;
  let punchGlowBack  = 0;
  if (isPunching) {
    if (fighter.isFlurrying) {
      const isHitConnected = (fighter._flurryHitConnectedTimer && fighter._flurryHitConnectedTimer > 0);
      if (isHitConnected) {
        const t = fighter.flurryTimer || 0;
        const wave = Math.sin(t * Math.PI / 2.5);
        punchGlowBack  = Math.max(0, wave);
        punchGlowFront = Math.max(0, -wave);
      }
    } else {
      const isHitConnected = (fighter._basicHitConnectedTimer && fighter._basicHitConnectedTimer > 0);
      if (isHitConnected) {
        punchGlowFront = !fighter.isRightPunch ? easePunch : 0;
        punchGlowBack  =  fighter.isRightPunch ? easePunch : 0;
      }
    }
  }

  if (!hideBack)  _drawMechArm(ctx, backHandX,  backHandY,  hr, palmColor, isChargingUlt, isSelfDestructing, isBackFiring,  blastProgress, punchGlowBack);
  if (!hideFront) _drawMechArm(ctx, frontHandX, frontHandY, hr, palmColor, isChargingUlt, isSelfDestructing, isFrontFiring, blastProgress, punchGlowFront);

  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Draws a single detailed high-tech mechanical arm / fist at (cx, cy).
 * @param {number} punchGlow - 0..1 sinusoidal punch impact intensity for fire aura & speed lines
 */
function _drawMechArm(ctx, cx, cy, hr, palmColor, isChargingUlt, isSelfDestructing, isFiringArm, blastProgress, punchGlow = 0) {
  ctx.save();
  ctx.translate(cx, cy);

  const isDarkMode = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  // ── PUNCH IMPACT VISUAL: Fire Aura Glow + Radial Speed Lines ──
  if (punchGlow > 0.05) {
    ctx.save();

    if (isDarkMode) {
      ctx.imageSmoothingEnabled = false;
      const P = 2.0;
      const snap = (v) => Math.round(v / P) * P;
      const maxR = snap(hr * 2.2 * punchGlow);

      // 1. Discrete 2D Stepped Pixel Fire Aura Grid
      for (let dy = -maxR; dy <= maxR; dy += P) {
        for (let dx = -maxR; dx <= maxR; dx += P) {
          const dist = Math.hypot(dx, dy);
          if (dist > maxR) continue;

          if (dist >= maxR - P) {
            ctx.fillStyle = '#150500'; // Dark manga obsidian border
          } else if (dist < hr * 0.65) {
            ctx.fillStyle = '#FFFFFF'; // Superheated pure white core
          } else if (dist < hr * 1.35) {
            ctx.fillStyle = '#FFE600'; // Solar yellow
          } else if (dist < hr * 1.80) {
            ctx.fillStyle = '#FF5500'; // Saturated fiery orange
          } else {
            ctx.fillStyle = '#CC2A00'; // Magma crimson
          }
          ctx.fillRect(snap(dx), snap(dy), P, P);
        }
      }

      // 2. Stepped Radial Needle Streaks
      const lineCount = 8;
      for (let i = 0; i < lineCount; i++) {
        const lineAngle = (i / lineCount) * Math.PI * 2;
        const innerR = snap(hr * 1.1);
        const outerR = snap(((i % 2 === 0) ? hr * 2.6 : hr * 1.85) * punchGlow);
        const cosA = Math.cos(lineAngle);
        const sinA = Math.sin(lineAngle);
        const steps = Math.max(4, Math.round((outerR - innerR) / P));

        for (let st = 0; st <= steps; st++) {
          const dist = innerR + (st / steps) * (outerR - innerR);
          const px = snap(cosA * dist);
          const py = snap(sinA * dist);
          ctx.fillStyle = (st % 2 === 0) ? '#FFFFFF' : '#FFE600';
          ctx.fillRect(px, py, P, P);
        }
      }
    } else {
      // 1. Outer fire aura bloom (flat tinted rings — no gradient, for performance)
      ctx.globalAlpha = punchGlow * 0.45;
      ctx.fillStyle = '#FF8800';
      ctx.beginPath();
      ctx.arc(0, 0, hr * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = punchGlow * 0.60;
      ctx.fillStyle = '#FF4400';
      ctx.beginPath();
      ctx.arc(0, 0, hr * 1.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = punchGlow * 0.30;
      ctx.fillStyle = '#FFDD44';
      ctx.beginPath();
      ctx.arc(0, 0, hr * 0.70, 0, Math.PI * 2);
      ctx.fill();

      // 2. Radial speed lines burst (8 jagged lines radiating outward)
      ctx.globalAlpha = punchGlow * 0.80;
      ctx.strokeStyle = '#FFCC55';
      ctx.lineCap = 'round';
      const lineCount = 8;
      for (let i = 0; i < lineCount; i++) {
        const lineAngle = (i / lineCount) * Math.PI * 2;
        const innerR = hr * 1.1;
        // Alternate long/short lines for a jagged starburst
        const outerR = (i % 2 === 0) ? hr * 2.6 : hr * 1.85;
        ctx.lineWidth = (i % 2 === 0) ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(lineAngle) * innerR, Math.sin(lineAngle) * innerR);
        ctx.lineTo(Math.cos(lineAngle) * outerR, Math.sin(lineAngle) * outerR);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ── Directional Barrel Nozzle (Points towards +X aim target) ──
  const nozzleLength = hr * 0.40;
  ctx.fillStyle = '#1C2530';
  ctx.strokeStyle = '#3A4555';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(hr * 0.50, -hr * 0.30, nozzleLength, hr * 0.60);
  ctx.fill();
  ctx.stroke();

  // Glowing Muzzle Tip Ring (Front of Cannon)
  ctx.beginPath();
  ctx.ellipse(hr * 0.50 + nozzleLength, 0, hr * 0.12, hr * 0.30, 0, 0, Math.PI * 2);
  ctx.fillStyle = palmColor;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // ── Layer 1: Dark background plate (#1A1E25) ──
  ctx.beginPath();
  ctx.arc(0, 0, hr, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1E25';
  ctx.fill();

  // ── Layer 2: Main armor plating gradient (#6E7D8C → #3C4654) ──
  const armorGrad = ctx.createRadialGradient(-hr * 0.25, -hr * 0.25, 0, 0, 0, hr);
  armorGrad.addColorStop(0, '#8A9BAD');
  armorGrad.addColorStop(0.45, '#5C6E80');
  armorGrad.addColorStop(1, '#2E3A46');
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.93, 0, Math.PI * 2);
  ctx.fillStyle = armorGrad;
  ctx.fill();

  // ── Layer 3: Top specular highlight plate (bright chrome reflection) ──
  ctx.beginPath();
  ctx.ellipse(-hr * 0.18, -hr * 0.30, hr * 0.38, hr * 0.18, -Math.PI * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200, 220, 240, 0.30)';
  ctx.fill();

  // ── Layer 4: Segmented armor ring (outer knuckle guard) ──
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.92, 0, Math.PI * 2);
  ctx.strokeStyle = '#0D1117';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = '#4A5568';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // ── Layer 5: Panel engraving lines (cross hatch grooves) ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.88, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = '#0D1117';
  ctx.lineWidth = 1.0;

  // Horizontal groove
  ctx.beginPath();
  ctx.moveTo(-hr * 0.85, hr * 0.08);
  ctx.lineTo( hr * 0.85, hr * 0.08);
  ctx.stroke();

  // Angled top-left panel divide
  ctx.beginPath();
  ctx.moveTo(-hr * 0.5, -hr * 0.85);
  ctx.lineTo(-hr * 0.85, hr * 0.08);
  ctx.stroke();

  // Angled top-right panel divide
  ctx.beginPath();
  ctx.moveTo(hr * 0.5, -hr * 0.85);
  ctx.lineTo(hr * 0.85, hr * 0.08);
  ctx.stroke();

  // Inner bevel lines on lower section
  ctx.strokeStyle = '#3A4555';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-hr * 0.60, hr * 0.28);
  ctx.lineTo( hr * 0.60, hr * 0.28);
  ctx.stroke();

  ctx.restore(); // clip release

  // ── Layer 6: Energy conduit grooves (glowing lines to palm) ──
  const conduitColor = isChargingUlt
    ? 'rgba(255, 200, 0, 0.85)'
    : isSelfDestructing
      ? 'rgba(0, 255, 255, 0.95)'
      : 'rgba(255, 120, 30, 0.70)';

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.80, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = conduitColor;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  // Left conduit line converging to center
  ctx.beginPath();
  ctx.moveTo(-hr * 0.55, -hr * 0.65);
  ctx.quadraticCurveTo(-hr * 0.30, -hr * 0.10, 0, 0);
  ctx.stroke();

  // Right conduit line converging to center
  ctx.beginPath();
  ctx.moveTo(hr * 0.55, -hr * 0.65);
  ctx.quadraticCurveTo(hr * 0.30, -hr * 0.10, 0, 0);
  ctx.stroke();

  // Bottom conduit line
  ctx.beginPath();
  ctx.moveTo(0, hr * 0.68);
  ctx.lineTo(0, hr * 0.10);
  ctx.stroke();

  ctx.restore(); // clip release

  // ── Layer 7: Joint bolt heads (top-left & top-right corners) ──
  const boltColor = '#4A5568';
  const boltHighlight = '#8A9BAD';
  for (const [bx, by] of [[-hr * 0.50, -hr * 0.52], [hr * 0.50, -hr * 0.52]]) {
    ctx.beginPath();
    ctx.arc(bx, by, hr * 0.095, 0, Math.PI * 2);
    ctx.fillStyle = boltColor;
    ctx.fill();
    ctx.strokeStyle = '#0D1117';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    // Tiny hex-bolt highlight glint
    ctx.beginPath();
    ctx.arc(bx - hr * 0.025, by - hr * 0.025, hr * 0.030, 0, Math.PI * 2);
    ctx.fillStyle = boltHighlight;
    ctx.fill();
  }

  // Bottom-center small joint bolt
  ctx.beginPath();
  ctx.arc(0, hr * 0.60, hr * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = boltColor;
  ctx.fill();
  ctx.strokeStyle = '#0D1117';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // ── Layer 8: PALM BLAST CANNON (multi-ring glowing port) ──
  // Outer dark cannon recess ring
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = '#0A0D12';
  ctx.fill();

  // Mid cannon barrel ring
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = '#1C2530';
  ctx.fill();
  ctx.strokeStyle = '#3A4555';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Glowing cannon throat
  const cannonGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hr * 0.28);
  if (isChargingUlt) {
    cannonGrad.addColorStop(0, '#FFFFFF');
    cannonGrad.addColorStop(0.3, 'rgba(255, 220, 0, 0.95)');
    cannonGrad.addColorStop(0.7, 'rgba(255, 100, 0, 0.70)');
    cannonGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
  } else if (isSelfDestructing) {
    cannonGrad.addColorStop(0, '#FFFFFF');
    cannonGrad.addColorStop(0.3, 'rgba(0, 255, 255, 0.95)');
    cannonGrad.addColorStop(0.7, 'rgba(0, 200, 255, 0.60)');
    cannonGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
  } else {
    cannonGrad.addColorStop(0, 'rgba(255, 255, 220, 0.90)');
    cannonGrad.addColorStop(0.35, 'rgba(255, 160, 20, 0.80)');
    cannonGrad.addColorStop(0.75, 'rgba(255, 70, 0, 0.40)');
    cannonGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
  }
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = cannonGrad;
  ctx.fill();

  // Outer cannon ring border glow
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.42, 0, Math.PI * 2);
  ctx.strokeStyle = isChargingUlt
    ? 'rgba(255, 220, 0, 0.75)'
    : isSelfDestructing
      ? 'rgba(0, 255, 255, 0.95)'
      : 'rgba(255, 100, 30, 0.55)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // ── Outer ring ──
  // ── Muzzle Energy Flash Cone & Expanding Shockwave Ring (Active Firing Arm - Rendered ON TOP of hand) ──
  if (isFiringArm && blastProgress > 0 && blastProgress < 0.6) {
    const flashScale = Math.sin((blastProgress / 0.6) * Math.PI);
    ctx.save();
    ctx.translate(hr * 0.90, 0); // At nozzle tip

    // 1. Multi-layer white-hot to orange heat flash aura
    const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hr * 2.2 * flashScale);
    flashGrad.addColorStop(0, '#FFFFFF'); // White hot core
    flashGrad.addColorStop(0.25, 'rgba(255, 200, 50, 0.95)'); // Gold plasma
    flashGrad.addColorStop(0.65, 'rgba(255, 80, 0, 0.60)'); // Fiery orange
    flashGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');

    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(0, 0, hr * 2.2 * flashScale, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-frequency expanding shockwave ring
    ctx.strokeStyle = `rgba(255, 230, 180, ${0.95 * (1 - blastProgress / 0.6)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, hr * 2.8 * flashScale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders Genos's Incineration Palm Heat Ammo Gauge (Ranged Mode) & Reload Bar (Melee Mode)
 */
function drawGenosAmmoGauge(ctx, fighter) {
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  if (isPodiumPreview || fighter._isAfterImage) return;

  const r = fighter.r || 25;
  const maxAmmo = fighter.maxHeatAmmo || 6;
  const ammo = fighter.heatAmmo !== undefined ? fighter.heatAmmo : maxAmmo;
  const isMelee = fighter.isMeleeStance || ammo <= 0;

  ctx.save();
  ctx.translate(fighter.x, fighter.y + r + 18); // Anchor to fighter world position, below body

  if (!isMelee) {
    // ── RANGED MODE: Glowing Energy Bullets/Pills ──
    const dotSpacing = 7.5;
    const startX = -((maxAmmo - 1) * dotSpacing) / 2;

    for (let i = 0; i < maxAmmo; i++) {
      const dotX = startX + i * dotSpacing;
      const isActive = i < ammo;

      ctx.beginPath();
      ctx.arc(dotX, 0, 3.2, 0, Math.PI * 2);

      if (isActive) {
        ctx.fillStyle = '#FF6600';
        ctx.fill();
        ctx.strokeStyle = '#FFDD80';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(dotX, 0, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(40, 45, 55, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  } else {
    // ── MELEE MODE: Reloading Progress Bar ──
    const reloadTimer = fighter.ammoReloadTimer || 0;
    const reloadMax = fighter.ammoReloadMax || 300;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (reloadTimer / reloadMax)));

    const barW = 38;
    const barH = 5;

    // Background track
    ctx.fillStyle = 'rgba(20, 20, 25, 0.85)';
    ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
    ctx.strokeStyle = '#FF4400';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(-barW / 2, -barH / 2, barW, barH);

    // Active fill
    ctx.fillStyle = '#FF7700';
    ctx.fillRect(-barW / 2 + 1, -barH / 2 + 1, (barW - 2) * progress, barH - 2);

    // Reloading text
    ctx.fillStyle = '#FFCC00';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MELEE', 0, -5);
  }

  ctx.restore();
}

/**
 * Renders Shattered Cybernetic Debris and Magnetic Piece-by-Piece Reassembly Animation
 */
function _drawShatteredGenosSkin(ctx, fighter, r, now) {
  ctx.save();

  // 1. Calculate overall reassembly progress normP
  let normP = 0;
  if (fighter.hp <= 0 || fighter.isDead) {
    normP = 0; // Remains shattered on ground if dead!
  } else if (fighter._isWinnerReveal) {
    normP = 1.0; // Fully whole on victory reveal!
  } else if (fighter.selfDestructRecoveryTimer !== undefined) {
    const maxT = fighter.selfDestructRecoveryMax || 240;
    const elapsed = maxT - Math.max(0, fighter.selfDestructRecoveryTimer);
    normP = Math.min(1.0, Math.max(0, elapsed / maxT));
  }

  // 2. Draw Inner Exposed Power Chassis Core
  const coreY = -r * 0.02;
  const pulseFreq = 0.03;
  const cyanPulse = 0.5 + Math.sin(now * pulseFreq) * 0.5;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#12141C'; // Dark metallic inner chassis
  ctx.fill();
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + cyanPulse * 0.3})`;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Exposed central power core
  const bloomGrad = ctx.createRadialGradient(0, coreY, 0, 0, coreY, r * 0.65);
  bloomGrad.addColorStop(0, '#FFFFFF');
  bloomGrad.addColorStop(0.3, 'rgba(0, 255, 255, 0.95)');
  bloomGrad.addColorStop(0.7, 'rgba(0, 200, 255, 0.5)');
  bloomGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
  ctx.fillStyle = bloomGrad;
  ctx.beginPath();
  ctx.arc(0, coreY, r * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.arc(0, coreY, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 3. Render Shattered Cybernetic Pieces magnetically pulling back piece-by-piece over 4 seconds
  const pieces = fighter.shatteredPieces || [];
  // First 20% of time: hold shattered position smoking & building energy
  const reassembleP = Math.max(0, Math.min(1.0, (normP - 0.20) / 0.75));

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const stagger = i / pieces.length;
    const rawP = Math.max(0, Math.min(1.0, (reassembleP - stagger * 0.40) / 0.60));
    const smoothP = 1 - Math.pow(1 - rawP, 3.0); // Smooth magnetic snap curve

    const currX = p.scatterX * (1 - smoothP) + p.targetX * smoothP;
    const currY = p.scatterY * (1 - smoothP) + p.targetY * smoothP;
    const currRot = p.rot * (1 - smoothP);

    // Electric cyan tendrils connecting piece to power core during magnetic pull
    if (smoothP > 0.05 && smoothP < 0.95) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(currX, currY);
      ctx.lineTo(0, coreY);
      ctx.strokeStyle = `rgba(0, 255, 255, ${(1 - smoothP) * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Render individual cybernetic armor piece
    ctx.save();
    ctx.translate(currX, currY);
    ctx.rotate(currRot);

    if (p.id === 'hair') {
      ctx.fillStyle = '#E5CC82';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.2);
      ctx.lineTo(0, -r * 0.4);
      ctx.lineTo(r * 0.5, -r * 0.2);
      ctx.lineTo(0, -r * 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (p.id === 'leftShoulder' || p.id === 'rightShoulder') {
      ctx.fillStyle = '#C2CCD6';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.22, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22262E';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.id === 'leftVest' || p.id === 'rightVest') {
      ctx.fillStyle = '#1A1D24';
      ctx.beginPath();
      ctx.rect(-r * 0.25, -r * 0.25, r * 0.5, r * 0.5);
      ctx.fill();
      ctx.strokeStyle = '#101217';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (p.id === 'bezelFrame') {
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.id === 'coreDisc') {
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.id === 'collar') {
      ctx.strokeStyle = '#B0B8C2';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, 0);
      ctx.lineTo(0, r * 0.12);
      ctx.lineTo(r * 0.25, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

