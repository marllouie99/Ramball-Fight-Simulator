import { Fighter } from '../../entities/fighter.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { drawDivineFlameArrowConstruct } from '../../graphics/draw.js';
import { renderSukunaDomainBackground, renderSukunaDomainForeground } from '../../entities/fighters/sukuna/sukunaDomainVisuals.js';
import { drawSukunaBody } from './sukunaSkin.js';
import { fastCleanArray, pushTrailCap } from '../particles/visualTrailSystem.js';

export class SukunaRenderer {
  static draw(ctx, fighter) {
    // Render Cursed Energy Aura BEHIND body and weapon constructs
    // Also show during countdown for dramatic effect
    const isParalyzed = (fighter.timeStopTimer > 0) || (fighter.electricStunTimer > 0) || (fighter.crimsonElectrifiedTimer > 0);
    const isFrozenByDomain = (fighter.timeStopTimer > 0) || (fighter.hitStunTimer > 0);

    if (fighter.rctVisualTimer > 0) {
      fighter._drawSukunaCursedEnergyAura(ctx, 'rct');
    } else if (fighter.isChannelingDivineFlame || fighter.divineFlameRecoveryTimer > 0) {
      fighter._drawSukunaCursedEnergyAura(ctx, 'fuga');
    } else if (fighter.isChannelingDomainExpansion && !fighter.domainActive && !isParalyzed) {
      fighter._drawSukunaCursedEnergyAura(ctx, 'domain');
    } else if (!isFrozenByDomain && (fighter.combatAuraOpacity > 0 || state.gameState === 'countdown' || fighter._isWinnerReveal)) {
      fighter._drawSukunaCursedEnergyAura(ctx, 'red');
    }

    // Malevolent Shrine is now drawn in drawDomainBackground so it renders behind all fighters

    Fighter.prototype.draw.call(fighter, ctx);

    // Render small version of blobby cursed energy on Sukuna's both hands on opposite sides of his body
    fighter._drawHandCursedEnergy(ctx);

    // Draw Sakuga Anime Impact Frame (red/black ink impact)
    if (fighter.sakugaImpactTimer > 0) {
      fighter._drawSakugaImpactFrame(ctx);
    }

    // Render residual hit flame wisps
    if (fighter.hitFlameWisps && fighter.hitFlameWisps.length > 0) {
      fighter._drawHitFlameWisps(ctx);
    }

    // Draw Punch Impact Effects (Gojo-style shockwave & star core in Crimson)
    if (fighter.punchEffects && fighter.punchEffects.length > 0) {
      fighter.punchEffects.forEach(effect => {
        const prog = 1 - (effect.timer / effect.maxTimer);
        const alpha = Math.sin((1 - prog) * Math.PI);

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // 1. Outer Crimson Shockwave Ring
        const ringRadius = (fighter.r + 5) * (0.8 + 1.2 * prog);
        ctx.strokeStyle = '#FF1100';
        ctx.lineWidth = 5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. High-contrast Black Ink Outline
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2.5 * (1 - prog * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.94, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Piercing White/Gold Impact Star Core
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

        // 4. Directional Crimson Impact Sparks
        ctx.strokeStyle = '#FF4500';
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

    // Draw afterimages during flurry, dodge & melee teleports
    if (fighter.afterImages && fighter.afterImages.length > 0) {
      for (let i = 0; i < fighter.afterImages.length; i++) {
        const img = fighter.afterImages[i];
        if (img && img.timer > 0) {
          const maxT = img.maxTimer || 20;
          const progress = Math.max(0, Math.min(1, img.timer / maxT));
          const alpha = Math.pow(progress, 0.7) * 0.2;

          ctx.save();

          // 1. Dash Trajectory Line
          if (img.fromX !== undefined && img.toX !== undefined) {
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#FF1100';
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

          // 2. Volcanic Crimson Cursed Energy Glow
          ctx.save();
          // OPTIMIZED: Replaced expensive radial gradient with layered alpha circles
          ctx.beginPath();
          ctx.arc(0, 0, fighter.r * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(139, 0, 0, ${alpha * 0.3})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, fighter.r * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 30, 0, ${alpha * 0.5})`;
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
          ctx.fillStyle = '#8B0000';
          ctx.fill();
          ctx.strokeStyle = '#FF4500';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // 4. Crimson Eye Glints
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(fighter.r * 0.5, -fighter.r * 0.25, 3, 0, Math.PI * 2);
          ctx.arc(fighter.r * 0.5, fighter.r * 0.25, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          ctx.restore();
        }
      }
    }

    // Draw Skill 1 Slash visual arcs on flurry target (Crescent Blade Arcs)
    if (fighter.flurrySlashVisuals && fighter.flurrySlashVisuals.length > 0) {
      fighter.flurrySlashVisuals.forEach(slash => {
        const ratio = slash.timer / slash.maxTimer;
        ctx.save();
        ctx.translate(slash.x, slash.y);
        ctx.rotate(slash.angle);
        ctx.scale(slash.scale, slash.scale);

        const r = 26;
        // Crescent outer & inner returning arc geometry
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.55, Math.PI * 0.55, false);
        ctx.arc(r * 0.42, 0, r * 0.82, Math.PI * 0.50, -Math.PI * 0.50, true);
        ctx.closePath();

        // Heavy black ink outline
        ctx.fillStyle = `rgba(0, 0, 0, ${0.95 * ratio})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.95 * ratio})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Crimson crescent inner blade
        ctx.save();
        ctx.scale(0.85, 0.85);
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.52, Math.PI * 0.52, false);
        ctx.arc(r * 0.42, 0, r * 0.82, Math.PI * 0.48, -Math.PI * 0.48, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 10, 10, ${0.95 * ratio})`;
        ctx.fill();
        ctx.restore();

        // White-hot razor crescent edge line
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * ratio})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
        ctx.stroke();

        ctx.restore();
      });
    }


    // Draw Slash Hit visuals on target (Ghost blade slash marks during rapid slash)
    if (fighter.slashHitVisuals && fighter.slashHitVisuals.length > 0) {
      fighter.slashHitVisuals.forEach(slash => {
        const ratio = slash.timer / slash.maxTimer;
        ctx.save();
        ctx.translate(slash.x, slash.y);
        ctx.rotate(slash.angle);
        ctx.scale(slash.scale, slash.scale);

        const r = 22;
        // Crescent slash shape
        ctx.globalAlpha = 0.85 * ratio;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5, false);
        ctx.arc(r * 0.45, 0, r * 0.8, Math.PI * 0.45, -Math.PI * 0.45, true);
        ctx.closePath();
        // Heavy black ink outline & deep crimson cursed energy blade arc
        ctx.fillStyle = `rgba(10, 2, 2, ${0.9 * ratio})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.95 * ratio})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Crimson cursed energy blade core
        ctx.save();
        ctx.scale(0.85, 0.85);
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5, false);
        ctx.arc(r * 0.45, 0, r * 0.8, Math.PI * 0.45, -Math.PI * 0.45, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 20, 20, ${0.95 * ratio})`;
        ctx.fill();
        ctx.restore();

        // White-hot razor crescent edge line
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * ratio})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw Furnace (Fuga / Open) — Volcanic magma cursed flame arrow construct
    if (fighter.isChannelingDivineFlame) {
      const progress = fighter.divineFlameChargeTimer / fighter.divineFlameChargeMax;
      const time = Date.now() * 0.012;

      ctx.save();
      ctx.translate(fighter.x, fighter.y);

      // ── 1. CHIAROSCURO: Blinding front-light vs deep back-shadow ──
      ctx.save();
      ctx.rotate(fighter.gunAngle);
      const shadowGrad = ctx.createLinearGradient(fighter.r * 1.4, 0, -fighter.r * 1.2, 0);
      shadowGrad.addColorStop(0, `rgba(255, 240, 170, ${0.6 * progress})`);
      shadowGrad.addColorStop(0.35, 'rgba(255, 100, 0, 0)');
      shadowGrad.addColorStop(0.65, `rgba(15, 5, 5, ${0.70 * progress})`);
      shadowGrad.addColorStop(1, `rgba(5, 2, 2, ${0.92 * progress})`);
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── 2. VOLCANIC MAGMA FLAME ARROW CONSTRUCT (From reference image) ──
      drawDivineFlameArrowConstruct(ctx, {
        x: 0,
        y: 0,
        angle: fighter.gunAngle,
        scale: 1.0,
        progress,
        isFlying: false,
        time
      });

      // Cursed Flame Origin Glow (Sukuna's channeling hands)
      ctx.save();
      ctx.rotate(fighter.gunAngle);
      const notchX = -32 * progress;
      // OPTIMIZED: Replaced expensive radial gradient with layered alpha circles
      ctx.beginPath();
      ctx.arc(notchX, 0, 18 * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 50, 0, ${0.3 * progress})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(notchX, 0, 10 * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 140, 20, ${0.7 * progress})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(notchX, 0, 5 * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 220, ${0.95 * progress})`;
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    // Ensure Sukuna's HP text and freeze timer are always rendered on top of his hands and Cursed Energy aura
    fighter.drawHealth(ctx);
    fighter.drawFreezeTimer(ctx);
  }

  // Render physical circle hands + animated blobby Cursed Energy flame aura on Sukuna's front and back hands
  static _drawHandCursedEnergy(ctx, fighter) {
    const basePosY = (fighter.y - (fighter.z || 0));
    const nowTime = Date.now();

    // Dynamic hand animation offsets (Left hand rests in center of body by default)
    let frontOffset = 6;
    let frontAngleOffset = 0;

    let backHandX = fighter.x - Math.cos(fighter.gunAngle + Math.PI / 2) * (fighter.r * 0.35);
    let backHandY = basePosY - Math.sin(fighter.gunAngle + Math.PI / 2) * (fighter.r * 0.35);
    let hideFrontHand = false;
    let hideBackHand = false;

    // Champion Screen / Victory Reveal / Fighter Index Stance / Round Countdown / Target of Ambush: Hide hands completely
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isWinnerScreen = fighter._isWinnerReveal || isCountdown || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));

    if (isWinnerScreen || fighter.isTargetOfAmbush) {
      return;
    }

    // 1. Smooth Dynamic Melee Punch Animation (Alternating 1-2 punches extending to target with recovery easing)
    if (fighter.punchAnimTimer > 0) {
      const maxT = 16.0;
      fighter.currentSukunaPunchProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
    } else {
      fighter.currentSukunaPunchProgress = 0.0;
    }

    if (fighter.currentSukunaPunchProgress > 0) {
      const rawProgress = fighter.currentSukunaPunchProgress;
      const smoothP = rawProgress < 0.5 ? 4 * rawProgress * rawProgress * rawProgress : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
      const lungeProgress = Math.sin(smoothP * Math.PI); // Buttery smooth 0 -> 1 -> 0 bell curve

      let reachDist = 85;
      if (fighter.target) {
        const distToTarget = Math.hypot(fighter.target.x - fighter.x, fighter.target.y - fighter.y);
        reachDist = Math.max(50, Math.min(115, distToTarget - fighter.r * 0.45));
      }

      const punchDist = lungeProgress * reachDist; // Dynamic reach extension directly to opponent!

      if (fighter.punchAnimHand === 0) {
        // --- RIGHT HAND PUNCH (Strikes along right flank) ---
        frontAngleOffset = 0.22;         // Right side angle offset
        frontOffset += punchDist;        // Right hand punches forward to enemy!

        // Left hand stays tucked in tight martial arts guard at chest
        const guardAngle = fighter.gunAngle - 0.35;
        const guardDist = fighter.r * 0.4;
        backHandX = fighter.x + Math.cos(guardAngle) * guardDist;
        backHandY = basePosY + Math.sin(guardAngle) * guardDist;
      } else {
        // --- LEFT HAND PUNCH (Strikes along left flank) ---
        const backAngle = fighter.gunAngle - 0.22; // Left side angle offset
        const backOffset = (fighter.r + 6) + punchDist;
        backHandX = fighter.x + Math.cos(backAngle) * backOffset; // Left hand punches forward to enemy!
        backHandY = basePosY + Math.sin(backAngle) * backOffset;

        // Right hand pulls into tight right guard at chest
        frontAngleOffset = 0.35;
        frontOffset = -fighter.r * 0.5;
      }
    }

    // 2. Single-Hand Slash Swing Animation (Fast 10-frame single-hand chop across body when unleashing Cleave / Dismantle slashes)
    else if (fighter.slashSwingTimer > 0 || (fighter.rapidSlashHitsLeft > 0 && fighter.punchAnimTimer <= 0)) {
      const swingMax = 10;
      const rawT = (10 - Math.max(0, fighter.slashSwingTimer)) / swingMax; // 0 to 1 smooth progress over 10 frames
      const swingProg = Math.pow(rawT, 0.4); // Fast snappy acceleration curve
      const swingAngleOffset = (swingProg * Math.PI - Math.PI / 2);
      const swingThrust = Math.sin(swingProg * Math.PI) * 35;

      if (fighter.slashHand === 1) {
        // Left hand slashes across body! Hide right hand!
        hideFrontHand = true;
        const backAngle = fighter.gunAngle - swingAngleOffset;
        const backOffset = (fighter.r + 6) + swingThrust;
        backHandX = fighter.x + Math.cos(backAngle) * backOffset;
        backHandY = basePosY + Math.sin(backAngle) * backOffset;
      } else {
        // Right hand slashes across body! Hide left hand!
        hideBackHand = true;
        frontAngleOffset = swingAngleOffset;
        frontOffset = 6 + swingThrust;
      }
    }

    // 3. Fuga (Divine Flame Arrow) Kamino Archer Bow Stance (Leading arm extends, trailing arm pulls back into archery drawback)
    else if (fighter.isChannelingDivineFlame) {
      const progress = Math.min(1.0, (fighter.divineFlameChargeTimer || 0) / Math.max(1, fighter.divineFlameChargeMax || 90));

      // Leading Bow Arm (Front hand extending far forward to hold bow riser):
      frontAngleOffset = -0.15;
      frontOffset = 24 + progress * 8; // Extends 24px to 32px out along aim angle

      // Trailing Draw String Arm (Back hand pulling arrow notch deep behind body):
      const pullAngle = fighter.gunAngle + Math.PI; // Pulls backward opposite to facing direction
      const drawbackDist = 6 + progress * 24;     // Pulls 6px to 30px back into deep archery drawback
      const perpX = Math.cos(fighter.gunAngle + Math.PI / 2) * 4;
      const perpY = Math.sin(fighter.gunAngle + Math.PI / 2) * 4;

      backHandX = fighter.x + Math.cos(pullAngle) * drawbackDist + perpX;
      backHandY = basePosY + Math.sin(pullAngle) * drawbackDist + perpY;
    }

    // Front hand (Right hand) position
    const frontAngle = fighter.gunAngle + frontAngleOffset;
    let frontHandX = fighter.x + Math.cos(frontAngle) * (fighter.r + frontOffset);
    let frontHandY = basePosY + Math.sin(frontAngle) * (fighter.r + frontOffset);

    // Safety Clamp: Prevent idle hands from extending above the top boundary of body circle (-fighter.r + 6)
    const isAttacking = (fighter.punchAnimTimer > 0) || (fighter.slashSwingTimer > 0) || (fighter.rapidSlashHitsLeft > 0) || (fighter.flurryHitsLeft > 0);
    const maxTopY = basePosY - (fighter.r - 6);
    if (!isAttacking && frontHandY < maxTopY && (frontOffset < 0 || Math.abs(frontAngleOffset) > 1.0)) {
      frontHandY = maxTopY;
    }
    if (!isAttacking && backHandY < maxTopY && !fighter.isChannelingDivineFlame) {
      backHandY = maxTopY;
    }

    // 1. Draw Cursed Energy Aura BEHIND physical hands (skip during RCT and Fuga channeling)
    const isRCT = (fighter.rctVisualTimer > 0);
    const isFuga = (fighter.isChannelingDivineFlame);
    const isFrozenByDomain = (fighter.timeStopTimer > 0) || (fighter.hitStunTimer > 0);
    const isActive = !isRCT && !isFuga && !isFrozenByDomain && ((fighter.combatAuraOpacity > 0.05) || (fighter.slashGlowTimer > 0) || (fighter.rapidSlashHitsLeft > 0) || (fighter.flurryHitsLeft > 0) || (fighter.domainActive) || (state.gameState === 'countdown') || (fighter.punchAnimTimer > 0));

    if (isActive) {
      let theme = 'red';
      if (fighter.isChannelingDomainExpansion && !fighter.domainActive) {
        theme = 'domain';
      }
      const blobRadius = (fighter.punchAnimTimer > 0 || fighter.slashGlowTimer > 0) ? 15.0 : 12.0;

      if (!hideFrontHand) fighter._drawSukunaCursedEnergyAura(ctx, theme, frontHandX, frontHandY, blobRadius);
      if (!hideBackHand) fighter._drawSukunaCursedEnergyAura(ctx, theme, backHandX, backHandY, blobRadius);
    }

    // 2. Draw Physical Circle Hands ON TOP of aura
    ctx.save();
    ctx.fillStyle = fighter.color || '#e0a899';
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

    // Clean crisp energy flash ring around punching fist during punch animation
    if (fighter.punchAnimTimer > 0 && !fighter.domainActive && !fighter.isChannelingDomainExpansion) {
      const strikingX = fighter.punchAnimHand === 0 ? frontHandX : backHandX;
      const strikingY = fighter.punchAnimHand === 0 ? frontHandY : backHandY;

      ctx.save();
      ctx.translate(strikingX, strikingY);

      // Clean crisp Crimson Impact Ring
      ctx.strokeStyle = '#FF2400';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Taut glowing fiery Cursed Energy bowstring during Fuga charge!
    if (fighter.isChannelingDivineFlame && !hideFrontHand && !hideBackHand) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const progress = Math.min(1.0, (fighter.divineFlameChargeTimer || 0) / Math.max(1, fighter.divineFlameChargeMax || 90));

      const perpX = Math.cos(fighter.gunAngle + Math.PI / 2) * 22;
      const perpY = Math.sin(fighter.gunAngle + Math.PI / 2) * 22;

      const upperTipX = frontHandX + perpX;
      const upperTipY = frontHandY + perpY;
      const lowerTipX = frontHandX - perpX;
      const lowerTipY = frontHandY - perpY;

      // Outer flame glow bowstring
      ctx.strokeStyle = `rgba(255, 120, 0, ${0.75 * progress})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(upperTipX, upperTipY);
      ctx.lineTo(backHandX, backHandY);
      ctx.lineTo(lowerTipX, lowerTipY);
      ctx.stroke();

      // White-hot core bowstring
      ctx.strokeStyle = `rgba(255, 255, 240, ${0.95 * progress})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(upperTipX, upperTipY);
      ctx.lineTo(backHandX, backHandY);
      ctx.lineTo(lowerTipX, lowerTipY);
      ctx.stroke();

      ctx.restore();
    }
  }

