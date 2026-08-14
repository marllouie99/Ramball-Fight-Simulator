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

    // === ANIME CHARACTER ROTATION LOGIC (Matches Yuji & Todo) ===
    // 1. When in countdown, winner screen, floating in air (z > 0), performing Red & Blue mixing (Hollow Purple),
    //    casting Reversal Red, or using Domain Expansion:
    //    Rotation is skipped so Gojo is drawn perfectly upright facing the player's screen!
    // 2. Otherwise during active ground combat, Gojo rotates to face target angle (gunAngle) like Yuji and Todo.
    // 3. When facing left (Math.abs(angle) > Math.PI / 2), scale(1, -1) is applied so hair stays on top and uniform stays on bottom!

    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isWinnerScreen = fighter._isWinnerReveal || isCountdown || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));
    const isFloatingOrChanneling = isWinnerScreen || (z > 0) || fighter.isChannelingPurple || ((fighter.redEffectTimer || 0) > 0) || fighter.isChannelingDomainExpansion;

    if (!isFloatingOrChanneling) {
      const angle = fighter.gunAngle || 0;
      ctx.rotate(angle);

      const facingLeft = Math.abs(angle) > Math.PI / 2;
      if (facingLeft) {
        ctx.scale(1, -1);
      }
    }

    // === ENHANCED GOJO LIMITLESS (INFINITY) SPATIAL DISTORTION BARRIER ===
    const fadeOpacity = (fighter.isTargetOfAmbush) ? 0 : (fighter.infinityFadeOpacity || 0);
    if (fadeOpacity > 0.005) {
      const time = Date.now();
      const infinityR = CONFIG.gojo?.infinityRadius ?? (fighter.r + 30);
      const pulse = Math.sin(time * 0.005) * 2.5;
      
      // Smooth subtle expanding bloom scale during fade-in (0.88 -> 1.0)
      const sizeScale = 0.88 + 0.12 * Math.sin(fadeOpacity * Math.PI * 0.5);
      const barrierRadius = (infinityR + pulse) * sizeScale;

      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1.0) * fadeOpacity;

      // 1. High-Luminosity Base Fill & Glow
      const bubbleGrad = ctx.createRadialGradient(0, 0, fighter.r * 0.5, 0, 0, barrierRadius);
      bubbleGrad.addColorStop(0, 'rgba(0, 229, 255, 0.05)');
      bubbleGrad.addColorStop(0.65, 'rgba(0, 229, 255, 0.22)');
      bubbleGrad.addColorStop(0.90, 'rgba(0, 229, 255, 0.48)');
      bubbleGrad.addColorStop(1.0, 'rgba(224, 255, 255, 0.85)');
      ctx.fillStyle = bubbleGrad;
      ctx.beginPath();
      ctx.arc(0, 0, barrierRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Dual Concentric Bright Electric Cyan & Pure White Glowing Barrier Rings
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Outer Electric Cyan Ring
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, barrierRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner White-Hot Core Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, barrierRadius - 2.5, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Rotating Spatial Distortion Arcs (Infinite Space Energy Streams)
      const rotAngle = time * 0.003;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
      ctx.lineWidth = 2.0;
      for (let i = 0; i < 3; i++) {
        const arcStart = rotAngle + i * ((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.arc(0, 0, barrierRadius - 6, arcStart, arcStart + Math.PI * 0.35);
        ctx.stroke();
      }

      ctx.restore();
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

    const r = fighter.r;

    // --- 1. Base (Skin Color) ---
    ctx.fillStyle = '#FFE0BD';
    ctx.fill();

    // --- 2. JJK High Uniform Torso Base ---
    ctx.fillStyle = '#211A36'; // Official JJK Deep Violet-Navy
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.55);
    ctx.lineTo(-r * 0.45, r * 0.35);
    ctx.lineTo(-r * 0.42, r * 0.22);
    ctx.quadraticCurveTo(0, r * 0.26, r * 0.42, r * 0.22);
    ctx.lineTo(r * 0.45, r * 0.35);
    ctx.lineTo(r, r * 0.55);
    ctx.lineTo(r, r);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fill();

    // --- 3. White Hair (Plain Hairline) ---
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-r, -r);
    ctx.lineTo(r, -r);
    ctx.lineTo(r, -r * 0.42);
    ctx.lineTo(-r, -r * 0.42);
    ctx.closePath();
    ctx.fill();

    // Outline the plain hair bottom border in black
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.42);
    ctx.lineTo(r, -r * 0.42);
    ctx.stroke();

    // Soft blue-gray hair strand shading lines
    ctx.strokeStyle = '#D9E2EC';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.85);
    ctx.quadraticCurveTo(-r * 0.25, -r * 0.65, -r * 0.25, -r * 0.42);
    ctx.moveTo(r * 0.35, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.25, -r * 0.65, r * 0.25, -r * 0.42);
    ctx.stroke();

    // --- 4. Black Blindfold (Anime Sculpted Shape - Scaled Up Top) ---
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    // Top edge curve (extending higher on top)
    ctx.moveTo(-r, -r * 0.42);
    ctx.quadraticCurveTo(0, -r * 0.46, r, -r * 0.42);
    
    // Right side
    ctx.lineTo(r, -r * 0.20);
    
    // Bottom edge: dip over right eye, arch up over nose bridge, dip over left eye, up to left temple
    ctx.quadraticCurveTo(r * 0.5, -r * 0.02, 0, -r * 0.10);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.02, -r, -r * 0.20);
    ctx.closePath();
    ctx.fill();

    // Outer border stroke
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fabric crease & highlight lines following the organic eye contours
    ctx.strokeStyle = '#2D2D30';
    ctx.lineWidth = 1.8;

    // Folds along the eye dips & upper forehead
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.18);
    ctx.quadraticCurveTo(-r * 0.45, -r * 0.08, 0, -r * 0.15);
    ctx.quadraticCurveTo(r * 0.45, -r * 0.08, r * 0.85, -r * 0.18);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.28);
    ctx.quadraticCurveTo(0, -r * 0.31, r * 0.9, -r * 0.28);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.36);
    ctx.quadraticCurveTo(0, -r * 0.39, r * 0.95, -r * 0.36);
    ctx.stroke();

    // --- 5. Gojo High Collar Detail & Central Placket ---
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Collar Rim & Outer Edge Outline
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.55);
    ctx.lineTo(-r * 0.45, r * 0.35);
    ctx.lineTo(-r * 0.42, r * 0.22);
    ctx.quadraticCurveTo(0, r * 0.26, r * 0.42, r * 0.22);
    ctx.lineTo(r * 0.45, r * 0.35);
    ctx.lineTo(r, r * 0.55);
    ctx.stroke();

    // Central Covered Zip/Button Placket (Vertical strip running up the neck/chest)
    ctx.fillStyle = '#141024'; // Deep Violet-Black Placket Fill
    ctx.beginPath();
    ctx.rect(-r * 0.08, r * 0.24, r * 0.16, r * 0.76);
    ctx.fill();

    ctx.strokeStyle = '#0E0B1A';
    ctx.lineWidth = 2;
    ctx.strokeRect(-r * 0.08, r * 0.24, r * 0.16, r * 0.76);

    // Horizontal Fabric Folds & Collar Creases
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.8;

    // Upper collar crease folds
    ctx.beginPath();
    ctx.moveTo(-r * 0.40, r * 0.30);
    ctx.lineTo(-r * 0.08, r * 0.33);
    ctx.moveTo(r * 0.08, r * 0.33);
    ctx.lineTo(r * 0.40, r * 0.30);

    // Lower collar / shoulder seam lines
    ctx.moveTo(-r * 0.45, r * 0.38);
    ctx.quadraticCurveTo(-r * 0.25, r * 0.44, -r * 0.08, r * 0.42);
    ctx.moveTo(r * 0.08, r * 0.42);
    ctx.quadraticCurveTo(r * 0.25, r * 0.44, r * 0.45, r * 0.38);

    // Mid-chest horizontal fabric folds
    ctx.moveTo(-r * 0.85, r * 0.52);
    ctx.lineTo(-r * 0.08, r * 0.50);
    ctx.moveTo(r * 0.08, r * 0.50);
    ctx.lineTo(r * 0.85, r * 0.52);
    ctx.stroke();

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
