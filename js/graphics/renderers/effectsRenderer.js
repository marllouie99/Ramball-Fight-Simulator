import { drawFlamesToCanvas, clearFlameCanvas } from '../canvasManager.js';
import { state, getProjectiles, triggerGlobalScreenShake } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { drawBlackHoleVisual } from './projectileRenderer.js';
import { drawShurikenProjectile } from '../weaponVisuals.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { fastCleanArray } from '../particles/visualTrailSystem.js';
import { applyCameraToCtx } from '../../systems/cameraSystem.js';

export {
  drawGenosSpeedLines,
  drawSaitamaSpeedLines,
  drawMahoragaSpeedLines,
  drawNanamiSpeedLines,
  drawIchigoBankaiSpeedLines,
  drawTojiSpeedLines,
} from './speedLinesRenderer.js';

export {
  triggerGenosSelfDestructFlash,
  drawGenosSelfDestructDimScreen,
  isTodoTakadaOverlayActive,
  drawTodoTakadaDimScreen,
  drawTodoTakadaIdolScreenOverlay,
  loadTodoUltimateOverlayImage,
  getTodoUltimateOverlayImage,
  drawTodoUltimateArenaOverlay,
  loadYujiSoulSwapOverlayImage,
  getYujiSoulSwapOverlayImage,
  isYujiSoulSwapOverlayActive,
  drawYujiSoulSwapArenaOverlay,
  drawYujiSoulSwapDimScreen,
} from './specialOverlayRenderer.js';

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

const FONT_CRIT = '900 18px "Silkscreen", "Press Start 2P", monospace';
const FONT_DEFAULT = '700 15px "Silkscreen", "Press Start 2P", monospace';

export function drawFloatingTexts() {
  const { floatingTextCtx: ctx, floatingTextCanvas: canvas } = state;
  if (!ctx || !canvas) return;

  const texts = state.floatingTexts;
  if (!texts || texts.length === 0) {
    if (state._floatingTextCanvasDirty) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      state._floatingTextCanvasDirty = false;
      if (state.floatingTextSprite && state.floatingTextSprite.texture) {
        state.floatingTextSprite.visible = false;
        state.floatingTextSprite.texture.update();
      }
    }
    return;
  }

  state._floatingTextCanvasDirty = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyCameraToCtx(ctx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  let currentFont = '';

  fastCleanArray(texts, (t) => {
    t.timer++;

    // Kinematic motion & gravity
    t.x += t.vx || 0;
    t.y += t.vy;
    if (t.gravity) t.vy += t.gravity;
    if (t.dragX) t.vx *= t.dragX;
    else t.vy *= 0.96;

    if (t.timer >= t.maxTimer) {
      return false; // Evict expired text
    }

    const progress = t.timer / t.maxTimer;
    let alpha = 1;
    if (progress > 0.65) {
      alpha = Math.max(0, 1 - (progress - 0.65) / 0.35);
    }
    ctx.globalAlpha = alpha;

    // Scale punch pop * baseScale for heavy hits
    let scale = t.baseScale || 1.0;
    if (t.popFrames && t.timer < t.popFrames) {
      const popRatio = (t.popFrames - t.timer) / t.popFrames;
      scale *= (1.0 + (t.popAmount || 0.35) * Math.sin(popRatio * Math.PI * 0.5));
    }

    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.rotation) {
      ctx.rotate(t.rotation);
    }
    if (scale !== 1.0) {
      ctx.scale(scale, scale);
    }

    // Static Font Switch — cached font string, zero dynamic string interpolation
    const isCrit = Boolean(t.isCrit || /^CRIT/i.test(t.text));
    const fontToUse = isCrit ? FONT_CRIT : FONT_DEFAULT;
    if (currentFont !== fontToUse) {
      ctx.font = fontToUse;
      currentFont = fontToUse;
    }

    // Single crisp solid black outline (Rule 11 compliant, no CPU blur, no multi-pass)
    ctx.lineWidth = isCrit ? 3.6 : 2.8;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(t.text, 0, 0);

    // Single vibrant fill
    ctx.fillStyle = t.color || (isCrit ? '#FF3B30' : '#FFFFFF');
    ctx.fillText(t.text, 0, 0);

    ctx.restore();
    return true; // Keep active
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
      const maxCharge = fighter.domainChargeMax || 120;
      const progress = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.domainChargeTimer || 0) / Math.max(1, maxCharge))));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(217, 70, 239, ${progress})`, progress, `rgba(168, 85, 247, ${progress * 0.6})`);
    } else if (isGojo && fighter.isChannelingDomainExpansion && (fighter.timeStopTimer || 0) <= 0) {
      const progress = Math.min(1.0, fighter.domainChargeTimer / Math.max(1, fighter.domainChargeMax || 120));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(0, 229, 255, ${progress})`, progress);
    } else if (isSukuna && fighter.isChannelingDomainExpansion && !fighter.domainActive && (fighter.timeStopTimer || 0) <= 0) {
      const maxTime = CONFIG.sukuna?.domainChargeMax || 120;
      const progress = Math.min(1.0, Math.max(0, (fighter.domainChargeTimer || 0) / maxTime));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(220, 20, 60, ${progress})`, progress);
    } else if (isYuta && fighter.isChannelingDomain) {
      const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 50));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(255, 255, 255, ${progress})`, progress, `rgba(255, 20, 147, ${progress * 0.4})`);
    } else if (fighter.isChannelingDomainExpansion || fighter.isChannelingDomain) {
      const progress = Math.min(1.0, (fighter.domainChargeTimer || 0) / Math.max(1, fighter.domainChargeMax || 120));
      renderChannelingText(fighter, 'DOMAIN EXPANSION', `rgba(255, 215, 0, ${progress})`, progress);
    }
  });
}
