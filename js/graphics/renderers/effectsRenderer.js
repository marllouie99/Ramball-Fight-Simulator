import { drawFlamesToCanvas, clearFlameCanvas } from '../canvasManager.js';
import { state, getProjectiles, triggerGlobalScreenShake } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { drawBlackHoleVisual } from './projectileRenderer.js';
import { drawShurikenProjectile } from '../weaponVisuals.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { fastCleanArray } from '../particles/visualTrailSystem.js';

export function drawBlackHoleEffects() {
  const ctx = state.ctx;
  const projectiles = getProjectiles();
  const now = Date.now();

  // ── SCREEN DIM EFFECT: Ominous Deep Cosmic Void Dimming when Black Hole is Cast/Active ──
  const activeBlackHole = projectiles.find(p => p.isBlackHole && p.transformed);
  const chargingFighter = state.fighters ? state.fighters.find(f => f && (f.type === 'black' || f.characterId === 'erebus' || (f._def && f._def.type === 'black')) && f.skillCharging) : null;

  if (activeBlackHole || chargingFighter) {
    let dimAlpha = 0;
    if (activeBlackHole) {
      const maxLife = CONFIG.black?.blackHoleDuration || 200;
      const fadeIn = 20;
      const fadeOut = 25;
      const life = activeBlackHole.life;
      if (life > maxLife - fadeIn) {
        dimAlpha = 0.88 * Math.max(0, (maxLife - life) / fadeIn);
      } else if (life < fadeOut) {
        dimAlpha = 0.88 * Math.max(0, life / fadeOut);
      } else {
        dimAlpha = 0.88;
      }

      // Continuous subtle screen shake while black hole is active
      if (activeBlackHole.life % 8 === 0) {
        triggerGlobalScreenShake(2.5, 6);
      }
    } else if (chargingFighter) {
      const total = CONFIG.black?.skillChargeDuration || 30;
      const rem = chargingFighter.skillChargeTimer || total;
      dimAlpha = 0.75 * Math.min(1.0, (total - rem) / 15);
    }

    if (dimAlpha > 0.01) {
      ctx.save();
      // Clip-safe full canvas dim (adheres strictly to rule 14)
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Clean solid dark black screen dim overlay
      ctx.fillStyle = `rgba(0, 0, 0, ${(dimAlpha * 0.85).toFixed(3)})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }

  projectiles.forEach((p) => {
    if (!p.isBlackHole) return;

    // Check if this is a transformed black hole or a projectile about to transform
    if (p.transformed) {
      // Calculate fade-in and fade-out
      const maxLife = CONFIG.black.blackHoleDuration || 180;
      const fadeInDuration = 30;
      const fadeOutDuration = 30;

      let alpha = 1;
      if (p.life > maxLife - fadeOutDuration) {
        // Fade out
        alpha = (p.life - (maxLife - fadeOutDuration)) / fadeOutDuration;
      } else if (maxLife - p.life < fadeInDuration) {
        // Fade in
        alpha = (maxLife - p.life) / fadeInDuration;
      }

      // If summoned just now, show a larger pulsing ring that fades in/out
      if (p.indicatorTimer > 0) {
        const ip = p.indicatorTimer / (p.indicatorLife || 1);
        const ringProgress = 1 - ip; // grows as timer decreases
        const ringRadius = p.r * (1 + 0.8 + ringProgress * 1.4);
        ctx.save();
        ctx.globalAlpha = Math.max(0, ip * 0.95);
        ctx.beginPath();
        ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(204,102,255,${0.85 * ip})`;
        ctx.lineWidth = 4 * (0.6 + ringProgress * 1.4);
        ctx.stroke();
        ctx.restore();
      }

      // Unified black hole renderer (exact visual pipeline)
      const eventHorizon = Math.max(1, p.r * 0.28);
      const innerDiskR = p.r * 0.40;
      const outerDiskR = p.r * 0.95;

      drawBlackHoleVisual({
        ctx,
        p,
        alpha,
        now: p.visualTime || now,
        eventHorizon,
        innerDiskR,
        outerDiskR,
        progress: 1,
        rotateAngle: 0,
        indicator: true,
      });
    } else {
      // Unified black hole renderer (exact visual pipeline) for pre-transform phase
      // progress 0..1 (0 = just spawned, 1 = about to transform)
      const initial = p.initialTransformTimer || (Math.floor((p.life || 30) / 3) || 12);
      const progress = Math.min(1, Math.max(0, 1 - (p.transformTimer || 0) / initial));

      // Keep projectile-size interpolation (so it still reads as a projectile),
      // but render using the exact same element pipeline.
      const alpha = 0.78 + 0.20 * progress;

      const eventHorizon = Math.max(2.2, p.r * (0.62 + progress * 0.22));
      const innerDiskR = p.r * (1.10 + progress * 0.35);
      const outerDiskR = p.r * (2.45 + progress * 0.85);

      const angle = Math.atan2(p.vy || 0, p.vx || 1);
      const animTime = p.visualTime || now;

      // Subtle projectile tilt so it still feels like it's moving.
      // The hole art itself stays identical; only the local canvas transform changes.
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle + Math.sin(animTime / 360) * 0.18);
      ctx.scale(1.35, 0.58);
      ctx.rotate(animTime / 520);
      ctx.translate(-p.x, -p.y);

      drawBlackHoleVisual({
        ctx,
        p,
        alpha,
        now: animTime,
        eventHorizon,
        innerDiskR,
        outerDiskR,
        progress,
        rotateAngle: 0,
        indicator: false,
      });
      ctx.restore();

      // Projectile motion lensing trail (keep separate from the hole renderer)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 4.5, p.y - p.vy * 4.5);
      ctx.strokeStyle = `rgba(153,0,255,${0.18 + 0.08 * progress})`;
      ctx.lineWidth = Math.max(1, p.r * 0.55);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
  });

  // Draw stuck shurikens on the walls
  if (projectileSystem.stuckShurikens && projectileSystem.stuckShurikens.length > 0) {
    projectileSystem.stuckShurikens.forEach(s => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s.life / 60); // Fade out over the last 60 frames
      drawShurikenProjectile(ctx, s.x, s.y, s.angle, s.scale);
      ctx.restore();
    });
  }
}

