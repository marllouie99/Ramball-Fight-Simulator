import { Fighter } from '../../entities/fighter.js';
import { FighterRenderer } from '../renderers/fighterRenderer.js';
import { CONFIG, GUN_TIP_DIST, getHandSize } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';
import { spawnBloodEffect } from '../particles/bloodEffect.js';
import { fastCleanArray, pushTrailCap } from '../particles/visualTrailSystem.js';
import { renderYutaDomainBackground } from '../../entities/fighters/yuta/yutaDomainVisuals.js';
import { updateRika } from '../../entities/fighters/yuta/rikaLogic.js';

const _yutaAuraCanvasCache = new Map();

export class YutaRenderer {
  static drawDomainBackground(ctx, fighter, isClashSecondary = false) {
    renderYutaDomainBackground(fighter, ctx, isClashSecondary);
  }

  static draw(ctx, fighter, opponent) {
    const wasHidingHp = fighter.hideHpText;
    fighter.hideHpText = true;

    ctx.save();
    let tremorX = 0;
    let tremorY = 0;
    const currentShake = (typeof state !== 'undefined' && state.screenShake) ? (state.screenShake.intensity || 0) : 0;
    if (fighter.isChannelingDomain || currentShake > 0) {
      const shakeAmt = fighter.isChannelingDomain ? 5.0 : Math.min(6, currentShake * 0.6);
      tremorX = (Math.random() - 0.5) * shakeAmt;
      tremorY = (Math.random() - 0.5) * shakeAmt;
    }
    ctx.translate(tremorX, tremorY);

    if (fighter.isChannelingDomain) {
      fighter._drawDomainChannelAura(ctx);
    }

    fighter._drawYutaCursedEnergyAura(ctx);

    // Draw sword bag on his back (behind body)
    fighter._drawYutaSwordBag(ctx);

    Fighter.prototype.draw.call(fighter, ctx, opponent);

    // Domain Expansion Floating Text is drawn on top layer by drawUltimateChannelingTexts()
    ctx.restore();

    // Draw spatial cracks (Thin Ice Breaker)
    if (fighter.spatialCracks && fighter.spatialCracks.length > 0) {
      YutaRenderer._drawSpatialCracks(ctx, fighter);
    }

    // Draw the left hand punching out for Thin Ice Breaker
    if (fighter.thinIceBreakerChargeTimer > 0 || fighter.thinIceBreakerPunchTimer > 0) {
      YutaRenderer._drawThinIceBreakerHand(ctx, fighter);
    }

    // Draw afterimages during flurry & teleports (Draw ON TOP of Sakuga Impact Frame so they are never covered!)
    if (fighter.afterImages && fighter.afterImages.length > 0) {
      const skipAlternate = (typeof state !== 'undefined' && state.fps && state.fps < 45);
      for (let i = 0; i < fighter.afterImages.length; i++) {
        if (skipAlternate && i % 2 === 0) continue;
        const ai = fighter.afterImages[i];
        const maxT = ai.maxTimer || 25;
        const progress = Math.max(0, Math.min(1, ai.timer / maxT));
        const alpha = Math.pow(progress, 0.7) * 0.2; // High visibility smooth fade

        ctx.save();
        ctx.globalAlpha = alpha;

        // 1. High-Speed Dash Trajectory Streaks
        if (ai.fromX !== undefined && ai.toX !== undefined) {
          ctx.strokeStyle = '#FF1493';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ai.fromX, ai.fromY);
          ctx.lineTo(ai.toX, ai.toY);
          ctx.stroke();

          // Inner white-hot streak core
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(ai.fromX, ai.fromY);
          ctx.lineTo(ai.toX, ai.toY);
          ctx.stroke();
        }

        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle || 0);

        // 2. Outer Cursed Energy Radial Glow Aura (Neon Pink / Violet Bloom) - Optimized: Solid fill circle instead of radial gradient
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255, 20, 147, 0.18)`;
        ctx.beginPath();
        ctx.arc(0, 0, fighter.r * 1.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // 3. Phantom Body Silhouette Circle
        ctx.beginPath();
        ctx.arc(0, 0, fighter.r * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = '#FF1493'; // Vibrant Deep Pink
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; // Crisp White Outline for extreme contrast
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 4. Directional Eye Glints (High-speed facing indicator)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(fighter.r * 0.5, -fighter.r * 0.25, 3, 0, Math.PI * 2);
        ctx.arc(fighter.r * 0.5, fighter.r * 0.25, 3, 0, Math.PI * 2);
        ctx.fill();

        // 5. Extended Katana Phantom Blade Silhouette
        const swordLength = 48;
        ctx.beginPath();
        ctx.moveTo(fighter.r * 0.6, 6);
        ctx.lineTo(fighter.r * 0.6 + swordLength, 2);
        ctx.lineTo(fighter.r * 0.6 + swordLength + 8, 0);
        ctx.lineTo(fighter.r * 0.6 + swordLength, -2);
        ctx.lineTo(fighter.r * 0.6, -6);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }
    }

    if (fighter.rika && (fighter.rika.active || (fighter.rikaAlpha && fighter.rikaAlpha > 0) || (fighter.rikaEmergingForBeamTimer && fighter.rikaEmergingForBeamTimer > 0))) {
      if (fighter.hp <= 0) {
        // Trigger retracting/shrinking instantly if Yuta dies
        if (fighter.rika.active && !fighter.rika.disappearing) {
          fighter.rika.disappearing = true;
          fighter.rika.disappearDuration = 30;
          fighter.rika.disappearTimer = 30;
          fighter.rika.startX = fighter.rika.x;
          fighter.rika.startY = fighter.rika.y;
        }

        // Run updateRika since normal update loop bypasses dead fighters
        if (fighter.rika.active) {
          updateRika(fighter, CONFIG.arena);
        }

        // Gradually fade rikaAlpha to 0 once Rika starts disappearing on death
        if (fighter.rika.disappearing) {
          fighter.rikaAlpha = Math.max(0, fighter.rikaAlpha - 0.04);
        }
      }

      const rk = fighter.rika;
      const spawnScale = rk.spawnScale ?? 1.0;
      let drawX = rk.x;
      let drawY = rk.y;
      if (rk.spawnTimer > 0) {
        const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
        const progress = 1 - (rk.spawnTimer / ariseMax);
        const shakeAmt = (1.0 - progress * 0.4) * 5;
        drawX += (Math.random() - 0.5) * shakeAmt;
        drawY += (Math.random() - 0.5) * shakeAmt;
      }

      let targetAngle = 0;
      if (rk.timeStopTimer > 0 || rk.hitStunTimer > 0 || rk.isDying) {
        targetAngle = rk.angle || 0;
      } else {
        if (opponent && !opponent.isDead) {
          const desiredAngle = Math.atan2(opponent.y - rk.y, opponent.x - rk.x);
          if (opponent.isStealthed) {
            let diff = desiredAngle - (rk.angle || 0);
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            targetAngle = (rk.angle || 0) + diff * (CONFIG.toji?.stealthTurnRate || 0.035);
          } else {
            targetAngle = desiredAngle;
          }
        } else if (Math.hypot(rk.vx, rk.vy) > 0.1) {
          targetAngle = Math.atan2(rk.vy, rk.vx);
        } else {
          targetAngle = rk.angle || 0;
        }
        rk.angle = targetAngle;
      }

      if (!state.pixiApp || fighter.isDemoFighter) {
        const renderState = { drawX, drawY, targetAngle, spawnScale };

        ctx.save();
        ctx.translate(tremorX, tremorY);
        ctx.globalAlpha = fighter.rikaAlpha;
        fighter._drawRikaCursedEnergyAura(ctx, opponent, renderState);
        fighter._drawRika(ctx, opponent, renderState);
        ctx.restore();
      }
    }

    fighter.hideHpText = wasHidingHp;
    if (!fighter.hideHpText) {
      FighterRenderer.drawHealth(ctx, fighter);
    }
  }

  static _drawDomainChannelAura(ctx, fighter) {
    const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 180));

    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    // 2. Isometric Ground Summoning Ring
    ctx.scale(1, 0.45);
    const ringRadius = 140 * progress;

    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    
    // Fake glow for ring
    ctx.lineWidth = 15;
    ctx.strokeStyle = `rgba(255, 20, 147, ${progress * 0.3})`;
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(255, 20, 147, ${progress})`;
    ctx.stroke();