  // Draw glowing cursed energy on Sukuna's hands when unleashing slashes
  static drawGun(ctx, fighter) { }

  // Draw Sakuga Anime Impact Frame (ink-brush style impact burst)
  static _drawSakugaImpactFrame(ctx, fighter) {
    const t = fighter.sakugaImpactTimer / fighter.sakugaImpactMaxTimer;
    const alpha = Math.max(0, t);
    const scale = 1.0 + (1.0 - t) * 0.5;

    ctx.save();
    ctx.translate(fighter.sakugaImpactX, fighter.sakugaImpactY);
    ctx.rotate(fighter.sakugaImpactAngle);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const seed = fighter.sakugaImpactSeed;
    const numClusters = 5 + Math.floor(seed * 4);
    for (let c = 0; c < numClusters; c++) {
      const clusterAngle = (c / numClusters) * Math.PI * 2 + seed * 2.5;
      const clusterDist = 18 + (seed * 10) * (c % 3 === 0 ? 1.5 : 0.5);
      const cx = Math.cos(clusterAngle) * clusterDist;
      const cy = Math.sin(clusterAngle) * clusterDist;

      const numStrokes = 3 + Math.floor(seed * 3);
      for (let s = 0; s < numStrokes; s++) {
        const strokeAngle = clusterAngle + (s - 1) * 0.35 + seed * 1.2;
        const strokeLen = 14 + seed * 18 + (s === 0 ? 12 : 0);
        const strokeWidth = 1.5 + seed * 1.5;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const midX = cx + Math.cos(strokeAngle + 0.3) * strokeLen * 0.5;
        const midY = cy + Math.sin(strokeAngle + 0.3) * strokeLen * 0.5;
        const endX = cx + Math.cos(strokeAngle) * strokeLen;
        const endY = cy + Math.sin(strokeAngle) * strokeLen;
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = strokeWidth * 0.45;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Draw hit flame wisps (stretched cursed energy wisps on melee hit)
  static _drawHitFlameWisps(ctx, fighter) {
    for (let i = 0; i < fighter.hitFlameWisps.length; i++) {
      const wisp = fighter.hitFlameWisps[i];
      const lifeRatio = wisp.timer / wisp.maxTimer;

      ctx.save();
      ctx.translate(wisp.x, wisp.y);
      ctx.rotate(wisp.angle);
      ctx.globalAlpha = lifeRatio * 0.85;

      // Outer flame (dark crimson)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wisp.length * 0.3, -wisp.width * 0.5);
      ctx.lineTo(wisp.length, 0);
      ctx.lineTo(wisp.length * 0.3, wisp.width * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#8B0000';
      ctx.fill();

      // Inner flame (bright orange)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wisp.length * 0.25, -wisp.width * 0.25);
      ctx.lineTo(wisp.length * 0.75, 0);
      ctx.lineTo(wisp.length * 0.25, wisp.width * 0.25);
      ctx.closePath();
      ctx.fillStyle = '#FF4500';
      ctx.fill();

      // Core flame (yellow-white)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wisp.length * 0.2, -wisp.width * 0.12);
      ctx.lineTo(wisp.length * 0.5, 0);
      ctx.lineTo(wisp.length * 0.2, wisp.width * 0.12);
      ctx.closePath();
      ctx.fillStyle = '#FFD700';
      ctx.fill();

      ctx.restore();
    }
  }

  // Draw Sukuna's Cursed Energy Aura
  static _drawSukunaCursedEnergyAura(ctx, fighter, colorTheme = 'red', overrideX = null, overrideY = null, overrideRadius = null) {
    // Calculate smooth fade-in & fade-out progress
    let progress = 1.0;
    if (overrideX !== null) {
      progress = Math.min(1.0, (fighter.slashGlowTimer / 25) || 1.0);
    } else if (colorTheme === 'rct') {
      progress = Math.min(1, (fighter.rctVisualTimer / 150) || 1);
    } else if (colorTheme === 'fuga') {
      if (fighter.divineFlameRecoveryTimer > 0) {
        // Smooth fade-out after firing Fuga
        const maxRecovery = CONFIG.sukuna.divineFlameRecoveryTime || 60;
        progress = Math.min(1.0, Math.max(0, fighter.divineFlameRecoveryTimer / maxRecovery));
      } else {
        // Fades in over the channeling duration
        const maxTime = fighter.divineFlameChargeMax || 150;
        progress = fighter.isChannelingDivineFlame ? Math.min(1.0, Math.max(0, fighter.divineFlameChargeTimer / maxTime)) : 0;
      }
    } else if (colorTheme === 'domain') {
      const maxTime = fighter.domainChargeMax || 90;
      progress = (fighter.isChannelingDomainExpansion && !fighter.domainActive) ? Math.min(1.0, Math.max(0, fighter.domainChargeTimer / maxTime)) : 0;
    } else {
      progress = Math.min(1, Math.max(0, fighter.combatAuraOpacity || 0));
    }

    if (progress <= 0) return;

    // Stepped 30-frame anime animation loop (30 FPS Sakuga frame rate)
    const frameRate = 30;
    if (fighter.timeStopTimer > 0 && typeof fighter._timeStopFrozenTime !== 'number') {
      fighter._timeStopFrozenTime = Date.now();
    } else if (fighter.timeStopTimer <= 0) {
      delete fighter._timeStopFrozenTime;
    }
    const nowTime = (fighter.timeStopTimer > 0 && fighter._timeStopFrozenTime !== undefined) ? fighter._timeStopFrozenTime : Date.now();
    const frameIndex = Math.floor((nowTime / 1000) * frameRate) % 30;
    const time = frameIndex * 120;
    ctx.save();
    const posX = overrideX !== null ? overrideX : fighter.x;
    const posY = overrideY !== null ? overrideY : (fighter.y - (fighter.z || 0));
    ctx.translate(posX, posY);
    ctx.globalCompositeOperation = 'source-over';
    const r = overrideRadius !== null ? overrideRadius : fighter.r;

    const isRCT = colorTheme === 'rct';
    const isFuga = colorTheme === 'fuga';

    // === Luminous Body/Hand Backlight (Soft Volcanic Crimson Bloom) ===
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glowRadius = overrideX !== null ? (r + 25) : (r + 90 + Math.sin(time * 0.005) * 8);
    const backGlow = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, glowRadius);
    if (isRCT) {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);
      backGlow.addColorStop(0.5, `rgba(50, 205, 50, ${0.3 * progress})`);
      backGlow.addColorStop(1, 'rgba(50, 205, 50, 0)');
    } else if (isFuga) {
      backGlow.addColorStop(0, `rgba(255, 255, 250, ${0.55 * progress})`);   // White-hot core
      backGlow.addColorStop(0.35, `rgba(255, 120, 20, ${0.45 * progress})`); // Fiery orange bloom
      backGlow.addColorStop(0.7, `rgba(220, 40, 0, ${0.22 * progress})`);   // Crimson outer feathering
      backGlow.addColorStop(1, 'rgba(120, 10, 0, 0)');
    } else {
      backGlow.addColorStop(0, `rgba(255, 255, 255, ${0.45 * progress})`);   // Soft white core
      backGlow.addColorStop(0.35, `rgba(255, 30, 0, ${0.42 * progress})`);  // Crimson red bloom
      backGlow.addColorStop(0.7, `rgba(180, 0, 0, ${0.20 * progress})`);    // Deep blood red feathering
      backGlow.addColorStop(1, 'rgba(80, 0, 0, 0)');
    }
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = backGlow;
    ctx.fill();
    ctx.restore();

    let mainColor = '#FF1100';
    let fillColor = `rgba(230, 20, 20, ${0.72 * progress})`;
    let coreColor = `rgba(255, 120, 100, ${0.85 * progress})`;
    let wispColor = '#FF3300';

    if (isRCT) {
      mainColor = '#32CD32';
      fillColor = `rgba(50, 205, 50, ${0.72 * progress})`;
      coreColor = `rgba(144, 238, 144, ${0.85 * progress})`;
      wispColor = '#00FF7F';
    } else if (isFuga) {
      mainColor = '#FF4500';
      fillColor = `rgba(255, 69, 0, ${0.75 * progress})`;
      coreColor = `rgba(255, 200, 60, ${0.88 * progress})`;
      wispColor = '#FFD700';
    } else if (colorTheme === 'domain') {
      mainColor = '#4B0082'; // Indigo/Dark Purple
      fillColor = `rgba(0, 0, 0, ${0.85 * progress})`; // Almost solid black
      coreColor = `rgba(139, 0, 0, ${0.90 * progress})`; // Solid blood red core
      wispColor = '#8B0000';

      // Draw persistent text and ground ring ONLY during main body channeling (not on hands or after domain deployment)
      if (overrideX === null && fighter.isChannelingDomainExpansion && !fighter.domainActive) {
        ctx.save();
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = `rgba(220, 20, 60, ${progress})`; // Crimson text fading in
        ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        const textY = -r - 50 - (Math.sin(Date.now() / 150) * 5); // Floating effect
        ctx.strokeText('DOMAIN EXPANSION', 0, textY);
        ctx.fillText('DOMAIN EXPANSION', 0, textY);
        ctx.restore();

        // Draw graphic ring on the ground
        ctx.save();
        ctx.scale(1, 0.4); // Isometric perspective
        const ringRadius = 160 * progress; // Expands outwards

        // Outer blood ring
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = `rgba(139, 0, 0, ${progress})`;
        ctx.stroke();

        // Inner rotating dashed indigo ring
        ctx.rotate(Date.now() / 300);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.85, 0, Math.PI * 2);
        ctx.setLineDash([15, 15]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(75, 0, 130, ${progress * 1.2})`;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    const strokeColor = '#000000';

    // (Removed expensive shadowBlur)

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
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw outline as individual segments with varying width
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      const midX = (p.x + next.x) / 2;
      const midY = (p.y + next.y) / 2;

      // Brush pressure varies per segment (thick in some spots, thin in others)
      const pressureNoise = Math.sin(time * 0.002 + i * 1.7) * 0.5 + 0.5;
      const baseThick = 1.2 + pressureNoise * 2.5;

      ctx.lineWidth = baseThick;
      ctx.beginPath();

      const prev = points[(i - 1 + numPoints) % numPoints];
      const prevMidX = (prev.x + p.x) / 2;
      const prevMidY = (prev.y + p.y) / 2;

      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
      ctx.stroke();
    }

    // Inner dark core wash
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = coreColor;
    ctx.fill();

    // Rough, thin black ink brush cuts & hatches moving along the border contour
    ctx.globalAlpha = 0.9 * progress;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'butt';

    const insetScales = [0.84, 0.91, 0.96];
    for (let layer = 0; layer < insetScales.length; layer++) {
      const scale = insetScales[layer];
      const speedDir = (layer % 2 === 0 ? 1 : -1);
      const flowTime = time * 0.003 * speedDir;

      for (let i = 0; i < numPoints; i++) {
        const cutSeed = Math.sin(i * 17.3 + layer * 31.7 + flowTime * 2.5);
        if (cutSeed < -0.1) continue;

        const p = points[i];
        const next = points[(i + 1) % numPoints];
        const prev = points[(i - 1 + numPoints) % numPoints];

        const jitterX = Math.sin(i * 7.9 + layer * 5.3 + time * 0.005) * 1.8;
        const jitterY = Math.cos(i * 11.3 - layer * 3.7 + time * 0.004) * 1.8;

        const midX = (p.x * scale + next.x * scale) / 2 + jitterX;
        const midY = (p.y * scale + next.y * scale) / 2 + jitterY;
        const prevMidX = (prev.x * scale + p.x * scale) / 2 - jitterX * 0.5;
        const prevMidY = (prev.y * scale + p.y * scale) / 2 - jitterY * 0.5;

        const pressureNoise = Math.sin(time * 0.005 + i * 2.3 + layer * 5.1) * 0.5 + 0.5;
        ctx.lineWidth = 0.6 + pressureNoise * 1.6;

        ctx.beginPath();
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p.x * scale + jitterX, p.y * scale + jitterY, midX, midY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // Soft rising flame wisps (smooth curves, bright red-orange) (Removed to prevent wiggling lines)
    /*
    ctx.strokeStyle = wispColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.65 * progress;
    for (let k = 0; k < 3; k++) {
      const baseAngle = -Math.PI * 0.5 + (k - 1) * 0.5;
      const sway = Math.sin(time * 0.003 + k * 2.1) * 0.2;
      const fa = baseAngle + sway;
      const len = r + 18 + Math.sin(time * 0.004 + k * 1.7) * 5;

      ctx.beginPath();
      ctx.moveTo(Math.cos(fa) * (r + 8), Math.sin(fa) * (r + 8));
      ctx.quadraticCurveTo(
        Math.cos(fa + sway * 0.5) * (len * 0.7),
        Math.sin(fa + sway * 0.5) * (len * 0.7),
        Math.cos(fa + sway) * len,
        Math.sin(fa + sway) * len
      );
      ctx.stroke();
    }
    */
    ctx.restore();
  }

  // Helper method to render detailed realistic human & demon skulls
  static _drawRealisticSkull(ctx, fighter, sx, sy, scale = 1.0, isDemon = false) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);

    // Cranium bone gradient fill
    const craniumGlow = ctx.createRadialGradient(-1, -2, 1, 0, 0, 7);
    craniumGlow.addColorStop(0, '#F5EFE6');
    craniumGlow.addColorStop(0.7, '#D4C7B4');
    craniumGlow.addColorStop(1, '#8A7A68');

    ctx.fillStyle = craniumGlow;
    ctx.strokeStyle = '#1F140A';
    ctx.lineWidth = 1.1;

    // Anatomical Human Skull Outline (Cranium + Zygomatic Arches + Maxilla/Mandible)
    ctx.beginPath();
    ctx.moveTo(-4.5, -2.5);
    ctx.quadraticCurveTo(-6.5, -9, 0, -10); // Top cranium dome
    ctx.quadraticCurveTo(6.5, -9, 4.5, -2.5);
    ctx.lineTo(5.5, 1); // Right cheekbone
    ctx.lineTo(3.8, 2);
    ctx.lineTo(3.8, 6.5); // Right upper jaw
    ctx.lineTo(2.2, 8.5); // Right mandible base
    ctx.lineTo(-2.2, 8.5); // Left mandible base
    ctx.lineTo(-3.8, 6.5); // Left upper jaw
    ctx.lineTo(-3.8, 2);
    ctx.lineTo(-5.5, 1); // Left cheekbone
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark Hollow Anatomical Eye Sockets
    ctx.fillStyle = '#180002';
    // Left socket
    ctx.beginPath();
    ctx.moveTo(-1.8, -3.8);
    ctx.lineTo(-5, -3.2);
    ctx.lineTo(-4.2, -0.2);
    ctx.lineTo(-1.6, -1.2);
    ctx.closePath();
    ctx.fill();
    // Right socket
    ctx.beginPath();
    ctx.moveTo(1.8, -3.8);
    ctx.lineTo(5, -3.2);
    ctx.lineTo(4.2, -0.2);
    ctx.lineTo(1.6, -1.2);
    ctx.closePath();
    ctx.fill();

    // Inverted Heart / Triangular Nasal Cavity
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(-1.1, 2.5);
    ctx.lineTo(1.1, 2.5);
    ctx.closePath();
    ctx.fill();

    // Teeth division lines along maxilla & jaw
    ctx.strokeStyle = '#2B1A0C';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2.8, 4.8); ctx.lineTo(2.8, 4.8);
    for (let tx = -2; tx <= 2; tx += 1) {
      ctx.moveTo(tx, 3.5); ctx.lineTo(tx, 6.5);
    }
    ctx.stroke();

    // Demon / Ox Horns attached to skull if specified
    if (isDemon) {
      ctx.fillStyle = '#221208';
      ctx.strokeStyle = '#050201';
      ctx.lineWidth = 1;

      // Left Demon Horn
      ctx.beginPath();
      ctx.moveTo(-4.5, -5.5);
      ctx.quadraticCurveTo(-10, -11, -8, -14);
      ctx.quadraticCurveTo(-5.5, -9, -2.5, -7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Demon Horn
      ctx.beginPath();
      ctx.moveTo(4.5, -5.5);
      ctx.quadraticCurveTo(10, -11, 8, -14);
      ctx.quadraticCurveTo(5.5, -9, 2.5, -7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // Helper method to render the Malevolent Shrine structure
  static _drawShrineBody(ctx, fighter) {
    if (!fighter._shrineCacheCanvas) {
      fighter._shrineCacheCanvas = document.createElement('canvas');
      fighter._shrineCacheCanvas.width = 360;
      fighter._shrineCacheCanvas.height = 420;
      const offCtx = fighter._shrineCacheCanvas.getContext('2d');
      offCtx.translate(180, 230);
      fighter._renderFullShrineToContext(offCtx);
    }

    ctx.drawImage(fighter._shrineCacheCanvas, -180, -230);
  }

  // Pre-rendered vector graphics for Malevolent Shrine (cached to offscreen canvas)
  static _renderFullShrineToContext(ctx, fighter) {
    // Shrine Ambient Backing Glow & Shadows
    const bgGlow = ctx.createRadialGradient(0, -35, 15, 0, -35, 110);
    bgGlow.addColorStop(0, 'rgba(255, 30, 0, 0.65)');
    bgGlow.addColorStop(0.5, 'rgba(120, 0, 0, 0.4)');
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(0, -35, 110, 0, Math.PI * 2);
    ctx.fill();

    // ── SIDE PROFILE MOUTHS (Flanking the Shrine Behind Pillars) ──
    const drawSideMouth = (cx, cy, isLeft) => {
      ctx.save();
      ctx.translate(cx, cy);
      const scaleX = isLeft ? 1 : -1;
      ctx.scale(scaleX * 0.85, 0.85); // Slightly larger scale

      // Side Teeth (Square human teeth following the curve) — BIGGER
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 1;

      // Upper Side Teeth — bigger
      const upperTeeth = [
        { x: -8, y: -26, w: 6, h: 16, ang: 0.05 },
        { x: 0, y: -24, w: 6, h: 15, ang: 0.2 },
        { x: 8, y: -20, w: 6, h: 14, ang: 0.4 },
        { x: 16, y: -15, w: 5.5, h: 13, ang: 0.6 },
        { x: 23, y: -9, w: 5.5, h: 12, ang: 0.8 },
        { x: 29, y: -3, w: 5, h: 10, ang: 1.0 }
      ];
      upperTeeth.forEach(t => {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.ang);
        ctx.fillStyle = '#F5EFE6';
        ctx.fillRect(-t.w / 2, 0, t.w, t.h);
        ctx.strokeRect(-t.w / 2, 0, t.w, t.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-t.w / 2 + 1, 1, t.w - 2, 3);
        ctx.restore();
      });

      // Lower Side Teeth — bigger
      const lowerTeeth = [
        { x: -8, y: 26, w: 6, h: 16, ang: -0.05 },
        { x: 0, y: 24, w: 6, h: 15, ang: -0.2 },
        { x: 8, y: 20, w: 6, h: 14, ang: -0.4 },
        { x: 16, y: 15, w: 5.5, h: 13, ang: -0.6 },
        { x: 23, y: 9, w: 5.5, h: 12, ang: -0.8 },
        { x: 29, y: 3, w: 5, h: 10, ang: -1.0 }
      ];
      lowerTeeth.forEach(t => {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.ang);
        ctx.fillStyle = '#F5EFE6';
        ctx.fillRect(-t.w / 2, -t.h, t.w, t.h);
        ctx.strokeRect(-t.w / 2, -t.h, t.w, t.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-t.w / 2 + 1, -t.h + 1, t.w - 2, 3);
        ctx.restore();
      });

      ctx.restore();
    };

    // Draw Left & Right Side Mouths (Behind the Pillars)
    drawSideMouth(-58, -8, true);
    drawSideMouth(58, -8, false);

    // ── SHRINE VERMILION PILLARS & LINTEL ──
    ctx.fillStyle = '#5A0A0C';
    ctx.strokeStyle = '#1A0000';
    ctx.lineWidth = 2;
    // Left & Right Main Columns
    ctx.fillRect(-44, -40, 9, 58);
    ctx.strokeRect(-44, -40, 9, 58);
    ctx.fillRect(35, -40, 9, 58);
    ctx.strokeRect(35, -40, 9, 58);

    // Inner Vermilion Accents & Gold Capitals
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-45, -42, 11, 4);
    ctx.fillRect(34, -42, 11, 4);

    // Horizontal Lintel Beam above mouth
    ctx.fillStyle = '#3D0608';
    ctx.fillRect(-45, -42, 90, 8);
    ctx.strokeRect(-45, -42, 90, 8);
    ctx.fillStyle = '#B8860B';
    ctx.fillRect(-43, -39, 86, 2);

    // ── OPEN MOUTH MAW WITH SQUARE HUMAN TEETH ──
    // Lip / Fleshy Border
    ctx.fillStyle = '#2D0204';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-35, -8);
    ctx.quadraticCurveTo(-35, -36, 0, -38);
    ctx.quadraticCurveTo(35, -36, 35, -8);
    ctx.lineTo(35, 12);
    ctx.quadraticCurveTo(20, 20, 0, 22);
    ctx.quadraticCurveTo(-20, 20, -35, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Deep Red / Crimson Throat Cavity
    const throatGlow = ctx.createRadialGradient(0, -6, 4, 0, -4, 30);
    throatGlow.addColorStop(0, 'rgba(255, 30, 10, 0.95)');
    throatGlow.addColorStop(0.45, 'rgba(160, 8, 0, 0.85)');
    throatGlow.addColorStop(1, 'rgba(5, 0, 0, 0.98)');
    ctx.fillStyle = throatGlow;
    ctx.beginPath();
    ctx.moveTo(-30, -5);
    ctx.quadraticCurveTo(-30, -30, 0, -33);
    ctx.quadraticCurveTo(30, -30, 30, -5);
    ctx.lineTo(30, 8);
    ctx.quadraticCurveTo(16, 14, 0, 16);
    ctx.quadraticCurveTo(-16, 14, -30, 8);
    ctx.closePath();
    ctx.fill();

    // ── SQUARE / RECTANGULAR HUMAN TEETH ──
    // Upper Human Teeth (6 large teeth along upper jaw arch)
    const upperTeethSquare = [
      { x: -22, w: 8, h: 14 }, { x: -13, w: 8, h: 15 }, { x: -4, w: 8, h: 16 },
      { x: 4, w: 8, h: 16 }, { x: 13, w: 8, h: 15 }, { x: 22, w: 8, h: 14 }
    ];

    // Lower Human Teeth (6 large teeth along lower jaw arch)
    const lowerTeethSquare = [
      { x: -20, w: 8, h: 13 }, { x: -11, w: 8, h: 14 }, { x: -3, w: 8, h: 15 },
      { x: 5, w: 8, h: 15 }, { x: 13, w: 8, h: 14 }, { x: 21, w: 8, h: 13 }
    ];
    upperTeethSquare.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 1;
      const topY = -29;
      // Draw rounded rectangular tooth
      const cornerR = 1.2;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, topY);
      ctx.lineTo(t.x + t.w / 2 - cornerR, topY);
      ctx.quadraticCurveTo(t.x + t.w / 2, topY, t.x + t.w / 2, topY + cornerR);
      ctx.lineTo(t.x + t.w / 2, topY + t.h - cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, topY + t.h, t.x + t.w / 2 - cornerR, topY + t.h);
      ctx.lineTo(t.x - t.w / 2 + cornerR, topY + t.h);
      ctx.quadraticCurveTo(t.x - t.w / 2, topY + t.h, t.x - t.w / 2, topY + t.h - cornerR);
      ctx.lineTo(t.x - t.w / 2, topY + cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, topY, t.x - t.w / 2 + cornerR, topY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tooth enamel gradient highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(t.x - t.w / 2 + 1, topY + 1, t.w - 2, 3);
    });



    lowerTeethSquare.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 1;
      const botY = 12;
      const cornerR = 1.2;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, botY - t.h);
      ctx.lineTo(t.x + t.w / 2 - cornerR, botY - t.h);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY - t.h, t.x + t.w / 2, botY - t.h + cornerR);
      ctx.lineTo(t.x + t.w / 2, botY - cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY, t.x + t.w / 2 - cornerR, botY);
      ctx.lineTo(t.x - t.w / 2 + cornerR, botY);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY, t.x - t.w / 2, botY - cornerR);
      ctx.lineTo(t.x - t.w / 2, botY - t.h + cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY - t.h, t.x - t.w / 2 + cornerR, botY - t.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Enamel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(t.x - t.w / 2 + 1, botY - t.h + 1, t.w - 2, 3);
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── REDESIGNED ANIME-ACCURATE MALEVOLENT SHRINE ROOF ──
    // ══════════════════════════════════════════════════════════════════════

    // ── 1. UNDER-EAVE BRACKET CLUSTERS & WOODEN RAFTERS (Doukyou / Tokyou) ──
    ctx.fillStyle = '#2A0406';
    for (let rx = -68; rx <= 68; rx += 8) {
      ctx.fillRect(rx - 2, -48, 4, 10);
    }
    ctx.fillStyle = '#D4AF37'; // Golden bracket ends
    for (let rx = -64; rx <= 64; rx += 16) {
      ctx.fillRect(rx - 2.5, -43, 5, 3);
    }
    // Horizontal support beam under eaves
    ctx.fillStyle = '#3D0608';
    ctx.fillRect(-70, -48, 140, 4);
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1;
    ctx.strokeRect(-70, -48, 140, 4);

    // ══════════════════════════════════════════════════════════════════════
    // ── 2. MAIN LOWER ROOF TIER — Wide Sweeping Concave Eaves ──
    // ══════════════════════════════════════════════════════════════════════
    // Heavy, imposing overhang with flared eave tips curving up at corners
    const lowerRoofGrad = ctx.createLinearGradient(0, -72, 0, -44);
    lowerRoofGrad.addColorStop(0, '#2A0204');
    lowerRoofGrad.addColorStop(0.4, '#4A0608');
    lowerRoofGrad.addColorStop(0.8, '#5A0A0C');
    lowerRoofGrad.addColorStop(1, '#3A0406');
    ctx.fillStyle = lowerRoofGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Bottom eave edge — wide sweeping concave curve (sags down in center, flares at tips)
    ctx.moveTo(-90, -52);                          // Far left eave tip (flared out)
    ctx.quadraticCurveTo(-70, -40, -40, -38);      // Left droop down
    ctx.quadraticCurveTo(0, -34, 40, -38);         // Center sag (concave belly)
    ctx.quadraticCurveTo(70, -40, 90, -52);        // Right flare up
    // Right upturned eave corner (dramatic curl upward)
    ctx.quadraticCurveTo(86, -60, 78, -58);
    // FLAT RIDGE running across the top
    ctx.lineTo(68, -68);
    ctx.lineTo(-68, -68);
    ctx.lineTo(-78, -58);
    // Left upturned eave corner
    ctx.quadraticCurveTo(-86, -60, -90, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Layered roof tile ridges for depth (horizontal lines on lower roof)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    for (let ridgeY = -66; ridgeY <= -42; ridgeY += 5) {
      const spread = 0.6 + (ridgeY + 68) / 26 * 0.4;
      ctx.beginPath();
      ctx.moveTo(-85 * spread, ridgeY);
      ctx.quadraticCurveTo(0, ridgeY + 4 * spread, 85 * spread, ridgeY);
      ctx.stroke();
    }

    // Vertical tile texture lines (fan out from ridge to eave)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let tx = -60; tx <= 60; tx += 7) {
      ctx.beginPath();
      const topX = tx * 0.82;
      const topY = -67;
      const botX = tx * 1.2;
      const eaveY = -38 + Math.abs(tx) * 0.18;
      ctx.moveTo(topX, topY);
      ctx.lineTo(botX, eaveY);
      ctx.stroke();
    }

    // Gold trim along bottom eave edge
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-90, -52);
    ctx.quadraticCurveTo(-70, -40, -40, -38);
    ctx.quadraticCurveTo(0, -34, 40, -38);
    ctx.quadraticCurveTo(70, -40, 90, -52);
    ctx.stroke();

    // Secondary gold trim along flat ridge top
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-68, -68);
    ctx.lineTo(68, -68);
    ctx.stroke();

    // ══════════════════════════════════════════════════════════════════════
    // ── 3. UPPER TIER GABLE ROOF (Chidori Hafu / Triangular Peak) ──
    // ══════════════════════════════════════════════════════════════════════
    const upperRoofGrad = ctx.createLinearGradient(0, -100, 0, -64);
    upperRoofGrad.addColorStop(0, '#1A0102');
    upperRoofGrad.addColorStop(0.5, '#380305');
    upperRoofGrad.addColorStop(1, '#4A0608');
    ctx.fillStyle = upperRoofGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Bottom edge of upper gable (sits on top of lower roof ridge)
    ctx.moveTo(-58, -66);
    // Outer gable eave edges sweeping up to the peak
    ctx.quadraticCurveTo(-30, -82, 0, -94);
    ctx.quadraticCurveTo(30, -82, 58, -66);
    // Upper ridge corners (slightly upturned)
    ctx.quadraticCurveTo(50, -74, 42, -72);
    // Inner gable boundary
    ctx.quadraticCurveTo(22, -88, 0, -100);
    ctx.quadraticCurveTo(-22, -88, -42, -72);
    ctx.quadraticCurveTo(-50, -74, -58, -66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vertical tile texture on upper gable
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.8;
    for (let tx = -40; tx <= 40; tx += 6) {
      const ratio = Math.abs(tx) / 50;
      ctx.beginPath();
      ctx.moveTo(tx * 0.7, -68 - (1 - ratio) * 28);
      ctx.lineTo(tx, -66 - ratio * 4);
      ctx.stroke();
    }

    // Gold trim on upper gable outer eave edge
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-58, -66);
    ctx.quadraticCurveTo(-30, -82, 0, -94);
    ctx.quadraticCurveTo(30, -82, 58, -66);
    ctx.stroke();

    // ══════════════════════════════════════════════════════════════════════
    // ── 4. DISTINCTIVE BULL-LIKE HORNS AT CORNER RIDGES ──
    // ══════════════════════════════════════════════════════════════════════
    // Horns protrude from: 4 corners of lower roof eaves + 2 corners of upper gable ridge
    // They sweep dramatically outward and upward, mimicking an enraged bull

    const drawBullHorn = (bx, by, cp1x, cp1y, cp2x, cp2y, tipX, tipY, baseW, color, highlightColor) => {
      // Calculate perpendicular for base width
      const dx = cp1x - bx;
      const dy = cp1y - by;
      const angle = Math.atan2(dy, dx);
      const perp = angle + Math.PI / 2;
      const blx = bx + Math.cos(perp) * baseW;
      const bly = by + Math.sin(perp) * baseW;
      const brx = bx - Math.cos(perp) * baseW;
      const bry = by - Math.sin(perp) * baseW;

      // Horn body with bone gradient
      const hornGrad = ctx.createLinearGradient(bx, by, tipX, tipY);
      hornGrad.addColorStop(0, color);
      hornGrad.addColorStop(0.6, '#1A2C30');
      hornGrad.addColorStop(1, '#0A1418');
      ctx.fillStyle = hornGrad;
      ctx.strokeStyle = '#040A0C';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(blx, bly);
      // Outer curve — sweeping outward then back
      ctx.bezierCurveTo(cp1x - 2, cp1y - 2, cp2x, cp2y, tipX, tipY);
      // Inner curve — back to base
      ctx.bezierCurveTo(cp2x + 4, cp2y + 4, cp1x + 4, cp1y + 3, brx, bry);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ridge highlight along outer curve (bony shine)
      if (highlightColor) {
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo((blx + brx) / 2, (bly + bry) / 2);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }


    };

    // ── LOWER LEFT EAVE CORNER HORN — sweeps far left and upward ──
    drawBullHorn(
      -86, -52,       // base at left eave corner
      -115, -60,      // cp1: sweeps outward
      -125, -85,      // cp2: curves up dramatically
      -110, -108,     // tip: fierce upward point
      8, '#1F3A40', '#6ABBC8'
    );

    // ── LOWER RIGHT EAVE CORNER HORN — mirrored ──
    drawBullHorn(
      86, -52,        // base at right eave corner
      115, -60,       // cp1: sweeps outward
      125, -85,       // cp2: curves up
      110, -108,      // tip: fierce upward point
      8, '#1F3A40', '#6ABBC8'
    );

    // ── UPPER LEFT RIDGE CORNER HORN — curving outward from gable corner ──
    drawBullHorn(
      -56, -66,       // base at upper left ridge corner
      -85, -72,       // cp1: outward sweep
      -95, -100,      // cp2: dramatic upward arc
      -78, -125,      // tip: high and fierce
      6, '#2F4A50', '#7ACBD0'
    );

    // ── UPPER RIGHT RIDGE CORNER HORN — mirrored ──
    drawBullHorn(
      56, -66,        // base at upper right ridge corner
      85, -72,        // cp1: outward sweep
      95, -100,       // cp2: dramatic upward arc
      78, -125,       // tip: high and fierce
      6, '#2F4A50', '#7ACBD0'
    );

    // ── TOP LEFT PEAK HORN — flanking the demon mask, sweeping up and outward ──
    drawBullHorn(
      -18, -92,       // base near top of gable peak (left of demon mask)
      -35, -100,      // cp1: sweeps outward
      -42, -112,      // cp2: shorter upward arc
      -28, -122,      // tip: shorter and closer in
      4, '#2A4450', '#8ADBE8'
    );

    // ── TOP RIGHT PEAK HORN — mirrored ──
    drawBullHorn(
      18, -92,        // base near top of gable peak (right of demon mask)
      35, -100,       // cp1: sweeps outward
      42, -112,       // cp2: shorter upward arc
      28, -122,       // tip: shorter and closer in
      4, '#2A4450', '#8ADBE8'
    );

    // ══════════════════════════════════════════════════════════════════════
    // ── 5. SMALLER SHARP HORN-LIKE PROTRUSIONS ALONG ROOF EDGES ──
    // ══════════════════════════════════════════════════════════════════════
    // Twisted, grotesque spikes integrated into the roof's edges and corners

    const drawSmallHorn = (sx, sy, tipDx, tipDy, w) => {
      ctx.fillStyle = '#1A2A2E';
      ctx.strokeStyle = '#060E10';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - w, sy);
      ctx.quadraticCurveTo(sx + tipDx * 0.5, sy + tipDy * 0.5, sx + tipDx, sy + tipDy);
      ctx.quadraticCurveTo(sx + tipDx * 0.5, sy + tipDy * 0.5, sx + w, sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // Spikes along the lower eave edge (left side)
    drawSmallHorn(-72, -46, -12, -22, 3);
    drawSmallHorn(-55, -40, -8, -18, 2.5);
    drawSmallHorn(-35, -37, -6, -16, 2);
    // Spikes along the lower eave edge (right side)
    drawSmallHorn(72, -46, 12, -22, 3);
    drawSmallHorn(55, -40, 8, -18, 2.5);
    drawSmallHorn(35, -37, 6, -16, 2);
    // Spikes along upper gable edges
    drawSmallHorn(-42, -72, -8, -14, 2);
    drawSmallHorn(-25, -80, -5, -12, 1.8);
    drawSmallHorn(42, -72, 8, -14, 2);
    drawSmallHorn(25, -80, 5, -12, 1.8);

    // ══════════════════════════════════════════════════════════════════════
    // ── 6. CLOSED-TEETH MOUTH AT CENTER GABLE PEAK ──
    // ══════════════════════════════════════════════════════════════════════
    // A row of closed teeth visible at the top center of the gable (like the reference)

    ctx.save();
    ctx.translate(0, -86);

    // Dark mouth slit behind the teeth
    ctx.fillStyle = '#0A0000';
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.quadraticCurveTo(0, -6, 18, -2);
    ctx.quadraticCurveTo(0, 6, -18, -2);
    ctx.closePath();
    ctx.fill();

    // Upper closed teeth (hanging down)
    const gableUpperTeeth = [
      { x: -14, w: 5.5, h: 8 }, { x: -8, w: 5.5, h: 9 }, { x: -2.5, w: 5.5, h: 10 },
      { x: 3, w: 5.5, h: 10 }, { x: 8.5, w: 5.5, h: 9 }, { x: 14, w: 5.5, h: 8 }
    ];
    gableUpperTeeth.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 0.8;
      const cornerR = 1;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, -4);
      ctx.lineTo(t.x + t.w / 2 - cornerR, -4);
      ctx.quadraticCurveTo(t.x + t.w / 2, -4, t.x + t.w / 2, -4 + cornerR);
      ctx.lineTo(t.x + t.w / 2, -4 + t.h - cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, -4 + t.h, t.x + t.w / 2 - cornerR, -4 + t.h);
      ctx.lineTo(t.x - t.w / 2 + cornerR, -4 + t.h);
      ctx.quadraticCurveTo(t.x - t.w / 2, -4 + t.h, t.x - t.w / 2, -4 + t.h - cornerR);
      ctx.lineTo(t.x - t.w / 2, -4 + cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, -4, t.x - t.w / 2 + cornerR, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Enamel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(t.x - t.w / 2 + 1, -3, t.w - 2, 2);
    });

    // Lower closed teeth (pointing up, meeting the upper teeth)
    const gableLowerTeeth = [
      { x: -12, w: 5, h: 7 }, { x: -6, w: 5, h: 8 }, { x: 0, w: 5, h: 8.5 },
      { x: 6, w: 5, h: 8 }, { x: 12, w: 5, h: 7 }
    ];
    gableLowerTeeth.forEach(t => {
      ctx.fillStyle = '#F5EFE6';
      ctx.strokeStyle = '#2B1B10';
      ctx.lineWidth = 0.8;
      const cornerR = 1;
      const botY = 4;
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2 + cornerR, botY);
      ctx.lineTo(t.x + t.w / 2 - cornerR, botY);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY, t.x + t.w / 2, botY - cornerR);
      ctx.lineTo(t.x + t.w / 2, botY - t.h + cornerR);
      ctx.quadraticCurveTo(t.x + t.w / 2, botY - t.h, t.x + t.w / 2 - cornerR, botY - t.h);
      ctx.lineTo(t.x - t.w / 2 + cornerR, botY - t.h);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY - t.h, t.x - t.w / 2, botY - t.h + cornerR);
      ctx.lineTo(t.x - t.w / 2, botY - cornerR);
      ctx.quadraticCurveTo(t.x - t.w / 2, botY, t.x - t.w / 2 + cornerR, botY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Enamel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(t.x - t.w / 2 + 1, botY - 3, t.w - 2, 2);
    });

    ctx.restore(); // End gable mouth transform

    // ── POINTY SHORT PILLAR AT ROOF PEAK ──
    // Dark pointed pillar/finial at the very top
    ctx.fillStyle = '#2A0406';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    // Pillar base (short rectangular shaft)
    ctx.fillRect(-4, -102, 8, 10);
    ctx.strokeRect(-4, -102, 8, 10);
    // Pointed tip
    ctx.beginPath();
    ctx.moveTo(0, -115);
    ctx.lineTo(-5, -102);
    ctx.lineTo(5, -102);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Gold accent ring at base of pillar
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-5, -93, 10, 3);
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-5, -93, 10, 3);

    // ══════════════════════════════════════════════════════════════════════
    // ── 7. ANIMALISTIC SKULLS AT ROOF EDGES AND CORNERS ──
    // ══════════════════════════════════════════════════════════════════════
    // Skulls integrated into the roof structure — hanging from eaves and at gable corners

    const hangingSkulls = [
      // Lower eave corners
      { x: -85, y: -48, s: 0.85 }, { x: 85, y: -48, s: 0.85 },
      // Along lower eave edge
      { x: -60, y: -40, s: 0.7 }, { x: 60, y: -40, s: 0.7 },
      { x: -30, y: -36, s: 0.65 }, { x: 30, y: -36, s: 0.65 },
      { x: 0, y: -34, s: 0.6 },
      // At upper gable corners
      { x: -52, y: -64, s: 0.75 }, { x: 52, y: -64, s: 0.75 },
      // Along upper gable edges
      { x: -30, y: -76, s: 0.65 }, { x: 30, y: -76, s: 0.65 },
    ];
    hangingSkulls.forEach((sk, i) => {
      // Hanging chain / sinew
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sk.x, sk.y - 5);
      ctx.lineTo(sk.x + Math.sin(sk.x * 0.1) * 2, sk.y + 2);
      ctx.stroke();
      fighter._drawRealisticSkull(ctx, sk.x, sk.y + 6, sk.s, i % 2 === 0);
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── 8. SKULL MOUND AT SHRINE BASE ──
    // ══════════════════════════════════════════════════════════════════════
    const baseSkulls = [
      // Layer 1: Back row
      { x: -65, y: 14, s: 0.6, d: true }, { x: 65, y: 14, s: 0.6, d: true },
      { x: -52, y: 16, s: 0.65 }, { x: 52, y: 16, s: 0.65 },
      // Layer 2: Middle Pile
      { x: -42, y: 18, s: 0.7 }, { x: -28, y: 17, s: 0.75, d: true },
      { x: -16, y: 19, s: 0.75 }, { x: -5, y: 18, s: 0.8 },
      { x: 5, y: 18, s: 0.8 }, { x: 16, y: 19, s: 0.75 },
      { x: 28, y: 17, s: 0.75, d: true }, { x: 42, y: 18, s: 0.7 },
      // Layer 3: Front Mound
      { x: -58, y: 21, s: 0.65 }, { x: -38, y: 22, s: 0.8 },
      { x: -22, y: 23, s: 0.85 }, { x: -9, y: 22, s: 0.8 },
      { x: 0, y: 24, s: 0.85, d: true }, { x: 9, y: 22, s: 0.8 },
      { x: 22, y: 23, s: 0.85 }, { x: 38, y: 22, s: 0.8 },
      { x: 58, y: 21, s: 0.65 }
    ];
    baseSkulls.forEach(sk => {
      fighter._drawRealisticSkull(ctx, sk.x, sk.y, sk.s, sk.d || false);
    });
  }

  // PUBLIC: Draw domain liquid water floor BEFORE fighters so they aren't overlayed
  static drawDomainBackground(ctx, fighter, isClashSecondary = false) {
    renderSukunaDomainBackground(fighter, ctx, isClashSecondary);
  }

  // Draw Malevolent Shrine structure & embers (called during fighter draw, AFTER background)
  static drawDomainForeground(ctx, fighter) {
    renderSukunaDomainForeground(fighter, ctx);
  }
}
