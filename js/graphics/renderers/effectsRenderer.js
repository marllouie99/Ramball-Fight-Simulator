import { drawFlamesToCanvas, clearFlameCanvas } from '../canvasManager.js';
import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { drawBlackHoleVisual } from './projectileRenderer.js';
import { drawShurikenProjectile } from '../weaponVisuals.js';
import { projectileSystem } from '../../systems/projectileSystem.js';

export function drawBlackHoleEffects() {
  const ctx = state.ctx;
  const projectiles = getProjectiles();
  const now = Date.now();

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
  const texts = state.floatingTexts;
  if (!texts || texts.length === 0) return;

  const activeTexts = [];
  const { ctx } = state;
  if (!ctx) return;

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    t.timer++;
    t.y += t.vy;
    t.vy *= 0.96; // gradually decelerate upward drift

    const progress = t.timer / t.maxTimer;
    let alpha;
    if (progress < 0.15) {
      alpha = progress / 0.15;
    } else if (progress > 0.65) {
      alpha = 1 - (progress - 0.65) / 0.35;
    } else {
      alpha = 1;
    }

    if (t.timer < t.maxTimer) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = t.isDamage ? 'bold 18px "Architects Daughter"' : 'normal 16px "Glast Blitch"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.strokeText(t.text, t.x, t.y);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(t.text, t.x + 1, t.y + 1); // Subtle drop shadow

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();

      activeTexts.push(t);
    }
  }

  state.floatingTexts = activeTexts;
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
// DRAW — ILLUSIONS (Doppleganger)
// ──────────────────────────────────────────