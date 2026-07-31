import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

/**
 * Draws a dark dim screen overlay when Zeus is charging or casting his Storm ultimate.
 * The overlay opacity increases during charge, then stays at max while strikes are active.
 */
export function drawStormDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;
  
  // Find Zeus fighters that are charging or actively storming
  const zeusStorming = state.fighters?.filter(f => 
    f && f._def?.type === 'zeus' && (f.isChargingStorm || f.stormActive)
  );
  
  // Also check if there are active storm strikes happening
  const hasActiveStrikes = state.zeusStormStrikes && state.zeusStormStrikes.length > 0;
  
  // If no Zeus is storming and no strikes active, don't draw the overlay
  if ((!zeusStorming || zeusStorming.length === 0) && !hasActiveStrikes) return;
  
  // Get the first Zeus fighter for reference
  const zeus = zeusStorming ? zeusStorming[0] : null;
  
  // Calculate opacity
  let opacity;
  if (zeus && zeus.isChargingStorm) {
    // During charge: opacity increases with charge progress
    const chargeProgress = 1.0 - (zeus.stormCooldown / (CONFIG.zeus.stormTelegraphFrames || 120));
    const dimOpacity = CONFIG.zeus.stormDimOpacity || 0.7;
    opacity = chargeProgress * dimOpacity;
  } else {
    // During active storm: always at max opacity
    opacity = CONFIG.zeus.stormDimOpacity || 0.7;
  }
  
  // Don't draw if opacity is too low
  if (opacity < 0.01) return;
  
  // Fill the arena with a plain dark overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

let currentFurnaceDimOpacity = 0;

/**
 * Draws a dark fiery dim screen overlay with flame lightning when Sukuna channels or fires Furnace (Fuga).
 */
export function drawFurnaceDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  // Find Sukuna fighters channeling Furnace or in post-fire recovery
  const sukunaFuga = state.fighters?.find(f => 
    f && (f._def?.type === 'sukuna' || f._def?.name === 'Sukuna') && (f.isChannelingDivineFlame || (f.divineFlameRecoveryTimer && f.divineFlameRecoveryTimer > 0))
  );
  
  // Also check if Furnace fire arrow is actively flying
  const furnaceArrow = getProjectiles().find(p => (p.isSukunaFurnace || p.visual === 'sukunaFurnaceArrow') && p.life > 0);

  let targetOpacity = 0;
  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  if (sukunaFuga) {
    cx = sukunaFuga.x;
    cy = sukunaFuga.y;
    if (sukunaFuga.isChannelingDivineFlame) {
      const progress = Math.min(1.0, sukunaFuga.divineFlameChargeTimer / Math.max(1, sukunaFuga.divineFlameChargeMax));
      targetOpacity = 0.25 + progress * 0.55;
    } else if (sukunaFuga.divineFlameRecoveryTimer > 0) {
      const maxRecovery = CONFIG.sukuna.divineFlameRecoveryTime || 60;
      const recProgress = sukunaFuga.divineFlameRecoveryTimer / maxRecovery;
      targetOpacity = 0.55 * recProgress;
    }
  } else if (furnaceArrow) {
    targetOpacity = 0.55;
    cx = furnaceArrow.x;
    cy = furnaceArrow.y;
  }

  // Smoothly interpolate dim opacity for seamless fade-in and gradual fade-out
  if (targetOpacity > currentFurnaceDimOpacity) {
    currentFurnaceDimOpacity += (targetOpacity - currentFurnaceDimOpacity) * 0.15; // Smooth charge fade-in
  } else {
    currentFurnaceDimOpacity += (targetOpacity - currentFurnaceDimOpacity) * 0.06; // Smooth gradual fade-out
  }

  if (currentFurnaceDimOpacity < 0.01) {
    currentFurnaceDimOpacity = 0;
    return;
  }

  ctx.save();

  // Dark fiery vignette gradient centered on Sukuna/Arrow
  const opacity = currentFurnaceDimOpacity;
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(canvas.width, canvas.height) * 0.95);
  grad.addColorStop(0, `rgba(255, 60, 0, ${opacity * 0.25})`);
  grad.addColorStop(0.3, `rgba(120, 20, 0, ${opacity * 0.65})`);
  grad.addColorStop(0.7, `rgba(30, 5, 2, ${opacity * 0.85})`);
  grad.addColorStop(1, `rgba(10, 2, 2, ${opacity * 0.95})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

let currentRikaSummonDimOpacity = 0;

/**
 * Draws a dark purple/pink cursed energy dim screen overlay when Yuta calls or summons Rika.
 */
export function drawRikaSummonDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  // Find Yuta fighters calling for Rika or when Rika is expanding on summon
  const yutaSummoning = state.fighters?.find(f =>
    f && (f._def?.type === 'yuta' || f._def?.id === 'yuta' || f._def?.id === 23 || f._def?.name === 'Yuta') &&
    (f.rikaCallTimer > 0 || (f.rika && f.rika.active && f.rika.spawnTimer > 0))
  );

  let targetOpacity = 0;
  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  if (yutaSummoning) {
    cx = yutaSummoning.x;
    cy = yutaSummoning.y;
    if (yutaSummoning.rikaCallTimer > 0) {
      // Fade in smoothly as Yuta channels
      const maxCharge = CONFIG.yuta?.rikaSummonChargeDuration || 40;
      const progress = 1.0 - (yutaSummoning.rikaCallTimer / maxCharge);
      targetOpacity = 0.25 + progress * 0.50; // Up to 0.75 opacity
    } else if (yutaSummoning.rika && yutaSummoning.rika.spawnTimer > 0) {
      // Hold high dim while Rika expands/arises
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      const progress = yutaSummoning.rika.spawnTimer / ariseMax;
      targetOpacity = 0.75 * progress;
    }
  }

  // Smooth interpolation for zero popping
  currentRikaSummonDimOpacity += (targetOpacity - currentRikaSummonDimOpacity) * 0.15;
  if (currentRikaSummonDimOpacity < 0.01) {
    currentRikaSummonDimOpacity = 0;
    return;
  }

  ctx.save();

  // Dark flat overlay wash (optimized to bypass expensive radial gradient creation on large screens)
  const opacity = currentRikaSummonDimOpacity;
  ctx.fillStyle = `rgba(10, 0, 18, ${opacity * 0.82})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pulsing Cursed Energy Ring around Yuta/Rika
  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  const ringR = 85 + Math.sin(Date.now() * 0.01) * 15;
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 20, 147, ${opacity * 0.45})`;
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.restore();
}
