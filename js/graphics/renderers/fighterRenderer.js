import { CONFIG, getHandSize } from '../../core/config.js';
import {
  drawSlowEffect,
  drawElectricStunEffect,
  drawDubstepStunEffect,
  drawCrimsonElectrifiedEffect,
  drawPoisonEffect,
  drawSilenceEffect,
  drawThunderRootsEffect,
  drawBlackFlashDebuffEffect,
  drawVoidMarkEffect,
  drawParalyzeEffect,
  drawSoulDisfigurementEffect,
  drawEmbeddedMahitoSpikes
} from '../statusEffects.js';

// Cache of pre-computed sketchy circle paths keyed by "radius_seed"
const _sketchyCircleCache = new Map();

// Pre-compute a sketchy circle's path points (relative to 0,0) once, then replay them each frame.
function _getSketchyCirclePaths(r, seed) {
  const key = `${r}_${seed}`;
  let cached = _sketchyCircleCache.get(key);
  if (cached) return cached;

  let currentSeed = seed;
  const nextRand = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  const strokeCount = 3;
  const paths = [];
  for (let s = 0; s < strokeCount; s++) {
    const lineWidthMul = 0.6 + nextRand() * 0.4;
    const points = [];
    const step = (Math.PI * 2) / 30;
    const offsetX = (nextRand() - 0.5) * 1.5;
    const offsetY = (nextRand() - 0.5) * 1.5;
    const startAngle = (nextRand() - 0.5) * 0.5;
    const overshoot = 0.2 + nextRand() * 0.3;
    const endAngle = startAngle + Math.PI * 2 + overshoot;

    for (let angle = startAngle; angle <= endAngle; angle += step) {
      const rNoise = (nextRand() - 0.5) * 1.5;
      const currentR = r + rNoise;
      points.push(offsetX + Math.cos(angle) * currentR, offsetY + Math.sin(angle) * currentR);
    }
    paths.push({ lineWidthMul, points });
  }

  _sketchyCircleCache.set(key, paths);
  return paths;
}

