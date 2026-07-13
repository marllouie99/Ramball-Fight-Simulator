// ─────────────────────────────────────────────
// DOPPELGANGER DEATH EFFECT
// A dramatic, multi-stage death effect for the main Doppelganger fighter.
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { drawDoppelgangerSkin } from '../fighters/doppelgangerSkin.js';

/**
 * Spawns the multi-stage death effect for the Doppelganger.
 * @param {Fighter} fighter - The Doppelganger fighter who died.
 */
export function spawnDoppelgangerDeath(fighter) {
  const color = fighter.color || '#9b59b6';
  const r = fighter.r;

  // Stage 1: Implosion Tendrils
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const startDist = r * (1.5 + Math.random() * 1.5);
    state.doppelgangerDeathEffects.push({
      x: fighter.x + Math.cos(angle) * startDist,
      y: fighter.y + Math.sin(angle) * startDist,
      targetX: fighter.x,
      targetY: fighter.y,
      size: 2 + Math.random() * 3,
      color: '#2c3e50',
      life: 1.0,
      decay: 0.08,
      type: 'tendril'
    });
  }

  // Stage 2: Main Explosion (triggered after a delay)
  // We'll add these in the update loop when the implosion is almost done.
  
  // Add a master controller particle to manage the sequence
  state.doppelgangerDeathEffects.push({
    x: fighter.x,
    y: fighter.y,
    fighterR: r,
    fighterColor: color,
    life: 1.0,
    decay: 0.02, // Controls the total duration of the whole effect
    stage: 'implosion',
    stage_timer: 0,
    type: 'controller'
  });
}

/**
 * Updates all Doppelganger death effects.
 */
export function updateDoppelgangerDeathEffects() {
  for (let i = state.doppelgangerDeathEffects.length - 1; i >= 0; i--) {
    const p = state.doppelgangerDeathEffects[i];
    p.life -= p.decay;

    switch (p.type) {
      case 'tendril':
        p.x += (p.targetX - p.x) * 0.25;
        p.y += (p.targetY - p.y) * 0.25;
        p.size *= 0.95;
        break;

      case 'shard':
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.vy += 0.1; // Gravity
        p.angle += p.spin;
        break;
        
      case 'smoke':
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.size *= 0.97;
        break;

      case 'echo':
        p.opacity -= p.decay;
        p.scale += 0.02;
        break;

      case 'controller':
        p.stage_timer++;
        if (p.stage === 'implosion' && p.stage_timer > 15) {
          p.stage = 'explosion';
          
          const r = p.fighterR;
          const color = p.fighterColor;

          // Spawn Shards
          for (let j = 0; j < 30; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 6;
            state.doppelgangerDeathEffects.push({
              x: p.x, y: p.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: r * (0.1 + Math.random() * 0.25),
              angle: Math.random() * Math.PI * 2,
              spin: (Math.random() - 0.5) * 0.4,
              color: Math.random() > 0.3 ? color : '#f1c40f',
              life: 1.0, decay: 0.015,
              type: 'shard'
            });
          }
          // Spawn Smoke
          for (let j = 0; j < 40; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            state.doppelgangerDeathEffects.push({
              x: p.x, y: p.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: r * (0.8 + Math.random() * 0.8),
              color: '#34495e',
              life: 1.0, decay: 0.012,
              type: 'smoke'
            });
          }
           // Spawn Echoes
          for (let j = 0; j < 3; j++) {
             state.doppelgangerDeathEffects.push({
               x: p.x, y: p.y,
               r: r,
               angle: (Math.random() - 0.5) * 0.5,
               opacity: 0.6,
               scale: 1.0,
               life: 1.0, decay: 0.02 - j * 0.005,
               type: 'echo'
             });
           }
        }
        break;
    }

    if (p.life <= 0) {
      state.doppelgangerDeathEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all Doppelganger death effects.
 */
export function drawDoppelgangerDeathEffects() {
  const { ctx } = state;
  
  for (const p of state.doppelgangerDeathEffects) {
    ctx.save();

    switch (p.type) {
      case 'tendril':
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'shard':
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        if (p.color === '#f1c40f') {
            ctx.filter = 'blur(2px)';
            ctx.fillStyle = '#fff';
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        break;
        
      case 'smoke':
        ctx.globalAlpha = p.life * 0.7;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `${p.color}99`);
        gradient.addColorStop(1, `${p.color}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'echo':
         ctx.globalAlpha = p.opacity;
         ctx.translate(p.x, p.y);
         ctx.scale(p.scale, p.scale);
         ctx.rotate(p.angle);
         drawDoppelgangerSkin(ctx, 0, 0, p.r, 0, Date.now());
         break;
    }
    
    ctx.restore();
  }
}
