import { Fighter, isSuppressedByGetsuga } from '../../entities/fighter.js';
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
import { drawYutaGhostSkin } from './yutaSkin.js';

// Pre-seeded static data for Yuta Domain Channeling Pixel Art VFX (0 GC per Rule #12 & #16)
const _YUTA_DOMAIN_EMBERS = Array.from({ length: 32 }, (_, i) => ({
  angle: (i / 32) * Math.PI * 2 + (i * 0.47) % Math.PI,
  distMult: 0.20 + ((i * 17) % 80) / 100, // 0.20 to 1.0 of ringRadius
  speedY: 1.0 + ((i * 7) % 15) * 0.12,
  size: (i % 3 === 0) ? 3 : (i % 2 === 0 ? 2 : 4), // 2px, 3px, 4px pixel blocks
  phase: (i * 1.37) % (Math.PI * 2),
  colorIdx: i % 4, // 0: White, 1: Hot Pink, 2: Deep Magenta, 3: Dark Violet
  wobbleSpeed: 0.003 + ((i * 3) % 5) * 0.001,
  wobbleAmp: 3 + (i % 4) * 2,
}));

const _YUTA_DOMAIN_FISSURES = [
  { angle: 0.20, segments: [{ len: 0.35, off: 0.08 }, { len: 0.70, off: -0.12 }, { len: 1.0, off: 0.05 }] },
  { angle: 1.15, segments: [{ len: 0.40, off: -0.10 }, { len: 0.75, off: 0.14 }, { len: 1.0, off: -0.06 }] },
  { angle: 2.20, segments: [{ len: 0.30, off: 0.12 }, { len: 0.65, off: -0.09 }, { len: 1.0, off: 0.11 }] },
  { angle: 3.35, segments: [{ len: 0.45, off: -0.07 }, { len: 0.80, off: 0.10 }, { len: 1.0, off: -0.04 }] },
  { angle: 4.40, segments: [{ len: 0.35, off: 0.11 }, { len: 0.70, off: -0.13 }, { len: 1.0, off: 0.08 }] },
  { angle: 5.50, segments: [{ len: 0.40, off: -0.09 }, { len: 0.75, off: 0.12 }, { len: 1.0, off: -0.05 }] },
];

function _drawPixelSteppedEllipse(ctx, cx, cy, rx, ry, P, color, thickness = 1) {
  if (rx <= 0 || ry <= 0) return;
  const snap = (v) => Math.round(v / P) * P;
  const circum = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const steps = Math.max(16, Math.ceil(circum / P));
  const stepAngle = (Math.PI * 2) / steps;

  ctx.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    const a = i * stepAngle;
    const px = snap(cx + Math.cos(a) * rx);
    const py = snap(cy + Math.sin(a) * ry);
    ctx.fillRect(px, py, P * thickness, P * thickness);
  }
}

