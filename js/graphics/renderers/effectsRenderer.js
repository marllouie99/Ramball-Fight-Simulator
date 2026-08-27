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

  const isDark = (state.arenaTheme === 'dark');

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

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
      
      const isTactical = (state.gameCategory === 'tactical' || (state.mode && String(state.mode).toLowerCase().includes('tactical')));

      // Arcade font in Dark Mode; clean modern font for Tactical; stylized comic/brush fonts for FOC Light
      let targetFont;
      if (isDark) {
        targetFont = t.isDamage ? '700 16px "Silkscreen", "Press Start 2P", monospace' : '700 12px "Silkscreen", "Press Start 2P", monospace';
      } else if (isTactical) {
        targetFont = t.isDamage ? '900 18px "Outfit", "Segoe UI", sans-serif' : '900 13.5px "Rajdhani", "Outfit", "Segoe UI", sans-serif';
      } else {
        targetFont = t.isDamage ? 'bold 20px "Architects Daughter"' : 'bold 18px "Glast Blitch"';
      }

      if (currentFont !== targetFont) {
        ctx.font = targetFont;
        currentFont = targetFont;
      }

      // Glow effect for green healing numbers (Rule #11 compliant)
      const isGreenHeal = t.text.startsWith('+') && (t.color === '#39FF14' || t.color === '#00FF66' || t.color === '#22c55e');
      if (isGreenHeal) {
        ctx.save();
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.35)'; // Semi-transparent electric green outer glow
        ctx.lineWidth = 8.5;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; // White inner core glow
        ctx.lineWidth = 5.5;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.restore();
      }

      if (isDark) {
        // In Dark Mode: Thin crisp white outer stroke
        ctx.lineWidth = isTactical ? (t.isDamage ? 3.0 : 2.5) : (t.isDamage ? 4.6 : 4.2);
        ctx.strokeStyle = isTactical ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.92)';
        ctx.strokeText(t.text, t.x, t.y);

        if (!isTactical) {
          ctx.lineWidth = t.isDamage ? 2.6 : 2.4;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
          ctx.strokeText(t.text, t.x, t.y);
        }
      } else {
        // In Light Mode: Classic bold black outline
        ctx.lineWidth = isTactical ? 2.6 : (t.isDamage ? 3.2 : 3.0);
        ctx.strokeStyle = 'rgba(0,0,0,0.92)';
        ctx.strokeText(t.text, t.x, t.y);
      }

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

// ──────────────────────────────────────────
// DRAW — MANGA ACTION SPEED LINES CLUSTER (Saitama Consecutive Normal Punches)
// ──────────────────────────────────────────
let _saitamaSpeedLineSeeds = null;

