import { getHandSize } from '../../core/config.js';
import { GojoRenderer } from './gojoRenderer.js';
import { state } from '../../core/state.js';

function drawTakadaIdolAura(ctx, fighter) {
  const r = fighter.r || 25;
  const time = Date.now() * 0.003;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Radiant Pink & Gold Idol Aura Rings
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const scale = 1.2 + Math.sin(time * 2 + i * 1.5) * 0.15;
    ctx.strokeStyle = i % 2 === 0 ? `rgba(236, 72, 153, 0.65)` : `rgba(251, 191, 36, 0.65)`;
    ctx.lineWidth = 4 - i;
    ctx.beginPath();
    ctx.arc(0, 0, r * scale + i * 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Animated Idol Hearts & Stars drifting around Todo
  const sparkleCount = 6;
  for (let i = 0; i < sparkleCount; i++) {
    const sAngle = time * 1.5 + (i * Math.PI * 2 / sparkleCount);
    const dist = r * 1.45 + Math.sin(time * 3 + i) * 6;
    const sx = Math.cos(sAngle) * dist;
    const sy = Math.sin(sAngle) * dist;

    ctx.fillStyle = i % 2 === 0 ? '#ff66cc' : '#ffd700';
    ctx.beginPath();
    ctx.arc(sx, sy, 3 + Math.sin(time * 4 + i) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Glowing Takada Idol Banner above head
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillStyle = '#ec4899';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff66cc';
  ctx.shadowBlur = 8;
  ctx.fillText('♥ TAKADA-CHAN ♥', 0, -r - 35);
  ctx.shadowBlur = 0;

  ctx.restore();
}

/**
 * Visual Skin Renderer for Aoi Todo (Boogie Woogie Brawler)
 */
export function drawTodoSkin(ctx, fighter) {
  const r = fighter.r;
  const skinColor = '#EBBF9E'; // Naked Tone skin base

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  
  // Draw Takada-chan Idol Ultimate Aura if active or channeling
  if (fighter.isTakadaUltActive || fighter.isTakadaChanneling) {
    ctx.save();
    drawTakadaIdolAura(ctx, fighter);
    ctx.restore();
  }

  // Draw Cursed Energy body aura if opacity > 0 (disabled on winner reveal / champion screen)
  const auraOpacity = (fighter && fighter._isWinnerReveal) ? 0 : (fighter.combatAuraOpacity || 0);
  if (auraOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = auraOpacity;
    drawTodoCursedEnergyAura(ctx, fighter);
    ctx.restore();
  }
  
  const isClapping = (fighter.clapAnimTimer || 0) > 0 || (fighter.clapWindupTimer || 0) > 0 || (fighter.clapHoldTimer || 0) > 0;

  let angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  if (isClapping) {
    angle = 0; // Force Todo to face directly towards the camera/viewer when clapping!
  }
  ctx.rotate(angle);
  const facingLeft = !isClapping && Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Smooth sinusoidal punch progress
  const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || fighter._isWinnerReveal);
  const isPunching = !isMatchEnded && fighter.punchAnimTimer > 0;
  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 14;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }

  let easePunch = 0;
  if (isPunching) {
    if (rawProgress < 0.28) {
      easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
    } else {
      const retractT = (rawProgress - 0.28) / 0.72;
      easePunch = Math.cos(retractT * (Math.PI / 2));
    }
  }
  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;
  const oppositeRecoil = isPunching ? -Math.sin(rawProgress * Math.PI) * (r * 0.20) : 0;

  let frontHandX = 0, frontHandY = 0;
  let backHandX = 0, backHandY = 0;
  let clapLeftHandX = 0, clapLeftHandY = 0;
  let clapRightHandX = 0, clapRightHandY = 0;

  if (isClapping) {
    const animTimer = fighter.clapAnimTimer || 0;
    const windupTimer = fighter.clapWindupTimer || 0;

    let spread = 0;
    if (windupTimer > 0) {
      // Windup phase (7 frames): hands start wide apart on left/right and slam together
      const windupProgress = (7 - windupTimer) / 7.0; // 0.0 -> 1.0
      spread = r * 0.85 * Math.pow(1 - windupProgress, 1.8) + r * 0.06;
    } else {
      // Impact & release phase (13 frames): hands held together at center then retract
      const releaseProgress = Math.min(1.0, (13 - animTimer) / 13.0); // 0.0 -> 1.0
      if (releaseProgress < 0.25) {
        spread = r * 0.06; // Held together on impact
      } else {
        const retractP = (releaseProgress - 0.25) / 0.75;
        spread = r * 0.06 + r * 0.45 * Math.sin(retractP * Math.PI * 0.5);
      }
    }

    clapLeftHandX  = r * 0.88;
    clapLeftHandY  = -spread;
    clapRightHandX = r * 0.88;
    clapRightHandY = +spread;
  } else if (isPunching) {
    if (fighter.isRightPunch) {
      frontHandX = r * 0.85 + lungeExtension * 1.40;
      backHandX  = r * 1.05 + oppositeRecoil;
    } else {
      backHandX  = r * 1.05 + lungeExtension * 1.60;
      frontHandX = oppositeRecoil;
    }
  } else {
    // Idle brawler guard stance: front hand (top layer) centered at (0, 0), back hand (back layer) peeking out at (r * 1.05, 0)
    frontHandX = 0;        frontHandY = 0;
    backHandX  = r * 1.05; backHandY  = 0;
  }

  const handRadius = getHandSize(7.5);

  // 1. Render Back Hand (Back Layer - Behind Body Circle)
  if (!fighter._isWinnerReveal && !isClapping) {
    drawHandFist(ctx, backHandX, backHandY, handRadius, skinColor, fighter);
  }

  // Keep body facing camera
  ctx.save();
  ctx.rotate(Math.PI / 2);

  // 1a. Skin Tone Base (#EBBF9E) for Head, Face, Neck, and Arms
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  // Clip to body circle so shirt, belt, and pants stay perfectly flush with character body
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // 1b. Deep Magenta Purple Shirt (#6B2375) covering Torso & Shoulders ONLY (starts below chin at x = +r * 0.10)
  ctx.fillStyle = '#6B2375';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.47, Math.PI * 0.47);
  ctx.closePath();
  ctx.fill();

  // Shirt Crew-Neck Collar Line (#4A1553) below chin
  ctx.strokeStyle = '#4A1553';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(r * 0.10, -r * 0.35);
  ctx.lineTo(r * 0.10, r * 0.35);
  ctx.stroke();

  // Short Sleeve Shoulder Seams (#4A1553) on left and right shoulders
  ctx.strokeStyle = '#4A1553';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(r * 0.10, -r * 0.70);
  ctx.lineTo(r * 0.50, -r * 0.70);
  ctx.moveTo(r * 0.10, r * 0.70);
  ctx.lineTo(r * 0.50, r * 0.70);
  ctx.stroke();

  // 1c. Multi-Layer White Belt Sash / Obi (#EBEFF5) tied around waist (x = r * 0.50 to r * 0.65)
  ctx.fillStyle = '#EBEFF5';
  ctx.fillRect(r * 0.50, -r * 0.88, r * 0.15, r * 1.76);
  ctx.strokeStyle = '#111317';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r * 0.50, -r * 0.88, r * 0.15, r * 1.76);

  // Belt horizontal fold crease line (#B0B8C8)
  ctx.strokeStyle = '#B0B8C8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.575, -r * 0.85);
  ctx.lineTo(r * 0.575, r * 0.85);
  ctx.stroke();

  // 1d. Dark Charcoal / Black Baggy Hakama Pants (#18151D) — (bottom 25% of body: x = r * 0.65 to +r)
  ctx.fillStyle = '#18151D';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.28, Math.PI * 0.28);
  ctx.fill();

  // Hakama center seam line (#0B0A0E)
  ctx.strokeStyle = '#0B0A0E';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.66, 0);
  ctx.lineTo(r * 0.98, 0);
  ctx.stroke();

  ctx.restore(); // restore clipping region

  // Outer Body Circle Outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Pure Black Slicked-Back Hair Cap, Hairline & Topknot Man-Bun (#0A0A0A)
  ctx.fillStyle = '#0A0A0A'; // Pure Black Hair
  
  // 2a. Main Slicked-Back Hair Cap covering top of head down to forehead hairline (-X)
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.68, Math.PI * 1.32); // Top arc curve of head (-X)
  ctx.quadraticCurveTo(-r * 0.48, 0, r * Math.cos(Math.PI * 0.68), r * Math.sin(Math.PI * 0.68));
  ctx.closePath();
  ctx.fill();

  // 2b. Defined Frontal Hairline Contour Line (#000000) across forehead
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(r * Math.cos(Math.PI * 0.68), r * Math.sin(Math.PI * 0.68));
  ctx.quadraticCurveTo(-r * 0.48, 0, r * Math.cos(Math.PI * 1.32), r * Math.sin(Math.PI * 1.32));
  ctx.stroke();

  // 2c. Combed Hair Texture Strands (subtle dark grey lines running up toward topknot at top of head)
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 1.0;
  const hairOffsetsY = [-r * 0.35, -r * 0.18, 0, r * 0.18, r * 0.35];
  for (let yOff of hairOffsetsY) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.48, yOff);
    ctx.lineTo(-r * 0.88, yOff * 0.25);
    ctx.stroke();
  }

  // 2d. Topknot Bun centered on the top edge of the body (-r)
  ctx.fillStyle = '#0A0A0A';
  ctx.beginPath();
  ctx.arc(-r * 0.92, 0, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Topknot White hair tie band (#F3F3F3)
  ctx.fillStyle = '#F3F3F3';
  ctx.fillRect(-r * 0.82, -r * 0.16, 4, r * 0.32);

  // 3. Authentic Anime Facial Burn Scar (#CA9688) on left temple/cheek (upper face x = -r * 0.65 to -r * 0.25)
  ctx.save();
  ctx.fillStyle = '#CA9688'; // Warm Dusty Rose Burn Scar tissue
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.45);
  ctx.lineTo(-r * 0.65, -r * 0.18);
  ctx.lineTo(-r * 0.45, -r * 0.16);
  ctx.lineTo(-r * 0.32, -r * 0.18);
  ctx.lineTo(-r * 0.25, -r * 0.24);
  ctx.lineTo(-r * 0.38, -r * 0.42);
  ctx.lineTo(-r * 0.52, -r * 0.50);
  ctx.closePath();
  ctx.fill();

  // Contour outline around burn scar (#966054)
  ctx.strokeStyle = '#966054';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Horizontal skin crease lines across burn scar
  ctx.strokeStyle = 'rgba(150, 96, 84, 0.6)';
  ctx.lineWidth = 0.9;
  const creasePositions = [-0.60, -0.50, -0.40, -0.30];
  for (let posX of creasePositions) {
    const x = r * posX;
    ctx.beginPath();
    ctx.moveTo(x, -r * 0.42);
    ctx.lineTo(x, -r * 0.20);
    ctx.stroke();
  }

  ctx.restore();

  // 4. Martial Artist Eyebrows & Eyes (#141B26 / #F3F3F3) on upper head area (x = -r * 0.45 to -r * 0.25)
  ctx.fillStyle = '#141B26';
  // Right Eyebrow & Eye
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, r * 0.20);
  ctx.lineTo(-r * 0.30, r * 0.16);
  ctx.lineTo(-r * 0.40, r * 0.28);
  ctx.fill();

  // Left Eyebrow & Eye
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.20);
  ctx.lineTo(-r * 0.30, -r * 0.16);
  ctx.lineTo(-r * 0.40, -r * 0.28);
  ctx.fill();

  // Eye highlights (#F3F3F3)
  ctx.fillStyle = '#F3F3F3';
  ctx.beginPath();
  ctx.arc(-r * 0.36, r * 0.20, 1.1, 0, Math.PI * 2);
  ctx.arc(-r * 0.36, -r * 0.20, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // 5. "Black Flash Window" / Just Swapped Aura (incorporates lingering visual glow)
  const bfVal = fighter ? Math.max(fighter.justSwappedTimer || 0, fighter.blackFlashGlowTimer || 0) : 0;
  if (bfVal > 0) {
    const alpha = bfVal / 45;
    ctx.strokeStyle = `rgba(180, 0, 0, ${alpha})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Red/Black electrical arcs
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, Math.PI * 0.2, Math.PI * 0.8);
    ctx.arc(0, 0, r + 7, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
  ctx.restore(); // restore body rotate (Math.PI / 2)

  // 7. Draw Hands (Front Layer - On Top of Body Circle)
  if (!fighter._isWinnerReveal) {
    if (isClapping) {
      // Draw BOTH hands in front of body to show full clap animation facing the user!
      drawHandFist(ctx, clapLeftHandX, clapLeftHandY, handRadius, skinColor, fighter);
      drawHandFist(ctx, clapRightHandX, clapRightHandY, handRadius, skinColor, fighter);

      // Clap impact shockwave flash at palms collision point
      const windupTimer = fighter.clapWindupTimer || 0;
      const animTimer = fighter.clapAnimTimer || 0;
      if (windupTimer === 0 && animTimer > 8) {
        const flashAlpha = Math.min(1.0, (animTimer - 8) / 5.0);
        ctx.save();
        const flashGrad = ctx.createRadialGradient(r * 0.88, 0, 2, r * 0.88, 0, handRadius * 2.2);
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * flashAlpha})`);
        flashGrad.addColorStop(0.4, `rgba(0, 229, 255, ${0.75 * flashAlpha})`);
        flashGrad.addColorStop(1.0, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(r * 0.88, 0, handRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      drawHandFist(ctx, frontHandX, frontHandY, handRadius, skinColor, fighter);
    }
  }

  // Draw status overlays (slow, electric stun, black flash, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();

  // 8. Draw Cursed Rocks (drawn in absolute world space outside fighter transform)
  drawCursedRocks(ctx, fighter);
}

