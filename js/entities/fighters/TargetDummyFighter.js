// ─────────────────────────────────────────────
// TARGET DUMMY FIGHTER
// ─────────────────────────────────────────────
// A stationary target for testing damage and performance
// Does not move, does not attack, just takes damage
import { Fighter } from '../fighter.js';

export class TargetDummyFighter extends Fighter {
  constructor(def) {
    super(def);
    this.isTargetDummy = true;
    // Store intended spawn position
    this.intendedX = def.startX || 270;
    this.intendedY = def.startY || 330;
  }

  reset() {
    // Override reset to keep target dummy at intended position
    this.x = this.intendedX;
    this.y = this.intendedY;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.hp = this.maxHp;
    this.shootCooldown = 0;
  }

  update(dt, fighters, projectiles) {
    // Target dummy doesn't move or attack
    // Just update base physics (position, etc.)
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Keep target dummy stationary
    this.vx = 0;
    this.vy = 0;
    
    // Keep angle fixed
    this.angle = 0;
    
    // Update cooldowns (though we never use them)
    if (this.shootCooldown > 0) this.shootCooldown--;
  }

  updateAI(fighters, projectiles) {
    // Target dummy has no AI - doesn't aim or shoot
    return;
  }

  draw(ctx) {
    // Draw target dummy as a bullseye target
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Outer ring (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    
    // Middle ring (red)
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner ring (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Bullseye (red)
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Crosshairs
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-this.r, 0);
    ctx.lineTo(this.r, 0);
    ctx.moveTo(0, -this.r);
    ctx.lineTo(0, this.r);
    ctx.stroke();
    
    // "TARGET" label
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TARGET', 0, this.r + 12);
    
    ctx.restore();
  }

  drawGun(ctx) {
    // Target dummy has no weapon
    return;
  }
}