export function drawFloatingTexts() {
  const { floatingTextCtx: ctx, floatingTextCanvas: canvas } = state;
  if (!ctx || !canvas) return;

  // Clear the dedicated floating text canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const texts = state.floatingTexts;
  if (!texts || texts.length === 0) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';

  let currentFont = '';

  fastCleanArray(texts, (t) => {
    t.timer++;
    t.y += t.vy;
    t.vy *= 0.96; // gradually decelerate upward drift

    const progress = t.timer / t.maxTimer;
    let alpha = 1;
    if (progress > 0.70) {
      alpha = 1 - (progress - 0.70) / 0.30;
    }

    if (t.timer < t.maxTimer) {
      ctx.globalAlpha = Math.max(0, alpha);
      
      // Floating damage numbers (20px bold), skill title text (18px bold)
      const targetFont = t.isDamage ? 'bold 20px "Architects Daughter"' : 'bold 18px "Glast Blitch"';
      if (currentFont !== targetFont) {
        ctx.font = targetFont;
        currentFont = targetFont;
      }

      ctx.lineWidth = t.isDamage ? 3.2 : 3.0;
      ctx.strokeStyle = 'rgba(0,0,0,0.92)';
      ctx.strokeText(t.text, t.x, t.y);

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillText(t.text, t.x + 1, t.y + 1); // Subtle drop shadow

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);

      return true; // Keep
    }
    return false; // Remove
  });

  ctx.restore();
}

export function drawFlames() {
  const projectiles = getProjectiles();
  const flames = projectiles.filter(p => p.isFlame);

  if (flames.length === 0) {
    clearFlameCanvas();
    return;
  }

  // Draw all flames to the offscreen flame canvas
  drawFlamesToCanvas(flames);
}

// ──────────────────────────────────────────
// DRAW — MANGA ACTION SPEED LINES CLUSTER (Genos Machine Gun Blows & Dash)
// ──────────────────────────────────────────
let _genosSpeedLineSeeds = null;

