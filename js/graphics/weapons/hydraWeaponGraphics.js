import { drawStolenWeapon } from '../../entities/fighters/hydra/hydraStolenWeapons.js';

/**
 * Hydra's Weapon Graphics
 * Handles drawing Hydra's hands and his stolen weapon.
 */

export function drawHydraGun(ctx, fighter) {
    const handRadius = fighter.r * 0.35;
    
    if (fighter.stolenWeaponType) {
       // Draw the stolen weapon (managed centrally)
       drawStolenWeapon(ctx, fighter);

       // Setup for hands
       ctx.save();
       ctx.translate(fighter.x, fighter.y);
       ctx.rotate(fighter.gunAngle);
       
       let swingOffset = 0;
       if (fighter.attackSwingTimer > 0) {
         const progress = fighter.attackSwingTimer / 15;
         swingOffset = Math.sin(progress * Math.PI) * Math.PI / 2;
       }
       ctx.rotate(swingOffset);

       // (Back hand hidden for single-handed grip)
       
       // Draw Front Hand (gripping the hilt)
       ctx.save();
       ctx.beginPath();
       ctx.arc(fighter.r + handRadius * 0.5, 0, handRadius, 0, Math.PI * 2);
       ctx.fillStyle = fighter.color || '#4B0082';
       ctx.fill();
       ctx.lineWidth = 3;
       ctx.strokeStyle = '#000';
       ctx.stroke();
       ctx.restore();
       
       ctx.restore();
    } else {
       // Draw both hands idle
       ctx.save();
       ctx.translate(fighter.x, fighter.y);
       ctx.rotate(fighter.gunAngle);
       
       let punchExtension = 0;
       let rightAngle = Math.PI / 2.5;
       if (fighter.attackSwingTimer > 0) {
           const progress = fighter.attackSwingTimer / 15; // 1 to 0
           const snap = Math.sin(progress * Math.PI); 
           punchExtension = snap * fighter.r * 1.5;
           rightAngle = rightAngle * (1 - snap); // Move the hand straight in front of him
       }
       
       // Right Hand (idle or punching)
       ctx.save();
       ctx.rotate(rightAngle); 
       ctx.beginPath();
       ctx.arc(fighter.r + handRadius * 0.2 + punchExtension, 0, handRadius, 0, Math.PI * 2);
       ctx.fillStyle = fighter.color || '#4B0082';
       ctx.fill();
       ctx.lineWidth = 3;
       ctx.strokeStyle = '#000';
       ctx.stroke();
       ctx.restore();
       
       // Left Hand (idle)
       ctx.save();
       ctx.rotate(-Math.PI / 2.5); // Moved out to the side
       ctx.beginPath();
       ctx.arc(fighter.r + handRadius * 0.2, 0, handRadius, 0, Math.PI * 2);
       ctx.fillStyle = fighter.color || '#4B0082';
       ctx.fill();
       ctx.lineWidth = 3;
       ctx.strokeStyle = '#000';
       ctx.stroke();
       ctx.restore();
       
       ctx.restore();
    }
}
