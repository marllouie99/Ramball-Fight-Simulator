import { Fighter, isSuppressedByGetsuga } from '../../entities/fighter.js';
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

    const isSaitamaCounterActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'saitama' || f.type === 'saitama') && 
      ((f._counterPunchTimer && f._counterPunchTimer > 0) || 
       (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) || 
       (f._counterWindupTimer && f._counterWindupTimer > 0) ||
       f.isCountering)
    );
    const isSuppressed = typeof fighter.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : Boolean(fighter.isTargetOfAmbush || fighter.caughtInSaitamaCounter || isSaitamaCounterActive || isSuppressedByGetsuga(fighter));

    // Domain Expansion Channeling Visuals (Ground ring, Aura)
    if (fighter.isChannelingDomainExpansion && (fighter.timeStopTimer || 0) <= 0 && !isSuppressed) {
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

    // === PIXEL ART PURPLE RECOVERY BREATHER STASIS VISUAL ===
    if ((fighter.purpleRecoveryTimer || 0) > 0 && !isSuppressed) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const time = Date.now();
      const pulse = 1 + Math.sin(time * 0.008) * 0.08;
      const ringRadius = (fighter.r + 12) * pulse;
      const P = 2.5; // Stepped pixel grid size
      const maxRecovery = fighter.purpleRecoveryMaxTimer || 120;
      const ratio = Math.max(0, Math.min(1, fighter.purpleRecoveryTimer / maxRecovery));

      const cx = fighter.x;
      const cy = fighter.y - (fighter.z || 0);

      // 1. Soft Stepped Pixel Atmosphere Fill
      ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
      const fillSteps = Math.ceil(ringRadius / P);
      for (let gy = -fillSteps; gy <= fillSteps; gy++) {
        for (let gx = -fillSteps; gx <= fillSteps; gx++) {
          const d = Math.hypot(gx * P, gy * P);
          if (d <= ringRadius && (gx + gy) % 2 === 0) {
            ctx.fillRect(cx + gx * P, cy + gy * P, P, P);
          }
        }
      }

      // 2. Stepped Concentric Void Purple & Cursed Ink Pixel Ring
      // 2.1 Dark Outer Ink Border
      ctx.fillStyle = '#0E0F14';
      for (let a = 0; a < 360; a += 1.2) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * (ringRadius + P)) / P) * P;
        const by = Math.round((Math.sin(rad) * (ringRadius + P)) / P) * P;
        ctx.fillRect(cx + bx, cy + by, P, P);
      }

      // 2.2 Glowing Void Purple Main Ring
      ctx.fillStyle = '#A855F7';
      for (let a = 0; a < 360; a += 1.2) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * ringRadius) / P) * P;
        const by = Math.round((Math.sin(rad) * ringRadius) / P) * P;
        ctx.fillRect(cx + bx, cy + by, P, P);
      }

      // 2.3 Inner Lavender Specular Core
      ctx.fillStyle = '#E9D5FF';
      for (let a = 0; a < 360; a += 2.4) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * (ringRadius - P)) / P) * P;
        const by = Math.round((Math.sin(rad) * (ringRadius - P)) / P) * P;
        ctx.fillRect(cx + bx, cy + by, P, P);
      }

      // 3. Stepped Pixel Countdown Progress Arc (Electric Cyan & White Tip)
      const arcR = ringRadius + P * 2.5;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * ratio);
      const totalDeg = Math.round(ratio * 360);

      // Dark shadow backdrop under countdown arc
      ctx.fillStyle = '#001428';
      for (let deg = 0; deg <= totalDeg; deg += 1.5) {
        const rad = startAngle + (deg * Math.PI) / 180;
        const ax = Math.round((Math.cos(rad) * (arcR + P * 0.8)) / P) * P;
        const ay = Math.round((Math.sin(rad) * (arcR + P * 0.8)) / P) * P;
        ctx.fillRect(cx + ax, cy + ay, P, P);
      }

      // Electric Cyan Progress Arc
      ctx.fillStyle = '#00E5FF';
      for (let deg = 0; deg <= totalDeg; deg += 1.5) {
        const rad = startAngle + (deg * Math.PI) / 180;
        const ax = Math.round((Math.cos(rad) * arcR) / P) * P;
        const ay = Math.round((Math.sin(rad) * arcR) / P) * P;
        ctx.fillRect(cx + ax, cy + ay, P, P);
      }

      // Pure-White Leading Pixel Head
      if (totalDeg > 0) {
        const leadRad = endAngle;
        const lx = Math.round((Math.cos(leadRad) * arcR) / P) * P;
        const ly = Math.round((Math.sin(leadRad) * arcR) / P) * P;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx + lx - P * 0.5, cy + ly - P * 0.5, P * 2, P * 2);
      }

      // 4. Orbiting 4-Point Pixel Diamond Stars (Stabilizing Limitless Energy)
      const starCount = 3;
      const orbitSpeed = time * 0.003;
      for (let s = 0; s < starCount; s++) {
        const starAngle = orbitSpeed + (s * (Math.PI * 2 / starCount));
        const starDist = ringRadius + 14;
        const sx = Math.round((cx + Math.cos(starAngle) * starDist) / P) * P;
        const sy = Math.round((cy + Math.sin(starAngle) * starDist) / P) * P;

        // Outer cyan glow
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(sx - P, sy, P * 3, P);
        ctx.fillRect(sx, sy - P, P, P * 3);

        // Core white glint
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx, sy, P, P);
      }

      ctx.restore();
    }

    // Draw Sakuga Anime Impact Frame (matches reference image style with unique angle/variation)
    if (fighter.sakugaImpactTimer > 0 && !isSuppressed) {
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
    if (fighter.hitFlameWisps && fighter.hitFlameWisps.length > 0 && !isSuppressed) {
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
    if (fighter.afterImages && fighter.afterImages.length > 0 && !isSuppressed) {
      ctx.save();
      const skipAlternate = (typeof state !== 'undefined' && state.fps && state.fps < 45);
      fighter.afterImages.forEach((img, i) => {
        if (skipAlternate && i % 2 === 0) return;
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
    if (fighter.punchEffects && fighter.punchEffects.length > 0 && !isSuppressed) {
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
    if (fighter.afterImages && fighter.afterImages.length > 0 && !isSuppressed) {
      const skipAlternate = (typeof state !== 'undefined' && state.fps && state.fps < 45);
      for (let i = 0; i < fighter.afterImages.length; i++) {
        if (skipAlternate && i % 2 === 0) continue;
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
    // Also suppress when frozen by Gojo's own domain or when his domain is active or under ambush/counter
    const isFrozenByDomain = (fighter.timeStopTimer > 0) || (fighter.hitStunTimer > 0);
    const isInOwnDomain = fighter.domainActive;
    if (!isSuppressed) {
      if (fighter.isChannelingPurple) {
        if (fighter.is200PercentChannel || fighter.purpleUseCount === 1) {
          fighter._drawJJKCursedEnergyAura(ctx, 'purple');
        }
      } else if (fighter.isChannelingRCT || fighter.healingAuraTimer > 0) {
        fighter._drawJJKCursedEnergyAura(ctx, 'rct');
      } else if (!isFrozenByDomain && !isInOwnDomain && (fighter.isMeleeMode || fighter.combatAuraOpacity > 0 || state.gameState === 'countdown' || fighter._isWinnerReveal)) {
        fighter._drawJJKCursedEnergyAura(ctx, 'blue');
      }
    }

    // Draw hand Cursed Energy flame blobs BEHIND body
    fighter._drawHandCursedEnergyAura(ctx);
    fighter._drawHandCursedEnergy(ctx, 'back');

    // 1b. Champion/Victory Screen: Draw 3D orbiting orbs BEHIND body when zDepth < 0
    if (fighter._isWinnerReveal) {
      GojoRenderer._draw3DOrbitingOrbs(ctx, fighter, 'back');
    }

    // 2. Draw fighter body
    drawGojoBody(ctx, fighter);

    if (!fighter.isChannelingPurple) {
      fighter.drawGun(ctx);
    }

    // 3. Draw physical circle hands + flare ON TOP of body
    fighter._drawHandCursedEnergy(ctx, 'front');

    // Draw Hollow Purple Red & Blue fusing orbs ON TOP of hands so hands don't cover them
    if (fighter.isChannelingPurple) {
      fighter.drawGun(ctx);
    }

    // Draw Reversal Red Orb + blast ON TOP of body and hands (hidden during Mahoraga wheel click pause or under counter)
    const isMahoAdapting = (typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && f.hp > 0 && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga') || f.characterId === 'mahoraga') && 
      ((f.wheelClickTimer || 0) > 0 || (f.adaptationPauseTimer || 0) > 0)
    )) || ((fighter.mahoragaAdaptationFreezeTimer || 0) > 0);

    if (fighter.redEffectTimer > 0 && !isMahoAdapting && !isSuppressed) {
      fighter._drawReversalRedEffect(ctx);
    }

    fighter.drawHealth(ctx);
    fighter.drawFreezeTimer(ctx);

    // 3b. Champion/Victory Screen: Draw 3D orbiting orbs IN FRONT of body when zDepth >= 0
    if (fighter._isWinnerReveal) {
      GojoRenderer._draw3DOrbitingOrbs(ctx, fighter, 'front');
    }

    // Domain Expansion Floating Text is drawn on top layer by drawUltimateChannelingTexts()
  }

  /**
   * Renders the 3 Cursed Technique Orbs (Red, Blue, Purple) orbiting Gojo in 3D perspective.
   * Split into 'back' (zDepth < 0) and 'front' (zDepth >= 0) layers for 3D occlusion around his body.
   */
  static _draw3DOrbitingOrbs(ctx, fighter, layer = 'front') {
    const t = Date.now();
    const orbitRadius = fighter.r + 38;
    const orbs = [
      { colorType: 'red',    angleOffset: 0 },
      { colorType: 'blue',   angleOffset: (Math.PI * 2) / 3 },
      { colorType: 'purple', angleOffset: (Math.PI * 4) / 3 }
    ];

    for (const orb of orbs) {
      const angle = (t / 600) + orb.angleOffset;
      const zDepth = Math.sin(angle); // -1.0 (far back behind Gojo) -> +1.0 (front)
      const isBehind = zDepth < 0;

      if ((layer === 'back' && isBehind) || (layer === 'front' && !isBehind)) {
        const ox = fighter.x + Math.cos(angle) * orbitRadius;
        const oy = fighter.y + zDepth * (orbitRadius * 0.42) - 6;
        const orbR = 8.5 * (0.8 + 0.35 * ((zDepth + 1) / 2));
        
        ctx.save();
        if (isBehind) {
          ctx.globalAlpha = 0.75 + zDepth * 0.25; // Subtle depth fade when passing behind back
        }
        drawGojoOrb(ctx, ox, oy, orbR, t, orb.colorType, 0);
        ctx.restore();
      }
    }
  }

  // Calculate hand positions for melee punch / skill gestures (Front POV style)
  static _getHandPositions(fighter) {
    const basePosY = (fighter.y - (fighter.z || 0));

    // Champion Screen / Victory Reveal / Fighter Index Stance / Round Countdown / Showoff (FaceOff): Hide hands completely
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isFaceOff = fighter._isFaceOff || (typeof state !== 'undefined' && state.gameState === 'faceoff');
    const isWinnerScreen = fighter._isWinnerReveal || isCountdown || isFaceOff || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));
    if (isWinnerScreen || fighter.hideHands) {
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
      const is200 = !!(fighter.is200PercentChannel || fighter.purpleUseCount === 1);

      if (is200) {
        // 200% Purple Custom Animation Sequence:
        // Frame 1 (mergeProgress < 0.65): Hands wide open sideways as Red and Blue float high above
        // Frame 2 & 3 (mergeProgress >= 0.65 -> 1.00): When about to launch 200% Purple, both hands smoothly move forward and get close together in front of the body
        let handX = 0;
        let handY = r * 2.2;

        if (mergeProgress >= 0.65) {
          const launchP = Math.min(1.0, (mergeProgress - 0.65) / 0.35); // 0.0 -> 1.0
          // Smooth S-curve easing for natural organic hand movement
          const easeClasp = 0.5 - 0.5 * Math.cos(launchP * Math.PI);
          
          // Move from 0 (side alignment) forward to front edge of body circle (r * 0.88)
          handX = easeClasp * (r * 0.88);
          // Move from wide open (r * 2.2) inward until both hands are touching side-by-side (r * 0.30)
          handY = (r * 2.2) * (1 - easeClasp) + (r * 0.30) * easeClasp;
        }

        const fHand = toGlobal(handX, handY);
        const bHand = toGlobal(handX, -handY);
        return { frontHandX: fHand.x, frontHandY: fHand.y, backHandX: bHand.x, backHandY: bHand.y, hideFrontHand, hideBackHand };
      } else {
        // Standard 100% Purple gesture
        const handDistance = r + 10;
        const handSpread = 14 * (1 - mergeProgress);
        const fHand = toGlobal(handDistance, handSpread);
        const bHand = toGlobal(handDistance, -handSpread);
        return { frontHandX: fHand.x, frontHandY: fHand.y, backHandX: bHand.x, backHandY: bHand.y, hideFrontHand, hideBackHand };
      }
    }

    // 4. Domain Expansion Hand Sign Gesture (Unlimited Void - Single Hand Sign near Collar)
    if (fighter.isChannelingDomainExpansion) {
      hideBackHand = true;
      hideFrontHand = false;
      const domainHand = toGlobal(0, r * 0.28);
      return {
        frontHandX: domainHand.x,
        frontHandY: domainHand.y,
        backHandX: domainHand.x,
        backHandY: domainHand.y,
        hideFrontHand,
        hideBackHand
      };
    }

    // Idle martial arts brawler guard stance & dynamic front hand punches
    let frontHandX, frontHandY, backHandX = 0, backHandY = 0;
    hideBackHand = true; // Hide back hand for brawler single front hand stance

    if (fighter.punchAnimTimer > 0) {
      const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 12;
      const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
      let easePunch = 0;
      if (rawProgress < 0.28) {
        easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
      } else {
        const retractT = (rawProgress - 0.28) / 0.72;
        easePunch = Math.cos(retractT * (Math.PI / 2));
      }
      const lungeExtension = easePunch * (r * 1.5);

      // All punches executed with the front hand extending forward from right edge
      frontHandX = r * 0.95 + lungeExtension * 1.40;
      frontHandY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
    } else {
      // Idle brawler guard stance: front hand at the right edge of body circle
      frontHandX = r * 0.95;
      frontHandY = 0;
    }

    const fHand = toGlobal(frontHandX, frontHandY);
    const bHand = toGlobal(backHandX, backHandY);

    return { 
      frontHandX: fHand.x, frontHandY: fHand.y, 
      backHandX: bHand.x, backHandY: bHand.y, 
      hideFrontHand, hideBackHand 
    };
  }

  // Render hand Cursed Energy aura blobs (removed per user request)
  static _drawHandCursedEnergyAura(ctx, fighter) {
    return;
  }

  // Render physical circle hands (back layer behind body, front layer on top of body)
  static _drawHandCursedEnergy(ctx, fighter, layer = 'all') {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    if (fighter.hideHands) return;

    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isFaceOff = fighter._isFaceOff || (typeof state !== 'undefined' && state.gameState === 'faceoff');
    const isWinnerScreen = fighter._isWinnerReveal || isCountdown || isFaceOff || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));
    if (isWinnerScreen || fighter.isTargetOfAmbush) return;

    const hands = fighter._getHandPositions();
    if (!hands) return;

    const { frontHandX, frontHandY, backHandX, backHandY, hideFrontHand, hideBackHand } = hands;
    const handRadius = getHandSize(7.5, fighter);
    const is200Purple = fighter.isChannelingPurple && !!(fighter.is200PercentChannel || fighter.purpleUseCount === 1);
    const skinColor = fighter.skinColor || '#FFE0BD';

    const _drawPixelFist = (hx, hy) => {
      const P = 2.0;
      const gridR = Math.max(P * 2, handRadius);
      const steps = Math.ceil(gridR / P);

      // Outer Dark Shell
      ctx.fillStyle = '#0E0F14';
      for (let gy = -steps; gy <= steps; gy++) {
        for (let gx = -steps; gx <= steps; gx++) {
          const dist = Math.hypot(gx * P, gy * P);
          if (dist <= gridR + P * 0.75) {
            ctx.fillRect(Math.round(hx + gx * P), Math.round(hy + gy * P), P, P);
          }
        }
      }

      // Inner Base Skin Tone
      ctx.fillStyle = skinColor;
      const innerR = gridR - P * 0.4;
      for (let gy = -steps; gy <= steps; gy++) {
        for (let gx = -steps; gx <= steps; gx++) {
          const dist = Math.hypot(gx * P, gy * P);
          if (dist <= innerR) {
            ctx.fillRect(Math.round(hx + gx * P), Math.round(hy + gy * P), P, P);
          }
        }
      }

      // Knuckle Shading
      ctx.fillStyle = '#D4A882';
      for (let gy = 0; gy <= steps; gy++) {
        for (let gx = -steps; gx <= steps; gx++) {
          const dist = Math.hypot(gx * P, gy * P);
          if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
            ctx.fillRect(Math.round(hx + gx * P), Math.round(hy + gy * P), P, P);
          }
        }
      }

      // Knuckle Specular Highlight
      ctx.fillStyle = '#FFF5EB';
      ctx.fillRect(Math.round(hx + P * 0.5), Math.round(hy - innerR * 0.45), P, P);
      ctx.fillRect(Math.round(hx + P * 1.5), Math.round(hy - innerR * 0.45), P, P);
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Back hand: drawn on 'back' layer for normal stances, but for 200% Purple both hands render in front on top of body
    if (!is200Purple) {
      if ((layer === 'all' || layer === 'back') && !hideBackHand) {
        _drawPixelFist(backHandX, backHandY);
      }
    }

    // Front hand (on top of body circle)
    if (layer === 'all' || layer === 'front') {
      if (is200Purple) {
        // Draw both hands on top of the body circle during 200% purple launch preparation
        if (!hideBackHand) {
          _drawPixelFist(backHandX, backHandY);
        }
      }

      if (!hideFrontHand) {
        _drawPixelFist(frontHandX, frontHandY);
      }

      // Unlimited Void Hand Sign: crossed fingers near collar during domain channeling
      if (fighter.isChannelingDomainExpansion) {
        const P = 2.0;
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(Math.round(frontHandX - 4), Math.round(frontHandY - handRadius * 1.6), 8, handRadius * 1.6);
        ctx.fillStyle = skinColor;
        ctx.fillRect(Math.round(frontHandX - 3), Math.round(frontHandY - handRadius * 1.5), 6, handRadius * 1.5);
      }
    }
    ctx.restore();
  }

  static drawOutline(ctx, fighter) {
    // Global fighter body outline stroke removed
  }

  static _drawHealingAura(ctx, fighter) {
    const progress = fighter.healingAuraTimer / 180; // Fade out as timer decreases
    if (progress <= 0) return;
    const time = Date.now();

    ctx.save();
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
    ctx.globalCompositeOperation = 'source-over';

    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;
    const r = fighter.r || 25;

    // ── 1. STEPPED PIXEL GLOW RINGS (Concentric Pixel Art Aura) ──
    const ringRadii = [r * 1.35, r * 1.15, r * 0.95];
    const ringAlphas = [0.22 * progress, 0.38 * progress, 0.55 * progress];
    const ringColors = ['rgba(56, 189, 248,', 'rgba(50, 205, 50,', 'rgba(167, 243, 208,'];

    for (let i = 0; i < ringRadii.length; i++) {
      const rad = ringRadii[i];
      const alpha = ringAlphas[i];
      const col = ringColors[i];
      const gridR = Math.ceil(rad / P);
      ctx.fillStyle = `${col} ${alpha.toFixed(2)})`;
      for (let gy = -gridR; gy <= gridR; gy++) {
        for (let gx = -gridR; gx <= gridR; gx++) {
          const dist = Math.sqrt(gx * gx + gy * gy) * P;
          if (dist <= rad && dist > rad - P * 2) {
            ctx.fillRect(gx * P - P * 0.5, gy * P - P * 0.5, P, P);
          }
        }
      }
    }

    // ── 2. STEPPED PIXEL FLAME CRESTS (8 Radial Pixel Flames) ──
    const flameCount = 8;
    for (let f = 0; f < flameCount; f++) {
      const baseAngle = (Math.PI * 2 / flameCount) * f + time * 0.002;
      const flameLen = snap(r * (0.35 + Math.sin(time * 0.008 + f * 1.2) * 0.2));
      const startDist = r * 0.9;
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const d = startDist + (flameLen / steps) * s;
        const fx = snap(Math.cos(baseAngle) * d);
        const fy = snap(Math.sin(baseAngle) * d);
        const flameAlpha = progress * (1 - (s / steps) * 0.7);
        ctx.fillStyle = s === steps - 1 
          ? `rgba(255, 255, 255, ${flameAlpha.toFixed(2)})`
          : `rgba(56, 189, 248, ${(flameAlpha * 0.8).toFixed(2)})`;
        ctx.fillRect(fx - P * 0.5, fy - P * 0.5, P, P);
      }
    }

    // ── 3. ORBITING / ASCENDING PIXEL CROSSES (+) ──
    const crossCount = 5;
    for (let c = 0; c < crossCount; c++) {
      const angle = time * 0.003 + (c * Math.PI * 2) / crossCount;
      const orbitR = r * (1.15 + Math.sin(time * 0.005 + c) * 0.2);
      const px = snap(Math.cos(angle) * orbitR);
      const py = snap(Math.sin(angle) * orbitR * 0.6 - ((time * 0.035 + c * 14) % (r * 1.6)));
      const crossAlpha = progress * (0.6 + Math.sin(time * 0.01 + c) * 0.4);

      if (crossAlpha > 0.05) {
        // White-hot center pixel
        ctx.fillStyle = `rgba(255, 255, 255, ${crossAlpha.toFixed(2)})`;
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);

        // 4 cardinal arms
        ctx.fillStyle = `rgba(0, 255, 102, ${(crossAlpha * 0.85).toFixed(2)})`;
        ctx.fillRect(px - P * 1.5, py - P * 0.5, P, P);
        ctx.fillRect(px + P * 0.5, py - P * 0.5, P, P);
        ctx.fillRect(px - P * 0.5, py - P * 1.5, P, P);
        ctx.fillRect(px - P * 0.5, py + P * 0.5, P, P);
      }
    }

    ctx.restore();

    // Spawn occasional pixel healing particles while aura is active
    if (Math.random() < 0.35) {
      const angle = Math.random() * Math.PI * 2;
      const dist = fighter.r * (0.5 + Math.random() * 0.5);
      const px = fighter.x + Math.cos(angle) * dist;
      const py = (fighter.y - (fighter.z || 0)) + Math.sin(angle) * dist;
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
      progress = (fighter && fighter.combatAuraOpacity !== undefined) ? Math.min(1, Math.max(0, fighter.combatAuraOpacity)) : 1.0;
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
    let fillColor = `rgba(0, 212, 204, ${0.30 * progress})`;
    let coreColor = `rgba(200, 255, 250, ${0.40 * progress})`;

    if (colorTheme === 'rct') {
      mainColor = '#32CD32';
      fillColor = `rgba(50, 205, 50, ${0.30 * progress})`;
      coreColor = `rgba(144, 238, 144, ${0.40 * progress})`;
    } else if (colorTheme === 'red') {
      mainColor = '#FF1100';
      fillColor = `rgba(255, 17, 0, ${0.32 * progress})`;
      coreColor = `rgba(255, 120, 100, ${0.40 * progress})`;
    } else if (colorTheme === 'purple') {
      mainColor = '#9900FF';
      fillColor = `rgba(153, 0, 255, ${0.32 * progress})`;
      coreColor = `rgba(204, 120, 255, ${0.40 * progress})`;
    } else if (colorTheme === 'pink') {
      mainColor = '#FF1493';
      fillColor = `rgba(255, 20, 147, ${0.32 * progress})`;
      coreColor = `rgba(255, 200, 220, ${0.40 * progress})`;
    } else if (colorTheme === 'mahito' || colorTheme === 'magenta') {
      mainColor = '#D946EF';
      fillColor = `rgba(217, 70, 239, ${0.32 * progress})`;
      coreColor = `rgba(245, 208, 254, ${0.40 * progress})`;
    } else if (colorTheme === 'nanami' || colorTheme === 'gold' || colorTheme === 'golden') {
      mainColor = '#D4AF37'; // Warm Ochre / Golden Sand
      fillColor = `rgba(212, 175, 55, ${0.36 * progress})`;
      coreColor = `rgba(255, 235, 120, ${0.48 * progress})`;
    }
    const strokeColor = '#000000'; // Pure pitch black JJK ink contour

    // (Removed shadowBlur for 60 FPS performance)

    // Generate smooth flame contour points (Viscous Liquid Fire Silhouette - stretching Sakuga tongues)
    const numPoints = 28;
    const isHandBlob = (overrideRadius !== null && overrideRadius < (r * 0.8));
    const baseRadius = isHandBlob ? (r + 9.0) : (r + 15);
    const points = [];
    const moveOffset = (fighter.x + fighter.y) * 0.015;
    const stretchMult = isHandBlob ? 0.2 : 1.0;

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

    // === Soft Bloom/Glow Layer (Slightly larger concentric shape with flat fill) ===
    const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
    if (!isLowQuality) {
      ctx.save();
      ctx.scale(1.22, 1.22);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      for (let i = 0; i < numPoints; i++) {
        const p = points[i];
        const next = points[(i + 1) % numPoints];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.fillStyle = mainColor + '1C'; // ~11% opacity of the theme color
      ctx.fill();
      ctx.restore();
    }

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
      ctx.globalAlpha = 0.3 * progress;
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
    // Hide Gojo's Red blast and repulsion rings visual effect during Mahoraga's wheel click adaptation pause
    const isMahoragaAdapting = (typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && f.hp > 0 && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga') || f.characterId === 'mahoraga') && 
      ((f.wheelClickTimer || 0) > 0 || (f.adaptationPauseTimer || 0) > 0)
    )) || ((fighter.mahoragaAdaptationFreezeTimer || 0) > 0);

    if (isMahoragaAdapting) {
      return;
    }

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
    return; // Red ring visual disabled as requested
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