function _initSaitamaSpeedLineSeeds() {
  _saitamaSpeedLineSeeds = [];
  const totalLines = 24;

  for (let i = 0; i < totalLines; i++) {
    const norm = (i / (totalLines - 1)) * 2 - 1; // -1.0 to +1.0
    // Compact perpendicular distribution matching Saitama's body size (~70px total width)
    const perpOffset = norm * 36 + (Math.random() - 0.5) * 6;
    
    // Manga speed line length (center ~100px, edges ~40px)
    const normDist = 1 - Math.abs(norm);
    const len = 40 + normDist * 60 + Math.random() * 15;
    
    // Sharp needle thickness (1.0px to 2.3px max)
    const maxThick = 1.0 + normDist * 1.3 + Math.random() * 0.4;

    // Movement speed along direction
    const speed = 16 + Math.random() * 10;
    const phase = Math.random() * 120;

    // 4-slot character theme palette (Rule #16)
    let color;
    if (i % 4 === 0) color = 'rgba(245, 196, 0, 0.95)';       // Saitama Bright Yellow
    else if (i % 4 === 1) color = 'rgba(255, 235, 148, 0.95)'; // Hero Suit Cream Gold
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White-hot core
    else color = 'rgba(200, 0, 0, 0.90)';                     // Crimson Glove Accent

    _saitamaSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawSaitamaSpeedLines() {
  if (!state.fighters) return;
  const saitamaFighter = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'saitama' && f.type !== 'saitama')) return false;
    // Hide speed lines when frozen, time-stopped, hit-stunned, or ambushed
    const isFrozen = (f.timeStopTimer > 0) || (f.hitStunTimer > 0) || f.isTargetOfAmbush ||
                     (f.electricStunTimer > 0) || (f.dubstepStunTimer > 0) || (f.isFrozenByInfinity);
    if (isFrozen) return false;
    return f.isFlurrying;
  });
  if (!saitamaFighter) return;

  const ctx = state.ctx;
  if (!ctx) return;

  const activeState = saitamaFighter.isFlurrying ? 'flurry' : false;
  if (!activeState) return;

  if (saitamaFighter._lastSpeedLineState !== activeState) {
    _saitamaSpeedLineSeeds = null;
  }
  saitamaFighter._lastSpeedLineState = activeState;

  if (!_saitamaSpeedLineSeeds) _initSaitamaSpeedLineSeeds();

  const lineAngle = saitamaFighter.gunAngle !== undefined ? saitamaFighter.gunAngle : (saitamaFighter.angle || 0);

  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = saitamaFighter.x;
  const cy = saitamaFighter.y;
  const now = Date.now();

  ctx.save();

  for (let i = 0; i < _saitamaSpeedLineSeeds.length; i++) {
    const seed = _saitamaSpeedLineSeeds[i];
    // Travel in the BACKWARD direction (opposite to punch aim) — lines stream behind Saitama
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100);
    
    // Cluster centered slightly BEHIND Saitama (opposite punch direction)
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
  const isDark = (state.arenaTheme === 'dark');

  const renderChannelingText = (fighter, text, baseColor, progress, outerGlowColor = null) => {
    ctx.save();
    ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
    ctx.font = 'bold 21px "Glast Blitch", Arial';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    const textY = -fighter.r - 42 - (Math.sin(now / 150) * 4);

    if (outerGlowColor) {
      ctx.strokeStyle = outerGlowColor;
      ctx.lineWidth = 6;
      ctx.strokeText(text, 0, textY);
    }

    if (isDark) {
      ctx.lineWidth = 4.8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.90})`;
      ctx.strokeText(text, 0, textY);

      ctx.lineWidth = 2.8;
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress * 0.95})`;
      ctx.strokeText(text, 0, textY);
    } else {
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = `rgba(0, 0, 0, ${progress * 0.90})`;
      ctx.strokeText(text, 0, textY);
    }

    ctx.fillStyle = baseColor;
    ctx.fillText(text, 0, textY);
    ctx.restore();
  };

  fighters.forEach(fighter => {
    if (!fighter || fighter.hp <= 0) return;

    const isToji = fighter.characterId === 'toji' || fighter.type === 'toji' || fighter._def?.id === 'toji';
    const isGojo = fighter.characterId === 'gojo' || fighter.type === 'gojo' || fighter._def?.id === 'gojo';
    const isSukuna = fighter.characterId === 'sukuna' || fighter.type === 'sukuna' || fighter._def?.id === 'sukuna';
    const isYuta = fighter.characterId === 'yuta' || fighter.type === 'yuta' || fighter._def?.id === 'yuta';
    const isMahito = fighter.characterId === 'mahito' || fighter.type === 'mahito' || fighter._def?.id === 'mahito';

    if (isToji) {
      if ((fighter.ultimatePhase === 'CHANNELING' || (fighter.isChannelingDomain && !fighter.ultimateActive)) && (fighter.timeStopTimer || 0) <= 0) {
        const progress = Math.min(1.0, (fighter.ultimateChargeTimer || 0) / Math.max(1, fighter.ultimateChargeMax || 90));
        renderChannelingText(fighter, 'CURSE INVENTORY', `rgba(160, 64, 255, ${progress})`, progress);
      }
    } else if (isMahito && fighter.isChannelingDomainExpansion && (fighter.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 120));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(217, 70, 239, ${progress})`, progress);
    } else if (isGojo && fighter.isChannelingDomainExpansion && (fighter.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, fighter.domainChargeTimer / Math.max(1, fighter.domainChargeMax || 120));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(0, 229, 255, ${progress})`, progress);
    } else if (isSukuna && fighter.isChannelingDomainExpansion && !fighter.domainActive && (fighter.timeStopTimer || 0) <= 0) {
      const maxTime = CONFIG.sukuna?.domainChargeMax || 120;
      const progress = Math.min(1.0, Math.max(0, (fighter.domainChargeTimer || 0) / maxTime));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(220, 20, 60, ${progress})`, progress);
    } else if (isYuta && fighter.isChannelingDomain) {
      const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 180));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(255, 255, 255, ${progress})`, progress, `rgba(255, 20, 147, ${progress * 0.4})`);
    } else if (fighter.isChannelingDomainExpansion || fighter.isChannelingDomain) {
      const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 120));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(255, 215, 0, ${progress})`, progress);
    }
  });
}


// ──────────────────────────────────────────
// DRAW — ILLUSIONS (Doppleganger)
// ──────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// GENOS SELF-DESTRUCT: Screen Dim + Cyan Electric Starburst Explosion
// ─────────────────────────────────────────────────────────────────────

// Pre-seeded static needle arrays so no per-frame GC allocations (Rule 12)
const _SD_LONG_SEEDS = Array.from({ length: 18 }, () => ({
  angle: Math.random() * Math.PI * 2,
  len: 80 + Math.random() * 140,
  thick: 1.2 + Math.random() * 2.0,
  speed: 0.4 + Math.random() * 0.9,
  phase: Math.random() * Math.PI * 2,
  color: Math.floor(Math.random() * 3), // 0=cyan, 1=white, 2=light-blue
}));
const _SD_SHORT_SEEDS = Array.from({ length: 26 }, () => ({
  angle: Math.random() * Math.PI * 2,
  len: 20 + Math.random() * 60,
  thick: 0.8 + Math.random() * 1.4,
  speed: 0.7 + Math.random() * 1.2,
  phase: Math.random() * Math.PI * 2,
  tilt: (Math.random() - 0.5) * 0.55, // slight scatter angle off main ray
  color: Math.floor(Math.random() * 4),
}));

// Transient explosion flash state (short-burst 2D Canvas, Rule 10)
let _genosSdFlashTimer = 0;
let _genosSdFlashX = 0;
let _genosSdFlashY = 0;

export function triggerGenosSelfDestructFlash(x, y) {
  _genosSdFlashTimer = 55; // ~0.9s burst on Canvas 2D
  _genosSdFlashX = x;
  _genosSdFlashY = y;
}

export function drawGenosSelfDestructDimScreen() {
  const ctx = state.ctx;
  if (!ctx || !state.fighters) return;

  const now = Date.now();

  // ── 1. Find Genos fighter ──
  const genos = state.fighters.find(f =>
    f && (f.characterId === 'genos' || f.type === 'genos' || (f._def && f._def.id === 'genos'))
  );

  // ── 2. Smooth screen dim while charging self-destruct (Pitch Dark Screen) ──
  if (genos && genos.isSelfDestructing && genos.selfDestructTimer !== undefined) {
    const maxT = CONFIG.genos?.selfDestructCountdownFrames || 150;
    const elapsed = maxT - Math.max(0, genos.selfDestructTimer);
    // Smoothly fade in to 0.92 pitch dark alpha over first 50 frames
    const chargeP = Math.min(1.0, elapsed / 50);
    const dimAlpha = chargeP * 0.92;

    if (dimAlpha > 0.01) {
      const shakeX = state.shakeX || 0;
      const shakeY = state.shakeY || 0;
      const drawX = genos.x + shakeX;
      const drawY = genos.y + shakeY;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Pitch-black screen dim overlay (Rule 14)
      ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Bright Electric Cyan radial charging bloom centered on Genos
      const glowGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, 160);
      glowGrad.addColorStop(0, `rgba(0, 255, 255, ${(chargeP * 0.90).toFixed(3)})`);
      glowGrad.addColorStop(0.35, `rgba(0, 229, 255, ${(chargeP * 0.60).toFixed(3)})`);
      glowGrad.addColorStop(0.70, `rgba(0, 180, 255, ${(chargeP * 0.25).toFixed(3)})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ── 3. Tick down flash timer ──
  if (_genosSdFlashTimer > 0) _genosSdFlashTimer--;

  // ── 4. If no active flash, done ──
  if (_genosSdFlashTimer <= 0) return;

  const fx = _genosSdFlashX;
  const fy = _genosSdFlashY;
  const life = _genosSdFlashTimer / 55; // 1.0 → 0.0

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Maintain pitch dark backdrop during explosion starburst flash
  ctx.fillStyle = `rgba(0, 0, 0, ${(life * 0.85).toFixed(3)})`;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // ── 4a. Initial Electric Cyan Core Bloom ──
  const coreAlpha = Math.min(1.0, life * 2.2);
  const coreR = 26 * (1.15 - life * 0.35);
  const coreGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, coreR * 4.5);
  coreGrad.addColorStop(0, `rgba(224, 255, 255, ${(coreAlpha * 1.0).toFixed(3)})`);
  coreGrad.addColorStop(0.18, `rgba(0, 255, 255, ${(coreAlpha * 0.98).toFixed(3)})`);
  coreGrad.addColorStop(0.48, `rgba(0, 229, 255, ${(coreAlpha * 0.75).toFixed(3)})`);
  coreGrad.addColorStop(0.78, `rgba(0, 160, 255, ${(coreAlpha * 0.35).toFixed(3)})`);
  coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(fx, fy, coreR * 4.5, 0, Math.PI * 2);
  ctx.fill();

  // ── 4b. Long razor beam needles — sharp radiating streaks ──
  for (let i = 0; i < _SD_LONG_SEEDS.length; i++) {
    const s = _SD_LONG_SEEDS[i];
    // Needle expands outward quickly, fades as life drops
    const expand = 1 + (1 - life) * 2.8;
    const rayLen = s.len * expand * life;
    const flicker = 0.7 + Math.sin(now * 0.012 * s.speed + s.phase) * 0.3;
    const alpha = life * flicker * 0.95;
    if (alpha < 0.03) continue;

    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);
    const perpX = -sinA;
    const perpY = cosA;
    const halfT = (s.thick * life * 0.9) / 2;
    const midOff = rayLen * 0.12; // bulge toward tip

    const sx = fx;
    const sy = fy;
    const ex = fx + cosA * rayLen;
    const ey = fy + sinA * rayLen;
    const mx = fx + cosA * midOff;
    const my = fy + sinA * midOff;

    let color;
    if (s.color === 0) color = `rgba(0, 229, 255, ${alpha.toFixed(3)})`;
    else if (s.color === 1) color = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    else color = `rgba(100, 220, 255, ${alpha.toFixed(3)})`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(mx + perpX * halfT, my + perpY * halfT);
    ctx.lineTo(ex, ey);
    ctx.lineTo(mx - perpX * halfT, my - perpY * halfT);
    ctx.closePath();
    ctx.fill();
  }

  // ── 4c. Short scattered fragment needles — chaotic flying debris sparks ──
  for (let i = 0; i < _SD_SHORT_SEEDS.length; i++) {
    const s = _SD_SHORT_SEEDS[i];
    const scatter = s.angle + s.tilt + (1 - life) * s.tilt * 2.5;
    const expand = 1 + (1 - life) * 3.5;
    const rayLen = s.len * expand * life;
    const flicker = 0.55 + Math.sin(now * 0.018 * s.speed + s.phase) * 0.45;
    const alpha = life * flicker * 0.88;
    if (alpha < 0.03) continue;

    const cosA = Math.cos(scatter);
    const sinA = Math.sin(scatter);
    const perpX = -sinA;
    const perpY = cosA;
    const halfT = (s.thick * life * 0.75) / 2;
    const midOff = rayLen * 0.10;

    const sx = fx;
    const sy = fy;
    const ex = fx + cosA * rayLen;
    const ey = fy + sinA * rayLen;
    const mx = fx + cosA * midOff;
    const my = fy + sinA * midOff;

    let color;
    if (s.color === 0) color = `rgba(0, 255, 240, ${alpha.toFixed(3)})`;
    else if (s.color === 1) color = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    else if (s.color === 2) color = `rgba(60, 200, 255, ${alpha.toFixed(3)})`;
    else color = `rgba(200, 245, 255, ${alpha.toFixed(3)})`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(mx + perpX * halfT, my + perpY * halfT);
    ctx.lineTo(ex, ey);
    ctx.lineTo(mx - perpX * halfT, my - perpY * halfT);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

let _mahoragaSpeedLineSeeds = null;

function _initMahoragaSpeedLineSeeds() {
  _mahoragaSpeedLineSeeds = [];
  const totalLines = 25;

  for (let i = 0; i < totalLines; i++) {
    const norm = (i / (totalLines - 1)) * 2 - 1; // -1.0 to +1.0
    // Perpendicular offset matching Mahoraga body size (~35px radius)
    const perpOffset = norm * 45 + (Math.random() - 0.5) * 8;
    
    // Parabolic length distribution (center longest ~100px, edges ~40px)
    const normDist = 1 - Math.abs(norm);
    const len = 40 + normDist * 60 + Math.random() * 20;
    
    // Sharp needle thickness (1.2px to 2.5px max)
    const maxThick = 1.0 + normDist * 1.5 + Math.random() * 0.4;

    const speed = 16 + Math.random() * 12;
    const phase = Math.random() * 120;

    // 4-slot theme palette: [Golden-Yellow, Light Silver, White Core, Dark Ink Line]
    let color;
    if (i % 4 === 0) color = 'rgba(255, 215, 0, 0.95)';       // Mahoraga Gold Theme
    else if (i % 4 === 1) color = 'rgba(212, 175, 55, 0.85)';  // Golden metallic
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White core
    else color = 'rgba(15, 15, 22, 0.92)';                    // Crisp black ink line

    _mahoragaSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawMahoragaSpeedLines() {
  if (!state.fighters) return;
  const mahoraga = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'mahoraga' && f.type !== 'mahoraga')) return false;
    // Hide speed lines when frozen, time-stopped, hit-stunned, or ambushed
    const isFrozen = (f.timeStopTimer > 0) || (f.hitStunTimer > 0) || f.isTargetOfAmbush ||
                     (f.electricStunTimer > 0) || (f.dubstepStunTimer > 0) || (f.isFrozenByInfinity);
    if (isFrozen) return false;
    // Draw speed lines during: Wall Slam Dash, Strike, AND the Wall Slam Execution Blitz Flurry only
    const isDashOrStrike = f.isWallSlamActive && (f.wallSlamPhase === 'dash' || f.wallSlamPhase === 'strike');
    return isDashOrStrike || (f.isBlitzActive && f.isWallSlamBlitz);
  });
  if (!mahoraga) return;

  const ctx = state.ctx;
  if (!ctx) return;

  if (!_mahoragaSpeedLineSeeds) _initMahoragaSpeedLineSeeds();

  // Direction: points towards the target
  const lineAngle = mahoraga.gunAngle !== undefined ? mahoraga.gunAngle : (mahoraga.angle || 0);

  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = mahoraga.x;
  const cy = mahoraga.y;
  const now = Date.now();

  ctx.save();

  for (let i = 0; i < _mahoragaSpeedLineSeeds.length; i++) {
    const seed = _mahoragaSpeedLineSeeds[i];
    // Stream behind Mahoraga
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100);
    const backOffset = mahoraga.r * 1.2;
    const lineCenterX = cx - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = cy - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.len / 2;
    const halfThick = seed.maxThick / 2;
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