// Helper to draw wobbly sketched pencil circles (cached path replay)
export function drawSketchyCircle(ctx, cx, cy, r, seed, color = 'rgba(15,15,18,0.85)', width = 2.5) {
  const paths = _getSketchyCirclePaths(r, seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let s = 0; s < paths.length; s++) {
    const { lineWidthMul, points } = paths[s];
    ctx.lineWidth = width * lineWidthMul;
    ctx.beginPath();
    ctx.moveTo(cx + points[0], cy + points[1]);
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(cx + points[i], cy + points[i + 1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export class FighterRenderer {
  static drawBody(ctx, fighter) {
    ctx.save();
    let tremorX = 0;
    let tremorY = 0;
    const currentShake = (typeof state !== 'undefined' && state.screenShake) ? (state.screenShake.intensity || 0) : 0;
    const isAnyFighterChanneling = (typeof state !== 'undefined' && state.fighters) ? state.fighters.some(f => f && (f.isChannelingDomain || f.isChannelingDomainExpansion)) : false;
    
    if (currentShake > 0 || isAnyFighterChanneling) {
      const shakeAmt = isAnyFighterChanneling ? 4.0 : Math.min(6, currentShake * 0.6);
      tremorX = (Math.random() - 0.5) * shakeAmt;
      tremorY = (Math.random() - 0.5) * shakeAmt;
    }
    ctx.translate(fighter.x + tremorX, fighter.y + tremorY);
    ctx.rotate(fighter.angle);
    
    // Flip vertically if facing left to prevent being upside-down
    if (Math.abs(fighter.angle) > Math.PI / 2 && !fighter.isSpinning) {
      ctx.scale(1, -1);
    }

    ctx.beginPath();
    ctx.arc(0, 0, fighter.r, 0, Math.PI * 2);
    ctx.fillStyle = fighter.color;
    ctx.fill();

    this.drawStatusOverlays(ctx, fighter);

    ctx.restore();
  }

  static drawStatusOverlays(ctx, fighter) {
    const baseRadius = fighter.r;
    
    // Suppress white hit-flash during Yuji's soul-swap transformation; the
    // 'lighter' composite at full opacity would completely wash the body white.
    const isSoulSwapTransitioning = (fighter.soulSwapTransitionTimer || 0) > 0 || fighter.soulSwapActive;
    if (fighter.hitFlashTimer > 0 && !isSoulSwapTransitioning) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${fighter.hitFlashTimer / 8})`;
      ctx.fill();
      ctx.restore();
    }

    if (!fighter.purpleHitTimer && ((fighter.statusEffects && fighter.statusEffects.fighter.slowTimer > 0) || fighter.slowTimer > 0)) {
      // Suppress the generic slow visual if they are currently trapped in Toji's cinematic ultimate
      const trappedInTojiUltimate = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
        f && f.ultimateActive && f.ultimateTarget === fighter && (f.type === 'toji' || f.characterId === 'toji')
      );
      if (!trappedInTojiUltimate) {
        drawSlowEffect(ctx, baseRadius);
      }
    }

    if (fighter.electricStunTimer > 0) {
      drawElectricStunEffect(ctx, baseRadius, false);
    }

    if (fighter.pureLoveBeamRecoveryTimer > 0) {
      ctx.save();
      // Draw neon pink body overlay
      ctx.fillStyle = 'rgba(255, 20, 147, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Outer pink pulsing rings to show visual capture/stun
      const time = Date.now();
      const pulse = (Math.sin(time / 100) + 1) / 2;
      ctx.strokeStyle = 'rgba(255, 105, 180, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, baseRadius * (1.05 + pulse * 0.15), baseRadius * (1.05 + pulse * 0.15), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    if (fighter.dubstepStunVisualTimer > 0) {
      drawDubstepStunEffect(ctx, baseRadius, fighter.dubstepStunVisualTimer);
    }
    
    if (fighter.crimsonElectrifiedTimer > 0) {
      drawCrimsonElectrifiedEffect(ctx, baseRadius, fighter.crimsonElectrifiedTrickster);
    }

    if (fighter.poisonTicks > 0) {
      drawPoisonEffect(ctx, baseRadius);
    }
    
    if (fighter.silenceTimer > 0) {
      drawSilenceEffect(ctx, baseRadius);
    }
    
    if (fighter.thunderRootsTimer > 0) {
      drawThunderRootsEffect(ctx, baseRadius);
    }

    if (fighter.burnTimer > 0) {
      const offset = baseRadius * 0.15;
      const grad = ctx.createRadialGradient(-offset, -offset, 0, 0, 0, baseRadius);
      const pulse = 0.05 * Math.sin(Date.now() / 100);
      grad.addColorStop(0, 'rgba(255, 255, 220, 0.65)'); // Hot-white/yellow center
      grad.addColorStop(0.35, `rgba(255, 130, 0, ${0.5 + pulse})`);
      grad.addColorStop(0.75, `rgba(200, 30, 0, ${0.35 + pulse})`);
      grad.addColorStop(1, 'rgba(100, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (fighter.blackFlashDebuffTimer > 0) {
      drawBlackFlashDebuffEffect(ctx, baseRadius);
    }

    if (fighter.voidMarkTimer > 0) {
      drawVoidMarkEffect(ctx, baseRadius);
    }

    if (fighter.paralyzeTimer > 0) {
      drawParalyzeEffect(ctx, baseRadius, Boolean(fighter.isParalyzedByMahito));
    }

    if ((fighter._soulDisfigurementStacks || 0) > 0 && (fighter._soulDisfigurementTimer || 0) > 0) {
      drawSoulDisfigurementEffect(ctx, baseRadius, fighter._soulDisfigurementStacks);
    }

    if (fighter._embeddedMahitoSpikes && fighter._embeddedMahitoSpikes.length > 0) {
      drawEmbeddedMahitoSpikes(ctx, baseRadius, fighter);
    }
  }

  static drawOutline(ctx, fighter) {
    let seed = 0;
    const idStr = String(fighter.id || 'fighter');
    for (let i = 0; i < idStr.length; i++) {
      seed += idStr.charCodeAt(i);
    }
    
    // Draw sketchy circle instead of solid line
    drawSketchyCircle(ctx, fighter.x, fighter.y, fighter.r, seed, 'rgba(10, 10, 15, 0.9)', 3);
  }

  static drawGun(ctx, fighter) {
    if (fighter.isTargetOfAmbush || (typeof state !== 'undefined' && state.showSkinOnly)) return;
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.rotate(fighter.gunAngle);
    
    if (Math.abs(fighter.gunAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    ctx.translate(fighter.r + CONFIG.gun.baseOffset, 0);
    ctx.fillStyle = '#444';
    ctx.fillRect(-3, -5, 14, 10);
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2.5, 10, 5);
    
    // Draw Hand holding the gun
    ctx.beginPath();
    ctx.arc(0, 3, getHandSize(6, fighter), 0, Math.PI * 2);
    ctx.fillStyle = fighter.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    
    ctx.restore();
  }

  static drawHealth(ctx, fighter) {
    if (fighter.hp <= 0 || fighter._isWinnerReveal || fighter.hideHpText) return;

    ctx.save();
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hpText = Math.floor(fighter.hp).toString();
    // fighter.y is correct here — the draw() wrapper already applies a ctx.translate
    // offset of -z when the fighter has elevation (hasZ), so subtracting z again
    // would push the text 2x too high above the body center.
    const drawY = fighter.y;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(hpText, fighter.x, drawY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, fighter.x, drawY);
    ctx.restore();
  }

  static drawFreezeTimer(ctx, fighter) {
    if (fighter._suppressFreezeTimer) return;
    if (!fighter._timeStopStartTime || !fighter._timeStopOriginalDuration) return;
    
    ctx.save();
    const elapsedMs = performance.now() - fighter._timeStopStartTime;
    const elapsedFrames = (elapsedMs / 1000) * 60;
    const remainingFrames = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
    const seconds = Math.ceil(remainingFrames / 60);
    const text = `⏳ ${seconds}s`;
    
    const drawY = (fighter.y - (fighter.z || 0)) - (fighter.r + 18);
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(text, fighter.x, drawY);
    ctx.fillStyle = '#00F3FF';
    ctx.fillText(text, fighter.x, drawY);
    ctx.restore();
  }

  static draw(ctx, fighter) {
    const zOffset = fighter.z || 0;
    const hasZ = zOffset > 0;

    if (hasZ) {
      ctx.save();
      ctx.translate(fighter.x, fighter.y);
      ctx.scale(1, 0.5); 
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.6 - (zOffset / 150))})`;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(fighter.x, fighter.y - zOffset);
      ctx.translate(-fighter.x, -fighter.y);
    }

    fighter.drawBody(ctx);
    fighter.drawOutline(ctx);
    
    fighter.drawGun(ctx);
    fighter.drawHealth(ctx);
    fighter.drawFreezeTimer(ctx);

    if (hasZ) {
      ctx.restore();
    }
  }
}
