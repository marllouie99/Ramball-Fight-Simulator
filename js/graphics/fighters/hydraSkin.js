/**
 * Hydra's Body Skin Rendering
 * Draws his massive, dark purple textured body.
 */

export function drawHydraBody(ctx, fighter) {
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    // Overdrive Glow
    if (fighter.overdriveActive) {
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 10 + Math.sin(Date.now() / 100) * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
      ctx.fill();
    }

    // Base circle
    ctx.beginPath();
    ctx.arc(0, 0, fighter.r, 0, Math.PI * 2);
    ctx.fillStyle = fighter.color || '#4B0082';
    ctx.fill();
    
    // Add organic scale texture
    ctx.save();
    ctx.clip(); // clip just for the texture inside the body
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const scaleRadius = 8;
    for (let y = -fighter.r - scaleRadius; y < fighter.r + scaleRadius; y += scaleRadius) {
      for (let x = -fighter.r - scaleRadius; x < fighter.r + scaleRadius; x += scaleRadius * 1.5) {
        // Offset alternating rows and apply texture animation
        let rowOffset = (Math.floor(y / scaleRadius)) % 2 === 0 ? scaleRadius * 0.75 : 0;
        let animOffset = ((fighter.textureOffset || 0) * 0.5) % (scaleRadius * 1.5);
        let offsetX = x + rowOffset + animOffset;
        
        ctx.beginPath();
        ctx.arc(offsetX, y, scaleRadius, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore(); // restore from clip
    
    fighter.drawStatusOverlays(ctx, fighter.r);
    
    ctx.restore();
}