function _drawIdolHeartPath(ctx, x, y, size) {
  ctx.beginPath();
  const topH = size * 0.3;
  ctx.moveTo(x, y + topH);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topH);
  ctx.bezierCurveTo(x - size / 2, y + (size + topH) / 2, x, y + size * 0.9, x, y + size);
  ctx.bezierCurveTo(x, y + size * 0.9, x + size / 2, y + (size + topH) / 2, x + size / 2, y + topH);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topH);
  ctx.closePath();
  ctx.fill();
}

function _drawBatchedIdolSparkles(ctx, sparkles, screenW, screenH, now, baseAlpha) {
  ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha * 0.90})`;
  ctx.beginPath();
  for (let i = 0; i < sparkles.length; i++) {
    const sp = sparkles[i];
    const sx = sp.relX * screenW + Math.sin(now * 0.001 * sp.speed + sp.phase) * 15;
    const sy = sp.relY * screenH + Math.cos(now * 0.001 * sp.speed + sp.phase) * 15;
    ctx.moveTo(sx + sp.size, sy);
    ctx.arc(sx, sy, sp.size, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 240, 250, ${baseAlpha * 0.75})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < sparkles.length; i++) {
    const sp = sparkles[i];
    const sx = sp.relX * screenW + Math.sin(now * 0.001 * sp.speed + sp.phase) * 15;
    const sy = sp.relY * screenH + Math.cos(now * 0.001 * sp.speed + sp.phase) * 15;
    const arm = sp.size * 2.2;
    ctx.moveTo(sx - arm, sy); ctx.lineTo(sx + arm, sy);
    ctx.moveTo(sx, sy - arm); ctx.lineTo(sx, sy + arm);
  }
  ctx.stroke();
}

let _todoIdolOverlayAlpha = 0;
let _todoHeartSeeds = null;
let _todoSparkleSeeds = null;
let _cachedOverlayGrad = null;
let _cachedGradW = 0;
let _cachedGradH = 0;

function _initTodoIdolSeeds() {
  _todoHeartSeeds = [];
  for (let i = 0; i < 10; i++) {
    _todoHeartSeeds.push({
      relX: (i + 0.5) / 10 + (Math.random() - 0.5) * 0.08,
      speed: 0.7 + Math.random() * 0.4,
      size: 11 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
      color: i % 3 === 0 ? '#e62e5c' : (i % 3 === 1 ? '#ff5599' : '#ff77bc'),
      yOffset: Math.random() * 600
    });
  }

  _todoSparkleSeeds = [];
  for (let i = 0; i < 14; i++) {
    _todoSparkleSeeds.push({
      relX: Math.random(),
      relY: Math.random(),
      speed: 0.5 + Math.random() * 0.5,
      size: 1.5 + Math.random() * 2.0,
      phase: Math.random() * Math.PI * 2
    });
  }
}

export function isTodoTakadaOverlayActive() {
  return _todoIdolOverlayAlpha > 0.01;
}

export function drawTodoTakadaIdolScreenOverlay() {
  if (!state || !state.fighters || !state.ctx || !state.canvas) return;

  // Single pass fighter search
  let todoFighter = null;
  let yutaFighter = null;
  let isMahitoDomainActive = false;
  let isSaitamaSeriousPunchActive = false;
  const fighters = state.fighters;
  for (let i = 0; i < fighters.length; i++) {
    const f = fighters[i];
    if (!f || f.hp <= 0) continue;
    const charId = f.characterId || f.type || f._def?.type || f._def?.id;
    if (charId === 'todo' && (f.isTakadaChanneling || f.isTakadaUltActive)) {
      todoFighter = f;
    } else if (charId === 'yuta' && f.rika) {
      yutaFighter = f;
    } else if (charId === 'mahito' && f.domainActive) {
      isMahitoDomainActive = true;
    } else if (charId === 'saitama' && (
      (f._counterPunchTimer && f._counterPunchTimer > 0) ||
      (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) ||
      f.isChargingSeriousPunch ||
      f.isCountering
    )) {
      isSaitamaSeriousPunchActive = true;
    }
  }

  const targetAlpha = todoFighter ? 1.0 : 0.0;
  if (targetAlpha > _todoIdolOverlayAlpha) {
    _todoIdolOverlayAlpha = Math.min(1.0, _todoIdolOverlayAlpha + 0.05);
  } else if (targetAlpha < _todoIdolOverlayAlpha) {
    _todoIdolOverlayAlpha = Math.max(0.0, _todoIdolOverlayAlpha - 0.025);
  }

  if (_todoIdolOverlayAlpha <= 0.001) return;

  const ctx = state.ctx;
  const canvas = state.canvas;
  const screenW = canvas.width;
  const screenH = canvas.height;
  const now = Date.now();
  const isLowPerf = (state.performanceMode || (state.fps && state.fps < 50));

  if (!_todoHeartSeeds) _initTodoIdolSeeds();

  ctx.save();
  ctx.globalAlpha = _todoIdolOverlayAlpha;

  // 1. Cached Full-Screen Radial Background Gradient (Suppressed when Mahito's domain OR Saitama's Serious  // 2. Batched Full-Screen Shimmering White Sparks (Always render)
  const sparkleCount = isLowPerf ? 7 : _todoSparkleSeeds.length;
  _drawBatchedIdolSparkles(ctx, _todoSparkleSeeds.slice(0, sparkleCount), screenW, screenH, now, _todoIdolOverlayAlpha);

  // 3. Floating Pink & Red Hearts (Always render, drifting upward)
  const heartCount = isLowPerf ? 5 : _todoHeartSeeds.length;
  for (let i = 0; i < heartCount; i++) {
    const h = _todoHeartSeeds[i];
    const hx = h.relX * screenW + Math.sin(now * 0.0015 * h.speed + h.phase) * 25;
    const rawY = screenH - ((now * 0.035 * h.speed + h.yOffset) % (screenH + 60));
    const hy = rawY;
    const heartAlpha = Math.min(1.0, Math.sin((rawY / screenH) * Math.PI)) * _todoIdolOverlayAlpha * 0.85;

    ctx.fillStyle = h.color;
    ctx.globalAlpha = heartAlpha;
    _drawIdolHeartPath(ctx, hx, hy, h.size);
  }
  ctx.globalAlpha = _todoIdolOverlayAlpha;

  // 4. Radial cutout around Rika and Pure Love Beam Corridor
  if (!isMahitoDomainActive && yutaFighter && yutaFighter.rika) {
    const rk = yutaFighter.rika;
    const isRikaActive = rk.active || 
      (yutaFighter.rikaEmergingForBeamTimer && yutaFighter.rikaEmergingForBeamTimer > 0) || 
      yutaFighter.isChannelingPureLoveBeam || 
      yutaFighter.isFiringPureLoveBeam || 
      (yutaFighter.rikaAlpha !== undefined && yutaFighter.rikaAlpha > 0);

    if (isRikaActive) {
      const rkX = rk.x;
      const rkY = rk.y;
      const cutoutRadius = (rk.radius || rk.r || 65) + 110;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const cutoutGrad = ctx.createRadialGradient(rkX, rkY, 20, rkX, rkY, cutoutRadius);
      cutoutGrad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
      cutoutGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.8)');
      cutoutGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = cutoutGrad;
      ctx.beginPath();
      ctx.arc(rkX, rkY, cutoutRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (yutaFighter.isFiringPureLoveBeam) {
      const beamAngle = yutaFighter.pureLoveBeamLockedAngle !== undefined ? yutaFighter.pureLoveBeamLockedAngle : (yutaFighter.gunAngle || 0);
      const beamOffset = (yutaFighter.r || 22) + 14;
      const startX = yutaFighter.x + Math.cos(beamAngle) * beamOffset;
      const startY = yutaFighter.y + Math.sin(beamAngle) * beamOffset;
      const beamLen = 2500;
      const beamWidth = 220;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(startX, startY);
      ctx.rotate(beamAngle);

      const beamGrad = ctx.createLinearGradient(0, -beamWidth / 2, 0, beamWidth / 2);
      beamGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
      beamGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.9)');
      beamGrad.addColorStop(0.5, 'rgba(0, 0, 0, 1.0)');
      beamGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.9)');
      beamGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, -beamWidth / 2, beamLen, beamWidth);
      ctx.restore();
    }
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// Kento Nanami — Manga Action Speed Lines (Rule 16 Compliant)
// ─────────────────────────────────────────────
let _nanamiSpeedLineSeeds = null;

function _initNanamiSpeedLineSeeds() {
  _nanamiSpeedLineSeeds = [];
  const count = 24;
  const clusterWidth = 40; // ±(r * 1.4) around body
  for (let i = 0; i < count; i++) {
    const norm = (i / (count - 1)) * 2 - 1; // -1 to +1
    const perpOffset = norm * clusterWidth;
    const normDist = 1 - Math.abs(norm); // Parabolic length: center lines longest
    const len = 40 + normDist * 55;
    const maxThick = 1.0 + Math.random() * 1.4; // 1.0px - 2.4px
    const speed = 1.2 + Math.random() * 0.8;
    const phase = Math.random() * 100;

    // 4-slot theme: [Radiant Gold, Amber Gold, White Core, Deep Antique Gold]
    let color;
    if (i % 4 === 0) color = '#FFD700'; // Radiant Gold
    else if (i % 4 === 1) color = '#FBBF24'; // Amber Gold
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White Core
    else color = '#D4AF37'; // Deep Antique Gold

    _nanamiSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawNanamiSpeedLines() {
  if (!state.fighters) return;
  const nanami = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'nanami' && f.type !== 'nanami')) return false;
    const isFrozen = (f.timeStopTimer > 0) || (f.hitStunTimer > 0) || f.isTargetOfAmbush || (f.isFrozenByInfinity);
    if (isFrozen) return false;
    return f.isBlitzing || f.isLunging;
  });
  if (!nanami) return;

  const ctx = state.ctx;
  if (!ctx) return;

  const activeState = nanami.isBlitzing ? 'blitz' : (nanami.isLunging ? 'lunge' : false);
  if (!activeState) return;

  if (nanami._lastSpeedLineState !== activeState) {
    _nanamiSpeedLineSeeds = null;
  }
  nanami._lastSpeedLineState = activeState;

  if (!_nanamiSpeedLineSeeds) _initNanamiSpeedLineSeeds();

  const lineAngle = nanami.gunAngle !== undefined ? nanami.gunAngle : (nanami.angle || 0);
  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = nanami.x;
  const cy = nanami.y;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();

  for (let i = 0; i < _nanamiSpeedLineSeeds.length; i++) {
    const seed = _nanamiSpeedLineSeeds[i];
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 85);
    const backOffset = (nanami.r || 25) * 1.2;
    const lineCenterX = cx - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = cy - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.len / 2;
    const halfThick = seed.maxThick / 2;
    const midOff = halfLen * 0.15;

    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;

    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;

    const endX = lineCenterX + cosA * halfLen;
    const endY = lineCenterY - sinA * halfLen;

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

// ─────────────────────────────────────────────
// Ichigo Kurosaki — Bankai Speed Lines (Disabled per user request)
// ─────────────────────────────────────────────
export function drawIchigoBankaiSpeedLines() {
  // Disabled per user request: no speed lines during Ichigo's Bankai form
  return;
}
