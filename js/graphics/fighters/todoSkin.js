import { getHandSize } from '../../core/config.js';
import { GojoRenderer } from './gojoRenderer.js';
import { state } from '../../core/state.js';

/**
 * Visual Skin Renderer for Aoi Todo (Boogie Woogie Brawler)
 */
export function drawTodoSkin(ctx, fighter) {
  // 1. Draw afterimages (Zone trails) at their absolute coordinates
  if (fighter.afterImages && fighter.afterImages.length > 0) {
    ctx.save();
    for (let i = 0; i < fighter.afterImages.length; i++) {
      const ai = fighter.afterImages[i];
      if (ai.timer <= 0) continue;
      const progress = ai.timer / ai.maxTimer;
      const alpha = progress * 0.35; // Soft trail opacity

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ai.x, ai.y);
      ctx.rotate(ai.angle);

      // Flip vertically if facing left
      if (Math.abs(ai.angle) > Math.PI / 2) {
        ctx.scale(1, -1);
      }

      // Draw Todo afterimage body circle (deep gold/bronze theme silhouette)
      ctx.beginPath();
      ctx.arc(0, 0, ai.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(210, 105, 30, 0.4)'; // Todo's chocolate theme silhouette
      ctx.fill();

      // Add a soft red glow outline
      ctx.strokeStyle = 'rgba(230, 0, 30, 0.5)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  const r = fighter.r;
  const skinColor = '#EBBF9E'; // Naked Tone skin base

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  
  // Draw Cursed Energy body aura if opacity > 0 or on victory screen
  const auraOpacity = (fighter && fighter._isWinnerReveal) ? 1.0 : (fighter.combatAuraOpacity || 0);
  if (auraOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = auraOpacity;
    drawTodoCursedEnergyAura(ctx, fighter);
    ctx.restore();
  }
  
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Smooth sinusoidal punch progress
  const isPunching = fighter.punchAnimTimer > 0;
  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 22;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }

  const easePunch = Math.sin(rawProgress * Math.PI);
  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;
  const oppositeRecoil = isPunching ? -Math.sin(rawProgress * Math.PI * 0.8) * (r * 0.25) : 0;

  let frontHandX, frontHandY, backHandX, backHandY;

  if (isPunching) {
    frontHandX = -r * 0.55; frontHandY = r * 0.35;
    backHandX  =  r * 0.55; backHandY  = r * 0.35;

    if (fighter.isRightPunch) {
      frontHandX += lungeExtension * 1.40;
      frontHandY += (0.12 - frontHandY) * easePunch;
      backHandX  += oppositeRecoil;
    } else {
      backHandX  += lungeExtension * 1.60;
      backHandY  += (0.12 - backHandY) * easePunch;
      frontHandX += oppositeRecoil;
    }
  } else {
    // Idle brawler guard stance: outer hand extends forward toward enemy at shoulder height
    frontHandX = r * 0.85; frontHandY = r * 0.15;
    backHandX  = 0;        backHandY  = -r * 0.15;
  }

  const handRadius = getHandSize(7.5);

  // 1. Render Back Hand (Back Layer - Behind Body Circle)
  if (!fighter._isWinnerReveal) {
    drawHandFist(ctx, backHandX, backHandY, handRadius, skinColor, fighter);
  }

  // Keep body facing camera
  ctx.save();
  ctx.rotate(Math.PI / 2);

  // 1a. Naked Tone Skin Base (#EBBF9E)
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 1b. Dark Navy Blue Hakama Pants (#223148) at bottom/feet
  ctx.fillStyle = '#223148';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.25, Math.PI * 0.25);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Pure Black Spiky Hair & Topknot Man-Bun (#0A0A0A)
  ctx.fillStyle = '#0A0A0A'; // Pure Black Hair
  // Spiky hair tufts along top curve of head
  ctx.beginPath();
  ctx.arc(-r * 0.70, 0, r * 0.55, Math.PI * 0.45, Math.PI * 1.55);
  ctx.fill();

  // Larger Topknot Bun centered on the top edge of the body (-r)
  ctx.beginPath();
  ctx.arc(-r * 0.95, 0, r * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Topknot White hair tie band (#F3F3F3)
  ctx.fillStyle = '#F3F3F3';
  ctx.fillRect(-r * 0.85, -r * 0.20, 5, r * 0.40);

  // 3. Authentic Anime Facial Burn Scar (#CA9688)
  ctx.save();
  ctx.fillStyle = '#CA9688'; // Warm Dusty Rose Burn Scar tissue
  ctx.beginPath();
  // Wide top edge along hair line
  ctx.moveTo(-r * 0.48, -r * 0.52);
  ctx.lineTo(-r * 0.48, -r * 0.22);

  // Inner edge (near nose/center line)
  ctx.lineTo(-r * 0.15, -r * 0.20);
  ctx.lineTo(r * 0.20, -r * 0.18);
  ctx.lineTo(r * 0.50, -r * 0.18);
  ctx.lineTo(r * 0.72, -r * 0.22);

  // Bottom edge (flat/rounded taper)
  ctx.lineTo(r * 0.72, -r * 0.32);

  // Outer edge (wavy stepped temple/cheekbone contour)
  ctx.lineTo(r * 0.55, -r * 0.42);
  ctx.lineTo(r * 0.40, -r * 0.55);
  ctx.lineTo(r * 0.18, -r * 0.62);
  ctx.lineTo(-r * 0.18, -r * 0.60);
  ctx.closePath();
  ctx.fill();

  // Contour outline around burn scar (#966054)
  ctx.strokeStyle = '#966054';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Horizontal skin crease lines across burn scar
  ctx.strokeStyle = 'rgba(150, 96, 84, 0.6)';
  ctx.lineWidth = 1.0;
  const creasePositions = [-0.40, -0.25, -0.10, 0.05, 0.20, 0.35, 0.50, 0.62];
  for (let posX of creasePositions) {
    const x = r * posX;
    ctx.beginPath();
    ctx.moveTo(x, -r * 0.48);
    ctx.lineTo(x, -r * 0.24);
    ctx.stroke();
  }

  ctx.restore();

  // 4. Martial Artist Eyebrows & Eyes (#223148 / #F3F3F3)
  ctx.fillStyle = '#141B26';
  // Right Eyebrow & Eye
  ctx.beginPath();
  ctx.moveTo(r * 0.3, r * 0.25);
  ctx.lineTo(r * 0.55, r * 0.2);
  ctx.lineTo(r * 0.35, r * 0.35);
  ctx.fill();

  // Left Eyebrow & Eye
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.25);
  ctx.lineTo(r * 0.55, -r * 0.2);
  ctx.lineTo(r * 0.35, -r * 0.35);
  ctx.fill();

  // Eye highlights (#F3F3F3)
  ctx.fillStyle = '#F3F3F3';
  ctx.beginPath();
  ctx.arc(r * 0.42, r * 0.24, 1.2, 0, Math.PI * 2);
  ctx.arc(r * 0.42, -r * 0.24, 1.2, 0, Math.PI * 2);
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

  // 7. Draw Front Hand (Front Layer - On Top of Body Circle)
  if (!fighter._isWinnerReveal) {
    drawHandFist(ctx, frontHandX, frontHandY, handRadius, skinColor, fighter);
  }

  // 8. Draw Cursed Rocks
  drawCursedRocks(ctx, fighter);

  ctx.restore();
}

/** Draws a brawler fist matching skin color (#EBBF9E) with optional Cursed Energy glow */
function drawHandFist(ctx, x, y, radius, skinColor, fighter) {
  ctx.save();
  
  const inBFState = (fighter && (fighter.justSwappedTimer > 0 || fighter.blackFlashGlowTimer > 0));
  const bfVal = fighter ? Math.max(fighter.justSwappedTimer || 0, fighter.blackFlashGlowTimer || 0) : 0;
  const alpha = bfVal / 45;

  // 1. CE glow around fist — standard blue or Black Flash zone crimson/black theme
  const opacity = (fighter && fighter._isWinnerReveal) ? 1.0 : ((fighter && fighter.combatAuraOpacity !== undefined) ? fighter.combatAuraOpacity : 0.0);
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

function drawCursedRocks(ctx, fighter) {
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

  // 2. Animated JJK Flame Tendrils (Rising & Waving Cyan CE Flames around Todo's body)
  const flameCount = 7;
  for (let i = 0; i < flameCount; i++) {
    const baseAngle = (Math.PI * 2 / flameCount) * i;
    const rotation = time * 0.003;
    const angle = baseAngle + rotation;

    ctx.save();
    ctx.rotate(angle);

    const flameLength = r * (0.75 + Math.sin(time * 0.01 + i * 1.2) * 0.25);
    const flameWidth = r * 0.32;

    const flameGrad = ctx.createLinearGradient(r * 0.7, 0, r * 0.7 + flameLength, 0);
    flameGrad.addColorStop(0, 'rgba(0, 240, 255, 0.40)');
    flameGrad.addColorStop(0.4, 'rgba(0, 160, 255, 0.30)');
    flameGrad.addColorStop(0.8, 'rgba(0, 90, 255, 0.14)');
    flameGrad.addColorStop(1, 'rgba(0, 40, 180, 0)');

    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);

    const segments = 8;
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

    ctx.fillStyle = flameGrad;
    ctx.fill();
    ctx.restore();
  }

  // 3. Electric Cursed Energy Arcs / Rays
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.40)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 4; i++) {
    const sparkAngle = (Math.PI / 2) * i + (time * 0.007);
    const startR = r * 1.0;
    const endR = r * (1.3 + Math.sin(time * 0.01 + i) * 0.2);

    ctx.beginPath();
    ctx.moveTo(Math.cos(sparkAngle) * startR, Math.sin(sparkAngle) * startR);
    ctx.lineTo(Math.cos(sparkAngle) * endR, Math.sin(sparkAngle) * endR);
    ctx.stroke();
  }

  ctx.restore();
}

