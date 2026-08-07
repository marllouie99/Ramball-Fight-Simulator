import { CONFIG } from '../../core/config.js';

export function drawGojoBody(ctx, fighter) {
    const z = fighter.z || 0;
    
    // Draw high-contrast ground shadow silhouette when levitating in the air
    if (z > 0) {
      const levFactor = Math.min(1.0, z / 35);
      ctx.save();
      ctx.translate(fighter.x, fighter.y);
      ctx.scale(1.0, 0.35); // Perspective ground flattening

      // 1. Soft Ambient Radial Ground Shadow
      const shadowGlow = ctx.createRadialGradient(0, 0, fighter.r * 0.2, 0, 0, fighter.r * 1.6);
      shadowGlow.addColorStop(0, `rgba(0, 0, 0, ${0.7 * levFactor})`);
      shadowGlow.addColorStop(0.5, `rgba(0, 0, 0, ${0.4 * levFactor})`);
      shadowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, fighter.r * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = shadowGlow;
      ctx.fill();

      // 2. High-Contrast Dark Ground Silhouette Core
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r * (1.1 - levFactor * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(10, 10, 15, ${0.8 * levFactor})`;
      ctx.fill();

      ctx.restore();
    }

    ctx.save();
    ctx.translate(fighter.x, fighter.y - z);

    // Avatar is drawn statically facing forward (upright)
    // No rotation so he always faces the player's POV

    // === ENHANCED GOJO LIMITLESS (INFINITY) SPATIAL DISTORTION BARRIER ===
    if (fighter.infinityActive || fighter.infinityCooldown <= 0) {
      const time = Date.now();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const infinityR = CONFIG.gojo?.infinityRadius ?? (fighter.r + 30);
      const pulse = Math.sin(time * 0.005) * 2;
      const barrierRadius = infinityR + pulse;

      // 1. Crisp Spatial Refraction Barrier Ring (No solid filled cyan ball!)
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, barrierRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Inner White Core Barrier Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, barrierRadius - 3, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Rotating Infinity Spatial Distortion Arcs (Infinite division of space)
      const rot1 = time * 0.002;
      ctx.strokeStyle = 'rgba(224, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < 3; a++) {
        const startA = rot1 + a * (Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.arc(0, 0, barrierRadius - 1, startA, startA + Math.PI * 0.4);
        ctx.stroke();
      }

      ctx.restore();
    }

    // === ACTIVE INFINITY BLOCK SHIELD FLASH & RIPPLE ===
    if (fighter.infinityBlockTimer > 0) {
      const blockProg = 1 - (fighter.infinityBlockTimer / (fighter.infinityBlockMaxTimer || 25));
      const alpha = Math.sin((1 - blockProg) * Math.PI);
      const barrierR = CONFIG.gojo?.infinityRadius ?? (fighter.r + 30);
      const rippleR = barrierR + blockProg * 30;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Concentric Expanding Infinity Shockwaves
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4.5 * (1 - blockProg);
      ctx.beginPath();
      ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 3.0 * (1 - blockProg);
      ctx.beginPath();
      ctx.arc(0, 0, rippleR * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Clip to base circle to keep the face/blindfold cleanly inside
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r, 0, Math.PI * 2);
    ctx.clip();

    // --- 1. Base (Skin Color) ---
    ctx.fillStyle = '#FFE0BD';
    ctx.fill();

    // --- 2. White Hair - Covers the top part ---
    ctx.beginPath();
    ctx.rect(-fighter.r, -fighter.r, fighter.r * 2, fighter.r * 0.6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // --- 3. Black Blindfold - positioned between the hair and skin ---
    ctx.beginPath();
    ctx.rect(-fighter.r, -fighter.r * 0.4, fighter.r * 2, fighter.r * 0.6);
    ctx.fillStyle = '#111111';
    ctx.fill();

    ctx.restore(); // Undo clip

    // --- 4. Outline Stroke - Bold border around the body ---
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111111'; // Dark stroke so it's clearly visible
    ctx.stroke();

    // Overlays (stun, poison, etc)
    if (typeof fighter.drawStatusOverlays === 'function') {
        fighter.drawStatusOverlays(ctx, fighter.r);
    }
    
    ctx.restore();
}
