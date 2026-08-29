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
  // 2. MAIN CIRCLE BODY (AUTHENTIC PIXEL ART MODEL)
  // ─────────────────────────────────────────────
  drawGenosPixelBody(ctx, r, false, isChargingUlt, isSelfDestructing, fighter.isMeleeStance, now);

  ctx.restore();
}

/**
 * Draws Genos's entire body circle model in authentic Pixel Art Style.
 * Minimalist circle cyborg aesthetic, upright front POV, faceless (Rule #19 & Rule #35 compliant).
 */
export function drawGenosPixelBody(ctx, r, isGhost = false, isChargingUlt = false, isSelfDestructing = false, isMeleeStance = false, now = Date.now()) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Core pulse parameters
  const pulseFreq = isSelfDestructing ? 0.03 : 0.008;
  const cyanPulse = 0.5 + Math.sin(now * pulseFreq) * 0.5;
  const coreY = -r * 0.02;
  const activeCoreR = isSelfDestructing ? r * 0.22 : r * 0.16;

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // 4-neighbor attached border test (Rule #35 & Saitama standard)
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0D1117'; // Dark manga ink border
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Zone A: Golden Wheat Spiky Hair & Bangs (ry < -r * 0.22)
      if (ry < -r * 0.22) {
        // Spiky layered bangs profile
        const isBang = (
          (ry > -r * 0.35 && Math.abs(rx) > r * 0.65) ||
          (ry > -r * 0.30 && Math.abs(rx) > r * 0.38 && Math.abs(rx) < r * 0.55) ||
          (ry > -r * 0.26 && Math.abs(rx) < r * 0.22)
        );

        if (isBang) {
          ctx.fillStyle = '#D4B964'; // Bangs shadow / lower tier
        } else if (ry < -r * 0.55 && (Math.abs(rx - r * 0.35) < r * 0.12 || Math.abs(rx + r * 0.35) < r * 0.12)) {
          ctx.fillStyle = '#FAF0BE'; // Hair sheen highlights
        } else {
          ctx.fillStyle = '#E5CC82'; // Golden wheat main hair
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone B: Tactical Vest, Shoulders, Collar, & Chest Core (-r * 0.22 <= ry < r * 0.38)
      else if (ry < r * 0.38) {
        const coreDist = Math.hypot(rx, ry - coreY);

        // B1. Central Glowing Energy Core
        if (coreDist <= activeCoreR + P * 1.5) {
          if (coreDist <= activeCoreR * 0.45) {
            ctx.fillStyle = '#FFFFFF'; // Superheated fusion center
          } else if (coreDist <= activeCoreR) {
            ctx.fillStyle = isSelfDestructing ? '#00FFFF' : (cyanPulse > 0.6 ? '#00E5FF' : '#00B8D4'); // Glowing cyan core
          } else {
            ctx.fillStyle = isSelfDestructing ? '#00FFFF' : '#D4AF37'; // Golden bezel frame
          }
        }
        // B2. Metallic Silver Cybernetic Shoulders (left & right)
        else if (Math.abs(rx) > r * 0.58 && Math.abs(ry - (-r * 0.02)) < r * 0.36) {
          const shoulderCX = rx > 0 ? r * 0.72 : -r * 0.72;
          const sDist = Math.hypot((rx - shoulderCX) * 1.2, ry - (-r * 0.02));
          if (sDist <= r * 0.08) {
            ctx.fillStyle = '#E6ECF2'; // Joint bolt glint
          } else if (sDist <= r * 0.16) {
            ctx.fillStyle = '#22262E'; // Bolt core
          } else {
            ctx.fillStyle = (ry < -r * 0.08) ? '#D8E2EC' : '#A8B4C0'; // Metallic shoulder plate
          }
        }
        // B3. V-Neck Metallic Collar Trim
        else if (Math.abs(ry - (-r * 0.12 + Math.abs(rx) * 0.45)) < P * 0.9 && Math.abs(rx) <= r * 0.30 && ry <= -r * 0.02) {
          ctx.fillStyle = '#B0B8C2'; // Metallic collar trim
        }
        // B4. Armor Panel Seam Lines
        else if (Math.abs(Math.abs(rx) - r * 0.42) < P * 0.6) {
          ctx.fillStyle = '#101217'; // Seam line
        }
        // B5. Tactical Vest Body
        else {
          let vestCol = '#1A1D24';
          if (Math.abs(rx) < r * 0.35 && ry < r * 0.15) {
            vestCol = '#22262F'; // Chest fabric highlight
          } else if (Math.abs(rx) > r * 0.50 || ry > r * 0.28) {
            vestCol = '#13151A'; // Vest shadow
          }
          ctx.fillStyle = vestCol;
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone C: Tactical Belt & Gold Buckle (r * 0.38 <= ry < r * 0.51)
      else if (ry < r * 0.51) {
        // Golden Buckle at center
        const isBuckle = (Math.abs(rx) <= r * 0.28);
        if (isBuckle) {
          if (Math.abs(rx) <= r * 0.12 && Math.abs(ry - r * 0.44) <= r * 0.04) {
            ctx.fillStyle = '#241D09'; // Buckle inner slot notch
          } else if (rx < -P && ry < r * 0.44) {
            ctx.fillStyle = '#FFF2A8'; // Metallic buckle glint
          } else {
            ctx.fillStyle = '#D4AF37'; // Gold buckle plate
          }
        } else if (Math.abs(Math.abs(rx) - r * 0.37) < P * 0.8) {
          ctx.fillStyle = '#A0AAB5'; // Silver belt loop
        } else {
          ctx.fillStyle = (ry < r * 0.44) ? '#1A1D24' : '#101216'; // Belt strap
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone D: Black Combat Pants (ry >= r * 0.51)
      else {
        // Center fly seam line
        if (Math.abs(rx) < P * 0.6 && ry <= r * 0.88) {
          ctx.fillStyle = '#2A2E38'; // Pants seam line
        } else if (Math.abs(rx) > r * 0.70 || ry > r * 0.82) {
          ctx.fillStyle = '#0E1013'; // Pants shadow
        } else {
          ctx.fillStyle = '#16181C'; // Black combat pants body
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // 4 Segmented Cybernetic Joint Clamps (12, 3, 6, 9 o'clock)
  const clampOffsets = [
    { x: 0, y: -r + P },
    { x: r - P, y: 0 },
    { x: 0, y: r - P },
    { x: -r + P, y: 0 }
  ];
  for (const co of clampOffsets) {
    const cx = snap(co.x);
    const cy = snap(co.y);
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(cx - P, cy - P, P * 2, P * 2);
    ctx.fillStyle = '#4A5260';
    ctx.fillRect(cx, cy, P, P);
  }

  ctx.restore();
}

/**
 * Hand Renderer for Genos — High-tech multi-layered mechanical arms with segmented armor,
 * panel lines, energy conduit grooves, joint bolts, and a glowing palm blast port cannon (Pixel Art).
 */
export function drawGenosHands(ctx, fighter, isPreTranslated = false) {
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  if (isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands) return;

  const isPunching = (fighter.punchAnimTimer && fighter.punchAnimTimer > 0) || fighter.isFlurrying;
  const isBasicAttacking = fighter.basicBlastAnimTimer && fighter.basicBlastAnimTimer > 0;
  const isChargingUlt = fighter.isChargingUlt || fighter.isFiringUlt;
  const isSelfDestructing = fighter.isSelfDestructing;
  const r = fighter.r || 25;
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
 * Draws a single detailed high-tech mechanical arm / fist in authentic Pixel Art Style.
 * @param {number} punchGlow - 0..1 sinusoidal punch impact intensity for fire aura & speed lines
 */
function _drawMechArm(ctx, cx, cy, hr, palmColor, isChargingUlt, isSelfDestructing, isFiringArm, blastProgress, punchGlow = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const handX = snap(cx);
  const handY = snap(cy);
  const gridR = Math.max(P * 2, hr);
  const steps = Math.ceil(gridR / P);

  // ── 1. PUNCH IMPACT VISUAL: Stepped Pixel Fire Aura + Speed Lines ──
  if (punchGlow > 0.05) {
    const maxAuraR = snap(gridR * 2.2 * punchGlow);
    for (let gy = -maxAuraR; gy <= maxAuraR; gy += P) {
      for (let gx = -maxAuraR; gx <= maxAuraR; gx += P) {
        const dist = Math.hypot(gx, gy);
        if (dist > maxAuraR) continue;

        const px = snap(handX + gx);
        const py = snap(handY + gy);

        if (dist >= maxAuraR - P) {
          ctx.fillStyle = '#150500'; // Dark obsidian border
        } else if (dist < hr * 0.60) {
          ctx.fillStyle = '#FFFFFF'; // Superheated pure white core
        } else if (dist < hr * 1.30) {
          ctx.fillStyle = '#FFE600'; // Solar yellow
        } else if (dist < hr * 1.75) {
          ctx.fillStyle = '#FF5500'; // Fiery orange
        } else {
          ctx.fillStyle = '#CC2A00'; // Magma crimson
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // ── 2. Directional Barrel Nozzle (Points towards +X aim target) ──
  const nozzleW = snap(hr * 0.45);
  const nozzleH = snap(hr * 0.60);
  const nStartX = snap(handX + hr * 0.50);
  const nStartY = snap(handY - nozzleH * 0.5);

  ctx.fillStyle = '#0D1117';
  ctx.fillRect(nStartX, nStartY - P, nozzleW + P, nozzleH + P * 2);
  ctx.fillStyle = '#1C2530';
  ctx.fillRect(nStartX, nStartY, nozzleW, nozzleH);
  ctx.fillStyle = palmColor;
  ctx.fillRect(nStartX + nozzleW, nStartY + P, P, nozzleH - P * 2);

  // ── 3. Stepped 2D Cybernetic Fist Body ──
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > gridR) continue;

      const px = snap(handX + rx);
      const py = snap(handY + ry);

      // 4-neighbor attached border shell
      if (Math.hypot(rx + P, ry) > gridR || Math.hypot(rx - P, ry) > gridR || Math.hypot(rx, ry + P) > gridR || Math.hypot(rx, ry - P) > gridR) {
        ctx.fillStyle = '#0D1117'; // Dark manga border
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Palm Blast Cannon Port at Center (dist <= hr * 0.42)
      if (dist <= hr * 0.42) {
        if (dist <= hr * 0.16) {
          ctx.fillStyle = '#FFFFFF'; // White-hot port core
        } else if (dist <= hr * 0.32) {
          ctx.fillStyle = palmColor; // Palm cannon throat
        } else {
          ctx.fillStyle = '#0A0D12'; // Cannon recess ring
        }
      }
      // Specular Chrome Highlight (top-left)
      else if (rx < 0 && ry < -gridR * 0.30 && dist > gridR * 0.50) {
        ctx.fillStyle = '#D4E0EC'; // Bright chrome glint
      }
      // Armor Plating & Knuckle Guards
      else {
        let armorCol;
        if (dist >= gridR - P * 1.5) {
          armorCol = '#4A5568'; // Outer knuckle guard ring
        } else if (rx > 0 && Math.abs(ry) < gridR * 0.30) {
          armorCol = '#7A8B9D'; // Forward knuckle face
        } else if (ry > gridR * 0.35) {
          armorCol = '#2E3A46'; // Lower plate shadow
        } else {
          armorCol = '#5C6E80'; // Base metallic chrome armor
        }
        ctx.fillStyle = armorCol;
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // ── 4. Energy Conduit Pixels ──
  const conduitCol = isChargingUlt ? '#FFE600' : (isSelfDestructing ? '#00FFFF' : '#FF5500');
  ctx.fillStyle = conduitCol;
  ctx.fillRect(snap(handX - hr * 0.55), snap(handY - hr * 0.50), P, P);
  ctx.fillRect(snap(handX - hr * 0.35), snap(handY - hr * 0.30), P, P);
  ctx.fillRect(snap(handX + hr * 0.55), snap(handY - hr * 0.50), P, P);
  ctx.fillRect(snap(handX + hr * 0.35), snap(handY - hr * 0.30), P, P);
  ctx.fillRect(snap(handX), snap(handY + hr * 0.55), P, P);

  // ── 5. Muzzle Flash Flare (When firing basic blast) ──
  if (isFiringArm && blastProgress > 0 && blastProgress < 0.6) {
    const flashScale = Math.sin((blastProgress / 0.6) * Math.PI);
    const flashR = snap(hr * 2.2 * flashScale);
    const fx = snap(handX + hr * 0.90);
    const fy = handY;

    for (let gy = -flashR; gy <= flashR; gy += P) {
      for (let gx = -flashR; gx <= flashR; gx += P) {
        const dist = Math.hypot(gx, gy);
        if (dist > flashR) continue;
        const px = snap(fx + gx);
        const py = snap(fy + gy);

        if (dist < flashR * 0.35) {
          ctx.fillStyle = '#FFFFFF';
        } else if (dist < flashR * 0.70) {
          ctx.fillStyle = '#FFE600';
        } else {
          ctx.fillStyle = '#FF5500';
        }
        ctx.fillRect(px, py, P, P);
      }
    }
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