function _initGenosSpeedLineSeeds(theme = 'flurry') {
  _genosSpeedLineSeeds = [];
  const totalLines = 22;

  for (let i = 0; i < totalLines; i++) {
    const norm = (i / (totalLines - 1)) * 2 - 1; // -1.0 to +1.0
    // Compact perpendicular distribution matching Genos body size (~70px total width)
    const perpOffset = norm * 35 + (Math.random() - 0.5) * 6;
    
    // Dash speed line length (center ~90px, edges ~35px)
    const normDist = 1 - Math.abs(norm);
    const len = 35 + normDist * 55 + Math.random() * 15;
    
    // Sharp needle thickness (1.0px to 2.2px max)
    const maxThick = 1.0 + normDist * 1.2 + Math.random() * 0.4;

    // Movement speed along direction
    const speed = 14 + Math.random() * 10;
    const phase = Math.random() * 120;

    // Skill 1 (flurry) uses fiery orange/gold/white/black theme; Dashes use pure black manga ink
    let color;
    if (theme === 'dash') {
      color = 'rgba(10, 10, 15, 0.92)';
    } else {
      if (i % 4 === 0) color = 'rgba(255, 85, 0, 0.95)';       // Genos fiery orange
      else if (i % 4 === 1) color = 'rgba(255, 200, 0, 0.95)'; // Hot golden heat
      else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)';// White core
      else color = 'rgba(15, 15, 22, 0.90)';                   // Crisp black manga ink line
    }

    _genosSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawGenosSpeedLines() {
  if (!state.fighters) return;
  const genosFighter = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'genos' && f.type !== 'genos')) return false;
    // Hide speed lines when frozen, time-stopped, hit-stunned, or ambushed
    const isFrozen = (f.timeStopTimer > 0) || (f.hitStunTimer > 0) || f.isTargetOfAmbush ||
                     (f.electricStunTimer > 0) || (f.dubstepStunTimer > 0) || (f.isFrozenByInfinity);
    if (isFrozen) return false;
    const isDashing = (f.speedBoostTimer && f.speedBoostTimer > 0) || f.isDashing;
    return f.isFlurrying || isDashing;
  });
  if (!genosFighter) return;

  const ctx = state.ctx;
  if (!ctx) return;

  const isDashing = (genosFighter.speedBoostTimer && genosFighter.speedBoostTimer > 0) || genosFighter.isDashing;
  const activeState = genosFighter.isFlurrying ? 'flurry' : (isDashing ? 'dash' : false);
  if (!activeState) return;

  if (genosFighter._lastSpeedLineState !== activeState) {
    _genosSpeedLineSeeds = null;
  }
  genosFighter._lastSpeedLineState = activeState;

  if (!_genosSpeedLineSeeds) _initGenosSpeedLineSeeds(activeState);

  // If dashing and moving, align with movement velocity; if flurrying (Skill 1), align with aim angle
  let lineAngle;
  if (!genosFighter.isFlurrying && isDashing && Math.hypot(genosFighter.vx || 0, genosFighter.vy || 0) > 0.5) {
    lineAngle = Math.atan2(genosFighter.vy, genosFighter.vx);
  } else {
    lineAngle = genosFighter.gunAngle !== undefined ? genosFighter.gunAngle : (genosFighter.angle || 0);
  }

  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = genosFighter.x;
  const cy = genosFighter.y;
  const now = Date.now();

  ctx.save();

  for (let i = 0; i < _genosSpeedLineSeeds.length; i++) {
    const seed = _genosSpeedLineSeeds[i];
    // Travel in the BACKWARD direction (opposite to punch aim) — lines stream behind Genos
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100);
    
    // Cluster centered slightly BEHIND Genos (opposite punch direction)
    const backOffset = 30;
    const lineCenterX = cx - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = cy - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.len / 2;
    const halfThick = seed.maxThick / 2;

    // Needle polygon points: sharp start point, top mid, sharp end point, bot mid
    const midOff = halfLen * 0.15;
    
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;

    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;

    const endX = lineCenterX + cosA * halfLen;
    const endY = lineCenterY + sinA * halfLen;

    const topMidX = midX + perpX * halfThick;
    const topMidY = midY + perpY * halfThick;

    const botMidX = midX - perpX * halfThick;
    const botMidY = midY - perpY * halfThick;

    ctx.fillStyle = seed.color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawUltimateChannelingTexts() {
  const ctx = state.ctx;
  const fighters = state.fighters;
  if (!ctx || !fighters || fighters.length === 0) return;

  const now = Date.now();

  fighters.forEach(fighter => {
    if (!fighter || fighter.hp <= 0) return;

    const isToji = fighter.characterId === 'toji' || fighter.type === 'toji' || fighter._def?.id === 'toji';
    const isGojo = fighter.characterId === 'gojo' || fighter.type === 'gojo' || fighter._def?.id === 'gojo';
    const isSukuna = fighter.characterId === 'sukuna' || fighter.type === 'sukuna' || fighter._def?.id === 'sukuna';
    const isYuta = fighter.characterId === 'yuta' || fighter.type === 'yuta' || fighter._def?.id === 'yuta';

    if (isToji) {
      if ((fighter.ultimatePhase === 'CHANNELING' || (fighter.isChannelingDomain && !fighter.ultimateActive)) && (fighter.timeStopTimer || 0) <= 0) {
        const progress = Math.min(1.0, (fighter.ultimateChargeTimer || 0) / Math.max(1, fighter.ultimateChargeMax || 90));
        ctx.save();
        ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
        ctx.font = 'bold 21px "Glast Blitch", Arial';
        ctx.fillStyle = `rgba(160, 64, 255, ${progress})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
        ctx.lineWidth = 3.2;
        ctx.textAlign = 'center';
        const textY = -fighter.r - 42 - (Math.sin(now / 150) * 4);
        ctx.strokeText('HEAVENLY RESTRICTION', 0, textY);
        ctx.fillText('HEAVENLY RESTRICTION', 0, textY);
        ctx.restore();
      }
    } else if (isGojo && fighter.isChannelingDomainExpansion && (fighter.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, fighter.domainChargeTimer / Math.max(1, fighter.domainChargeMax || 120));
      ctx.save();
      ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
      ctx.font = 'bold 21px "Glast Blitch", Arial';
      ctx.fillStyle = `rgba(0, 229, 255, ${progress})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.lineWidth = 3.2;
      ctx.textAlign = 'center';
      const textY = -fighter.r - 42 - (Math.sin(now / 150) * 4);
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);
      ctx.fillText('DOMAIN EXPANSION', 0, textY);
      ctx.restore();
    } else if (isSukuna && fighter.isChannelingDomainExpansion && !fighter.domainActive && (fighter.timeStopTimer || 0) <= 0) {
      const maxTime = CONFIG.sukuna?.domainChargeMax || 120;
      const progress = Math.min(1.0, Math.max(0, (fighter.domainChargeTimer || 0) / maxTime));
      ctx.save();
      ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
      ctx.font = 'bold 21px "Glast Blitch", Arial';
      ctx.fillStyle = `rgba(220, 20, 60, ${progress})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.lineWidth = 3.2;
      ctx.textAlign = 'center';
      const textY = -fighter.r - 42 - (Math.sin(now / 150) * 4);
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);
      ctx.fillText('DOMAIN EXPANSION', 0, textY);
      ctx.restore();
    } else if (isYuta && fighter.isChannelingDomain) {
      const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 180));
      ctx.save();
      ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
      ctx.font = 'bold 21px "Glast Blitch", Arial';
      ctx.textAlign = 'center';
      const textY = -fighter.r - 42 - (Math.sin(now / 150) * 4);

      ctx.strokeStyle = `rgba(255, 20, 147, ${progress * 0.4})`;
      ctx.lineWidth = 6;
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);

      ctx.strokeStyle = `rgba(0, 0, 0, ${progress * 0.9})`;
      ctx.lineWidth = 3.5;
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);

      ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
      ctx.fillText('DOMAIN EXPANSION', 0, textY);
      ctx.restore();
    } else if (fighter.isChannelingDomainExpansion || fighter.isChannelingDomain) {
      const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 120));
      ctx.save();
      ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
      ctx.font = 'bold 21px "Glast Blitch", Arial';
      ctx.fillStyle = `rgba(255, 215, 0, ${progress})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.lineWidth = 3.2;
      ctx.textAlign = 'center';
      const textY = -fighter.r - 42 - (Math.sin(now / 150) * 4);
      ctx.strokeText('DOMAIN EXPANSION', 0, textY);
      ctx.fillText('DOMAIN EXPANSION', 0, textY);
      ctx.restore();
    }
  });
}


// ──────────────────────────────────────────
// DRAW — ILLUSIONS (Doppleganger)
// ──────────────────────────────────────────