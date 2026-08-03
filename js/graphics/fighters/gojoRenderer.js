import { Fighter } from '../../entities/fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { drawGojoBody } from './gojoSkin.js';
import { drawGojoWeapon, drawGojoOrb, drawAnamorphicLensFlare } from '../weapons/gojoWeaponGraphics.js';
import { fastCleanArray, pushTrailCap } from '../particles/visualTrailSystem.js';

export class GojoRenderer {
  static draw(ctx, fighter) {
    if (fighter.isDead) return;

    // Domain Expansion Channeling Visuals (Ground ring, Aura)
    if (fighter.isChannelingDomainExpansion && (fighter.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, fighter.domainChargeTimer / Math.max(1, fighter.domainChargeMax));

      ctx.save();
      ctx.translate(fighter.x, fighter.y);

      // 2. Isometric Ground Summoning Ring
      ctx.scale(1, 0.4); // Isometric perspective
      const ringRadius = 160 * progress;

      // Outer glowing cyan ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(0, 229, 255, ${progress})`;
      ctx.stroke();

      // Inner rotating dashed indigo/purple ring
      ctx.rotate(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(138, 43, 226, ${progress * 1.2})`;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    // Purple Recovery Stasis Ring
    if ((fighter.purpleRecoveryTimer || 0) > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(Date.now() / 100) * 0.1;
      const ringRadius = (fighter.r + 10) * pulse;

      // Base glowing aura (Increased opacity for better visibility)
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, ringRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(138, 43, 226, 0.35)'; // Bright BlueViolet
      ctx.fill();
      ctx.strokeStyle = 'rgba(138, 43, 226, 0.85)';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // Countdown arc
      const maxRecovery = 120; // 2 seconds
      const ratio = Math.max(0, Math.min(1, fighter.purpleRecoveryTimer / maxRecovery));
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, ringRadius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
      ctx.strokeStyle = '#00E5FF'; // Very bright Cyan for maximum visibility
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    // Draw Sakuga Anime Impact Frame (matches reference image style with unique angle/variation)
    if (fighter.sakugaImpactTimer > 0) {
      fighter._drawSakugaImpactFrame(
        ctx,
        fighter.sakugaImpactX,
        fighter.sakugaImpactY,
        fighter.sakugaImpactTimer,
        fighter.sakugaImpactMaxTimer,
        fighter.sakugaImpactAngle || 0,
        fighter.sakugaImpactSeed || 0
      );
    }

    // Render residual hit flame wisps (soft, flowy, curling JJK spirit flames)
    if (fighter.hitFlameWisps && fighter.hitFlameWisps.length > 0) {
      const time = Date.now();
      fighter.hitFlameWisps.forEach((wisp, idx) => {
        const progress = wisp.timer / wisp.maxTimer;
        ctx.save();
        ctx.translate(wisp.x, wisp.y);
        ctx.rotate(wisp.angle);
        ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;

        const len = wisp.length * (0.8 + (1 - progress) * 0.6);
        const width = wisp.width * progress;
        const wave = Math.sin(time * 0.015 + idx * 2.3) * 4;

        // Draw soft, S-curved fluid flame wisp
        ctx.beginPath();
        ctx.moveTo(0, 0); // Flame base
        ctx.quadraticCurveTo(len * 0.4, width * 1.8 + wave, len * 0.75, width * 0.6);
        ctx.quadraticCurveTo(len + wave * 0.5, 0, len * 0.75, -width * 0.6);
        ctx.quadraticCurveTo(len * 0.4, -width * 1.8 - wave, 0, 0);
        ctx.closePath();

        // Soft glowing cyan-teal spirit flame fill
        ctx.fillStyle = 'rgba(0, 212, 204, 0.75)';
        ctx.fill();

        // Inner bright white-mint core flame
        ctx.beginPath();
        ctx.moveTo(len * 0.1, 0);
        ctx.quadraticCurveTo(len * 0.4, width * 0.8 + wave * 0.5, len * 0.6, 0);
        ctx.quadraticCurveTo(len * 0.4, -width * 0.8 - wave * 0.5, len * 0.1, 0);
        ctx.fillStyle = 'rgba(220, 255, 245, 0.6)';
        ctx.fill();

        // Soft translucent dark ink accent edge (hand-drawn JJK wisp accent)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 30, 20, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw afterimages during dodge & teleports
    if (fighter.afterImages && fighter.afterImages.length > 0) {
      ctx.save();
      fighter.afterImages.forEach(img => {
        if (img && img.timer > 0) {
          const alpha = (img.timer / 8) * 0.5;
          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.fillStyle = img.color || '#00BFFF';
          ctx.beginPath();
          ctx.arc(img.x, img.y, img.r || fighter.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // Draw Gojo Punch Impact Effects
    if (fighter.punchEffects && fighter.punchEffects.length > 0) {
      fighter.punchEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        const alpha = Math.sin((1 - prog) * Math.PI);

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // 1. Outer Glowing Blue Shockwave Ring
        const ringRadius = (fighter.r + 5) * (0.8 + 1.2 * prog);
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. High-contrast Black Ink Outline (makes it visible on white/light backgrounds)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2.5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.94, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Piercing White Impact Star Core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const numRays = 8;
        const innerR = 6 * (1 - prog);
        const outerR = 30 * (0.5 + 0.8 * prog);
        for (let i = 0; i < numRays; i++) {
          const a = (Math.PI * 2 / numRays) * i;
          const ra = a + Math.PI / numRays;
          ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
          ctx.lineTo(Math.cos(ra) * innerR, Math.sin(ra) * innerR);
        }
        ctx.closePath();
        ctx.fill();

        // 4. Directional Cyan Impact Sparks
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2.5;
        for (let i = -2; i <= 2; i++) {
          const sa = i * 0.3;
          const sDist = ringRadius * 1.1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sa) * (sDist * 0.5), Math.sin(sa) * (sDist * 0.5));
          ctx.lineTo(Math.cos(sa) * sDist, Math.sin(sa) * sDist);
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    // Draw afterimages during teleports & high-speed moves
    if (fighter.afterImages && fighter.afterImages.length > 0) {
      for (let i = 0; i < fighter.afterImages.length; i++) {
        const img = fighter.afterImages[i];
        if (img && img.timer > 0) {
          const maxT = img.maxTimer || 20;
          const progress = Math.max(0, Math.min(1, img.timer / maxT));
          const alpha = Math.pow(progress, 0.7) * 0.2;

          ctx.save();

          // 1. Dash Trajectory Line (Electric Cyan)
          if (img.fromX !== undefined && img.toX !== undefined) {
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(img.fromX, img.fromY);
            ctx.lineTo(img.toX, img.toY);
            ctx.stroke();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(img.fromX, img.fromY);
            ctx.lineTo(img.toX, img.toY);
            ctx.stroke();
            ctx.restore();
          }

          ctx.translate(img.x, img.y);
          ctx.rotate(img.angle || 0);

          // 2. Limitless Electric Cyan Cursed Energy Glow
          ctx.save();
          // OPTIMIZED: Replaced expensive radial gradient with layered alpha circles
          ctx.beginPath();
          ctx.arc(0, 0, fighter.r * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 100, 255, ${alpha * 0.3})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, fighter.r * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 191, 255, ${alpha * 0.5})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, fighter.r * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
          ctx.fill();
          ctx.restore();

          // 3. Body Circle Silhouette
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(0, 0, fighter.r * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = '#00BFFF';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // 4. Electric Blue Six Eyes Glints
          ctx.fillStyle = '#E0FFFF';
          ctx.beginPath();
          ctx.arc(fighter.r * 0.5, -fighter.r * 0.25, 3, 0, Math.PI * 2);
          ctx.arc(fighter.r * 0.5, fighter.r * 0.25, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          ctx.restore();
        }
      }
    }

    // (Reversal Red effect now drawn AFTER body — see below)

    // 1. Draw JJK Cursed Energy Flame Aura BEHIND body
    // Suppress aura while channeling Hollow Purple so Red & Blue orbs stand out cleanly
    // Also suppress when frozen by Gojo's own domain or when his domain is active
    const isFrozenByDomain = (fighter.timeStopTimer > 0) || (fighter.hitStunTimer > 0);
    const isInOwnDomain = fighter.domainActive;
    if (fighter.isChannelingPurple) {
      // Aura suppressed during Hollow Purple orb fusion
    } else if (fighter.isChannelingRCT || fighter.healingAuraTimer > 0) {
      fighter._drawJJKCursedEnergyAura(ctx, 'rct');
    } else if (!isFrozenByDomain && !isInOwnDomain && (fighter.combatAuraOpacity > 0 || state.gameState === 'countdown' || fighter._isWinnerReveal)) {
      fighter._drawJJKCursedEnergyAura(ctx, 'blue');
    }

    // Draw hand Cursed Energy flame blobs BEHIND body
    fighter._drawHandCursedEnergyAura(ctx);

    // 2. Draw fighter body
    drawGojoBody(ctx, fighter);

    if (!fighter.isChannelingPurple) {
      fighter.drawGun(ctx);
    }

    // 3. Draw physical circle hands + flare ON TOP of body
    fighter._drawHandCursedEnergy(ctx);

    // Draw Hollow Purple Red & Blue fusing orbs ON TOP of hands so hands don't cover them
    if (fighter.isChannelingPurple) {
      fighter.drawGun(ctx);
    }

    // Draw Reversal Red Orb + blast ON TOP of body and hands
    if (fighter.redEffectTimer > 0) {
      fighter._drawReversalRedEffect(ctx);
    }

    fighter.drawHealth(ctx);
    fighter.drawFreezeTimer(ctx);

    // Draw Reversal Red slow countdown rings on any affected enemies
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== fighter && f.redSlowTimer > 0) {
          fighter._drawRedSlowRing(ctx, f);
        }
      });
    }

    if (fighter._isWinnerReveal) {
      const t = Date.now();
      const orbitRadius = fighter.r + 40; 
      
      const drawOrbitingOrb = (colorType, angleOffset) => {
        const angle = (t / 600) + angleOffset;
        const ox = fighter.x + Math.cos(angle) * orbitRadius;
        const oy = fighter.y + Math.sin(angle) * orbitRadius * 0.4 - 10;
        drawGojoOrb(ctx, ox, oy, 9, t, colorType, 0);
      };
      
      drawOrbitingOrb('red', 0);
      drawOrbitingOrb('blue', (Math.PI * 2) / 3);
      drawOrbitingOrb('purple', (Math.PI * 4) / 3);
    }

    // Draw Domain Expansion Floating Text at the end so it is never overlayed by body or visuals
    if (fighter.isChannelingDomainExpansion && (fighter.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, fighter.domainChargeTimer / Math.max(1, fighter.domainChargeMax));
      ctx.save();
      ctx.translate(fighter.x, fighter.y);
      ctx.font = '30px "Glast Blitch", Arial';
      ctx.fillStyle = `rgba(0, 229, 255, ${progress})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      const textY = -fighter.r - 55 - (Math.sin(Date.now() / 150) * 5);
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);
      ctx.fillText('DOMAIN EXPANSION', 0, textY);
      ctx.restore();
    }
  }