/** Draws a brawler fist matching skin color (#EBBF9E) with optional Cursed Energy glow */
function drawHandFist(ctx, x, y, radius, skinColor, fighter) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  
  const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || (fighter && fighter._isWinnerReveal));
  const inBFState = (fighter && (fighter.justSwappedTimer > 0 || fighter.blackFlashGlowTimer > 0));
  const bfVal = fighter ? Math.max(fighter.justSwappedTimer || 0, fighter.blackFlashGlowTimer || 0) : 0;
  const alpha = isMatchEnded ? 0.90 : (bfVal / 45);

  // 1. CE glow around fist — standard blue or Black Flash zone crimson/black theme
  const opacity = (fighter && fighter._isWinnerReveal) ? 0 : ((fighter && fighter.combatAuraOpacity !== undefined) ? fighter.combatAuraOpacity : 0.0);
  const glow = Math.max(opacity, inBFState ? alpha : 0);
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  if (!isLowQuality && glow > 0.01) {
    const fistCeGrad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 1.75);
    
    if (inBFState) {
      // Crimson Zone Glow: Lilac-white core -> Deep Crimson red -> Stark Black edge
      fistCeGrad.addColorStop(0,    `rgba(243, 232, 255, ${0.95 * alpha})`);
      fistCeGrad.addColorStop(0.35, `rgba(179, 0, 0, ${0.85 * alpha})`);
      fistCeGrad.addColorStop(0.75, `rgba(0, 0, 0, ${0.75 * alpha})`);
      fistCeGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
    } else {
      fistCeGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * glow})`);
      fistCeGrad.addColorStop(0.35, `rgba(0, 235, 255, ${0.70 * glow})`);
      fistCeGrad.addColorStop(0.75, `rgba(0, 140, 255, ${0.35 * glow})`);
      fistCeGrad.addColorStop(1.0, 'rgba(0, 80, 255, 0)');
    }

    ctx.fillStyle = fistCeGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.75, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Fist body
  if (inBFState) {
    ctx.save();
    // Inner blooming gradient inside the hand itself
    const innerGrad = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    innerGrad.addColorStop(0,   `rgba(255, 230, 235, ${0.7 * alpha})`);  // hot white core
    innerGrad.addColorStop(0.5, `rgba(230, 0, 30, ${0.45 * alpha})`);   // bright blooming crimson
    innerGrad.addColorStop(1,   `rgba(120, 0, 10, ${0.15 * alpha})`);     // transparent deep crimson edge
    ctx.fillStyle = innerGrad;

    // Glowing bloom shadow (shadowBlur) on the fill itself!
    // OPTIMIZED: Removed shadowColor and shadowBlur for performance

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = '#EBBF9E';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Solid black fist outline (or glowing crimson if in BF state)
  if (inBFState) {
    ctx.save();
    ctx.strokeStyle = `rgba(230, 0, 30, ${0.65 * alpha})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawCursedRocks(ctx, fighter) {
  if (!fighter.cursedRocks || fighter.cursedRocks.length === 0) return;

  for (let rock of fighter.cursedRocks) {
    const isTargetOfClap = rock.hasTriggeredTeleport || 
      (fighter.pendingSwapData && (fighter.pendingSwapData.rock === rock || fighter.pendingSwapData.swapTarget === rock));

    let ceSurgeAlpha = 0.0; // Idle rock has NO CE aura displayed!
    let rockAuraRadius = rock.radius * 1.35; // Balanced aura size relative to rock radius

    if (isTargetOfClap && (fighter.clapAnimTimer || 0) > 0) {
      const animTimer = fighter.clapAnimTimer || 0;
      const windupTimer = fighter.clapWindupTimer || 0;

      if (windupTimer > 0) {
        // Phase 1: Smooth Fade-In (0.0 -> 1.0) as hands swing together
        const progressIn = Math.min(1.0, Math.max(0.0, (20 - animTimer) / 7.0));
        ceSurgeAlpha = Math.pow(progressIn, 1.5);
      } else {
        // Phase 2: Smooth Fade-Out (1.0 -> 0.0) as hands retract after clap impact
        const progressOut = Math.min(1.0, Math.max(0.0, animTimer / 13.0));
        ceSurgeAlpha = Math.pow(progressOut, 1.2);
      }

      rockAuraRadius = rock.radius * (1.1 + ceSurgeAlpha * 0.4); // Dynamic aura radius matching intensity
    }

    // 1. Render EXACT JJK Cursed Energy Sakuga Aura BEHIND rock (Smooth Fade-In -> Peak -> Smooth Fade-Out)
    if (ceSurgeAlpha > 0.01) {
      const rockFighter = {
        x: rock.x,
        y: rock.y,
        r: rockAuraRadius,
        combatAuraOpacity: ceSurgeAlpha
      };
      GojoRenderer._drawJJKCursedEnergyAura(ctx, rockFighter, 'blue', rock.x, rock.y, rockAuraRadius);
    }

    // 2. Base Grey Rock Body
    ctx.save();
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
    ctx.fill();

    // Solid Black Rock Outline
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Render JJK Cursed Energy Cyan Flame Aura surrounding Todo's body
 */
function drawTodoCursedEnergyAura(ctx, fighter) {
  const r = fighter.r;
  const time = Date.now();

  ctx.save();

  // 1. Outer Radial Glow Bloom (Deep Cyan & Electric Blue)
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const outerRadius = r * 1.85;
  if (!isLowQuality) {
    const glowGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, outerRadius);
    glowGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    glowGrad.addColorStop(0.35, 'rgba(0, 175, 255, 0.18)');
    glowGrad.addColorStop(0.70, 'rgba(0, 100, 255, 0.09)');
    glowGrad.addColorStop(1.0, 'rgba(0, 40, 180, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Animated JJK Flame Tendrils (OPTIMIZED: reduced count 7->5, segments 8->5, flat fill instead of per-flame gradient)
  const flameCount = 5;
  for (let i = 0; i < flameCount; i++) {
    const baseAngle = (Math.PI * 2 / flameCount) * i;
    const rotation = time * 0.003;
    const angle = baseAngle + rotation;

    ctx.save();
    ctx.rotate(angle);

    const flameLength = r * (0.75 + Math.sin(time * 0.01 + i * 1.2) * 0.25);
    const flameWidth = r * 0.32;

    // OPTIMIZED: Use flat semi-transparent fill instead of creating a new LinearGradient per flame
    ctx.fillStyle = 'rgba(0, 200, 255, 0.28)';

    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);

    const segments = 5;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const x = r * 0.7 + flameLength * t;
      const waveOffset = Math.sin(time * 0.015 + j * 0.6 + i * 0.9) * flameWidth * (1 - t * 0.4);
      const width = flameWidth * (1 - t * 0.6);
      ctx.lineTo(x, waveOffset - width * 0.5);
    }

    for (let j = segments; j >= 0; j--) {
      const t = j / segments;
      const x = r * 0.7 + flameLength * t;
      const waveOffset = Math.sin(time * 0.015 + j * 0.6 + i * 0.9) * flameWidth * (1 - t * 0.4);
      const width = flameWidth * (1 - t * 0.6);
      ctx.lineTo(x, waveOffset + width * 0.5);
    }

    ctx.fill();
    ctx.restore();
  }

  // 3. Electric Cursed Energy Arcs / Rays (OPTIMIZED: reduced 4->3)
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.40)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    const sparkAngle = (Math.PI * 2 / 3) * i + (time * 0.007);
    const startR = r * 1.0;
    const endR = r * (1.3 + Math.sin(time * 0.01 + i) * 0.2);

    ctx.beginPath();
    ctx.moveTo(Math.cos(sparkAngle) * startR, Math.sin(sparkAngle) * startR);
    ctx.lineTo(Math.cos(sparkAngle) * endR, Math.sin(sparkAngle) * endR);
    ctx.stroke();
  }

  ctx.restore();
}