function _drawPixelDiamond(ctx, cx, cy, size, P, coreColor, outerColor) {
  const snap = (v) => Math.round(v / P) * P;
  const s = snap(size);
  // Outer Diamond Shell (Pass 1)
  ctx.fillStyle = outerColor || '#111114';
  for (let dy = -s - P; dy <= s + P; dy += P) {
    const span = Math.max(0, (s + P) - Math.abs(dy));
    for (let dx = -span; dx <= span; dx += P) {
      ctx.fillRect(cx + dx, cy + dy, P, P);
    }
  }
  // Inner Core Fill (Pass 2)
  ctx.fillStyle = coreColor;
  for (let dy = -s; dy <= s; dy += P) {
    const span = Math.max(0, s - Math.abs(dy));
    for (let dx = -span; dx <= span; dx += P) {
      ctx.fillRect(cx + dx, cy + dy, P, P);
    }
  }
  // White Specular Center Pixel
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx, cy, P, P);
}

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

    const isSuppressed = typeof fighter.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : isSuppressedByGetsuga(fighter);

    // Draw the left hand punching out for Thin Ice Breaker
    if (!isSuppressed && (fighter.thinIceBreakerChargeTimer > 0 || fighter.thinIceBreakerPunchTimer > 0)) {
      YutaRenderer._drawThinIceBreakerHand(ctx, fighter);
    }

    // Draw afterimages during flurry & teleports (Draw ON TOP of Sakuga Impact Frame so they are never covered!)
    if (fighter.afterImages && fighter.afterImages.length > 0 && !isSuppressed) {
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

        // 3. Phantom Body Ghost Skin Model (Rule 19 Compliant - Hair, Uniform, No Eyes)
        drawYutaGhostSkin(ctx, 0, 0, 0, fighter.r, 0.95);

        // 4. Extended Katana Phantom Blade Silhouette
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
        const ariseMax = CONFIG.yuta?.rikaAriseDuration || 45;
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

      const renderState = { drawX, drawY, targetAngle, spawnScale };

      ctx.save();
      ctx.translate(tremorX, tremorY);
      ctx.globalAlpha = fighter.rikaAlpha;
      YutaRenderer._drawRikaYutaTether(ctx, fighter, rk, renderState);
      fighter._drawRikaCursedEnergyAura(ctx, opponent, renderState);
      fighter._drawRika(ctx, opponent, renderState);
      ctx.restore();
    }

    fighter.hideHpText = wasHidingHp;
    if (!fighter.hideHpText) {
      ctx.save();
      ctx.translate(tremorX, tremorY);
      FighterRenderer.drawHealth(ctx, fighter);
      ctx.restore();
    }
  }

  static _drawDomainChannelAura(ctx, fighter) {
    const maxCharge = Math.max(1, fighter.domainChargeMax || 180);
    const progress = Math.min(1.0, Math.max(0, (fighter.domainChargeTimer || 0) / maxCharge));
    if (progress <= 0) return;

    const P = 2.0; // Standard 2.0px pixel art scale
    const snap = (v) => Math.round(v / P) * P;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

    ctx.save();
    ctx.translate(snap(fighter.x), snap(fighter.y - (fighter.z || 0)));

    const maxRadius = 150;
    const currentR = Math.max(10, maxRadius * progress);
    const isoAspect = 0.46; // Clean isometric floor perspective

    // ── 1. GROUND STEPPED PIXEL DROP SHADOW (Dark Obsidian Core) ──
    const shadowR = (fighter.r || 25) * 1.35;
    ctx.fillStyle = 'rgba(14, 15, 20, 0.75)';
    for (let dy = -shadowR * isoAspect; dy <= shadowR * isoAspect; dy += P) {
      const prog = Math.abs(dy) / (shadowR * isoAspect);
      const halfW = snap(Math.sqrt(Math.max(0, 1 - prog * prog)) * shadowR);
      ctx.fillRect(-halfW, snap(dy), halfW * 2, P);
    }

    // ── 2. STEPPED PIXEL GROUND LIGHTNING FISSURES / VEINS ──
    if (progress > 0.12) {
      const fissureAlpha = Math.min(1.0, (progress - 0.12) / 0.35);
      const pulseJitter = Math.sin(now * 0.02) * (P * 0.5);

      for (let i = 0; i < _YUTA_DOMAIN_FISSURES.length; i++) {
        const f = _YUTA_DOMAIN_FISSURES[i];
        const baseAngle = f.angle + (i * 0.1);
        let curX = 0;
        let curY = 0;

        for (let j = 0; j < f.segments.length; j++) {
          const seg = f.segments[j];
          const segDist = currentR * seg.len * 0.95;
          const segAngle = baseAngle + seg.off;
          const targetX = snap(Math.cos(segAngle) * segDist);
          const targetY = snap(Math.sin(segAngle) * segDist * isoAspect);

          // Draw stepped pixel line segment
          const dx = targetX - curX;
          const dy = targetY - curY;
          const dist = Math.hypot(dx, dy);
          const steps = Math.max(1, Math.ceil(dist / P));

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const px = snap(curX + dx * t + (s % 2 === 0 ? pulseJitter : 0));
            const py = snap(curY + dy * t);

            // Outer dark ink pixel
            ctx.fillStyle = `rgba(17, 17, 20, ${fissureAlpha * 0.85})`;
            ctx.fillRect(px - P, py - P, P * 3, P * 3);

            // Magenta vein pixel
            ctx.fillStyle = `rgba(255, 20, 147, ${fissureAlpha * 0.95})`;
            ctx.fillRect(px, py, P, P);

            // Specular white center pixel on early segments
            if (s % 3 === 0 && t < 0.6) {
              ctx.fillStyle = `rgba(255, 255, 255, ${fissureAlpha})`;
              ctx.fillRect(px, py, P, P);
            }
          }

          curX = targetX;
          curY = targetY;
        }
      }
    }

    // ── 3. EXPANDING STEPPED PIXEL ISOMETRIC CONCENTRIC RINGS ──
    const outerRx = currentR;
    const outerRy = currentR * isoAspect;

    // Pass A: Outer Dark Manga Ink Shell
    _drawPixelSteppedEllipse(ctx, 0, 0, outerRx + P, outerRy + P * isoAspect, P, `rgba(17, 17, 20, ${Math.min(1.0, progress * 1.2)})`, 2);

    // Pass B: Radiant Primary Cursed Energy Ring (Magenta / Deep Pink)
    _drawPixelSteppedEllipse(ctx, 0, 0, outerRx, outerRy, P, `rgba(255, 20, 147, ${progress})`, 1.5);

    // Pass C: Hot Pink Highlight Ring
    _drawPixelSteppedEllipse(ctx, 0, 0, outerRx - P, (outerRx - P) * isoAspect, P, `rgba(255, 105, 180, ${progress * 0.9})`, 1);

    // Pass D: White Specular Pixel Glint Accents along Outer Ring
    const glintCount = 16;
    const glintRot = now * 0.0018;
    ctx.fillStyle = `rgba(255, 255, 255, ${progress * 0.95})`;
    for (let i = 0; i < glintCount; i++) {
      const a = (i * (Math.PI * 2 / glintCount)) + glintRot;
      const gx = snap(Math.cos(a) * outerRx);
      const gy = snap(Math.sin(a) * outerRy);
      ctx.fillRect(gx, gy, P, P);
    }

    // ── 4. SECONDARY INNER ROTATING STEPPED PIXEL RING ──
    if (progress > 0.25) {
      const innerRx = outerRx * 0.72;
      const innerRy = innerRx * isoAspect;
      const innerRot = -now * 0.0022;
      const innerSteps = 32;

      for (let i = 0; i < innerSteps; i++) {
        // Dashed pixel pattern
        if (i % 2 === 0) continue;
        const a = (i * (Math.PI * 2 / innerSteps)) + innerRot;
        const ix = snap(Math.cos(a) * innerRx);
        const iy = snap(Math.sin(a) * innerRy);

        // Dark ink backing
        ctx.fillStyle = '#111114';
        ctx.fillRect(ix - P * 0.5, iy - P * 0.5, P * 2, P * 2);

        // Violet-pink cursed pixel
        ctx.fillStyle = `rgba(217, 70, 239, ${progress})`;
        ctx.fillRect(ix, iy, P, P);
      }
    }

    // ── 5. 8-POINT STEPPED PIXEL CARDINAL / ORDINAL DIAMOND SEALS ──
    if (progress > 0.30) {
      const diamondScale = Math.min(1.0, (progress - 0.30) / 0.40);
      const diamondSize = Math.max(P, snap(P * 2.5 * diamondScale));
      const sealRot = now * 0.0008;

      for (let i = 0; i < 8; i++) {
        const isCardinal = (i % 2 === 0);
        const a = (i * Math.PI / 4) + sealRot;
        const dX = snap(Math.cos(a) * outerRx);
        const dY = snap(Math.sin(a) * outerRy);

        const coreCol = isCardinal ? '#FF1493' : '#D946EF';
        _drawPixelDiamond(ctx, dX, dY, isCardinal ? diamondSize : diamondSize * 0.8, P, coreCol, '#111114');
      }
    }

    // ── 6. RISING STEPPED PIXEL CURSED EMBERS / SOUL FLAME PARTICLES ──
    for (let i = 0; i < _YUTA_DOMAIN_EMBERS.length; i++) {
      const em = _YUTA_DOMAIN_EMBERS[i];
      const maxRiseH = 110;
      const travel = ((now * 0.06 * em.speedY + em.phase * 20) % maxRiseH);
      const emberAlpha = Math.max(0, Math.min(1.0, 1.0 - (travel / maxRiseH))) * progress;

      if (emberAlpha <= 0.02) continue;

      const radialDist = outerRx * em.distMult * 0.90;
      const wobble = Math.sin(now * em.wobbleSpeed + em.phase) * em.wobbleAmp;
      const emX = snap(Math.cos(em.angle) * radialDist + wobble);
      const emY = snap(Math.sin(em.angle) * (radialDist * isoAspect) - travel);

      // Color Palette Ramp: [White Glint, Hot Pink, Radiant Magenta, Dark Violet]
      let emColor;
      if (em.colorIdx === 0) emColor = `rgba(255, 255, 255, ${emberAlpha * 0.95})`;
      else if (em.colorIdx === 1) emColor = `rgba(255, 105, 180, ${emberAlpha * 0.90})`;
      else if (em.colorIdx === 2) emColor = `rgba(255, 20, 147, ${emberAlpha * 0.85})`;
      else emColor = `rgba(139, 0, 85, ${emberAlpha * 0.75})`;

      // Dark ink outline for larger embers
      if (em.size >= 3) {
        ctx.fillStyle = `rgba(17, 17, 20, ${emberAlpha * 0.70})`;
        ctx.fillRect(emX - P, emY - P, P * (em.size + 1), P * (em.size + 1));
      }

      ctx.fillStyle = emColor;
      ctx.fillRect(emX, emY, P * em.size, P * em.size);
    }

    // ── 7. PERIODIC EXPANDING PIXEL SHOCKWAVE DIAMOND PULSE ──
    const pulseCycle = (now * 0.002) % 1.0;
    const pulseR = snap(currentR * pulseCycle);
    const pulseAlpha = Math.max(0, (1.0 - pulseCycle) * 0.60 * progress);
    if (pulseR > 10 && pulseAlpha > 0.05) {
      _drawPixelSteppedEllipse(ctx, 0, 0, pulseR, pulseR * isoAspect, P, `rgba(255, 105, 180, ${pulseAlpha})`, 1);
    }

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
      return; // Do NOT render Rika corpse inside Gojo's domain
    }

    const spawnScale = renderState ? renderState.spawnScale : (rk.spawnScale ?? 1.0);
    const isGamePlay = renderState ? !!renderState.isHybrid : true;

    let drawX = renderState ? renderState.drawX : rk.x;
    let drawY = renderState ? renderState.drawY : rk.y;
    if (!renderState && rk.spawnTimer > 0) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 45;
      const progress = 1 - (rk.spawnTimer / ariseMax);
      const shakeAmt = (1.0 - progress * 0.4) * 5;
      drawX += (Math.random() - 0.5) * shakeAmt;
      drawY += (Math.random() - 0.5) * shakeAmt;
    }

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(spawnScale, spawnScale);

    const r = (rk.r !== undefined && rk.r !== null) ? Math.max(0.1, rk.r) : 30;
    const P = 2.2; // Pixel art unit grid scale
    const now = Date.now();
    const pulse = Math.sin(now / 150) * (r * 0.05);

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

    // ── 1. PIXEL-ART GHOSTLY WHITE TRAILING SPIRIT TAIL (Connected Seamless Pixels) ──
    ctx.save();
    const tailLen = r * 1.6;
    const startTailX = -r * 0.2;
    const endTailX = startTailX - tailLen;

    // Pass 1: Outer Dark Shadow Pixel Outline
    ctx.fillStyle = '#111114';
    for (let bx = startTailX; bx >= endTailX; bx -= P) {
      const prog = Math.max(0, Math.min(1, (startTailX - bx) / tailLen));
      const waveOffset = Math.sin((now / 140) + prog * 4) * (P * 1.8);
      const halfH = Math.max(P * 0.6, (1.0 - prog * 0.75) * (r * 0.35));

      const px = Math.round(bx / P) * P;
      const topY = Math.round((waveOffset - halfH - P) / P) * P;
      const botY = Math.round((waveOffset + halfH + P) / P) * P;
      const ph = botY - topY;

      ctx.fillRect(px, topY, P, ph);
    }

    // Pass 2: Connected Stepped Pixel Fill
    for (let bx = startTailX; bx >= endTailX; bx -= P) {
      const prog = Math.max(0, Math.min(1, (startTailX - bx) / tailLen));
      const waveOffset = Math.sin((now / 140) + prog * 4) * (P * 1.8);
      const halfH = Math.max(P * 0.5, (1.0 - prog * 0.75) * (r * 0.32));

      const px = Math.round(bx / P) * P;
      const py = Math.round(waveOffset / P) * P;
      const topY = Math.round((waveOffset - halfH) / P) * P;
      const botY = Math.round((waveOffset + halfH) / P) * P;
      const ph = Math.max(P, botY - topY);

      // Ghostly bone-white gradient stepped fill
      ctx.fillStyle = prog < 0.3 ? '#FFFFFF' : (prog < 0.7 ? '#E4E0EC' : '#B8B2C4');
      ctx.fillRect(px, topY, P, ph);

      // Center bright white core pixel
      if (prog < 0.5) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px, py - P * 0.5, P, P);
      }
    }
    ctx.restore();

    const attackTimer = rk.attackTimer || 0;
    const isAttacking = (attackTimer > 0 || (rk.leftArmTimer || 0) > 0);

    // ── 2. PIXEL-ART TOP-DOWN ARMS AND CLAWS ──
    const rightArmTimer = rk.rightArmTimer || 0;
    const leftArmTimer = rk.leftArmTimer || 0;

    // Left Arm (-y side)
    fighter._drawTopDownArmAndClaw(ctx, r * 0.2, -r * 1.1, r * 1.3, -r * 1.3, true, leftArmTimer, isGamePlay);
    // Right Arm (+y side)
    fighter._drawTopDownArmAndClaw(ctx, r * 0.2, r * 1.1, r * 1.3, r * 1.3, false, rightArmTimer, isGamePlay);

    // ── 3. PIXEL-ART MAIN BONE-WHITE TORSO CIRCLE & SKELETAL RIBCAGE ──
    ctx.save();
    const torsoR = r + pulse * 0.4;
    const steps = Math.ceil(torsoR / P);

    // Outer Dark Pixel Ink Outline Shell
    ctx.fillStyle = '#111114';
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const d = Math.hypot(gx * P, gy * P);
        if (d <= torsoR + P * 0.85) {
          ctx.fillRect(Math.round(gx * P / P) * P, Math.round(gy * P / P) * P, P, P);
        }
      }
    }

    // Base Bone-White Body (Stepped Pixel Fill)
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const d = Math.hypot(gx * P, gy * P);
        if (d <= torsoR) {
          const rx = gx * P;
          const ry = gy * P;
          // Pure Bone-White Palette: Highlight (#FFFFFF), Body (#F8F6FA), Soft Silver-Slate Shadow (#D8D4E2 / #B8B2C4)
          let col = '#FFFFFF';
          if (rx < -torsoR * 0.3 || Math.abs(ry) > torsoR * 0.7) {
            col = (rx < -torsoR * 0.65) ? '#B8B2C4' : '#D8D4E2';
          } else if (rx > torsoR * 0.05 && Math.abs(ry) < torsoR * 0.5) {
            col = '#FFFFFF';
          } else {
            col = '#F6F4FA';
          }
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(rx / P) * P, Math.round(ry / P) * P, P, P);
        }
      }
    }

    // Stepped Pixel Ribcage & Spinal Bone Segments on the Back/Shoulders
    for (let rib = -2; rib <= 2; rib++) {
      const ry = rib * (P * 3);
      const rx = -torsoR * 0.35 + Math.abs(rib) * (P * 1.5);
      const rw = P * 3.5;

      // Dark seam under rib
      ctx.fillStyle = '#22202A';
      ctx.fillRect(Math.round(rx / P) * P, Math.round(ry / P) * P, rw, P);

      // Raised pure white bone plate
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(rx / P) * P + P, Math.round((ry - P) / P) * P, rw - P, P);
    }
    ctx.restore();

    // ── 4. PIXEL-ART FLOWING CONNECTED WHITE MANE & HAIR STRANDS (Zero Gaps) ──
    ctx.save();
    const hairStrandIndices = [-3, -2, -1, 0, 1, 2, 3];

    hairStrandIndices.forEach((i) => {
      const strandNorm = i / 3.0; // -1.0 to +1.0
      const baseOffset = i * (P * 3.0);
      const strandLen = r * (2.4 - Math.abs(strandNorm) * 0.7); // Center strands longer (~72px), outer strands slightly shorter (~51px)
      const startX = r * 0.35 - Math.abs(strandNorm) * (r * 0.15); // Root starts naturally embedded in skull/torso
      const endX = startX - strandLen;
      const strandSeed = i * 1.35;

      // Pass 1: Contiguous Dark Outline Pixels (drawn around the strand with no gaps)
      ctx.fillStyle = '#111114';
      for (let x = startX; x >= endX; x -= P) {
        const prog = Math.max(0, Math.min(1, (startX - x) / strandLen));
        const wave = Math.sin((now / 115) - (prog * 4.8) + strandSeed) * (P * 2.5 * Math.pow(prog, 1.25));
        const cy = baseOffset * (1.0 + prog * 0.5) + wave;
        const halfH = Math.max(P * 0.6, (1.0 - prog * 0.65) * (P * 1.6));

        const px = Math.round(x / P) * P;
        const topY = Math.round((cy - halfH - P) / P) * P;
        const botY = Math.round((cy + halfH + P) / P) * P;
        const ph = botY - topY;

        ctx.fillRect(px, topY, P, ph);
      }

      // Pass 2: Contiguous Solid Stepped Pixel Fill (connected seamlessly with zero gaps)
      for (let x = startX; x >= endX; x -= P) {
        const prog = Math.max(0, Math.min(1, (startX - x) / strandLen));
        const wave = Math.sin((now / 115) - (prog * 4.8) + strandSeed) * (P * 2.5 * Math.pow(prog, 1.25));
        const cy = baseOffset * (1.0 + prog * 0.5) + wave;
        const halfH = Math.max(P * 0.5, (1.0 - prog * 0.65) * (P * 1.4));

        const px = Math.round(x / P) * P;
        const py = Math.round(cy / P) * P;
        const topY = Math.round((cy - halfH) / P) * P;
        const botY = Math.round((cy + halfH) / P) * P;
        const ph = Math.max(P, botY - topY);

        // Gradient stepped bone-white palette
        let col = '#FFFFFF';
        if (prog > 0.75) {
          col = '#C8C2D4';
        } else if (prog > 0.4) {
          col = '#EBE7F2';
        } else {
          col = '#FFFFFF';
        }

        ctx.fillStyle = col;
        ctx.fillRect(px, topY, P, ph);

        // Core bright highlight line along the center
        if (prog < 0.55 && ph >= P * 1.8) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py - P * 0.5, P, P);
        }
      }
    });
    ctx.restore();

    // ── 5. PIXEL-ART BONE-WHITE HEAD DOME & GAPING MAW ──
    ctx.save();
    const headCenterX = r * 0.52;
    const headR = r * 0.42;
    const headSteps = Math.ceil(headR / P);

    // Head Pixel Outline
    ctx.fillStyle = '#111114';
    for (let gy = -headSteps; gy <= headSteps; gy++) {
      for (let gx = -headSteps; gx <= headSteps; gx++) {
        const d = Math.hypot(gx * P, gy * P);
        if (d <= headR + P * 0.8) {
          ctx.fillRect(Math.round((headCenterX + gx * P) / P) * P, Math.round(gy * P / P) * P, P, P);
        }
      }
    }

    // Head Dome Base Bone Fill (Pure White #FFFFFF / #F6F4FA)
    for (let gy = -headSteps; gy <= headSteps; gy++) {
      for (let gx = -headSteps; gx <= headSteps; gx++) {
        const d = Math.hypot(gx * P, gy * P);
        if (d <= headR) {
          const rx = gx * P;
          const ry = gy * P;
          let col = '#FFFFFF';
          if (rx < -headR * 0.2 || Math.abs(ry) > headR * 0.6) {
            col = '#DCD8E6';
          }
          ctx.fillStyle = col;
          ctx.fillRect(Math.round((headCenterX + rx) / P) * P, Math.round(ry / P) * P, P, P);
        }
      }
    }

    // Cranial Suture Plate Cracks (Dark pixel cracks)
    ctx.fillStyle = '#111114';
    ctx.fillRect(Math.round((headCenterX - P * 2) / P) * P, Math.round(-headR * 0.3 / P) * P, P * 4, P);
    ctx.fillRect(Math.round(headCenterX / P) * P, Math.round(-headR * 0.6 / P) * P, P, P * 4);

    // Gaping Maw Void (Abyssal Crimson-Black)
    const mouthOpen = isAttacking ? 18 : 10;
    ctx.fillStyle = '#140008';
    ctx.beginPath();
    ctx.moveTo(headCenterX + headR * 0.2, -mouthOpen * 0.5);
    ctx.lineTo(headCenterX + headR * 1.3, 0);
    ctx.lineTo(headCenterX + headR * 0.2, mouthOpen * 0.5);
    ctx.closePath();
    ctx.fill();

    // Sharp Stepped Pixel Teeth (Pure White Fangs)
    ctx.fillStyle = '#FFFFFF';
    for (let t = -3; t <= 3; t++) {
      if (t === 0) continue;
      const ty = t * (mouthOpen * 0.13);
      const tx = headCenterX + headR * 0.3 + (4 - Math.abs(t)) * (P * 1.1);
      const ptx = Math.round(tx / P) * P;
      const pty = Math.round(ty / P) * P;

      // Tooth block
      ctx.fillRect(ptx, pty, P * 1.5, P);
      // Tooth sharp tip
      ctx.fillStyle = '#FFFFFA';
      ctx.fillRect(ptx + (t > 0 ? P : -P) * 0.5 + P, pty, P, P);
      ctx.fillStyle = '#FFFFFF';
    }

    // Glowing Pixel Cursed Eye Slit within the head
    const eyeAlpha = 0.85 + Math.sin(now / 80) * 0.15;
    ctx.fillStyle = `rgba(255, 20, 147, ${eyeAlpha})`;
    const eyeX = Math.round((headCenterX + headR * 0.1) / P) * P;
    const eyeY = 0;
    ctx.fillRect(eyeX - P, eyeY - P, P * 3, P * 2);
    // Pure White-Hot Center Pixel
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(eyeX, eyeY, P, P);

    ctx.restore();

    // ── 6. PIXEL-ART TRIPLE-CLAW SLASH VISUALS ──
    const rikaArmsForVisual = [ 
      { timer: rk.rightArmTimer || 0, isLeft: false }, 
      { timer: rk.leftArmTimer || 0, isLeft: true } 
    ];

    try {
      rikaArmsForVisual.forEach(arm => {
        const armAttackTimer = arm.timer;
        const isLeftArm = arm.isLeft;
        if (armAttackTimer > 0) {
          const startAng = 0.75 * (isLeftArm ? -1 : 1);
          const targetAng = -0.75 * (isLeftArm ? -1 : 1);
          
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
            const P = 2.0;
            const snap = (v) => Math.round(v / P) * P;
            const clawRadii = [r * 1.45, r * 1.80, r * 2.15];
            const startAngle = (isLeftArm ? 0 : 0) + startAng;
            const endAngle = (isLeftArm ? 0 : 0) + (slashProgress === 1.0 ? targetAng : angleOffset);
            const numSteps = 24;
            
            clawRadii.forEach((radius) => {
              // Pass 1: Dark Obsidian Ink Outline Border
              ctx.fillStyle = `rgba(18, 5, 14, ${slashAlpha * 0.95})`;
              for (let s = 0; s <= numSteps; s++) {
                const stepProg = s / numSteps;
                const curA = startAngle + (endAngle - startAngle) * stepProg;
                const ax = Math.cos(curA) * radius;
                const ay = Math.sin(curA) * radius;
                const sx = snap(ax);
                const sy = snap(ay);
                ctx.fillRect(sx - P, sy - P, P * 3, P * 3);
              }

              // Pass 2: Glowing Hot Pink Core
              ctx.fillStyle = `rgba(255, 20, 147, ${slashAlpha * 0.95})`;
              for (let s = 0; s <= numSteps; s++) {
                const stepProg = s / numSteps;
                const curA = startAngle + (endAngle - startAngle) * stepProg;
                const ax = Math.cos(curA) * radius;
                const ay = Math.sin(curA) * radius;
                const sx = snap(ax);
                const sy = snap(ay);
                ctx.fillRect(sx, sy, P, P);
              }

              // Pass 3: Razor White Cutting Center
              ctx.fillStyle = `rgba(255, 255, 255, ${slashAlpha})`;
              for (let s = 0; s <= numSteps; s++) {
                const stepProg = s / numSteps;
                if (stepProg > 0.25 && stepProg < 0.85) {
                  const curA = startAngle + (endAngle - startAngle) * stepProg;
                  const ax = Math.cos(curA) * radius;
                  const ay = Math.sin(curA) * radius;
                  const sx = snap(ax);
                  const sy = snap(ay);
                  ctx.fillRect(sx, sy, P, P);
                }
              }
            });
            ctx.restore();
          }
        }
      });
    } catch (e) {
      console.error("Error drawing Rika slash visual:", e);
    }

    // ── 7. PIXEL-ART FLOATING HEALTH BAR (Upright in World Space above Rika's Model) ──
    if (rk.maxHp > 0 && rk.hp > 0 && !rk.isDying) {
      ctx.save();
      // Counter-rotate targetAngle so the health bar ALWAYS stays horizontal and floats on top of Rika's model!
      ctx.rotate(-targetAngle);
      
      const hpRatio = Math.max(0, Math.min(1, rk.hp / rk.maxHp));
      const barW = Math.max(42, r * 1.8);
      const barH = 5.5;
      const barX = -barW / 2;
      const barY = -r * 1.45 - 8; // Floats statically on top (-Y) of Rika in world space
      
      // 1. Dark Shadow / Border
      ctx.fillStyle = '#111114';
      ctx.fillRect(Math.round(barX - 1.5), Math.round(barY - 1.5), Math.round(barW + 3), Math.round(barH + 3));

      // 2. Empty Dark Trough
      ctx.fillStyle = 'rgba(20, 20, 28, 0.9)';
      ctx.fillRect(Math.round(barX), Math.round(barY), Math.round(barW), Math.round(barH));
      
      // 3. Dynamic Health Fill (Green -> Yellow -> Red)
      const fillW = Math.round(barW * hpRatio);
      if (fillW > 0) {
        ctx.fillStyle = (hpRatio > 0.5) ? '#2ECC71' : (hpRatio > 0.25) ? '#F1C40F' : '#E74C3C';
        ctx.fillRect(Math.round(barX), Math.round(barY), fillW, Math.round(barH));
        // Top highlight glint line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(Math.round(barX), Math.round(barY), fillW, 1.5);
      }
      
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

    const P = 2.2; // Pixel art unit grid scale
    const sideSign = isLeft ? -1 : 1;
    const now = Date.now();

    // Compute the idle arm vector
    const idleDx = handX - shoulderX;
    const idleDy = handY - shoulderY;
    const armLen = Math.sqrt(idleDx * idleDx + idleDy * idleDy);
    const idleAngle = Math.atan2(idleDy, idleDx);

    let angleOffset = 0;
    let clawSpread = 0;

    const startAng = 0.75 * sideSign;
    const targetAng = -0.75 * sideSign;

    if (attackTimer > 0) {
      const p = Math.min(60, attackTimer);
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
        const eased = t * t;
        angleOffset = targetAng * eased;
        clawSpread = -0.3 * eased;
      }
    }

    // Emergence Arm Sweep
    const isEmerging = (fighter.rika && fighter.rika.spawnTimer > 0);
    let emergenceAngleOffset = 0;
    let emergenceFingerFlex = 0;

    if (isEmerging) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 45;
      const progress = 1 - (fighter.rika.spawnTimer / ariseMax);
      emergenceAngleOffset = (Math.sin(progress * Math.PI) * 0.35 * sideSign);
      emergenceFingerFlex = Math.sin((now / 100) + (isLeft ? 0 : 1.5)) * 0.22;
    }

    const idleBreath = (attackTimer === 0) ? Math.sin(now / 800) * 0.03 : 0;
    const currentAngle = idleAngle + angleOffset + emergenceAngleOffset + idleBreath;

    const finalHandX = shoulderX + Math.cos(currentAngle) * armLen;
    const finalHandY = shoulderY + Math.sin(currentAngle) * armLen;

    // ── 1. CONTINUOUS SOLID BONE-WHITE FOREARM (No zebra stripes / no excessive black) ──
    const armSteps = 16; // Higher resolution for seamless contiguous connection

    // Pass 1: Outer Dark Contour Outline
    ctx.fillStyle = '#111114';
    for (let s = 0; s <= armSteps; s++) {
      const prog = s / armSteps;
      const ax = shoulderX + (finalHandX - shoulderX) * prog;
      const ay = shoulderY + (finalHandY - shoulderY) * prog;
      const armWidth = Math.max(P * 1.5, (6.5 - prog * 2.2) * P * 0.5);

      const px = Math.round(ax / P) * P;
      const py = Math.round(ay / P) * P;
      const topY = Math.round((py - armWidth - P) / P) * P;
      const botY = Math.round((py + armWidth + P) / P) * P;
      const ph = botY - topY;

      ctx.fillRect(px - P * 0.5, topY, P * 1.5, ph);
    }

    // Pass 2: Solid Stepped Bone-White Arm Body Fill
    for (let s = 0; s <= armSteps; s++) {
      const prog = s / armSteps;
      const ax = shoulderX + (finalHandX - shoulderX) * prog;
      const ay = shoulderY + (finalHandY - shoulderY) * prog;
      const armWidth = Math.max(P * 1.2, (6.0 - prog * 2.2) * P * 0.5);

      const px = Math.round(ax / P) * P;
      const py = Math.round(ay / P) * P;
      const topY = Math.round((py - armWidth) / P) * P;
      const botY = Math.round((py + armWidth) / P) * P;
      const ph = Math.max(P, botY - topY);

      // Clean bright bone-white palette
      let col = '#FFFFFF';
      if (prog < 0.25) {
        col = '#FFFFFF';
      } else if (prog < 0.7) {
        col = '#F8F6FC';
      } else {
        col = '#EAE4F2';
      }

      ctx.fillStyle = col;
      ctx.fillRect(px, topY, P, ph);

      // Subtle skeletal muscle ridge highlight
      if (s % 2 === 0 && ph >= P * 2) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px, py - P * 0.5, P, P);
      }
    }

    // ── 2. PIXEL-ART PALM & 5-DIGIT WHITE CLAWS ──
    ctx.save();
    ctx.translate(finalHandX, finalHandY);
    ctx.rotate(currentAngle);

    // Pixel Palm (Clean Bone-White with subtle thin outline)
    ctx.fillStyle = '#111114';
    ctx.fillRect(-P * 0.5, -P * 2.5, P * 6.5, P * 5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, -P * 2, P * 5.5, P * 4);
    // Subtle Palm Crease
    ctx.fillStyle = '#E2DCED';
    ctx.fillRect(P * 2, -P * 0.8, P, P * 1.6);

    // 5 Pixel-Art White Claws
    const fingersData = [
      { name: 'Thumb', baseX: 5, baseY: isLeft ? 5.5 : -5.5, len: 18, baseAngle: isLeft ? 0.65 : -0.65, thick: 3.6 },
      { name: 'Index', baseX: 12, baseY: isLeft ? 3.5 : -3.5, len: 24, baseAngle: isLeft ? 0.22 : -0.22, thick: 3.6 },
      { name: 'Middle', baseX: 14, baseY: 0, len: 27, baseAngle: 0, thick: 3.8 },
      { name: 'Ring', baseX: 12, baseY: isLeft ? -3.5 : 3.5, len: 24, baseAngle: isLeft ? -0.22 : 0.22, thick: 3.4 },
      { name: 'Pinky', baseX: 10, baseY: isLeft ? -5.5 : 5.5, len: 19, baseAngle: isLeft ? -0.45 : 0.45, thick: 3.0 }
    ];
    const flexIdle = ((attackTimer === 0) ? Math.sin(now / 400) * 0.05 : 0) + emergenceFingerFlex;

    fingersData.forEach((f, idx) => {
      ctx.save();
      ctx.translate(f.baseX, f.baseY);

      const curAngle = f.baseAngle + flexIdle + (clawSpread * (idx - 2) * 0.15);
      ctx.rotate(curAngle);

      const l = f.len;
      const clawSteps = 12; // Higher step count for smooth continuous finger strands

      // Pass 1: Finger Dark Contour Outline
      ctx.fillStyle = '#111114';
      for (let cs = 0; cs <= clawSteps; cs++) {
        const cprog = cs / clawSteps;
        const fx = cprog * l;
        const fy = Math.pow(cprog, 1.5) * (isLeft ? 2.2 : -2.2);
        const fw = Math.max(P * 0.5, (1.0 - cprog * 0.65) * (f.thick * 0.5));

        const fpx = Math.round(fx / P) * P;
        const fpy = Math.round(fy / P) * P;
        const topY = Math.round((fpy - fw - P) / P) * P;
        const botY = Math.round((fpy + fw + P) / P) * P;
        const ph = botY - topY;

        ctx.fillRect(fpx - P * 0.5, topY, P * 1.5, ph);
      }

      // Pass 2: Solid Bone-White Claw Finger Body Fill (Clean white with subtle gradient)
      for (let cs = 0; cs <= clawSteps; cs++) {
        const cprog = cs / clawSteps;
        const fx = cprog * l;
        const fy = Math.pow(cprog, 1.5) * (isLeft ? 2.2 : -2.2);
        const fw = Math.max(P * 0.4, (1.0 - cprog * 0.65) * (f.thick * 0.45));

        const fpx = Math.round(fx / P) * P;
        const fpy = Math.round(fy / P) * P;
        const topY = Math.round((fpy - fw) / P) * P;
        const botY = Math.round((fpy + fw) / P) * P;
        const ph = Math.max(P, botY - topY);

        // Pure bone-white finger palette (minimal black, pure monstrous elegance)
        let col = '#FFFFFF';
        if (cprog > 0.9) {
          col = '#C4BED0'; // Subtle dark tip accent
        } else if (cprog > 0.5) {
          col = '#F2EEF8';
        } else {
          col = '#FFFFFF';
        }

        ctx.fillStyle = col;
        ctx.fillRect(fpx, topY, P, ph);

        // Sharp White Specular Core along finger spine
        if (cs < clawSteps - 1 && ph >= P * 1.6) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(fpx, fpy - P * 0.5, P, P);
        }
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
    const P = 2.2;
    const now = Date.now();

    let targetAngle = renderState ? renderState.targetAngle : (rk.angle || 0);
    const spawnScale = renderState ? renderState.spawnScale : (rk.spawnScale ?? 1.0);
    let drawX = renderState ? renderState.drawX : rk.x;
    let drawY = renderState ? renderState.drawY : rk.y;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(spawnScale, spawnScale);
    ctx.rotate(targetAngle);

    // Stepped pixel cursed energy flame particles orbiting Rika
    const numSparks = 14;
    for (let sp = 0; sp < numSparks; sp++) {
      const sparkSeed = sp * 77 + (now * 0.003);
      const angle = (sp / numSparks) * Math.PI * 2 + Math.sin(sparkSeed) * 0.5;
      const dist = r * 1.1 + (Math.sin(sparkSeed * 1.5) * r * 0.35);
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;

      const px = Math.round(sx / P) * P;
      const py = Math.round(sy / P) * P;
      const pSize = (sp % 3 === 0) ? P * 2 : P;

      // Ethereal white/silver aura shell
      ctx.fillStyle = 'rgba(230, 225, 245, 0.45)';
      ctx.fillRect(px - P, py - P, pSize + P * 2, pSize + P * 2);

      // Glowing hot pink flame pixel
      ctx.fillStyle = 'rgba(255, 20, 147, 0.75)';
      ctx.fillRect(px, py, pSize, pSize);

      // Specular white pixel
      if (sp % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(px + P * 0.5, py + P * 0.5, P, P);
      }
    }

    ctx.restore();
  }

  static _drawRikaYutaTether(ctx, fighter, rk, renderState = null) {
    if (!fighter || !rk || !rk.active) return;
    if (rk.killedInDomain || rk.isDying || rk.hp <= 0) return;

    const yutaX = fighter.x;
    const yutaY = fighter.y;
    const rikaX = renderState ? renderState.drawX : rk.x;
    const rikaY = renderState ? renderState.drawY : rk.y;
    const rikaAngle = renderState ? renderState.targetAngle : (rk.angle || 0);
    const spawnScale = renderState ? renderState.spawnScale : (rk.spawnScale ?? 1.0);
    const rikaR = ((rk.r !== undefined && rk.r !== null) ? Math.max(0.1, rk.r) : 30) * spawnScale;

    // Anchor at Rika's rear body along her facing angle
    const rikaAnchorX = rikaX - Math.cos(rikaAngle) * (rikaR * 0.45);
    const rikaAnchorY = rikaY - Math.sin(rikaAngle) * (rikaR * 0.45);

    const dist = Math.hypot(rikaAnchorX - yutaX, rikaAnchorY - yutaY);
    if (dist < 5) return;

    const P = 2.2;
    const isRCT = Boolean(fighter.isChannelingRCT);

    // Color definitions strictly matching Yuta's Cursed Energy
    const mainCeColor = isRCT ? 'rgba(50, 205, 50, 0.75)' : 'rgba(255, 20, 147, 0.75)';
    const coreCeColor = isRCT ? 'rgba(144, 238, 144, 0.85)' : 'rgba(255, 105, 180, 0.85)';
    const innerLightColor = isRCT ? 'rgba(200, 255, 200, 0.95)' : 'rgba(255, 192, 203, 0.95)';
    const whiteHotColor = 'rgba(255, 255, 255, 0.95)';

    const numSteps = Math.max(16, Math.min(60, Math.ceil(dist / (P * 2.2))));

    ctx.save();

    // ── Layer 1: Dark Cursed Shadow Ink Outline (Static Non-Wiggling Vector) ──
    ctx.fillStyle = '#111114';
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const bx = yutaX + (rikaAnchorX - yutaX) * t;
      const by = yutaY + (rikaAnchorY - yutaY) * t;

      const halfW = (t * 0.65 + 0.35) * (rikaR * 0.30) + P * 0.8;
      const px = Math.round(bx / P) * P;
      const py = Math.round(by / P) * P;
      const pw = Math.round((halfW * 2) / P) * P;

      ctx.fillRect(px - pw / 2, py - pw / 2, pw, pw);
    }

    // ── Layer 2: Main Cursed Energy Flame Body (Identical Color to Yuta's CE) ──
    ctx.fillStyle = mainCeColor;
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const bx = yutaX + (rikaAnchorX - yutaX) * t;
      const by = yutaY + (rikaAnchorY - yutaY) * t;

      const halfW = (t * 0.65 + 0.35) * (rikaR * 0.25);
      const px = Math.round(bx / P) * P;
      const py = Math.round(by / P) * P;
      const pw = Math.max(P, Math.round((halfW * 2) / P) * P);

      ctx.fillRect(px - pw / 2, py - pw / 2, pw, pw);
    }

    // ── Layer 3: Inner Radiant Cursed Energy Core ──
    ctx.fillStyle = coreCeColor;
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const bx = yutaX + (rikaAnchorX - yutaX) * t;
      const by = yutaY + (rikaAnchorY - yutaY) * t;

      const halfW = (t * 0.50 + 0.30) * (rikaR * 0.15);
      const px = Math.round(bx / P) * P;
      const py = Math.round(by / P) * P;
      const pw = Math.max(P, Math.round((halfW * 2) / P) * P);

      ctx.fillRect(px - pw / 2, py - pw / 2, pw, pw);
    }

    // ── Layer 4: Soft Light Pink Core ──
    ctx.fillStyle = innerLightColor;
    for (let i = 0; i <= numSteps; i += 2) {
      const t = i / numSteps;
      const bx = yutaX + (rikaAnchorX - yutaX) * t;
      const by = yutaY + (rikaAnchorY - yutaY) * t;

      const px = Math.round(bx / P) * P;
      const py = Math.round(by / P) * P;
      ctx.fillRect(px - P / 2, py - P / 2, P, P);
    }

    // ── Layer 5: Pure White Specular Filament Core ──
    ctx.fillStyle = whiteHotColor;
    for (let i = 2; i < numSteps; i += 4) {
      const t = i / numSteps;
      const bx = yutaX + (rikaAnchorX - yutaX) * t;
      const by = yutaY + (rikaAnchorY - yutaY) * t;

      const px = Math.round(bx / P) * P;
      const py = Math.round(by / P) * P;
      ctx.fillRect(px, py, P, P);
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
    const facingLeft = Math.abs(fighter.gunAngle) > Math.PI / 2;
    const baseAngle = facingLeft ? Math.PI : 0;
    let diff = (fighter.gunAngle || 0) - baseAngle;
    let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (facingLeft) {
      normDiff = -normDiff;
    }
    ctx.rotate(baseAngle);
    if (facingLeft) {
      ctx.scale(1, -1);
    }
    ctx.rotate(normDiff * 0.7);
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
    // Strap is cleanly and accurately rendered within drawYutaSkin
  }

  static _drawSpatialCracks(ctx, fighter) {
    if (!fighter.spatialCracks || fighter.spatialCracks.length === 0) return;

    ctx.save();
    const P = 3.0; // Pixel art grid scale
    
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
      const scale = 1 + (1 - progress) * 0.25;
      
      ctx.save();
      ctx.translate(crack.x, crack.y);
      ctx.rotate(crack.angle);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      
      // 1. Pixel-Art Fractured Sky Crystal Polygon Shards
      const shardShapes = [
        [ { x: 0, y: 0 }, { x: 90, y: -65 }, { x: 140, y: -30 }, { x: 70, y: 0 } ],
        [ { x: 0, y: 0 }, { x: 140, y: -30 }, { x: 190, y: 0 }, { x: 130, y: 15 } ],
        [ { x: 0, y: 0 }, { x: 130, y: 15 }, { x: 180, y: 40 }, { x: 80, y: 65 } ],
        [ { x: 70, y: 0 }, { x: 190, y: 0 }, { x: 230, y: 0 }, { x: 160, y: -10 } ]
      ];

      shardShapes.forEach((pts, sIdx) => {
        // Pixel Outline
        ctx.fillStyle = '#111114';
        for (let j = 0; j < pts.length; j++) {
          const p1 = pts[j];
          const p2 = pts[(j + 1) % pts.length];
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(2, Math.round(dist / P));
          for (let st = 0; st <= steps; st++) {
            const rx = p1.x + (p2.x - p1.x) * (st / steps);
            const ry = p1.y + (p2.y - p1.y) * (st / steps);
            ctx.fillRect(Math.round(rx / P) * P - P * 0.5, Math.round(ry / P) * P - P * 0.5, P * 2, P * 2);
          }
        }

        // Stepped Shard Body
        const shardCol = (sIdx % 2 === 0) ? 'rgba(0, 255, 255, 0.75)' : 'rgba(180, 245, 255, 0.85)';
        ctx.fillStyle = shardCol;
        ctx.beginPath();
        pts.forEach((pt, pIdx) => {
          const px = Math.round(pt.x / P) * P;
          const py = Math.round(pt.y / P) * P;
          if (pIdx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();

        // White-hot edge highlight pixels
        ctx.fillStyle = '#FFFFFF';
        for (let j = 0; j < pts.length; j++) {
          const p1 = pts[j];
          const p2 = pts[(j + 1) % pts.length];
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(1, Math.round(dist / (P * 2)));
          for (let st = 0; st <= steps; st++) {
            const rx = p1.x + (p2.x - p1.x) * (st / steps);
            const ry = p1.y + (p2.y - p1.y) * (st / steps);
            ctx.fillRect(Math.round(rx / P) * P, Math.round(ry / P) * P, P, P);
          }
        }
      });

      // 2. Stepped Pixel Jagged Fissure Lines radiating from point of impact
      const fissures = [
        [ { x: 0, y: 0 }, { x: 45, y: -25 }, { x: 95, y: -45 }, { x: 155, y: -65 } ],
        [ { x: 0, y: 0 }, { x: 55, y: 0 }, { x: 115, y: 5 }, { x: 185, y: 0 }, { x: 245, y: -5 } ],
        [ { x: 0, y: 0 }, { x: 40, y: 20 }, { x: 90, y: 40 }, { x: 150, y: 65 } ]
      ];

      fissures.forEach(fiss => {
        ctx.fillStyle = '#FFFFFF';
        for (let j = 0; j < fiss.length - 1; j++) {
          const p1 = fiss[j];
          const p2 = fiss[j + 1];
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(2, Math.round(dist / P));
          for (let st = 0; st <= steps; st++) {
            const rx = p1.x + (p2.x - p1.x) * (st / steps);
            const ry = p1.y + (p2.y - p1.y) * (st / steps);
            ctx.fillRect(Math.round(rx / P) * P, Math.round(ry / P) * P, P * 1.5, P * 1.5);
          }
        }
      });

      // 3. Floating shattered pixel glass embers
      const numEmbers = 10;
      for (let eb = 0; eb < numEmbers; eb++) {
        const ebSeed = eb * 17.3 + (1 - progress) * 50;
        const ebX = Math.round((40 + (eb % 5) * 35 + ebSeed * 0.4) / P) * P;
        const ebY = Math.round(((eb % 3 - 1) * 30 + Math.sin(ebSeed) * 20) / P) * P;
        ctx.fillStyle = (eb % 2 === 0) ? '#00FFFF' : '#FFFFFF';
        ctx.fillRect(ebX, ebY, P, P);
      }

      ctx.restore();
    }
    ctx.restore();
  }

  static _drawThinIceBreakerHand(ctx, fighter) {
    if (typeof state !== 'undefined' && state.showSkinOnly) return;
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    const facingLeft = Math.abs(fighter.gunAngle) > Math.PI / 2;
    const baseAngle = facingLeft ? Math.PI : 0;
    let diff = (fighter.gunAngle || 0) - baseAngle;
    let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (facingLeft) {
      normDiff = -normDiff;
    }
    ctx.rotate(baseAngle);
    if (facingLeft) {
      ctx.scale(1, -1);
    }
    ctx.rotate(normDiff);

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

    // Left hand circle (matching face skin tone)
    ctx.fillStyle = fighter.skinColor || '#FABC95';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw cyan pixel-art aura on the fist
    const P = 2.4;
    const auraR = 10;
    const auraSteps = Math.ceil(auraR / P);
    for (let gy = -auraSteps; gy <= auraSteps; gy++) {
      for (let gx = -auraSteps; gx <= auraSteps; gx++) {
        const d = Math.hypot(gx * P, gy * P);
        if (d <= auraR && d >= 5) {
          ctx.fillStyle = (d > auraR * 0.75) ? 'rgba(0, 255, 255, 0.4)' : 'rgba(200, 255, 255, 0.8)';
          ctx.fillRect(Math.round(gx * P / P) * P, Math.round(gy * P / P) * P, P, P);
        }
      }
    }

    ctx.restore();
  }
}