  // Calculate hand positions for melee punch / skill gestures (Front POV style)
  static _getHandPositions(fighter) {
    const basePosY = (fighter.y - (fighter.z || 0));

    // Champion Screen / Victory Reveal / Fighter Index Stance / Round Countdown: Hide hands completely
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isWinnerScreen = fighter._isWinnerReveal || isCountdown || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));
    if (isWinnerScreen) {
      return null;
    }

    // Do not display extra hands when Reversal Red is active, when target of ambush, or in ranged mode (unless using punch/purple/domain)
    // EXCEPTION: During Hollow Purple mixing (isChannelingPurple), Red orb is still active but hands MUST show for the fusion gesture
    if ((fighter.redEffectTimer > 0 && !fighter.isChannelingPurple) || fighter.isTargetOfAmbush) {
      return null;
    }
    const isUsingHandSkill = (fighter.punchAnimTimer > 0) || (fighter.isChannelingPurple) || (fighter.isChannelingDomainExpansion);
    if (!fighter.isMeleeMode && !isUsingHandSkill) {
      return null;
    }

    const angle = fighter.gunAngle || 0;
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    // Helper to transform local Front POV coordinates to global coordinates
    const toGlobal = (lx, ly) => {
      if (facingLeft) ly = -ly; // Mirror across X axis when facing left
      return {
        x: fighter.x + (lx * cosA - ly * sinA),
        y: basePosY + (lx * sinA + ly * cosA)
      };
    };

    let hideFrontHand = false;
    let hideBackHand = false;
    const r = fighter.r || 25;

    // 2. Hollow Purple Fusion Gesture
    if (fighter.isChannelingPurple) {
      const mergeProgress = typeof fighter.getPurpleChargeProgress === 'function' ? fighter.getPurpleChargeProgress() : 0;
      const handDistance = r + 10;
      const handSpread = 14 * (1 - mergeProgress);

      const fHand = toGlobal(handDistance, handSpread);
      const bHand = toGlobal(handDistance, -handSpread);
      return { frontHandX: fHand.x, frontHandY: fHand.y, backHandX: bHand.x, backHandY: bHand.y, hideFrontHand, hideBackHand };
    }

    // 4. Domain Expansion Hand Sign Gesture
    if (fighter.isChannelingDomainExpansion) {
      const domainDist = r + 8;
      const fHand = toGlobal(domainDist, 3);
      const bHand = toGlobal(domainDist, -3);
      return { frontHandX: fHand.x, frontHandY: fHand.y, backHandX: bHand.x, backHandY: bHand.y, hideFrontHand, hideBackHand };
    }

    // Default rest positions in Front POV frame (+X is enemy, +Y is camera)
    // Left shoulder is at +X (closest to enemy), Right shoulder is at -X (furthest)
    let lx1 = -r * 0.55;    // Right Arm (frontHand/strikingX 0)
    let ly1 = r * 0.35;     // Slightly forward to camera
    
    let lx2 = r * 0.55;     // Left Arm (backHand)
    let ly2 = r * 0.35;     // Slightly forward to camera

    // 1. Snappy Dynamic Melee Punch Animation (Alternating 1-2 punches extending to target)
    if (fighter.punchAnimTimer > 0) {
      const maxT = fighter.punchActiveMaxTime || 8.0;
      const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
      const smoothP = rawProgress < 0.5 ? 4 * rawProgress * rawProgress * rawProgress : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
      const lungeProgress = Math.sin(smoothP * Math.PI); // Smooth 0 -> 1 -> 0 bell curve

      let reachDist = 75;
      const targetEnt = fighter.target || (fighter.flurryTarget && !fighter.flurryTarget.isDead ? fighter.flurryTarget : null);
      if (targetEnt) {
        const distToTarget = Math.hypot(targetEnt.x - fighter.x, targetEnt.y - fighter.y);
        reachDist = Math.max(45, Math.min(105, distToTarget - fighter.r * 0.45));
      }

      const punchDist = lungeProgress * reachDist;

      if (fighter.punchAnimHand === 0) {
        // --- RIGHT HAND PUNCH (Strikes along right flank and flies over body!) ---
        lx1 += punchDist * 1.5; 
        ly1 *= 0.4;
      } else {
        // --- LEFT HAND PUNCH (Strikes along left flank) ---
        lx2 += punchDist * 1.2; 
        ly2 *= 0.4;
      }
    }

    const fHand = toGlobal(lx1, ly1);
    const bHand = toGlobal(lx2, ly2);

    return { 
      frontHandX: fHand.x, frontHandY: fHand.y, 
      backHandX: bHand.x, backHandY: bHand.y, 
      hideFrontHand, hideBackHand 
    };
  }

  // Render hand Cursed Energy flame aura BEHIND physical body
  static _drawHandCursedEnergyAura(ctx, fighter) {
    // Hide Cursed Energy aura on hands during domain activation and domain expansion
    if (fighter.isChannelingDomainExpansion || fighter.domainActive) return;

    const hands = fighter._getHandPositions();
    if (!hands) return;

    const isRCT = (fighter.isChannelingRCT || fighter.healingAuraTimer > 0);
    const isPurple = (fighter.isChannelingPurple);
    const isFrozenByDomain = (fighter.timeStopTimer > 0) || (fighter.hitStunTimer > 0);
    const isActive = !isRCT && !isPurple && !isFrozenByDomain && ((fighter.combatAuraOpacity > 0.05) || (fighter.isMeleeMode) || (fighter.punchAnimTimer > 0) || (fighter.redEffectTimer > 0) || (state.gameState === 'countdown'));

    if (isActive) {
      // During Phase 1 (orb buildup), suppress the hand aura so the red orb stands alone.
      // During Phase 2+ blast the hand aura can show.
      const buildupFrames = (typeof CONFIG !== 'undefined' && CONFIG.gojo?.redBuildupFrames) || 20;
      const totalFrames  = fighter.redEffectMaxTimer || 75;
      const elapsed      = totalFrames - fighter.redEffectTimer;
      const isOrbBuildup = (fighter.redEffectTimer > 0) && fighter.redBuildupPhase;
      if (isOrbBuildup) return; // Suppress during buildup — orb renders on top

      const theme = (fighter.redEffectTimer > 0 ? 'blue' : 'blue'); // always blue for hand aura
      const blobRadius = (fighter.punchAnimTimer > 0) ? 15.0 : 12.0;

      if (!hands.hideFrontHand) fighter._drawJJKCursedEnergyAura(ctx, theme, hands.frontHandX, hands.frontHandY, blobRadius);
      if (!hands.hideBackHand) fighter._drawJJKCursedEnergyAura(ctx, theme, hands.backHandX, hands.backHandY, blobRadius);
    }
  }

  // Render physical circle hands ON TOP of body
  static _drawHandCursedEnergy(ctx, fighter) {
    const hands = fighter._getHandPositions();
    if (!hands) return;

    const { frontHandX, frontHandY, backHandX, backHandY, hideFrontHand, hideBackHand } = hands;

    // Draw Physical Circle Hands ON TOP of body
    ctx.save();
    ctx.fillStyle = fighter.color || '#FFE4C4';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    if (!hideFrontHand) {
      ctx.beginPath();
      ctx.arc(frontHandX, frontHandY, getHandSize(6.5, fighter), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (!hideBackHand) {
      ctx.beginPath();
      ctx.arc(backHandX, backHandY, getHandSize(6.5, fighter), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Draw Cursed Energy fist glow around punching hand during punch animation ON TOP of fighters (suppressed during domain)
    if (fighter.punchAnimTimer > 0 && !fighter.domainActive && !fighter.isChannelingDomainExpansion) {
      const strikingX = fighter.punchAnimHand === 0 ? frontHandX : backHandX;
      const strikingY = fighter.punchAnimHand === 0 ? frontHandY : backHandY;

      ctx.save();
      ctx.translate(strikingX, strikingY);

      // Glowing Cursed Energy aura around punching fist
      const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
      auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      auraGrad.addColorStop(0.35, 'rgba(0, 229, 255, 0.85)');
      auraGrad.addColorStop(0.7, 'rgba(0, 150, 255, 0.4)');
      auraGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Cyan Cursed Energy Ray Flares
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const rayAngle = (Math.PI / 2) * i + (Date.now() * 0.01);
        ctx.beginPath();
        ctx.moveTo(Math.cos(rayAngle) * 3, Math.sin(rayAngle) * 3);
        ctx.lineTo(Math.cos(rayAngle) * 12, Math.sin(rayAngle) * 12);
        ctx.stroke();
      }

      ctx.restore();
    }

  }

  static drawOutline(ctx, fighter) {
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = fighter.color;
    ctx.stroke();
  }

  static _drawHealingAura(ctx, fighter) {
    const progress = fighter.healingAuraTimer / 180; // Fade out as timer decreases
    const time = Date.now();

    // Use source-over to properly layer colors on white background
    // 'lighter' blending on white background makes colors invisible
    ctx.globalCompositeOperation = 'source-over';

    // OPTIMIZED: Replaced 5 expensive per-frame radial gradients with layered alpha circles
    // which look nearly identical but render exponentially faster.
    
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.globalAlpha = progress;

    // === LAYER 1: THE DARK OUTER EDGE (Deep Blue Silhouette) ===
    const outerRadius = fighter.r * 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40, 120, 255, 0.4)';
    ctx.fill();

    // === LAYER 2: SOFT SMUDGING (Rich Blue Gradient) ===
    const smokeRadius = fighter.r * 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, smokeRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80, 160, 255, 0.5)';
    ctx.fill();

    // === LAYER 3: THE BRIGHT CORE (Vibrant Blue) ===
    const coreRadius = fighter.r * 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120, 200, 255, 0.6)';
    ctx.fill();

    // === LAYER 4: THE HOT CENTER (Bright Emerald Green & Cyan Core) ===
    const whiteHotRadius = fighter.r * 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, whiteHotRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 150, 0.7)';
    ctx.fill();
    
    ctx.restore();

    // === LAYER 5: CAST DEEP SHADOWS (Dark Shadows on Back Side) ===
    // Creates dramatic contrast by placing dark shadows on parts facing away
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    // Shadow gradient - darker on the opposite side of the energy source
    const shadowAngle = Math.atan2(-fighter.vy, -fighter.vx) || 0; // Shadow opposite to movement
    ctx.rotate(shadowAngle);

    const shadowGrad = ctx.createRadialGradient(0, 0, fighter.r * 0.8, 0, 0, fighter.r * 1.4); // Reduced from 2
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(0.5, `rgba(40, 120, 200, ${0.9 * progress})`); // Brighter blue shadow
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    // Draw shadow crescent on the back side
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r * 2, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.arc(0, 0, fighter.r * 0.8, Math.PI * 0.3, -Math.PI * 0.3, true);
    ctx.closePath();
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    ctx.restore();

    // === LAYER 6: SHARP OUTLINES (Fine Whipping Wind Lines) ===
    // Sharp, whipping wind lines showing the direction the energy is flowing
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    const windLineCount = 16;
    for (let i = 0; i < windLineCount; i++) {
      const baseAngle = (Math.PI * 2 / windLineCount) * i;
      const wobble = Math.sin(time * 0.008 + i * 0.5) * 0.1;
      const angle = baseAngle + wobble;

      const startDist = fighter.r * (0.6 + Math.sin(time * 0.01 + i) * 0.1); // Reduced from 0.9
      const length = fighter.r * (0.5 + Math.sin(time * 0.012 + i * 0.7) * 0.4); // Reduced from 0.8

      const x1 = Math.cos(angle) * startDist;
      const y1 = Math.sin(angle) * startDist;
      const x2 = Math.cos(angle) * (startDist + length);
      const y2 = Math.sin(angle) * (startDist + length);

      // Draw sharp wind line with gradient - bright blue for visibility
      const windGrad = ctx.createLinearGradient(x1, y1, x2, y2);
      windGrad.addColorStop(0, `rgba(120, 200, 255, ${0.98 * progress})`);
      windGrad.addColorStop(0.5, `rgba(100, 180, 255, ${0.9 * progress})`);
      windGrad.addColorStop(1, 'rgba(80, 160, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = windGrad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Extra sharp tip at the end - bright cyan
      ctx.beginPath();
      ctx.arc(x2, y2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.fill();
    }
    ctx.restore();

    // === LAYER 7: FLAME TENDRILS (The Iconic Engulfed-in-Flames Effect) ===
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    const flameCount = 8;
    for (let i = 0; i < flameCount; i++) {
      const baseAngle = (Math.PI * 2 / flameCount) * i;
      const rotation = time * 0.003; // Slow rotation
      const angle = baseAngle + rotation;

      ctx.save();
      ctx.rotate(angle);

      // Flame tendril - animated wavy shape
      const flameLength = fighter.r * (1.0 + Math.sin(time * 0.01 + i) * 0.3); // Reduced from 1.4
      const flameWidth = fighter.r * 0.3; // Reduced from 0.4

      // Create flame gradient (bright blue for visibility)
      const flameGrad = ctx.createLinearGradient(fighter.r * 0.6, 0, fighter.r * 0.6 + flameLength, 0);
      flameGrad.addColorStop(0, `rgba(120, 200, 255, ${1.0 * progress})`); // Bright blue base
      flameGrad.addColorStop(0.3, `rgba(100, 180, 255, ${0.98 * progress})`); // Vivid blue
      flameGrad.addColorStop(0.6, `rgba(80, 160, 255, ${0.9 * progress})`); // Medium blue
      flameGrad.addColorStop(1, 'rgba(60, 140, 255, 0)'); // Fade to blue

      // Draw wavy flame shape
      ctx.beginPath();
      ctx.moveTo(fighter.r * 0.6, 0);

      const segments = 10;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = fighter.r * 0.6 + flameLength * t;
        const waveOffset = Math.sin(time * 0.015 + j * 0.5 + i * 0.8) * flameWidth * (1 - t * 0.5);
        const width = flameWidth * (1 - t * 0.7);

        ctx.lineTo(x, waveOffset - width * 0.5);
      }

      for (let j = segments; j >= 0; j--) {
        const t = j / segments;
        const x = fighter.r * 0.6 + flameLength * t;
        const waveOffset = Math.sin(time * 0.015 + j * 0.5 + i * 0.8) * flameWidth * (1 - t * 0.5);
        const width = flameWidth * (1 - t * 0.7);

        ctx.lineTo(x, waveOffset + width * 0.5);
      }

      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.fill();

      // Inner bright core of flame (bright cyan hot streak)
      ctx.beginPath();
      ctx.moveTo(fighter.r * 0.7, 0);
      const innerLength = flameLength * 0.5;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = fighter.r * 0.7 + innerLength * t;
        const waveOffset = Math.sin(time * 0.02 + j * 0.6 + i) * flameWidth * 0.25 * (1 - t);
        ctx.lineTo(x, waveOffset);
      }
      ctx.strokeStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();

    // === LAYER 8: ROTATING ENERGY RINGS (Swirling Domain-like Effect) ===
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    const ringRotation = time * 0.004;
    ctx.rotate(ringRotation);

    const ringRadius = fighter.r * 1.2; // Reduced from 1.6

    // Draw elliptical rings at different angles
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.rotate(r * Math.PI / 3);

      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, ringRadius * (0.18 + r * 0.08), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 180, 255, ${(0.95 - r * 0.2) * progress})`;
      ctx.lineWidth = 3 - r * 0.5;
      
      // OPTIMIZED: Removed shadowBlur. Used an alpha layered stroke for glow effect
      ctx.stroke();
      ctx.lineWidth = (3 - r * 0.5) * 2;
      ctx.strokeStyle = `rgba(80, 160, 255, ${(0.3) * progress})`;
      ctx.stroke();

      ctx.restore();
    }

    // Counter-rotating inner rings (Green RCT Energy Swirls)
    ctx.rotate(-ringRotation * 2);
    const innerRingRadius = fighter.r * 0.8;

    for (let r = 0; r < 2; r++) {
      ctx.save();
      ctx.rotate(r * Math.PI / 2 + Math.PI / 4);

      ctx.beginPath();
      ctx.ellipse(0, 0, innerRingRadius, innerRingRadius * 0.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${(0.95 - r * 0.15) * progress})`;
      ctx.lineWidth = 2.5;
      
      // OPTIMIZED: Removed shadowBlur. Used an alpha layered stroke for glow effect
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(0, 255, 136, ${(0.3) * progress})`;
      ctx.stroke();

      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // === LAYER 9: FLOATING CURSED ENERGY PARTICLES ===
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 1337.7331;
      const angle = (time * 0.002) + seed;
      const baseDist = fighter.r * (0.4 + (seed % 30) / 30); // Reduced from 0.6
      const wobble = Math.sin(time * 0.008 + seed) * 8; // Reduced from 12
      const dist = baseDist + wobble;

      const px = fighter.x + Math.cos(angle) * dist;
      const py = fighter.y + Math.sin(angle) * dist;

      const particleSize = 2 + (seed % 5);
      const alpha = 0.5 + Math.sin(time * 0.01 + seed) * 0.3;

      // Particle glow - bright blue for visibility
      const particleGrad = ctx.createRadialGradient(px, py, 0, px, py, particleSize * 4);
      particleGrad.addColorStop(0, `rgba(150, 220, 255, ${alpha * progress})`);
      particleGrad.addColorStop(0.5, `rgba(120, 200, 255, ${alpha * 0.8 * progress})`);
      particleGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');

      ctx.beginPath();
      ctx.arc(px, py, particleSize * 4, 0, Math.PI * 2);
      ctx.fillStyle = particleGrad;
      ctx.fill();

      // Bright core - bright cyan
      ctx.beginPath();
      ctx.arc(px, py, particleSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 240, 255, ${alpha * progress})`;
      ctx.fill();
    }

    // === LAYER 10: OUTER FLAME CROWN (Top Flames Rising Up) ===
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    const crownFlameCount = 12;
    for (let i = 0; i < crownFlameCount; i++) {
      const angle = (Math.PI * 2 / crownFlameCount) * i - Math.PI / 2; // Start from top
      const flameHeight = fighter.r * (0.4 + Math.sin(time * 0.012 + i * 0.7) * 0.25); // Reduced from 0.6

      ctx.save();
      ctx.rotate(angle);

      // Rising flame with bright blue gradient
      const crownGrad = ctx.createLinearGradient(0, -fighter.r, 0, -fighter.r - flameHeight);
      crownGrad.addColorStop(0, `rgba(120, 200, 255, ${0.98 * progress})`);
      crownGrad.addColorStop(0.4, `rgba(100, 180, 255, ${0.9 * progress})`);
      crownGrad.addColorStop(0.8, `rgba(80, 160, 255, ${0.7 * progress})`);
      crownGrad.addColorStop(1, 'rgba(60, 140, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(-7, -fighter.r);
      ctx.quadraticCurveTo(
        Math.sin(time * 0.01 + i) * 8, -fighter.r - flameHeight * 0.5,
        0, -fighter.r - flameHeight
      );
      ctx.quadraticCurveTo(
        Math.sin(time * 0.01 + i + 1) * 8, -fighter.r - flameHeight * 0.5,
        7, -fighter.r
      );
      ctx.closePath();
      ctx.fillStyle = crownGrad;
      ctx.fill();

      // Bright cyan hot tip
      ctx.beginPath();
      ctx.arc(0, -fighter.r - flameHeight, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 220, 255, ${1.0 * progress})`;
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Spawn occasional healing particles while aura is active
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = fighter.r * (0.5 + Math.random() * 0.5);
      const px = fighter.x + Math.cos(angle) * dist;
      const py = fighter.y + Math.sin(angle) * dist;
      spawnSparks(px, py, 1, 'healing');
    }
  }

  static drawGun(ctx, fighter) {
    if (fighter.isChannelingDomainExpansion || fighter.domainActive) return;
    drawGojoWeapon(ctx, fighter);
  }

  /**
   * Render JJK-authentic Cursed Energy Flame Aura engulfing the character.
   * Smooth, flowing flame silhouette with thick dark ink contour (not spiky).
   */
  static _drawJJKCursedEnergyAura(ctx, fighter, colorTheme = 'blue', overrideX = null, overrideY = null, overrideRadius = null) {
    // Calculate smooth fade-in & fade-out progress
    let progress = 1.0;
    if (overrideX !== null) {
      progress = 1.0;
    } else if (colorTheme === 'rct') {
      progress = Math.min(1, (fighter.healingAuraTimer / 180) || (fighter.rctChannelTimer / 150) || 1);
    } else {
      progress = Math.min(1, Math.max(0, fighter.combatAuraOpacity || 0));
    }

    if (progress <= 0) return;

    // Stepped 30-frame anime animation loop (30 FPS Sakuga frame rate)
    const frameRate = 30;
    const frameIndex = Math.floor((Date.now() / 1000) * frameRate) % 30;
    const time = frameIndex * 120; // 30 distinct stepped frames

    ctx.save();
    const posX = overrideX !== null ? overrideX : fighter.x;
    const posY = overrideY !== null ? overrideY : (fighter.y - (fighter.z || 0));
    ctx.translate(posX, posY);
    ctx.globalCompositeOperation = 'source-over';

    const r = overrideRadius !== null ? overrideRadius : fighter.r;

    // === Luminous Body Backlight (Soft Electric Blue Bloom - Matching Yuta) ===
    // Disabled for FPS optimization (removed screen composite + radial gradient glow)

    let mainColor = '#00D4CC';
    let fillColor = `rgba(0, 212, 204, ${0.70 * progress})`;
    let coreColor = `rgba(200, 255, 250, ${0.85 * progress})`;

    if (colorTheme === 'rct') {
      mainColor = '#32CD32';
      fillColor = `rgba(50, 205, 50, ${0.70 * progress})`;
      coreColor = `rgba(144, 238, 144, ${0.85 * progress})`;
    } else if (colorTheme === 'red') {
      mainColor = '#FF1100';
      fillColor = `rgba(255, 17, 0, ${0.72 * progress})`;
      coreColor = `rgba(255, 120, 100, ${0.85 * progress})`;
    } else if (colorTheme === 'purple') {
      mainColor = '#9900FF';
      fillColor = `rgba(153, 0, 255, ${0.72 * progress})`;
      coreColor = `rgba(204, 120, 255, ${0.85 * progress})`;
    } else if (colorTheme === 'pink') {
      mainColor = '#FF1493';
      fillColor = `rgba(255, 20, 147, ${0.72 * progress})`;
      coreColor = `rgba(255, 200, 220, ${0.85 * progress})`;
    }
    const strokeColor = '#000000'; // Pure pitch black JJK ink contour

    // (Removed shadowBlur for 60 FPS performance)

    // Generate smooth flame contour points (Viscous Liquid Fire Silhouette - stretching Sakuga tongues)
    const numPoints = 28;
    const baseRadius = overrideX !== null ? (r + 9.0) : (r + 15);
    const points = [];
    const moveOffset = (fighter.x + fighter.y) * 0.015;
    const stretchMult = overrideX !== null ? 0.2 : 1.0;

    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i;

      // Upward direction bias (flames flow upward on body, symmetrical on hands)
      const upFactor = Math.max(0, -Math.sin(angle) + 0.25) * stretchMult;
      const sideFactor = 1.0 - upFactor * 0.5;

      // Base shape evolution for stretching flame tongues
      const baseTongue1 = Math.pow(Math.sin(angle * 1.5 + time * 0.0005 - moveOffset * 0.2) * 0.5 + 0.5, 3.0) * 25 * upFactor;
      const baseTongue2 = Math.pow(Math.cos(angle * 2.2 - time * 0.0004 + moveOffset * 0.15) * 0.5 + 0.5, 2.5) * 18 * upFactor;

      // Localized height flicker
      const tongueFlicker = Math.sin(time * 0.002 + i * 1.4) * 5 * upFactor;
      const sideWave = Math.sin(time * 0.0012 + i * 0.8) * 4 * sideFactor;

      const totalRadius = baseRadius + baseTongue1 + baseTongue2 + tongueFlicker + sideWave;

      points.push({
        x: Math.cos(angle) * totalRadius,
        y: Math.sin(angle) * totalRadius
      });
    }

    // Draw smooth closed curve through midpoints (no sharp corners)
    ctx.beginPath();
    let mx = (points[numPoints - 1].x + points[0].x) / 2;
    let my = (points[numPoints - 1].y + points[0].y) / 2;
    ctx.moveTo(mx, my);

    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.closePath();

    // Fill with translucent cursed energy
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Ink brush stroke outline (varying thickness like calligraphy brush)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let mxG = (points[numPoints - 1].x + points[0].x) / 2;
    let myG = (points[numPoints - 1].y + points[0].y) / 2;
    ctx.moveTo(mxG, myG);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner bright core wash (scaled down flame silhouette matching Yuta)
    ctx.save();
    ctx.scale(0.75, 0.75);
    ctx.beginPath();
    ctx.moveTo(mx, my);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.closePath();
    ctx.fillStyle = coreColor;
    ctx.fill();
    ctx.restore();

    // Rough, thin black ink brush cuts & hatches moving along the border contour
    // Performance: Skip ink layers and flame wisps in low quality mode
    const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
    if (!isLowQuality) {
      ctx.globalAlpha = 0.9 * progress;
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'butt';

      // Draw 3 layers of thin, rough, broken/cut ink lines moving alongside the border
      // PERF: Batch all segments per layer into ONE path, then stroke once (3 strokes total instead of 84)
      const insetScales = [0.84, 0.91, 0.96];
      for (let layer = 0; layer < insetScales.length; layer++) {
        const scale = insetScales[layer];
        const speedDir = (layer % 2 === 0 ? 1 : -1);
        const flowTime = time * 0.003 * speedDir;

        // Use a uniform lineWidth per layer for batching (average pressure)
        ctx.lineWidth = 0.9 + layer * 0.35;
        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          // Dynamic moving cuts & breaks traveling around the border over time
          const cutSeed = Math.sin(i * 17.3 + layer * 31.7 + flowTime * 2.5);
          if (cutSeed < -0.1) continue;

          const p = points[i];
          const next = points[(i + 1) % numPoints];
          const prev = points[(i - 1 + numPoints) % numPoints];

          // Dynamic animated ink jitter for flowing hand-drawn anime texture
          const jitterX = Math.sin(i * 7.9 + layer * 5.3 + time * 0.005) * 1.8;
          const jitterY = Math.cos(i * 11.3 - layer * 3.7 + time * 0.004) * 1.8;

          const midX = (p.x * scale + next.x * scale) / 2 + jitterX;
          const midY = (p.y * scale + next.y * scale) / 2 + jitterY;
          const prevMidX = (prev.x * scale + p.x * scale) / 2 - jitterX * 0.5;
          const prevMidY = (prev.y * scale + p.y * scale) / 2 - jitterY * 0.5;

          ctx.moveTo(prevMidX, prevMidY);
          ctx.quadraticCurveTo(p.x * scale + jitterX, p.y * scale + jitterY, midX, midY);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // Soft rising flame wisps (smooth curves, not sharp tendrils)
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6 * progress;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const baseAngle = -Math.PI * 0.5 + (k - 1) * 0.5;
        const sway = Math.sin(time * 0.003 + k * 2.1) * 0.2;
        const fa = baseAngle + sway;
        const len = r + 18 + Math.sin(time * 0.004 + k * 1.7) * 5;

        ctx.moveTo(Math.cos(fa) * (r + 8), Math.sin(fa) * (r + 8));
        ctx.quadraticCurveTo(
          Math.cos(fa + sway * 0.5) * (len * 0.7),
          Math.sin(fa + sway * 0.5) * (len * 0.7),
          Math.cos(fa + sway) * len,
          Math.sin(fa + sway) * len
        );
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  static _drawSakugaImpactFrame(ctx, fighter, x, y, timer, maxTimer, angleOffset = 0, seed = 0) {
    const progress = 1 - (timer / maxTimer);
    const alpha = timer / maxTimer;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleOffset);
    ctx.scale(0.25, 0.25);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 1.5));

    // 1. Bright white center void
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 70 * (1 + progress * 0.3), 0, Math.PI * 2);
    ctx.fill();

    // 2. Ink clusters radiating outward (varied based on seed)
    const clusters = [
      { angle: -Math.PI * 0.75 + (seed * 0.3), dist: 55 + (seed * 15), scale: 1.2, lines: 7 },
      { angle: -Math.PI * 0.25 - (seed * 0.2), dist: 75 - (seed * 10), scale: 1.5, lines: 9 },
      { angle: 0.1 + (seed * 0.4), dist: 65 + (seed * 12), scale: 0.8, lines: 5 },
      { angle: Math.PI * 0.35 - (seed * 0.3), dist: 85 - (seed * 18), scale: 1.4, lines: 8 },
      { angle: Math.PI * 0.65 + (seed * 0.2), dist: 75 + (seed * 14), scale: 1.1, lines: 7 },
      { angle: Math.PI * 0.85 - (seed * 0.4), dist: 95 - (seed * 16), scale: 1.3, lines: 8 },
      { angle: -Math.PI * 0.9 + (seed * 0.25), dist: 85 + (seed * 10), scale: 1.0, lines: 6 },
    ];

    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#0a0a0a';

    clusters.forEach(c => {
      ctx.save();
      const cx = Math.cos(c.angle) * (c.dist + progress * 20);
      const cy = Math.sin(c.angle) * (c.dist + progress * 20);
      ctx.translate(cx, cy);
      ctx.rotate(c.angle + Math.PI / 2);

      // Cluster of parallel sharp ink brush spikes
      const numLines = c.lines;
      const width = 22 * c.scale;
      for (let i = 0; i < numLines; i++) {
        const lx = (i / (numLines - 1) - 0.5) * width;
        const length = (55 + Math.sin(i * 1.5) * 30) * c.scale;
        const thick = (2 + (i % 3) * 1.2) * c.scale;

        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, -length);
        ctx.stroke();
      }

      // Base ink blob connecting the cluster spikes
      ctx.beginPath();
      ctx.moveTo(-width * 0.5, 3);
      ctx.lineTo(width * 0.5, 3);
      ctx.lineTo(width * 0.3, -15 * c.scale);
      ctx.lineTo(-width * 0.3, -15 * c.scale);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // 3. Purple & Cyan inner line-art traces (matching subtle color in reference image)
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 / 4) * i + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50);
      ctx.stroke();
    }

    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 / 4) * i + 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render Cursed Technique Reversal: Red — three-phase animation:
   *   Phase 1 (buildup): Red orb manifests and swells at Gojo's fingertip. Enemies are frozen.
   *   Phase 2 (BOOM): Detonation flash — orb explodes into repulsion cone + rings.
   *   Phase 3 (fade): Blast wave expands and dissipates.
   */
  static _drawReversalRedEffect(ctx, fighter) {
    const totalFrames  = fighter.redEffectMaxTimer;           // e.g. 75
    const remaining    = fighter.redEffectTimer;              // counts down from totalFrames → 0
    const elapsed      = totalFrames - remaining;          // 0 → totalFrames
    const buildupEnd   = CONFIG.gojo.redBuildupFrames || 20; // first 20 frames = Phase 1
    const angle        = fighter.redTargetAngle || fighter.gunAngle || 0;
    const fingerDist   = fighter.r + 14;
    const time         = Date.now();
    const maxRange     = (CONFIG.gojo.redRange || 100) + 50;

    // Smooth screen dimming with deep crimson vignette overlay as Gojo charges Red
    let screenDimAlpha = 0;
    if (elapsed <= buildupEnd) {
      const buildProg = elapsed / buildupEnd; // 0 to 1
      screenDimAlpha = Math.sin(buildProg * Math.PI * 0.5) * 0.65; // Smooth ramp up to 0.65
    } else {
      const blastProg = (elapsed - buildupEnd) / Math.max(1, totalFrames - buildupEnd); // 0 to 1
      screenDimAlpha = (1 - blastProg) * 0.65; // Smooth fade out after blast
    }

    if (screenDimAlpha > 0.01) {
      ctx.save();
      const canvas = (typeof state !== 'undefined' && state.canvas) ? state.canvas : null;
      const cw = canvas ? canvas.width : 2000;
      const ch = canvas ? canvas.height : 2000;
      const maxR = Math.max(cw, ch) * 1.5;

      const redGrad = ctx.createRadialGradient(fighter.x, fighter.y - (fighter.z || 0), 20, fighter.x, fighter.y - (fighter.z || 0), maxR);
      redGrad.addColorStop(0, `rgba(140, 0, 25, ${screenDimAlpha * 0.25})`);
      redGrad.addColorStop(0.3, `rgba(70, 0, 12, ${screenDimAlpha * 0.60})`);
      redGrad.addColorStop(0.65, `rgba(25, 0, 5, ${screenDimAlpha * 0.85})`);
      redGrad.addColorStop(1, `rgba(0, 0, 0, ${screenDimAlpha * 0.95})`);

      ctx.fillStyle = redGrad;
      ctx.fillRect(-600, -600, cw + 1200, ch + 1200);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
    ctx.rotate(angle);

    // ─── Phase 1: Red orb manifests and swells at Gojo's fingertip ─────────
    if (elapsed <= buildupEnd) {
      const buildProg  = elapsed / buildupEnd;       // 0 → 1
      const eased      = buildProg * buildProg;       // smooth ease-in

      const baseR = getHandSize(6) * (0.2 + eased * 1.8);
      const pulse  = Math.sin(time / 120) * 0.08;
      const r2     = baseR * (1 + pulse);

      // Manifest red orb at Gojo's fingertip
      drawGojoOrb(ctx, fingerDist, 0, r2, time, 'red', 0);

      // Draw Anamorphic Red Lens Flare Beam delayed until right before explosion (final 25% of orb charge)
      if (buildProg > 0.75) {
        const flareP = (buildProg - 0.75) / 0.25; // 0.0 to 1.0 fast intense ignition right before explosion
        drawAnamorphicLensFlare(ctx, fingerDist, 0, flareP, 'red');

        if (!fighter._hasPlayedRedFlareSound) {
          fighter._hasPlayedRedFlareSound = true;
          triggerGlobalScreenShake(8, 12); // Pre-detonation flare tremor
          const sDep = getSkillSound(fighter._def?.id, 'red_deploy');
          audioSystem.playSFX(sDep?.src || 'Assets/Sound Effects/Skills/reddeploy.mp3', sDep?.volume ?? 2.0);
        }
      }
    }


    // ─── Phase 2 + 3: BOOM and Fade (elapsed > buildupEnd) ──────────────────
    else {
      const blastElapsed = elapsed - buildupEnd;           // 0 → (totalFrames - buildupEnd)
      const blastTotal   = totalFrames - buildupEnd;
      const blastProg    = blastElapsed / blastTotal;      // 0 → 1

      // Fade-out alpha: peaks at 0 and fades toward 1
      const alpha = Math.max(0, Math.sin((1 - blastProg) * Math.PI));
      ctx.globalAlpha = alpha;

      const beamLength = maxRange * (0.2 + blastProg * 1.1);
      const beamSpread = 40  * (0.4 + blastProg * 0.9);

      // 1. Repulsion cone beam
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const coneGrad = ctx.createLinearGradient(fingerDist, 0, fingerDist + beamLength, 0);
      coneGrad.addColorStop(0,    'rgba(255, 255, 255, 1.0)');
      coneGrad.addColorStop(0.2,  'rgba(255, 0, 51, 0.9)');
      coneGrad.addColorStop(0.65, 'rgba(200, 0, 40, 0.45)');
      coneGrad.addColorStop(1,    'rgba(150, 0, 20, 0)');
      ctx.beginPath();
      ctx.moveTo(fingerDist, 0);
      ctx.lineTo(fingerDist + beamLength, -beamSpread);
      ctx.quadraticCurveTo(fingerDist + beamLength * 1.1, 0, fingerDist + beamLength, beamSpread);
      ctx.closePath();
      ctx.fillStyle = coneGrad;
      ctx.fill();
      ctx.restore();

      // 2. JJK ink-brush arc strokes along the repulsion wave
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      const numArcs = 6;
      for (let k = 0; k < numArcs; k++) {
        const arcDist    = fingerDist + 15 + k * (beamLength / numArcs) * (0.5 + blastProg * 0.6);
        const arcSpread  = (22 + k * 16 * blastProg) * (Math.PI / 180);
        const numSegs    = 16;
        for (let layer = 0; layer < 2; layer++) {
          const offsetR = arcDist * (layer === 0 ? 1.0 : 0.95);
          for (let i = 0; i < numSegs; i++) {
            const a1 = -arcSpread + (arcSpread * 2 / numSegs) * i;
            const a2 = -arcSpread + (arcSpread * 2 / numSegs) * (i + 1);
            if (Math.sin(i * 13.7 + k * 23.1 + layer * 41.5 + time * 0.01) < -0.15) continue;
            const pn = Math.sin(i * 3.1 + k * 5.7 + time * 0.02) * 0.5 + 0.5;
            ctx.lineWidth = 0.6 + pn * 2.8;
            ctx.beginPath();
            ctx.arc(Math.sin(i * 9.1 + k * 17.3) * 0.8, Math.cos(i * 11.3 + k * 19.7) * 0.8, offsetR, a1, a2);
            ctx.stroke();
          }
        }
      }

      // 3. Expanding crimson repulsion rings (centered on Gojo, fan toward target)
      ctx.save();
      ctx.strokeStyle = '#FF0033';
      ctx.lineWidth = 3.5 * (1 - blastProg * 0.5);
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const ringR = (fighter.r + 15) + (rIdx * 38 + blastProg * 120);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, -Math.PI * 0.65, Math.PI * 0.65);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Fingertip orb — shrinks and fades using same drawGojoOrb visual as blast releases
      const orbR = getHandSize(10) * (1 - blastProg * 0.85);
      if (orbR > 1) {
        ctx.globalAlpha = alpha * (1 - blastProg * 0.6);
        drawGojoOrb(ctx, fingerDist, 0, orbR, time, 'red', 0);
        ctx.globalAlpha = alpha; // restore for anything after
      }
    }

    ctx.restore();
  }

  /**
   * Draw the crimson countdown ring on a fighter that was hit by Reversal Red slow.
   * The ring shrinks from full circumference to nothing as redSlowTimer counts down.
   */
  static _drawRedSlowRing(ctx, fighter, target) {
    if (!target || !target.redSlowTimer || target.redSlowTimer <= 0) return;
    const prog     = target.redSlowTimer / (target.redSlowMaxTimer || 120); // 1 → 0
    const ringR    = target.r + 8 + (1 - prog) * 4;   // expands slightly as it fades
    const arcEnd   = prog * Math.PI * 2;               // full circle → zero arc
    const alpha    = Math.min(1, prog * 1.8);

    ctx.save();
    ctx.translate(target.x, target.y);

    // Outer crimson glow ring
    ctx.strokeStyle = `rgba(255, 0, 40, ${alpha * 0.45})`;
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.arc(0, 0, ringR + 3, -Math.PI / 2, -Math.PI / 2 + arcEnd);
    ctx.stroke();

    // Bright crimson core ring
    ctx.strokeStyle = `rgba(255, 60, 60, ${alpha * 0.85})`;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + arcEnd);
    ctx.stroke();

    // White hot leading edge dot
    const ledX = Math.cos(-Math.PI / 2 + arcEnd) * ringR;
    const ledY = Math.sin(-Math.PI / 2 + arcEnd) * ringR;
    ctx.fillStyle = `rgba(255, 220, 220, ${alpha})`;
    ctx.beginPath();
    ctx.arc(ledX, ledY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
