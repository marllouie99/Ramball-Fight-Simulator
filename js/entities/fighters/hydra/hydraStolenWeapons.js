import { drawCronosCrescentBlade } from '../../../graphics/weapons/cronosWeaponGraphics.js';
import { drawEngineerWrench } from '../../../graphics/engineerWeaponGraphics.js';

/**
 * Handles rendering of all weapons stolen by Hydra.
 * Applies a colorless/gray ghost effect to any weapon drawn here.
 */
export function drawStolenWeapon(ctx, fighter) {
  ctx.save();
  
  // Apply a ghostly filter: translucent, colorless, and slightly bright
  ctx.globalAlpha = 0.6;
  ctx.filter = 'grayscale(100%) brightness(1.5)';

  const weaponType = (fighter.stolenWeaponType || '').toLowerCase();

  switch (weaponType) {
    case 'cronos':
      drawCronosCrescentBlade(
        ctx, 
        fighter.x, 
        fighter.y, 
        fighter.gunAngle, 
        fighter.r, 
        fighter.attackSwingTimer > 0, 
        fighter.attackSwingTimer, 
        fighter.gunAngle, 
        15, 
        1, 
        '#555'
      );
      break;
      
    case 'engineer':
      drawEngineerWrench(
        ctx,
        fighter.x,
        fighter.y,
        fighter.gunAngle,
        fighter.r,
        Math.abs(fighter.gunAngle) < Math.PI / 2, // facingRight
        Math.min(fighter.attackSwingTimer, 10), // cap to 10 max
        false // not stowed
      );
      break;

    default:
      // Generic stolen weapon fallback
      ctx.translate(fighter.x, fighter.y);
      ctx.rotate(fighter.gunAngle);
      
      let swingOffset = 0;
      if (fighter.attackSwingTimer > 0) {
        const progress = fighter.attackSwingTimer / 15;
        swingOffset = Math.sin(progress * Math.PI) * Math.PI / 2;
      }
      ctx.rotate(swingOffset);
      
      // Draw basic sword shape
      ctx.beginPath();
      ctx.moveTo(fighter.r * 0.8, -4);
      ctx.lineTo(fighter.r * 2.2, -4);
      ctx.lineTo(fighter.r * 2.6, 0);
      ctx.lineTo(fighter.r * 2.2, 4);
      ctx.lineTo(fighter.r * 0.8, 4);
      ctx.fillStyle = '#ccc';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#333';
      ctx.stroke();
      break;
  }
  
  ctx.restore();
}
