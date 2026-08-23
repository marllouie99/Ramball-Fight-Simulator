import { CONFIG, getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { STATUS_OVERLAY_REGISTRY } from '../statusEffects.js';

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
    
    // Suppress white hit-flash during Yuji's soul-swap transformation or on match end / winner reveal; the
    // 'lighter' composite at full opacity would completely wash the body white.
    const isSoulSwapTransitioning = (fighter.soulSwapTransitionTimer || 0) > 0 || fighter.soulSwapActive;
    const isMatchEnded = (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) || Boolean(fighter._isWinnerReveal);
    if (fighter.hitFlashTimer > 0 && !isSoulSwapTransitioning && !isMatchEnded) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${fighter.hitFlashTimer / 8})`;
      ctx.fill();
      ctx.restore();
    }

    // Process all declarative status overlays from registry
    for (let i = 0; i < STATUS_OVERLAY_REGISTRY.length; i++) {
      const entry = STATUS_OVERLAY_REGISTRY[i];
      if (entry.isActive(fighter)) {
        entry.render(ctx, baseRadius, fighter);
      }
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
    if (typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'faceoff' || state.gameState === 'faceOff' || state.gameState === 'faceOffThumbnail')) return;
    if (fighter.hp <= 0 || fighter._isWinnerReveal || fighter._isFaceOff || (fighter.hideHpText && typeof state !== 'undefined' && state.gameState !== 'playing')) return;

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

  static drawArmorFracture(ctx, fighter) {
    if (!fighter || (fighter.nanamiArmorFractureTimer || 0) <= 0 || fighter.isDead || fighter.hp <= 0) return;

    const r = fighter.r || 25;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const pulse = Math.sin(now * 0.008) * 0.5 + 0.5;

    ctx.save();
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

    // 1. Golden hairline fracture cracks on the fighter body
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.75 + pulse * 0.25})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    // Crack 1
    ctx.moveTo(-r * 0.65, -r * 0.35);
    ctx.lineTo(-r * 0.15, 0);
    ctx.lineTo(r * 0.10, -r * 0.40);
    ctx.lineTo(r * 0.55, -r * 0.20);
    // Crack 2
    ctx.moveTo(-r * 0.15, 0);
    ctx.lineTo(-r * 0.25, r * 0.55);
    // Crack 3
    ctx.moveTo(r * 0.10, -r * 0.40);
    ctx.lineTo(r * 0.45, r * 0.45);
    ctx.stroke();

    // 2. Glowing fractured diamond at intersection
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.15, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 3. Status Badge above health bar
    const drawY = -(r + 30);
    ctx.font = 'bold 9px Outfit, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeText('FRACTURED (+20%)', 0, drawY);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('FRACTURED (+20%)', 0, drawY);

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
    FighterRenderer.drawArmorFracture(ctx, fighter);

    if (hasZ) {
      ctx.restore();
    }
  }
}