    ctx.restore();
  }

  static _drawRika(ctx, fighter, opponent, renderState = null) {
    if (!fighter.rika) return;

    const rk = fighter.rika;
    const isGojoDomainActive = typeof state !== 'undefined' && (
      state.domainActive || state.activeDomain ||
      (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
    );

    if (rk.killedInDomain || (isGojoDomainActive && (rk.isDying || rk.hp <= 0 || !rk.active))) {
      return; // Do NOT render Rika white corpse inside Gojo's domain
    }

    const spawnScale = renderState ? renderState.spawnScale : (rk.spawnScale ?? 1.0);
    const isGamePlay = renderState ? !!renderState.isHybrid : true;

    let drawX = renderState ? renderState.drawX : rk.x;
    let drawY = renderState ? renderState.drawY : rk.y;
    if (!renderState && rk.spawnTimer > 0) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      const progress = 1 - (rk.spawnTimer / ariseMax);
      const shakeAmt = (1.0 - progress * 0.4) * 5;
      drawX += (Math.random() - 0.5) * shakeAmt;
      drawY += (Math.random() - 0.5) * shakeAmt;
    }

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(spawnScale, spawnScale);

    const r = (rk.r !== undefined && rk.r !== null) ? Math.max(0.1, rk.r) : 30;
    const now = Date.now();
    const pulse = Math.sin(now / 150) * (r * 0.06);

    let targetAngle = renderState ? renderState.targetAngle : 0;
    if (!renderState) {
      if (rk.timeStopTimer > 0 || rk.hitStunTimer > 0 || rk.isDying) {
        targetAngle = rk.angle || 0;
      } else {
        if (opponent && !opponent.isDead) {
          const desiredAngle = Math.atan2(opponent.y - rk.y, opponent.x - rk.x);
          if (opponent.isStealthed) {
            let diff = desiredAngle - (rk.angle || 0);
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            targetAngle = (rk.angle || 0) + diff * (CONFIG.toji?.stealthTurnRate || 0.035);
          } else {
            targetAngle = desiredAngle;
          }
        } else if (Math.hypot(rk.vx, rk.vy) > 0.1) {
          targetAngle = Math.atan2(rk.vy, rk.vx);
        } else {
          targetAngle = rk.angle || 0;
        }
        rk.angle = targetAngle;
      }
    }

    // Rotate context so +x is forward facing
    ctx.rotate(targetAngle);

    // 2. Trailing Shadow Tail extending naturally behind Rika's spine
    ctx.save();
    const tailLen = r * 1.5;
    const tailWave1 = Math.sin(now / 110) * 4;
    const tailWave2 = Math.cos(now / 140) * 5;

    const baseWidth = r * 0.28;
    const midWidth = r * 0.16;

    ctx.beginPath();
    // Top edge: extending backward behind Rika
    ctx.moveTo(-r * 0.4, -baseWidth);
    ctx.bezierCurveTo(
      -r * 0.8, -midWidth + tailWave1,
      -r * 1.2, tailWave2,
      -tailLen, 0
    );
    // Bottom edge: returning to Rika's back
    ctx.bezierCurveTo(
      -r * 1.2, tailWave2,
      -r * 0.8, midWidth + tailWave1,
      -r * 0.4, baseWidth
    );
    ctx.closePath();

    if (isGamePlay) {
      ctx.fillStyle = '#210638';
    } else {
      const tailGrad = ctx.createLinearGradient(-r * 0.4, 0, -tailLen, 0);
      tailGrad.addColorStop(0, '#420E63');
      tailGrad.addColorStop(0.5, '#210638');
      tailGrad.addColorStop(1, 'rgba(10, 0, 22, 0)');
      ctx.fillStyle = tailGrad;
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    const attackTimer = rk.attackTimer || 0;
    const isAttacking = (attackTimer > 0 || (rk.leftArmTimer || 0) > 0);

    // 3. Left & Right Top-Down Arms and Claws (reaching forward on both sides)
    // Arms alternate: right fires immediately, left fires 30 frames later via its own timer.
    const rightArmTimer = rk.rightArmTimer || 0;
    const leftArmTimer = rk.leftArmTimer || 0;

    // Left Arm (-y side)
    fighter._drawTopDownArmAndClaw(ctx, r * 0.2, -r * 1.1, r * 1.3, -r * 1.3, true, leftArmTimer, isGamePlay);
    // Right Arm (+y side)
    fighter._drawTopDownArmAndClaw(ctx, r * 0.2, r * 1.1, r * 1.3, r * 1.3, false, rightArmTimer, isGamePlay);

    // 4. Main Torso Circle (Base Hull from top-down)
    ctx.beginPath();
    ctx.arc(0, 0, r + pulse * 0.5, 0, Math.PI * 2);
    
    if (isGamePlay) {
      ctx.fillStyle = '#D2C8DC';
    } else {
      const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.2, 0, 0, r);
      bodyGrad.addColorStop(0, '#F6F2FA');   // Bone highlight
      bodyGrad.addColorStop(0.65, '#D2C8DC'); // Muscle grey
      bodyGrad.addColorStop(1, '#4D3E5E');   // Outer shadow
      ctx.fillStyle = bodyGrad;
    }
    
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ribcage / Skeletal overlay on shoulders/back (skipped during active gameplay for speed)
    if (!isGamePlay) {
      ctx.save();
      ctx.strokeStyle = 'rgba(70, 50, 90, 0.4)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * 4, 0, r * 0.6, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      }
      ctx.restore();
    }

    const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
    const tendrilCount = isLowQuality ? 1 : (isGamePlay ? 3 : 5);
    const numSegments = isLowQuality ? 3 : (isGamePlay ? 6 : 12);
    const loopMin = isLowQuality ? 0 : (isGamePlay ? -1 : -2);
    const loopMax = isLowQuality ? 0 : (isGamePlay ? 1 : 2);

    for (let pass = 0; pass < 2; pass++) {
      ctx.save();
      ctx.strokeStyle = pass === 0 ? '#000000' : '#EBE5F2';
      ctx.lineWidth = pass === 0 ? 5.5 : 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = loopMin; i <= loopMax; i++) {
        const offset = i * (isGamePlay ? 12 : 8); // Base y-spread

        ctx.beginPath();
        ctx.moveTo(r * 0.4, offset * 0.5); // Root on head

        const tendrilLength = r * 2.5;

        for (let s = 1; s <= numSegments; s++) {
          const progress = s / numSegments;
          const currentX = r * 0.4 - (tendrilLength * progress); // Extending backwards

          // Wave amplitude grows towards the tip
          const waveAmplitude = 14 * Math.pow(progress, 1.5);

          // Traveling sine wave along the tendril's length
          const waveY = Math.sin((now / 120) - (progress * 6) + i) * waveAmplitude;

          // Tendrils spread out slightly more at the tips
          const currentY = (offset * 0.5) + (offset * progress * 0.8) + waveY;

          ctx.lineTo(currentX, currentY);
        }
        ctx.stroke();
      }
      ctx.restore();
    } // end pass loop

    // 6. Top-Down Head & Gaping Teeth Maw (Front Center at +x)
    ctx.save();
    // Head dome
    ctx.beginPath();
    ctx.ellipse(r * 0.5, 0, r * 0.45, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F8F5FA';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head Shell Rib Lines (skipped during active gameplay)
    if (!isGamePlay) {
      ctx.strokeStyle = 'rgba(120, 100, 140, 0.4)';
      ctx.lineWidth = 1.5;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.arc(r * 0.5, k * 4, r * 0.35, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      }
    }

    // Gaping Maw
    const mouthOpen = isAttacking ? 16 : 8;
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -mouthOpen * 0.5);
    ctx.lineTo(r * 1.1, 0);
    ctx.lineTo(r * 0.7, mouthOpen * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#1A000A';
    ctx.fill();

    // Sharp Teeth inside maw (grouped path for massive Canvas draw call reduction)
    ctx.fillStyle = '#FFFEE0';
    ctx.beginPath();
    for (let t = -3; t <= 3; t++) {
      if (t === 0) continue;
      const toothY = t * (mouthOpen * 0.12);
      ctx.moveTo(r * 0.75, toothY);
      ctx.lineTo(r * 0.9, toothY + (t > 0 ? 1 : -1));
      ctx.lineTo(r * 0.8, toothY + (t > 0 ? 2 : -2));
    }
    ctx.fill();
    ctx.restore();

    // Attack Slash Ring Effect
    if (isAttacking) {
      ctx.strokeStyle = 'rgba(255, 180, 220, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r * 1.3, 0, 22, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }

    // 8. Draw Spectacular Triple-Claw Slash Visuals on top of everything
    const rikaArmsForVisual = [ 
      { timer: rk.rightArmTimer || 0, isLeft: false }, 
      { timer: rk.leftArmTimer || 0, isLeft: true } 
    ];
    
    try {
      rikaArmsForVisual.forEach(arm => {
        const armAttackTimer = arm.timer;
        const isLeftArm = arm.isLeft;
        if (armAttackTimer > 0) {
          const sideSign = isLeftArm ? -1 : 1;
          const startAng = 0.75 * sideSign;
          const targetAng = -0.75 * sideSign;
          
          const idleDx = r * 1.1; 
          const idleDy = r * 0.2 * sideSign;
          const idleAngle = Math.atan2(idleDy, idleDx);
          
          let slashActive = false;
          let slashProgress = 0;
          let slashAlpha = 0;
          let angleOffset = 0;
          
          const p = Math.min(60, armAttackTimer);
          if (p > 52) {
             // Wind up phase
          } else if (p > 42) {
             // Active swing phase
             const t = (52 - p) / 10;
             const eased = 1 - Math.pow(1 - t, 3);
             angleOffset = startAng + (targetAng - startAng) * eased;
             // Fade IN dynamically during swing
             slashAlpha = Math.min(1.0, t * 1.5) * 0.95;
             slashActive = true;
             slashProgress = t;
          } else {
             // Linger and fade phase
             if (p > 22) {
               slashActive = true;
               slashProgress = 1.0;
               // Fade OUT gracefully over 20 frames
               slashAlpha = ((p - 22) / 20) * 0.95;
               angleOffset = targetAng;
             }
          }
          
          if (slashActive && slashAlpha > 0.05) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            
            const clawRadii = [r * 1.5, r * 1.85, r * 2.2];
            
            const startAngle = idleAngle + startAng;
            const endAngle = idleAngle + (slashProgress === 1.0 ? targetAng : angleOffset);
            const anticlockwise = !isLeftArm;
            
            clawRadii.forEach((radius, index) => {
               // Layer 1: Bright Purple outer backing
               ctx.strokeStyle = `rgba(138, 43, 226, ${slashAlpha * 0.6})`;
               ctx.lineWidth = 10 - index * 1.5;
               ctx.lineCap = 'round';
               ctx.beginPath();
               ctx.arc(0, 0, radius, startAngle, endAngle, anticlockwise);
               ctx.stroke();
               
               // Layer 2: Glowing Hot pink mid-layer
               ctx.strokeStyle = `rgba(255, 20, 147, ${slashAlpha * 0.9})`;
               ctx.lineWidth = 6 - index;
               ctx.beginPath();
               ctx.arc(0, 0, radius, startAngle, endAngle, anticlockwise);
               ctx.stroke();
               
               // Layer 3: White-hot inner core
               ctx.strokeStyle = `rgba(255, 255, 255, ${slashAlpha})`;
               ctx.lineWidth = 2.5;
               ctx.beginPath();
               ctx.arc(0, 0, radius, startAngle, endAngle, anticlockwise);
               ctx.stroke();
            });
            ctx.restore();
          }
        }
      });
    } catch (e) {
      console.error("Error drawing Rika slash visual:", e);
    }

    // 9. Draw Health Bar
    if (rk.maxHp > 0 && rk.hp > 0) {
      ctx.save();
      ctx.rotate(-targetAngle); // Un-rotate so health bar draws horizontally flat
      
      const hpRatio = Math.max(0, rk.hp / rk.maxHp);
      const barW = r * 2.5;
      const barH = 5.5;
      const barX = -barW / 2;
      const barY = -r - 22; // Position clearly above her head

      // Background frame
      ctx.fillStyle = '#111';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      
      // Health fill color
      ctx.fillStyle = (hpRatio > 0.5) ? '#2ecc71' : (hpRatio > 0.25) ? '#f1c40f' : '#e74c3c'; // Green for high health
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      
      ctx.restore();
    }

    if (rk && rk.hitFlashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${rk.hitFlashTimer / 8})`;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // Restore main transform
  }

  static _drawTopDownArmAndClaw(ctx, fighter, shoulderX, shoulderY, handX, handY, isLeft, attackTimer, isGamePlay = false) {
    ctx.save();

    const sideSign = isLeft ? -1 : 1;
    const now = Date.now();

    // Compute the idle arm vector (from shoulder to hand)
    const idleDx = handX - shoulderX;
    const idleDy = handY - shoulderY;
    const armLen = Math.sqrt(idleDx * idleDx + idleDy * idleDy);
    const idleAngle = Math.atan2(idleDy, idleDx); // angle of idle arm

    let angleOffset = 0;
    let slashTrailAlpha = 0;
    let clawSpread = 0;

    const startAng = 0.75 * sideSign;   // Outward wind-up angle offset (pull back)
    const targetAng = -0.75 * sideSign; // Forward crossed slash angle offset (IN FRONT!)

    let isSlashing = false;
    let slashProgress = 0;

    if (attackTimer > 0) {
      const p = Math.min(60, attackTimer);
      if (p > 52) {
        const t = (60 - p) / 8;
        const eased = t * t;
        angleOffset = startAng * eased;
        clawSpread = 0.6 * eased;
      } else if (p > 42) {
        const t = (52 - p) / 10;
        const eased = 1 - Math.pow(1 - t, 3);
        angleOffset = startAng + (targetAng - startAng) * eased;
        slashTrailAlpha = (1 - t) * 0.95;
        clawSpread = 0.6 - (1.1 * eased);
        isSlashing = true;
        slashProgress = t;
      } else {
        const t = p / 42;
        const eased = t * t;
        angleOffset = targetAng * eased;
        clawSpread = -0.3 * eased;
        // Let the claw slash trail linger and fade out over 20 frames
        if (p > 22) {
          isSlashing = true;
          slashProgress = 1.0;
          slashTrailAlpha = ((p - 22) / 20) * 0.95;
        }
      }
    }

    // Emergence Arm Sweep & Finger Wave Animation (as she rises & pauses)
    const isEmerging = (fighter.rika && fighter.rika.spawnTimer > 0);
    let emergenceAngleOffset = 0;
    let emergenceFingerFlex = 0;

    if (isEmerging) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      const progress = 1 - (fighter.rika.spawnTimer / ariseMax);
      // Arms sweep out wide during rise and pause moment
      emergenceAngleOffset = (Math.sin(progress * Math.PI) * 0.35 * sideSign);
      // Dynamic finger wave flex as her clawed hands emerge
      emergenceFingerFlex = Math.sin((now / 100) + (isLeft ? 0 : 1.5)) * 0.22;
    }

    const idleBreath = (attackTimer === 0) ? Math.sin(now / 800) * 0.03 : 0;
    const currentAngle = idleAngle + angleOffset + emergenceAngleOffset + idleBreath;

    const finalHandX = shoulderX + Math.cos(currentAngle) * armLen;
    const finalHandY = shoulderY + Math.sin(currentAngle) * armLen;

    const elbowX = (shoulderX + finalHandX) * 0.5 + 10;
    const elbowY = (shoulderY + finalHandY) * 0.5 + (20 * sideSign);

    const wShoulder = 7;
    const wWrist = 4.5;
    const fingersData = [
      { name: 'Thumb', baseX: 7, baseY: isLeft ? 5.5 : -5.5, len: 19, baseAngle: isLeft ? 0.65 : -0.65, thick: 4.2 },
      { name: 'Index', baseX: 15, baseY: isLeft ? 3.5 : -3.5, len: 26, baseAngle: isLeft ? 0.22 : -0.22, thick: 4.0 },
      { name: 'Middle', baseX: 16, baseY: 0, len: 29, baseAngle: 0, thick: 4.2 },
      { name: 'Ring', baseX: 15, baseY: isLeft ? -3.5 : 3.5, len: 26, baseAngle: isLeft ? -0.22 : 0.22, thick: 3.8 },
      { name: 'Pinky', baseX: 13, baseY: isLeft ? -5.5 : 5.5, len: 21, baseAngle: isLeft ? -0.45 : 0.45, thick: 3.2 }
    ];
    const flexIdle = ((attackTimer === 0) ? Math.sin(now / 400) * 0.05 : 0) + emergenceFingerFlex;

    // Muscular Arm with tapering organic outline
    ctx.save();
    const armAngle = Math.atan2(finalHandY - shoulderY, finalHandX - shoulderX);
    const nx = -Math.sin(armAngle);
    const ny = Math.cos(armAngle);

    ctx.beginPath();
    ctx.moveTo(shoulderX + nx * wShoulder, shoulderY + ny * wShoulder);
    ctx.quadraticCurveTo(elbowX + nx * 6, elbowY + ny * 6, finalHandX + nx * wWrist, finalHandY + ny * wWrist);
    ctx.lineTo(finalHandX - nx * wWrist, finalHandY - ny * wWrist);
    ctx.quadraticCurveTo(elbowX - nx * 6, elbowY - ny * 6, shoulderX - nx * wShoulder, shoulderY - ny * wShoulder);
    ctx.closePath();

    if (isGamePlay) {
      ctx.fillStyle = '#D3C8DC';
    } else {
      const armGrad = ctx.createLinearGradient(shoulderX, shoulderY, finalHandX, finalHandY);
      armGrad.addColorStop(0, '#EAE3F2');
      armGrad.addColorStop(0.7, '#D3C8DC');
      armGrad.addColorStop(1, '#B5A6C4');
      ctx.fillStyle = armGrad;
    }
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Muscle / Tendon line art on forearm
    ctx.beginPath();
    ctx.moveTo(shoulderX + nx * 2, shoulderY + ny * 2);
    ctx.quadraticCurveTo(elbowX, elbowY, finalHandX + nx * 1, finalHandY + ny * 1);
    ctx.strokeStyle = 'rgba(70, 45, 90, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Hand Palm & Claws (Image 2 style organic hand rendering)
    ctx.save();
    ctx.translate(finalHandX, finalHandY);

    // Rotate to point along forearm towards hand
    const palmAngle = currentAngle;
    ctx.rotate(palmAngle);

    // 1. Organic Palm (Fleshy contoured palm base)
    ctx.beginPath();
    ctx.moveTo(0, -wWrist);
    ctx.bezierCurveTo(6, -wWrist * 1.3, 12, -wWrist * 1.2, 16, -6);
    ctx.bezierCurveTo(18, -2, 18, 2, 16, 6);
    ctx.bezierCurveTo(10, wWrist * 1.3, 4, wWrist * 1.1, 0, wWrist);
    ctx.closePath();

    if (isGamePlay) {
      ctx.fillStyle = '#D6CCE0';
    } else {
      const palmGrad = ctx.createRadialGradient(8, 0, 2, 8, 0, 16);
      palmGrad.addColorStop(0, '#F6F2FA');
      palmGrad.addColorStop(0.6, '#D6CCE0');
      palmGrad.addColorStop(1, '#8A779E');
      ctx.fillStyle = palmGrad;
    }
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Palm Crease & Muscle Line Art (matching sketch style in Image 2)
    ctx.beginPath();
    ctx.moveTo(4, -3);
    ctx.bezierCurveTo(9, -1, 13, 2, 15, 4);
    ctx.moveTo(6, 3);
    ctx.bezierCurveTo(10, 4, 13, 1, 15, -2);
    ctx.strokeStyle = 'rgba(50, 30, 70, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Organic Clawed Fingers (5 Digits matching Image 2 gesture)
    fingersData.forEach((f, idx) => {
      ctx.save();
      ctx.translate(f.baseX, f.baseY);

      const curAngle = f.baseAngle + flexIdle + (clawSpread * (idx - 2) * 0.15);
      ctx.rotate(curAngle);

      const l = f.len;
      const w = f.thick;

      const p1x = l * 0.4;
      const p1y = isLeft ? -1.5 : 1.5;

      const p2x = l * 0.75;
      const p2y = isLeft ? 1.0 : -1.0;

      const tipX = l * 1.15;
      const tipY = isLeft ? 3.5 : -3.5;

      if (isGamePlay) {
        // Fast simplified spiky claw triangle for gameplay (no expensive quadratic curves)
        ctx.fillStyle = '#D2C6DE';
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.4);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(0, w * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Draw Organic Finger Body (Polygon / Path)
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.5);
        ctx.quadraticCurveTo(p1x, p1y - w * 0.45, p2x, p2y - w * 0.35);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(p2x, p2y + w * 0.35);
        ctx.quadraticCurveTo(p1x, p1y + w * 0.45, 0, w * 0.5);
        ctx.closePath();

        const fingerGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
        fingerGrad.addColorStop(0, '#F8F5FA');
        fingerGrad.addColorStop(0.5, '#D2C6DE');
        fingerGrad.addColorStop(0.85, '#68547C');
        fingerGrad.addColorStop(1, '#1E1029');
        ctx.fillStyle = fingerGrad;
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      if (!isGamePlay) {
        // Rounded Knuckle Bulge (Joint 1)
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#E3D8EB';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Middle Joint (Joint 2) Crease Lines (Image 2 style)
        ctx.beginPath();
        ctx.moveTo(p1x, p1y - w * 0.4);
        ctx.lineTo(p1x, p1y + w * 0.4);
        ctx.moveTo(p1x + 2, p1y - w * 0.35);
        ctx.lineTo(p1x + 2, p1y + w * 0.35);
        ctx.strokeStyle = 'rgba(50, 25, 70, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Distal Talon / Nail highlight at tip
        ctx.beginPath();
        ctx.moveTo(p2x, p2y);
        ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#12081A';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
    ctx.restore();
  }

  static _drawRikaCursedEnergyAura(ctx, fighter, opponent, renderState = null) {
    const rk = fighter.rika;
    if (!rk) return;

    const showAura = (typeof state !== 'undefined' && !state.performanceMode && (state.previewShowCursedEnergy || (fighter.cursedEnergyAlpha || 0) > 0.05 || fighter.domainActive));
    if (!showAura) return;

    const r = (rk.r !== undefined && rk.r !== null) ? Math.max(0.1, rk.r) : 30;
    const now = Date.now();
    const isGamePlay = renderState ? !!renderState.isHybrid : true;

    // Stepped 30-frame anime animation loop (matching Yuta's 30fps Sakuga frame rate)
    const frameRate = 30;
    const frameIndex = Math.floor(Date.now() / (1000 / frameRate));
    const time = frameIndex * 120;

    let targetAngle = renderState ? renderState.targetAngle : 0;
    if (!renderState) {
      if (rk.timeStopTimer > 0 || rk.hitStunTimer > 0 || rk.isDying) {
        targetAngle = rk.angle || 0;
      } else {
        if (opponent && !opponent.isDead) {
          const desiredAngle = Math.atan2(opponent.y - rk.y, opponent.x - rk.x);
          if (opponent.isStealthed) {
            let diff = desiredAngle - (rk.angle || 0);
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            targetAngle = (rk.angle || 0) + diff * (CONFIG.toji?.stealthTurnRate || 0.035);
          } else {
            targetAngle = desiredAngle;
          }
        } else if (Math.hypot(rk.vx, rk.vy) > 0.1) {
          targetAngle = Math.atan2(rk.vy, rk.vx);
        } else {
          targetAngle = rk.angle || 0;
        }
      }
    }

    const yutaDx = fighter.x - rk.x;
    const yutaDy = fighter.y - rk.y;
    const cosA = Math.cos(-targetAngle);
    const sinA = Math.sin(-targetAngle);
    const localYutaX = yutaDx * cosA - yutaDy * sinA;
    const localYutaY = yutaDx * sinA + yutaDy * cosA;

    const rightArmTimer = rk.rightArmTimer || 0;
    const leftArmTimer = rk.leftArmTimer || 0;

    const spawnScale = renderState ? renderState.spawnScale : (rk.spawnScale ?? 1.0);
    const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
    let ariseCeAlpha = 1.0;
    if (rk.spawnTimer > 0) {
      const progress = 1.0 - (rk.spawnTimer / ariseMax);
      if (progress < 0.45) {
        ariseCeAlpha = 0.0;
      } else {
        ariseCeAlpha = Math.min(1.0, (progress - 0.45) / 0.55);
      }
    }

    let drawX = renderState ? renderState.drawX : rk.x;
    let drawY = renderState ? renderState.drawY : rk.y;
    if (!renderState && rk.spawnTimer > 0) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      const progress = 1 - (rk.spawnTimer / ariseMax);
      const shakeAmt = (1.0 - progress * 0.4) * 5;
      drawX += (Math.random() - 0.5) * shakeAmt;
      drawY += (Math.random() - 0.5) * shakeAmt;
    }

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(spawnScale, spawnScale);
    ctx.rotate(targetAngle);
    ctx.globalAlpha = (ctx.globalAlpha || 1.0) * ariseCeAlpha;

    // === 1. Luminous Backlight ===
    // Disabled for FPS optimization (removed screen composite + radial gradient glow)

    // Helper: Draw a form-fitting Yuta-style flame path around points
    const drawFlamePath = (pts, fillAlpha = 0.35) => {
      const numPts = pts.length;
      if (numPts < 3) return;

      let mx = (pts[numPts - 1].x + pts[0].x) / 2;
      let my = (pts[numPts - 1].y + pts[0].y) / 2;

      ctx.save();

      // Soft concentric glow/bloom layer
      const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
      if (!isLowQuality) {
        ctx.save();
        ctx.scale(1.22, 1.22);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        for (let i = 0; i < numPts; i++) {
          const p = pts[i];
          const next = pts[(i + 1) % numPts];
          ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 105, 180, ${0.11 * ariseCeAlpha})`;
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = `rgba(255, 105, 180, ${fillAlpha})`;

      ctx.beginPath();
      ctx.moveTo(mx, my);
      for (let i = 0; i < numPts; i++) {
        const p = pts[i];
        const next = pts[(i + 1) % numPts];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.fill();

      // ink Outline
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      mx = (pts[numPts - 1].x + pts[0].x) / 2;
      my = (pts[numPts - 1].y + pts[0].y) / 2;
      ctx.moveTo(mx, my);
      for (let i = 0; i < numPts; i++) {
        const p = pts[i];
        const next = pts[(i + 1) % numPts];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner Light Pink Core Wash
      let cx = 0, cy = 0;
      pts.forEach(p => { cx += p.x; cy += p.y; });
      cx /= numPts; cy /= numPts;

      ctx.fillStyle = 'rgba(255, 192, 203, 0.40)';
      ctx.beginPath();
      let mx2 = (pts[numPts - 1].x + pts[0].x) / 2;
      let my2 = (pts[numPts - 1].y + pts[0].y) / 2;
      ctx.moveTo(cx + (mx2 - cx) * 0.7, cy + (my2 - cy) * 0.7);
      for (let i = 0; i < numPts; i++) {
        const p = pts[i];
        const next = pts[(i + 1) % numPts];
        const midX = (p.x + next.x) / 2;
        const midY = (p.y + next.y) / 2;
        const px = cx + (p.x - cx) * 0.7;
        const py = cy + (p.y - cy) * 0.7;
        const nx = cx + (midX - cx) * 0.7;
        const ny = cy + (midY - cy) * 0.7;
        ctx.quadraticCurveTo(px, py, nx, ny);
      }
      ctx.closePath();
      ctx.fill();

      // Hatch Cuts (skipped in gameplay to optimize Electron performance)
      if (!isGamePlay) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#000000';
        ctx.lineCap = 'butt';

        const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
        const isLowFps = (state.fps && state.fps < 55);
        const insetScales = (isMultiDomain || isLowFps) ? [0.91] : [0.86, 0.94];

        for (let layer = 0; layer < insetScales.length; layer++) {
          const scale = insetScales[layer];
          const speedDir = (layer % 2 === 0 ? 1 : -1);
          const flowTime = time * 0.003 * speedDir;

          ctx.beginPath();
          for (let i = 0; i < numPts; i++) {
            const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
            const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
            const cutSeed = longWave + shortWave;
            if (cutSeed < 0.25) continue;

            const p = pts[i];
            const next = pts[(i + 1) % numPts];

            const psx = cx + (p.x - cx) * scale;
            const psy = cy + (p.y - cy) * scale;
            const nsx = cx + (next.x - cx) * scale;
            const nsy = cy + (next.y - cy) * scale;

            const jagX = Math.cos(i * 43) * 3;
            const jagY = Math.sin(i * 43) * 3;

            ctx.moveTo(psx, psy);
            ctx.lineTo(nsx + jagX, nsy + jagY);
          }
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    // Helper: Draw a form-fitting Yuta-style flame along a spine (for tendrils and tethers)
    const drawFlameStroke = (spinePts, startW, endW) => {
      const len = spinePts.length;
      if (len < 2) return;

      const extrude = (scale) => {
        const poly = [];
        for (let i = 0; i < len; i++) {
          const p = spinePts[i];
          let dx, dy;
          if (i < len - 1) { dx = spinePts[i+1].x - p.x; dy = spinePts[i+1].y - p.y; }
          else { dx = p.x - spinePts[i-1].x; dy = p.y - spinePts[i-1].y; }
          const dist = Math.hypot(dx, dy);
          let nx = 0, ny = -1;
          if (dist > 0) { nx = -dy/dist; ny = dx/dist; }
          const w = (startW + (endW - startW) * (i / (len - 1))) * scale;
          poly.push({ x: p.x + nx * w, y: p.y + ny * w });
        }
        for (let i = len - 1; i >= 0; i--) {
          const p = spinePts[i];
          let dx, dy;
          if (i > 0) { dx = p.x - spinePts[i-1].x; dy = p.y - spinePts[i-1].y; }
          else { dx = spinePts[i+1].x - p.x; dy = spinePts[i+1].y - p.y; }
          const dist = Math.hypot(dx, dy);
          let nx = 0, ny = 1;
          if (dist > 0) { nx = dy/dist; ny = -dx/dist; }
          const w = (startW + (endW - startW) * (i / (len - 1))) * scale;
          poly.push({ x: p.x + nx * w, y: p.y + ny * w });
        }
        return poly;
      };

      const fillPoly = extrude(1.0);
      
      ctx.save();
      ctx.fillStyle = 'rgba(255, 105, 180, 0.75)';
      ctx.beginPath();
      ctx.moveTo(fillPoly[0].x, fillPoly[0].y);
      for (let i = 1; i < fillPoly.length; i++) ctx.lineTo(fillPoly[i].x, fillPoly[i].y);
      ctx.closePath();
      ctx.fill();

      // Batched outline stroke
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < fillPoly.length - 1; i++) {
        ctx.moveTo(fillPoly[i].x, fillPoly[i].y);
        ctx.lineTo(fillPoly[i+1].x, fillPoly[i+1].y);
      }
      ctx.stroke();

      const corePoly = extrude(0.7);
      ctx.fillStyle = 'rgba(255, 192, 203, 0.85)';
      ctx.beginPath();
      ctx.moveTo(corePoly[0].x, corePoly[0].y);
      for (let i = 1; i < corePoly.length; i++) ctx.lineTo(corePoly[i].x, corePoly[i].y);
      ctx.closePath();
      ctx.fill();

      // Hatch Cuts (skipped in gameplay to optimize Electron performance)
      if (!isGamePlay) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#000000';
        ctx.lineCap = 'butt';

        const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
        const isLowFps = (state.fps && state.fps < 55);
        const insetScales = (isMultiDomain || isLowFps) ? [0.91] : [0.86, 0.94];

        for (let layer = 0; layer < insetScales.length; layer++) {
          const scale = insetScales[layer];
          const cutPoly = extrude(scale);
          const speedDir = (layer % 2 === 0 ? 1 : -1);
          const flowTime = time * 0.003 * speedDir;

          ctx.beginPath();
          for (let i = 0; i < cutPoly.length - 1; i++) {
            const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
            const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
            const cutSeed = longWave + shortWave;
            if (cutSeed < 0.25) continue;

            const jagX = Math.cos(i * 43) * 2;
            const jagY = Math.sin(i * 43) * 2;
            ctx.moveTo(cutPoly[i].x, cutPoly[i].y);
            ctx.lineTo(cutPoly[i+1].x + jagX, cutPoly[i+1].y + jagY);
          }
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // === 2. Tail Tether Flame ===
    const tailWave1 = Math.sin(now / 100) * 7;
    const tailWave2 = Math.cos(now / 130) * 9;
    
    const getBezierPt = (t, p0, p1, p2, p3) => {
      const mt = 1 - t;
      return {
        x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
        y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y
      };
    };

    const tetherSpine = [];
    const ts0 = { x: -r * 0.4, y: 0 };
    const ts1 = { x: localYutaX * 0.35, y: localYutaY * 0.35 + tailWave1 };
    const ts2 = { x: localYutaX * 0.7, y: localYutaY * 0.7 + tailWave2 };
    const ts3 = { x: localYutaX, y: localYutaY };
    const tsSegments = isGamePlay ? 6 : 12;
    for (let i = 0; i <= tsSegments; i++) tetherSpine.push(getBezierPt(i/tsSegments, ts0, ts1, ts2, ts3));

    drawFlameStroke(tetherSpine, r * 0.22 + 8, r * 0.06 + 5);

    // === 3. Torso & Head Dome Form-Fitting Flame Body ===
    const torsoHeadPts = [];
    const numTH = isGamePlay ? 12 : 24;
    for (let i = 0; i < numTH; i++) {
      const a = (Math.PI * 2 / numTH) * i;
      const cosA = Math.cos(a);
      const headBonus = (cosA > 0) ? r * 0.45 * cosA : 0;
      const baseR = r * 1.3 + headBonus;

      const noise = Math.sin(a * 3.0 + time * 0.001) * 6 + Math.cos(a * 2.0 - time * 0.0012) * 4;
      const radius = baseR + noise;

      torsoHeadPts.push({
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius
      });
    }
    drawFlamePath(torsoHeadPts);

    // === 4. Wavy Crown Hair Tendrils Form-Fitting Flame Tubes (skipped in gameplay to optimize performance) ===
    if (!isGamePlay) {
      const tendrilMin = -2;
      const tendrilMax = 2;
      const tendrilSegments = 12;

      for (let i = tendrilMin; i <= tendrilMax; i++) {
        const offset = i * 8;
        const tendrilLength = r * 2.5;

        const tendrilSpine = [{ x: r * 0.4, y: offset * 0.5 }];
        for (let s = 1; s <= tendrilSegments; s++) {
          const progress = s / tendrilSegments;
          const currentX = r * 0.4 - (tendrilLength * progress);
          const waveAmplitude = 14 * Math.pow(progress, 1.5);
          const waveY = Math.sin((now / 120) - (progress * 6) + i) * waveAmplitude;
          const currentY = (offset * 0.5) + (offset * progress * 0.8) + waveY;
          const flicker = Math.sin(time * 0.002 + s * 0.4 + i) * 2.5;
          tendrilSpine.push({ x: currentX, y: currentY + flicker });
        }
        
        drawFlameStroke(tendrilSpine, 6, 2.5);
      }
    }

    // === 5. Left & Right Form-Fitting Arm & Claw Flame Sleeves ===
    const buildArmPoints = (isLeft, timer) => {
      const sideSign = isLeft ? -1 : 1;
      const shoulderX = r * 0.2;
      const shoulderY = r * 1.1 * sideSign;
      const handX = r * 1.3;
      const handY = r * 1.3 * sideSign;

      const idleDx = handX - shoulderX;
      const idleDy = handY - shoulderY;
      const armLen = Math.hypot(idleDx, idleDy);
      const idleAngle = Math.atan2(idleDy, idleDx);

      let angleOffset = 0;
      let clawSpread = 0;
      const startAng = 0.75 * sideSign;
      const targetAng = -0.75 * sideSign;

      if (timer > 0) {
        const p = Math.min(60, timer);
        if (p > 52) {
          const t = (60 - p) / 8;
          angleOffset = startAng * (t * t);
          clawSpread = 0.6 * (t * t);
        } else if (p > 42) {
          const t = (52 - p) / 10;
          const eased = 1 - Math.pow(1 - t, 3);
          angleOffset = startAng + (targetAng - startAng) * eased;
          clawSpread = 0.6 - (1.1 * eased);
        } else {
          const t = p / 42;
          angleOffset = targetAng * (t * t);
          clawSpread = -0.3 * (t * t);
        }
      }

      const idleBreath = (timer === 0) ? Math.sin(now / 800) * 0.03 : 0;
      const currentAngle = idleAngle + angleOffset + idleBreath;

      const finalHandX = shoulderX + Math.cos(currentAngle) * armLen;
      const finalHandY = shoulderY + Math.sin(currentAngle) * armLen;

      const elbowX = (shoulderX + finalHandX) * 0.5 + 10;
      const elbowY = (shoulderY + finalHandY) * 0.5 + (20 * sideSign);

      const pad = 10;

      if (isGamePlay) {
        // Highly optimized simple arm capsule path for match gameplay
        const rawPts = [
          { x: shoulderX, y: shoulderY - pad * sideSign },
          { x: elbowX, y: elbowY - pad * 1.2 * sideSign },
          { x: finalHandX, y: finalHandY - pad * 0.8 * sideSign },
          { x: finalHandX, y: finalHandY + pad * 0.8 * sideSign },
          { x: elbowX, y: elbowY + pad * 1.2 * sideSign },
          { x: shoulderX, y: shoulderY + pad * sideSign }
        ];
        return rawPts.map((p, idx) => {
          const noise = Math.sin(idx * 2.3 + time * 0.0015) * 4;
          return { x: p.x + noise, y: p.y + noise };
        });
      }

      const fingersData = [
        { baseX: 7, baseY: isLeft ? 5.5 : -5.5, len: 19, baseAngle: isLeft ? 0.65 : -0.65 },
        { baseX: 15, baseY: isLeft ? 3.5 : -3.5, len: 26, baseAngle: isLeft ? 0.22 : -0.22 },
        { baseX: 16, baseY: 0, len: 29, baseAngle: 0 },
        { baseX: 15, baseY: isLeft ? -3.5 : 3.5, len: 26, baseAngle: isLeft ? -0.22 : 0.22 },
        { baseX: 13, baseY: isLeft ? -5.5 : 5.5, len: 21, baseAngle: isLeft ? -0.45 : 0.45 }
      ];

      const cosP = Math.cos(currentAngle);
      const sinP = Math.sin(currentAngle);
      const flexIdle = (timer === 0) ? Math.sin(now / 400) * 0.05 : 0;

      const fingerTips = fingersData.map((f, idx) => {
        const curAngle = f.baseAngle + flexIdle + (clawSpread * (idx - 2) * 0.15);
        const tipL = f.len * 1.15;
        const localX = f.baseX + Math.cos(curAngle) * tipL;
        const localY = f.baseY + Math.sin(curAngle) * tipL;
        return {
          x: finalHandX + (localX * cosP - localY * sinP),
          y: finalHandY + (localX * sinP + localY * cosP)
        };
      });

      const rawPts = [];
      rawPts.push({ x: shoulderX, y: shoulderY - pad * sideSign });
      rawPts.push({ x: elbowX, y: elbowY - pad * 1.2 * sideSign });
      rawPts.push({ x: finalHandX, y: finalHandY - pad * 1.1 * sideSign });

      const order = isLeft ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
      order.forEach(i => {
        rawPts.push({
          x: fingerTips[i].x + Math.cos(currentAngle) * pad * 0.8,
          y: fingerTips[i].y + Math.sin(currentAngle) * pad * 0.8
        });
      });

      rawPts.push({ x: finalHandX, y: finalHandY + pad * 1.1 * sideSign });
      rawPts.push({ x: elbowX, y: elbowY + pad * 1.2 * sideSign });
      rawPts.push({ x: shoulderX, y: shoulderY + pad * sideSign });

      return rawPts.map((p, idx) => {
        const noise = Math.sin(idx * 2.3 + time * 0.0015) * 4;
        return { x: p.x + noise, y: p.y + noise };
      });
    };

    if (!isGamePlay) {
      drawFlamePath(buildArmPoints(true, leftArmTimer));
      drawFlamePath(buildArmPoints(false, rightArmTimer));
    }

    ctx.restore();
  }

  static _renderYutaAuraFrameCanvas(frameIdx, isRCT) {
    const key = `${frameIdx}_${isRCT ? 'rct' : 'norm'}`;
    if (_yutaAuraCanvasCache.has(key)) {
      return _yutaAuraCanvasCache.get(key);
    }

    const offW = 160;
    const offH = 160;
    const canvas = document.createElement('canvas');
    canvas.width = offW;
    canvas.height = offH;
    const offCtx = canvas.getContext('2d');

    const time = frameIdx * 120;
    const r = 25; // standard fighter radius
    const cx = offW / 2;
    const cy = offH / 2;

    offCtx.save();
    offCtx.translate(cx, cy);

    const fillColor = isRCT ? 'rgba(50, 205, 50, 0.40)' : 'rgba(255, 105, 180, 0.40)';
    const coreColor = isRCT ? 'rgba(144, 238, 144, 0.45)' : 'rgba(255, 192, 203, 0.45)';
    const strokeColor = '#000000';

    const numPoints = 28;
    const baseRadius = r + 15;
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i;
      const upFactor = Math.max(0, -Math.sin(angle) + 0.25);
      const sideFactor = 1.0 - upFactor * 0.5;

      const baseTongue1 = Math.pow(Math.sin(angle * 1.5 + time * 0.0005) * 0.5 + 0.5, 3.0) * 25 * upFactor;
      const baseTongue2 = Math.pow(Math.cos(angle * 2.2 - time * 0.0004) * 0.5 + 0.5, 2.5) * 18 * upFactor;

      const flicker1 = Math.sin(time * 0.0018 + angle * 2.5) * 0.15 + 0.85;
      const flicker2 = Math.cos(time * 0.0022 - angle * 3.0) * 0.15 + 0.85;

      const tongue1 = baseTongue1 * flicker1;
      const tongue2 = baseTongue2 * flicker2;
      const bubble = Math.pow(Math.sin(angle * 3.0 + time * 0.0017) * Math.cos(angle * 1.8 - time * 0.0011), 2.0) * 9 * sideFactor;
      const flow = Math.sin(time * 0.0006 + angle) * 3;

      const radius = baseRadius + flow + bubble + tongue1 + tongue2;
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }

    let mx = (points[numPoints - 1].x + points[0].x) / 2;
    let my = (points[numPoints - 1].y + points[0].y) / 2;

    // Soft outer concentric glow/bloom layer (pre-rendered so absolutely free)
    offCtx.save();
    offCtx.scale(1.22, 1.22);
    offCtx.beginPath();
    offCtx.moveTo(mx, my);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      offCtx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    offCtx.closePath();
    const glowColor = isRCT ? 'rgba(50, 205, 50, 0.13)' : 'rgba(255, 105, 180, 0.13)';
    offCtx.fillStyle = glowColor;
    offCtx.fill();
    offCtx.restore();

    // Outer flame fill
    offCtx.beginPath();
    offCtx.moveTo(mx, my);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      offCtx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    offCtx.closePath();
    offCtx.fillStyle = fillColor;
    offCtx.fill();

    // Calligraphy ink contour
    offCtx.strokeStyle = strokeColor;
    offCtx.lineWidth = 2.2;
    offCtx.stroke();

    // Inner core wash
    offCtx.save();
    offCtx.scale(0.75, 0.75);
    offCtx.beginPath();
    offCtx.moveTo(mx, my);
    for (let i = 0; i < numPoints; i++) {
      const p = points[i];
      const next = points[(i + 1) % numPoints];
      offCtx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    offCtx.closePath();
    offCtx.fillStyle = coreColor;
    offCtx.fill();
    offCtx.restore();

    // Full 3-layer Calligraphy Ink Brush Hatch Cuts
    offCtx.strokeStyle = strokeColor;
    offCtx.lineCap = 'butt';
    const insetScales = [0.84, 0.91, 0.96];
    for (let layer = 0; layer < insetScales.length; layer++) {
      const scale = insetScales[layer];
      const speedDir = (layer % 2 === 0 ? 1 : -1);
      const flowTime = time * 0.003 * speedDir;

      offCtx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const longWave = Math.sin(i * 0.35 + layer * 8.0 + flowTime * 1.5) * 0.6;
        const shortWave = Math.sin(i * 2.5 - layer * 5.0 + flowTime * 3.5) * 0.4;
        const cutSeed = longWave + shortWave;
        if (cutSeed < 0.15) continue;

        const p = points[i];
        const next = points[(i + 1) % numPoints];
        const jagX = Math.cos(i * 43) * 3;
        const jagY = Math.sin(i * 43) * 3;
        offCtx.moveTo(p.x * scale, p.y * scale);
        offCtx.lineTo(next.x * scale + jagX, next.y * scale + jagY);
      }
      offCtx.lineWidth = 1.0;
      offCtx.stroke();
    }

    offCtx.restore();
    _yutaAuraCanvasCache.set(key, canvas);
    return canvas;
  }

  static _drawYutaCursedEnergyAura(ctx, fighter) {
    const isRCT = (fighter.rctRevivalTimer > 0);
    const isCountdown = (typeof state !== 'undefined' && state.gameState === 'countdown');

    let activeMultiplier = fighter.cursedEnergyAlpha || 0;
    if (isRCT || isCountdown || fighter._isWinnerReveal || (fighter.combatAuraOpacity && fighter.combatAuraOpacity > 0)) {
      activeMultiplier = 1.0;
    }
    if (activeMultiplier <= 0.01) return;

    let progress = 0;
    if (isRCT) {
      progress = Math.min(1.0, fighter.rctRevivalTimer / (CONFIG.yuta.rctRevivalDuration || 150));
    } else if (fighter.isChannelingDomain) {
      progress = fighter.domainChargeTimer / fighter.domainChargeMax;
    } else if (fighter.techniqueCooldown > fighter.cooldown - 30) {
      progress = (fighter.techniqueCooldown - (fighter.cooldown - 30)) / 30;
    } else {
      progress = 1.0;
    }

    progress *= activeMultiplier;
    if (progress <= 0) return;

    const frameRate = 30;
    const frameIndex = Math.floor(Date.now() / (1000 / frameRate)) % 30;
    const time = frameIndex * 120;

    ctx.save();
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

    // === Luminous Body Backlight (Soft Natural Pink Glow) ===
    // Disabled for FPS optimization (removed screen composite + radial gradient glow)

    // Hardware Accelerated Pre-Rendered Offscreen Sakuga Aura Canvas
    const frameCanvas = YutaRenderer._renderYutaAuraFrameCanvas(frameIndex, isRCT);
    ctx.globalAlpha = progress;
    ctx.drawImage(frameCanvas, -80, -80);

    ctx.restore();
  }

  static _drawYutaSwordBag(ctx, fighter) {
    ctx.save();
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
    ctx.rotate(fighter.gunAngle); // Align with his facing direction so the back stays opposite to his target
    ctx.scale(1.2, 1.2);       // Scale bag identically to the katana

    // Calculate the bag vector based on our start and end coordinates
    const startX = -16, startY = -28; // Shoulder opening
    const endX = -20, endY = 42;      // Hanging bottom cap (shortened)
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy); // Length is now ~70 pixels
    const bagAngle = Math.atan2(dy, dx);

    ctx.translate(startX, startY);
    ctx.rotate(bagAngle);

    // 1. Tapered Canvas Body Polygon (Wider at top, narrower at bottom)
    const topW = 3.5;
    const botW = 2.5;

    ctx.fillStyle = '#2C3136'; // Dark slate/charcoal canvas fabric
    ctx.strokeStyle = '#000000'; // Black outline
    ctx.lineWidth = 1.0;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(0, -topW);
    ctx.lineTo(length, -botW);
    ctx.lineTo(length, botW);
    ctx.lineTo(0, topW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Stitched Reinforcement Base Cap
    ctx.fillStyle = '#1A1C1F'; // Darker base fabric
    ctx.beginPath();
    ctx.moveTo(length - 7, -botW);
    ctx.lineTo(length, -botW);
    ctx.lineTo(length, botW);
    ctx.lineTo(length - 7, botW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke(); // Stroke black around base

    // 3. Thick Black Canvas Collar/Opening
    ctx.fillStyle = '#111111';
    ctx.fillRect(-1.5, -topW - 0.2, 2.5, topW * 2 + 0.4);
    ctx.strokeRect(-1.5, -topW - 0.2, 2.5, topW * 2 + 0.4);

    ctx.restore(); // Restore from Yuta scaling and rotation
  }

  static _drawYutaSwordStrap(ctx, fighter) {
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.rotate(fighter.gunAngle); // Align with his facing direction

    // Draw a thick strap over his right shoulder (+Y) and under his left arm (-Y)
    ctx.strokeStyle = '#1A1A1A'; // Thick black leather strap
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-12, -fighter.r + 2.5); // Top-left (shoulder region)
    ctx.lineTo(12, fighter.r - 2.5);   // Bottom-right (underarm region)
    ctx.stroke();

    // A small gold buckle fitting in the middle of the chest strap
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-2, -2, 4, 4);

    ctx.restore();
  }

  static _drawSpatialCracks(ctx, fighter) {
    if (!fighter.spatialCracks || fighter.spatialCracks.length === 0) return;

    ctx.save();
    
    // We clean up expired cracks here
    let i = fighter.spatialCracks.length;
    while (i--) {
      const crack = fighter.spatialCracks[i];
      crack.timer--;
      if (crack.timer <= 0) {
        fighter.spatialCracks.splice(i, 1);
        continue;
      }

      const progress = crack.timer / crack.maxTimer;
      const alpha = Math.max(0, progress);
      const scale = 1 + (1 - progress) * 0.2; // slight expansion
      
      ctx.save();
      ctx.translate(crack.x, crack.y);
      ctx.rotate(crack.angle);
      ctx.scale(scale, scale);
      
      // Draw shattered space polygons (Sky Manipulation effect)
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 255, 255, 0.65)';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      
      // Draw 3 jagged polygons forming a fractured cone shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(120, -90);
      ctx.lineTo(180, -45);
      ctx.lineTo(240, 0);
      ctx.lineTo(180, 45);
      ctx.lineTo(120, 90);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Inner deeper fracture lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(140, -30);
      ctx.moveTo(0, 0);
      ctx.lineTo(170, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(140, 30);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  static _drawThinIceBreakerHand(ctx, fighter) {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.rotate(fighter.gunAngle);

    let extension = 0;
    if (fighter.thinIceBreakerChargeTimer > 0) {
      // Winding up (pulling hand back)
      const maxCharge = 15;
      const progress = 1 - (fighter.thinIceBreakerChargeTimer / maxCharge);
      extension = -10 + progress * 5; 
    } else if (fighter.thinIceBreakerPunchTimer > 0) {
      // Punched out
      const maxPunch = 20;
      const progress = fighter.thinIceBreakerPunchTimer / maxPunch;
      extension = 18 * Math.pow(progress, 0.2); // Snap out quickly, then hold
    }

    // Draw the left hand (y = -14) punching forward
    ctx.translate(extension, -14);

    // Left hand circle
    ctx.fillStyle = fighter.color;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw cyan aura on the fist
    ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
