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

    // Enhanced Limitless (Infinity) Spatial Distortion Barrier
    if (fighter.infinityActive || fighter.infinityCooldown <= 0) {
      const time = Date.now();
      ctx.save();
      
      // 1. Outer Spatial Refraction Aura
      const infinityR = fighter.r + 14 + Math.sin(time * 0.004) * 3;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#00FFFF';

      const auraGrad = ctx.createRadialGradient(0, 0, fighter.r * 0.5, 0, 0, infinityR);
      auraGrad.addColorStop(0, 'rgba(224, 255, 255, 0.05)');
      auraGrad.addColorStop(0.6, 'rgba(180, 245, 255, 0.20)');
      auraGrad.addColorStop(1, 'rgba(0, 230, 255, 0.40)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, infinityR, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Refraction Rings (Infinite division of space)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(224, 255, 255, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, infinityR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 220, 255, 0.40)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, infinityR * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Active Infinity Block Shield Flash & Spatial Ripple
    if (fighter.infinityBlockTimer > 0) {
      const blockProg = 1 - (fighter.infinityBlockTimer / (fighter.infinityBlockMaxTimer || 25));
      const alpha = Math.sin((1 - blockProg) * Math.PI);
      const rippleR = (fighter.r + 10) + blockProg * 35;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#E0FFFF';

      // Spatial Flash Shield
      ctx.beginPath();
      ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4.5 * (1 - blockProg);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, rippleR * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2.5 * (1 - blockProg);
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
