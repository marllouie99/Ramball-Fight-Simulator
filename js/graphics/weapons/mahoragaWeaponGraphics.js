// mahoragaWeaponGraphics.js
//  - Use this file for Mahoraga-specific weapon graphics (3D Dharma Wheel & Sword of Extermination).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Convert a hex color string (e.g. '#8A2BE2' or '#FF1144') to an RGB string (e.g. '138, 43, 226').
 * Used for dynamic glow colors in the Dharma Wheel.
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Lighten a hex color by mixing it with white.
 * @param {string} hex - Hex color like '#8A2BE2'
 * @param {number} factor - 0.0 to 1.0, how much to lighten (0 = no change, 1 = white)
 * @returns {string} Lightened hex color
 */
function lightenHex(hex, factor) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return '#' + [lr, lg, lb].map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Darken a hex color by mixing it with black.
 * @param {string} hex - Hex color like '#8A2BE2'
 * @param {number} factor - 0.0 to 1.0, how much to darken (0 = no change, 1 = black)
 * @returns {string} Darkened hex color
 */
function darkenHex(hex, factor) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return '#' + [dr, dg, db].map(c => c.toString(16).padStart(2, '0')).join('');
}

export const MAHORAGA_WEAPON_GRAPHICS = {
  wheel: {
    scaleX: 1.25,
    scaleY: 0.45,
    wheelRadius: 16,
    spokeRadius: 26,
    sphereRadius: 4.5,
    depthOffset: 4,
    goldMain: '#DAA520',
    goldHighlight: '#FFE57F',
    strokeColor: '#000000',
  },
  sword: {
    bladeLength: 52,
    bladeWidth: 18,
    ringColor: '#1A1A1D',
    strokeColor: '#000000',
  }
};

/**
 * Draws Mahoraga's 3D Angled Dharma Wheel of Adaptation.
 */
export function drawMahoraga3DWheel(ctx, fighter) {
  if (!fighter) return;



  // ----------------------------------------------------
  // 1 DIVINE SHIELD + GREEN UP ARROW ARISING AT HIS FEET THEN FADING
  // Drawn in absolute world coordinates (fighter.x, fighter.y) before any translations!
  // ----------------------------------------------------
  if (fighter && fighter.shieldIconTimer > 0) {
    ctx.save();
    const timer = fighter.shieldIconTimer;
    const maxTime = 90;
    const progress = (maxTime - timer) / maxTime; // 0 to 1
    
    // Fade in quickly, then fade out smoothly
    const alpha = timer < 25 ? timer / 25 : (progress < 0.15 ? progress / 0.15 : 0.95);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const r = fighter.r || 30;
    // Position beside him (to his left side, so it doesn't overlap his body or sword arm!)
    const sideX = fighter.x - r - 18;
    const sideY = (fighter.y + 10) - progress * 28;
    
    ctx.save();
    ctx.translate(sideX, sideY);
    // STRICTLY UPRIGHT (NO ROTATION!)
    
    // Scale down to a clean, small badge size (0.65 scale)
    const popScale = Math.sin(Math.min(1, progress * 3) * Math.PI / 2) * 0.65;
    ctx.scale(popScale, popScale);

    // 1. Sleek, upright divine Guardian barrier shield shape
    ctx.beginPath();
    ctx.moveTo(0, -22);       // Top point
    ctx.lineTo(15, -14);      // Top right corner
    ctx.lineTo(13, 6);        // Right side curve down
    ctx.quadraticCurveTo(0, 22, 0, 24);   // Bottom tip
    ctx.quadraticCurveTo(0, 22, -13, 6);  // Left side curve down
    ctx.lineTo(-15, -14);     // Top left corner
    ctx.closePath();

    // Radiant white-hot & golden divine energy fill
    const shieldGrad = ctx.createLinearGradient(0, -22, 0, 24);
    shieldGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    shieldGrad.addColorStop(0.35, 'rgba(255, 235, 100, 0.85)');
    shieldGrad.addColorStop(0.75, 'rgba(255, 180, 0, 0.55)');
    shieldGrad.addColorStop(1, 'rgba(255, 140, 0, 0.1)');
    ctx.fillStyle = shieldGrad;
    ctx.fill();

    // Crisp white & gold energy border
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // 2. Glowing GREEN UP ARROW (▲ / ⬆) symbolizing Defense Level Up!
    ctx.save();
    ctx.translate(0, -1); // Centered inside the shield
    ctx.beginPath();
    ctx.moveTo(0, -13);      // Arrow tip pointing UP
    ctx.lineTo(8, -3);       // Right barb
    ctx.lineTo(3.5, -3);     // Right stem inner
    ctx.lineTo(3.5, 9);      // Right stem bottom
    ctx.lineTo(-3.5, 9);     // Left stem bottom
    ctx.lineTo(-3.5, -3);    // Left stem inner
    ctx.lineTo(-8, -3);      // Left barb
    ctx.closePath();

    // Neon Emerald Green Gradient Fill
    const arrowGrad = ctx.createLinearGradient(0, -13, 0, 9);
    arrowGrad.addColorStop(0, '#76FF03');  // Bright neon lime green
    arrowGrad.addColorStop(0.5, '#00E676'); // Vibrant emerald green
    arrowGrad.addColorStop(1, '#00C853');  // Deep green
    ctx.fillStyle = arrowGrad;
    ctx.fill();

    // Crisp white outline on the green arrow
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Restore left shield badge transform

    // ----------------------------------------------------
    // 3. SIMPLE GREEN + SIGN (Pops out on his right side!)
    // ----------------------------------------------------
    const rightX = fighter.x + r + 16;
    const rightY = (fighter.y + 10) - progress * 28;

    ctx.save();
    ctx.translate(rightX, rightY);
    ctx.scale(popScale, popScale);

    // Simple bright green + sign
    ctx.fillStyle = '#00FF66';
    ctx.fillRect(-3, -10, 6, 20);
    ctx.fillRect(-10, -3, 20, 6);

    ctx.restore(); // Restore right RCT badge transform

    ctx.restore(); // Restore root canvas context
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  const rotAngle = fighter.angle || 0;
  ctx.rotate(rotAngle);
  if (Math.abs(rotAngle) > Math.PI / 2) ctx.scale(1, -1);

  // Position wheel floating above Mahoraga's head with subtle floating animation along his body orientation
  const floatOffset = Math.sin(Date.now() * 0.003) * 2;
  const wheelOffset = -fighter.r - 28 + floatOffset;
  
  ctx.translate(0, wheelOffset);

  const scaleX = MAHORAGA_WEAPON_GRAPHICS.wheel.scaleX;
  const scaleY = MAHORAGA_WEAPON_GRAPHICS.wheel.scaleY;
  const wheelRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.wheelRadius;
  const spokeRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.spokeRadius;
  const sphereRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.sphereRadius;
  const depthOffset = MAHORAGA_WEAPON_GRAPHICS.wheel.depthOffset;

  // Glow Effect when actively adapting (click timer) or when FULLY adapted (8 stages / max adapted)
  const totalStages = (fighter.adaptationStage?.melee || 0) + (fighter.adaptationStage?.ranged || 0) + (fighter.adaptationStage?.skill || 0);
  const isFullyAdapted = totalStages >= 8 || fighter.isMaxAdapted;
  const isGlowing = (fighter.wheelGlowTimer > 0) || isFullyAdapted;
  if (isGlowing) {
    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.beginPath();
    ctx.arc(0, 0, spokeRadius + 12, 0, Math.PI * 2);
    const glowAlpha = fighter.wheelGlowTimer > 0 ? Math.min(1.0, fighter.wheelGlowTimer / 45) : 0.45;
    const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, spokeRadius + 14);

    // Use Gojo-adapted color if set, otherwise default gold
    const glowColor = fighter.wheelGlowColor || '#FFD700';
    const glowColorDark = fighter.wheelGlowColor || '#DAA520';

    glowGrad.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha})`);
    glowGrad.addColorStop(0.4, `rgba(${hexToRgb(glowColor)}, ${glowAlpha * 0.8})`);
    glowGrad.addColorStop(1, `rgba(${hexToRgb(glowColorDark)}, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.fill();
    ctx.restore();
  }

  const isGojoDomainActive = typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  // ----------------------------------------------------
  // RECOGNIZABLE ROTATION VISUAL EFFECT (DIVINE SHOCKWAVE HALO & SUNBURST RAYS)
  // ----------------------------------------------------
  if (fighter.wheelClickTimer > 0 && !isGojoDomainActive) {
    const clickMax = CONFIG.mahoraga?.wheelClickDuration || 25;
    const clickProgress = 1.0 - (fighter.wheelClickTimer / clickMax); // 0.0 to 1.0
    const haloAlpha = Math.max(0, 1.0 - clickProgress);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // 1. Expanding Golden Halo Shockwave Ring
    const haloRadius = spokeRadius + clickProgress * 32;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 223, 0, ${haloAlpha * 0.95})`;
    ctx.lineWidth = 3.5 * haloAlpha;
    ctx.stroke();

    // Inner bright white shockwave rim
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${haloAlpha * 0.8})`;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 2. 8 Radial Sunburst Laser Beams (Shooting outward from 8 handle spheres!)
    const currentRot = fighter.wheelRotation || 0;
    for (let i = 0; i < 8; i++) {
      const angle = currentRot + (i / 8) * Math.PI * 2;
      const innerDist = spokeRadius * 0.7;
      const outerDist = spokeRadius + clickProgress * 28;

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerDist, Math.sin(angle) * innerDist);
      ctx.lineTo(Math.cos(angle) * outerDist, Math.sin(angle) * outerDist);
      ctx.strokeStyle = `rgba(255, 245, 157, ${haloAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Bright white beam core
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerDist, Math.sin(angle) * innerDist);
      ctx.lineTo(Math.cos(angle) * (outerDist - 4), Math.sin(angle) * (outerDist - 4));
      ctx.strokeStyle = `rgba(255, 255, 255, ${haloAlpha * 0.9})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // 3. Central Starburst Core Flare
    ctx.beginPath();
    ctx.arc(0, 0, 8 + (1 - clickProgress) * 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${haloAlpha * 0.75})`;
    ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------
  // LAYER 1: 3D EXTRUSION / UNDERSIDE SHADOW (Depth Thickness)
  // ----------------------------------------------------
  ctx.save();
  ctx.translate(0, depthOffset);
  ctx.scale(scaleX, scaleY);
  ctx.rotate(fighter.wheelRotation || 0);

  // Dark underside outer ring
  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#3D2B0F';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Dark underside spokes & sphere bases
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * spokeRadius, sinA * spokeRadius);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * spokeRadius, sinA * spokeRadius);
    ctx.strokeStyle = '#2A1D0A';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cosA * spokeRadius, sinA * spokeRadius, sphereRadius + 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
  }
  ctx.restore();

  // ----------------------------------------------------
  // LAYER 2: MAIN TOP 3D WHEEL SURFACE WITH BLACK STROKE EDGES
  // ----------------------------------------------------
  ctx.save();
  ctx.scale(scaleX, scaleY);
  ctx.rotate(fighter.wheelRotation || 0);

  // 1. 8 Spokes
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * spokeRadius, sinA * spokeRadius);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * spokeRadius, sinA * spokeRadius);
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * spokeRadius, sinA * spokeRadius);
    ctx.strokeStyle = '#FFE57F';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 2. Outer Ring Rim
  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius + 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFE57F';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. Inner Ring Rim
  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 4. Center Hub Dome
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  const hubGrad = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 6);
  hubGrad.addColorStop(0, '#FFFFFF');
  hubGrad.addColorStop(0.3, '#FFF59D');
  hubGrad.addColorStop(0.7, '#D4AF37');
  hubGrad.addColorStop(1, '#8B6508');
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Calculate total adaptation levels reached across all damage types & color history
  let activeStages = 0;
  const historyCount = fighter.gojoAdaptColorHistory ? fighter.gojoAdaptColorHistory.length : 0;
  if (fighter.adaptationStage) {
    const totalClicks = (fighter.adaptationStage.melee || 0) + (fighter.adaptationStage.ranged || 0) + (fighter.adaptationStage.skill || 0);
    activeStages = Math.min(8, Math.max(totalClicks, historyCount));
  } else if (fighter.adapted && (fighter.adapted.melee || fighter.adapted.ranged || fighter.adapted.skill)) {
    activeStages = Math.min(8, Math.max(1, historyCount));
  }

  // 5. 8 Handle Spheres (Glow color adapts to Gojo attack type when adapted!)
  // Determine sphere colors: use Gojo-adapted color if set, otherwise default gold
  const sphereGlowColor = fighter.wheelGlowColor || '#FFD700';
  const sphereGlowRgb = hexToRgb(sphereGlowColor);
  // Generate a lighter variant for the inner glow
  const sphereGlowLight = fighter.wheelGlowColor ? lightenHex(sphereGlowColor, 0.5) : '#FFF9C4';
  const sphereGlowLightRgb = hexToRgb(sphereGlowLight);
  // Darker outer variant
  const sphereGlowDark = fighter.wheelGlowColor ? darkenHex(sphereGlowColor, 0.4) : '#FF8C00';
  const sphereGlowDarkRgb = hexToRgb(sphereGlowDark);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sx = Math.cos(angle) * spokeRadius;
    const sy = Math.sin(angle) * spokeRadius;
    const isLeveled = i < activeStages;

    // Per-sphere color: use the permanent color from the history entry for this sphere's click.
    // Spheres without a history entry (general/non-Gojo adaptations) fall back to gold — NOT wheelGlowColor.
    const adaptColorHistory = fighter.gojoAdaptColorHistory;
    const thisSphereColor      = (adaptColorHistory && adaptColorHistory[i]) ? adaptColorHistory[i] : '#FFD700';
    const thisSphereColorLight = lightenHex(thisSphereColor, 0.5);
    const thisSphereColorDark  = darkenHex(thisSphereColor, 0.4);
    const thisSphereRgb        = hexToRgb(thisSphereColor);
    const thisSphereRgbLight   = hexToRgb(thisSphereColorLight);

    // Draw steady outer energy halo around leveled spheres (No spinning/pulsing!)
    if (isLeveled) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, sphereRadius * 3.0, 0, Math.PI * 2);
      const ballGlow = ctx.createRadialGradient(sx, sy, sphereRadius * 0.2, sx, sy, sphereRadius * 3.0);
      ballGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      ballGlow.addColorStop(0.35, `rgba(${thisSphereRgbLight}, 0.85)`);
      ballGlow.addColorStop(0.7,  `rgba(${thisSphereRgb}, 0.45)`);
      ballGlow.addColorStop(1,    `rgba(${thisSphereRgb}, 0)`);
      ctx.fillStyle = ballGlow;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(sx, sy, sphereRadius, 0, Math.PI * 2);
    
    const sphereGrad = ctx.createRadialGradient(
      sx - sphereRadius * 0.35, 
      sy - sphereRadius * 0.35, 
      0.5, 
      sx, 
      sy, 
      sphereRadius
    );
    if (isLeveled) {
      // Each sphere uses its own permanent adaptation color from history
      sphereGrad.addColorStop(0, '#FFFFFF');
      sphereGrad.addColorStop(0.25, thisSphereColorLight);
      sphereGrad.addColorStop(0.6, thisSphereColor);
      sphereGrad.addColorStop(1, thisSphereColorDark);
    } else {
      // Standard golden dharma spheres for unadapted levels
      sphereGrad.addColorStop(0, '#FFFFFF');
      sphereGrad.addColorStop(0.25, '#FFE082');
      sphereGrad.addColorStop(0.7, '#C59B27');
      sphereGrad.addColorStop(1, '#4A3319');
    }
    
    ctx.fillStyle = sphereGrad;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Crisp white energy rim on leveled spheres
    if (isLeveled) {
      ctx.beginPath();
      ctx.arc(sx, sy, sphereRadius + 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  ctx.restore();

  // ----------------------------------------------------
  // LAYER 3: (Removed spinning orbital sparkles for clean, steady glow)
  // ----------------------------------------------------

  ctx.restore(); // Restore from wheel translation
}



/**
 * Draws Mahoraga's Sword of Extermination Wrist Blade (Matching Reference Image 2 & 3).
 */
export function drawMahoragaSword(ctx, x = 0, y = 0, gunAngle = 0, r = 30, punchAnimTimer = 0, isCleaving = false, color = '#F5F5DC', swordCombo = 0, isThrowing = false, bladeRetractProgress = 1.0, maxAnimTimer = 18, isWorldCutting = false, worldCuttingTimer = 0) {
  let fighterObj = null;
  if (typeof x === 'object' && x !== null) {
    fighterObj = x;
    const f = fighterObj;
    x = f.x || 0;
    y = f.y || 0;
    gunAngle = f.gunAngle || 0;
    r = f.r || 30;
    punchAnimTimer = f.punchAnimTimer || 0;
    isCleaving = f.isCleaving || false;
    color = f.color || '#F5F5DC';
    swordCombo = f.swordCombo || 0;
    isThrowing = f.isThrowing || false;
    bladeRetractProgress = f.bladeRetractProgress !== undefined ? f.bladeRetractProgress : 1.0;
    maxAnimTimer = f.punchAnimMaxTimer || 18;
    isWorldCutting = f.isWorldCutting || false;
    worldCuttingTimer = f.worldCuttingTimer || 0;
  }

  // --- DRAW DYNAMIC SWORD TRAIL IN WORLD SPACE (SINGLE CRESCENT SHAPE) ---
  const isGojoDomainActive = typeof state !== 'undefined' && (
    state.domainActive || state.activeDomain ||
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  if (fighterObj && !isGojoDomainActive) {
    if (!fighterObj.swordTrail) fighterObj.swordTrail = [];
    const isMoving = Math.hypot(fighterObj.vx, fighterObj.vy) > 0.15 || (fighterObj._prevX !== undefined && Math.hypot(fighterObj.x - fighterObj._prevX, fighterObj.y - fighterObj._prevY) > 0.5);
    const isMahoragaSwinging = (fighterObj.punchAnimTimer > 0) || (fighterObj.isCleaving && (fighterObj.cleaveWindupTimer > 0)) || isMoving;

    if (isMahoragaSwinging) {
      fighterObj.trailFadeAlpha = 1.0;
      const pos = fighterObj._getSwordTipPositions();
      let shouldAdd = true;
      if (fighterObj.swordTrail.length > 0) {
        const last = fighterObj.swordTrail[fighterObj.swordTrail.length - 1];
        const dist = Math.hypot(pos.outer.x - last.outer.x, pos.outer.y - last.outer.y);
        if (dist < 1.0) shouldAdd = false;
      }
      if (shouldAdd) {
        fighterObj.swordTrail.push({
          outer: pos.outer,
          inner: pos.inner,
          life: 1.0
        });
      }
      if (fighterObj.swordTrail.length > 24) { // Increased to 24 capacity for ultimate smoothness!
        fighterObj.swordTrail.shift();
      }
    } else {
      // Fast snappy fade out post-swing (disappears cleanly in 5 frames)
      if (fighterObj.trailFadeAlpha === undefined) fighterObj.trailFadeAlpha = 1.0;
      fighterObj.trailFadeAlpha = Math.max(0, fighterObj.trailFadeAlpha - 0.20);
      if (fighterObj.trailFadeAlpha <= 0) {
        fighterObj.swordTrail = [];
      }
    }
  }

  if (fighterObj && fighterObj.swordTrail && fighterObj.swordTrail.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    
    const trail = fighterObj.swordTrail;
    const N = trail.length;

    // Smooth fade out based on the latest point's life and post-swing fade alpha
    const fadeAlpha = (fighterObj.trailFadeAlpha !== undefined) ? fighterObj.trailFadeAlpha : 1.0;
    const latestLife = trail[N - 1].life;
    ctx.globalAlpha = Math.max(0, Math.min(1, latestLife * fadeAlpha));

    const totalStages = fighterObj ? ((fighterObj.adaptationStage?.melee || 0) + (fighterObj.adaptationStage?.ranged || 0) + (fighterObj.adaptationStage?.skill || 0)) : 0;
    const isLevel8 = totalStages >= 8 || fighterObj.isInfinityBlitz || fighterObj.isMaxAdapted;

    // Define colors based on adaptation level
    const glowColor = isLevel8 ? 'rgba(255, 110, 0, 0.45)' : 'rgba(255, 191, 0, 0.35)';
    const fillColor = isLevel8 ? 'rgba(255, 165, 0, 0.85)' : 'rgba(255, 215, 0, 0.80)';
    const coreColor = isLevel8 ? 'rgba(255, 250, 240, 0.98)' : 'rgba(255, 255, 230, 0.95)';

    // Helper to render a single, continuous, double-tapered crescent arc polygon
    const drawCrescentPolygon = (widthMult = 1.0, isGlow = false) => {
      ctx.beginPath();
      // Outer arc: from tail (i=0) to leading tip (i=N-1)
      const p0 = trail[0].outer;
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < N - 1; i++) {
        const pi = trail[i].outer;
        const pi1 = trail[i + 1].outer;
        const xc = (pi.x + pi1.x) / 2;
        const yc = (pi.y + pi1.y) / 2;
        ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
      }
      const pLast = trail[N - 1].outer;
      ctx.lineTo(pLast.x, pLast.y);

      // Inner returning arc: from leading tip (i=N-1, attached to sword tip) back to tail (i=0)
      // Rule 15 Compliant Double Tapering Function (taper to zero at both ends)
      for (let i = N - 1; i >= 0; i--) {
        const t = N > 1 ? i / (N - 1) : 1.0;
        const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
        const p = trail[i];
        const alphaFactor = Math.min(1.0, p.life * 1.4) * taper * widthMult;

        let inX, inY;
        if (isGlow) {
          const dx = p.outer.x - p.inner.x;
          const dy = p.outer.y - p.inner.y;
          inX = p.outer.x - dx * (alphaFactor + 0.60);
          inY = p.outer.y - dy * (alphaFactor + 0.60);
        } else {
          inX = p.outer.x + (p.inner.x - p.outer.x) * alphaFactor;
          inY = p.outer.y + (p.inner.y - p.outer.y) * alphaFactor;
        }

        if (i === N - 1) {
          ctx.lineTo(inX, inY);
        } else if (i > 0) {
          const pPrev = trail[i - 1];
          const tPrev = (i - 1) / (N - 1);
          const taperPrev = Math.pow(Math.sin(tPrev * Math.PI), 1.15) * (0.3 + 0.7 * tPrev);
          const alphaPrev = Math.min(1.0, pPrev.life * 1.4) * taperPrev * widthMult;
          let prevInX, prevInY;
          if (isGlow) {
            const dxP = pPrev.outer.x - pPrev.inner.x;
            const dyP = pPrev.outer.y - pPrev.inner.y;
            prevInX = pPrev.outer.x - dxP * (alphaPrev + 0.60);
            prevInY = pPrev.outer.y - dyP * (alphaPrev + 0.60);
          } else {
            prevInX = pPrev.outer.x + (pPrev.inner.x - pPrev.outer.x) * alphaPrev;
            prevInY = pPrev.outer.y + (pPrev.inner.y - pPrev.outer.y) * alphaPrev;
          }
          const xc = (inX + prevInX) / 2;
          const yc = (inY + prevInY) / 2;
          ctx.quadraticCurveTo(inX, inY, xc, yc);
        } else {
          ctx.lineTo(inX, inY);
        }
      }
      ctx.closePath();
    };

    // 1. Soft Outer Aura Glow
    ctx.fillStyle = glowColor;
    drawCrescentPolygon(1.2, true);
    ctx.fill();

    // 2. Main Divine Gold Crescent Body Fill
    ctx.fillStyle = fillColor;
    drawCrescentPolygon(1.0, false);
    ctx.fill();

    // 3. Searing White-Gold Core Line
    ctx.fillStyle = coreColor;
    drawCrescentPolygon(0.45, false);
    ctx.fill();

    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y); // Center of Mahoraga (statically upright)

  const bladeLength = 58;
  const bladeWidth = 12;

  let swingAngle = 0;
  let extendDist = 0;

  const isParrying = (fighterObj && fighterObj.defensePoseType === 'parry' && (fighterObj.defensePoseTimer || 0) > 0);
  const isGuarding = (fighterObj && fighterObj.defensePoseType === 'guard' && (fighterObj.defensePoseTimer || 0) > 0);

  if (punchAnimTimer > 0) {
    const maxTimer = (maxAnimTimer && maxAnimTimer > 0) ? maxAnimTimer : 18.0;
    const swingDuration = 12.0;
    const elapsed = maxTimer - punchAnimTimer;
    const comboIndex = (fighterObj && fighterObj.isInfinityBlitz) ? (1 + ((swordCombo || 0) % 2)) : ((swordCombo || 0) % 3);

    if (elapsed <= swingDuration) {
      const p = Math.min(1.0, elapsed / swingDuration);

      if (comboIndex === 1) {
        // Combo 1: Sweeps backhand from +0.65 to -0.55
        const easedP = 1.0 - Math.pow(1.0 - p, 2.2);
        swingAngle = (Math.PI * 0.65) - (Math.PI * 1.20) * easedP;
        extendDist = Math.sin(p * Math.PI) * 28;
      } else if (comboIndex === 2) {
        // Combo 2: Heavy Overhead Chop (Windup -0.55 -> -0.85, then heavy chop -0.85 -> +0.85)
        if (p < 0.15) {
          const w = p / 0.15;
          swingAngle = (-Math.PI * 0.55) + (-Math.PI * 0.30) * Math.sin(w * Math.PI * 0.5);
        } else {
          const s = (p - 0.15) / 0.85;
          const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
          swingAngle = (-Math.PI * 0.85) + (Math.PI * 1.70) * easedS;
        }
        extendDist = Math.sin(p * Math.PI) * 30;
      } else {
        // Combo 0: Smooth windup back from idle (0 -> -0.45), then slash forward (-0.45 -> +0.65)
        if (p < 0.20) {
          const w = p / 0.20;
          swingAngle = (-Math.PI * 0.45) * Math.sin(w * Math.PI * 0.5);
        } else {
          const s = (p - 0.20) / 0.80;
          const easedS = 1.0 - Math.pow(1.0 - s, 2.2);
          swingAngle = (-Math.PI * 0.45) + (Math.PI * 1.10) * easedS;
        }
        extendDist = Math.sin(p * Math.PI) * 28;
      }
    } else {
      // Recovery phase: Smoothly return from swing end angle to 0 idle guard
      const recP = Math.min(1.0, (elapsed - swingDuration) / (maxTimer - swingDuration));
      const easeRec = recP * (2 - recP);
      let endAngle = Math.PI * 0.65;
      if (comboIndex === 1) endAngle = -Math.PI * 0.55;
      else if (comboIndex === 2) endAngle = Math.PI * 0.85;

      swingAngle = endAngle * (1.0 - easeRec);
      extendDist = (1.0 - easeRec) * 12;
    }
  } else if (isParrying) {
    // Parry Pose: snappy blade deflection swing
    const maxT = fighterObj.defensePoseMaxTimer || 25;
    const t = 1.0 - (fighterObj.defensePoseTimer / maxT);
    const p = Math.sin(t * Math.PI); // 0 -> 1 -> 0 sweep
    swingAngle = Math.PI * 0.25 - p * (Math.PI * 0.45);
    extendDist = 18 + p * 15;
  } else if (isGuarding) {
    // Guard / Block Pose: sword hand pulled in close covering face
    swingAngle = -Math.PI * 0.35;
    extendDist = -12;
  } else if (isThrowing) {
    // Alternating right hand throw swing (blade remains retracted into forearm gauntlet)
    const shotsLeft = fighterObj ? (fighterObj.throwBarrageShotsLeft || 0) : 0;
    const isRightArmTurn = (shotsLeft % 2 === 0);
    
    if (isRightArmTurn && fighterObj) {
      const interval = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga?.throwBarrageInterval) || 5;
      const t = (fighterObj.throwBarrageTimer || 0) / interval;
      const p = Math.sin(t * Math.PI); // Smooth 0 -> 1 -> 0 lunge
      
      swingAngle = -Math.PI * 0.25 + p * 0.45;
      extendDist = 10 + p * 38;
    } else {
      swingAngle = -Math.PI * 0.25;
      extendDist = 10;
    }
  } else if (fighterObj && fighterObj.isWallSlamActive && (fighterObj.wallSlamPhase === 'post_throw_delay' || fighterObj.wallSlamPhase === 'dash')) {
    let p = 1.0;
    if (fighterObj.wallSlamPhase === 'post_throw_delay') {
      const standoffDuration = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga?.wallSlamStandoffDuration) || 40;
      p = Math.min(1.0, (fighterObj.wallSlamTimer || 0) / standoffDuration);
    }
    const easeP = p * p * (3 - 2 * p); // Smooth ease-in-out transition
    swingAngle = easeP * (-Math.PI * 0.65); // Wide arm open wind-up
    extendDist = easeP * 15; // Extend arm out widely
  } else {
    // Statically follow gunAngle when idle/resting
    swingAngle = 0;
    extendDist = 0;
  }

  // Right shoulder is statically positioned on the right side of his chest (aligned for front hand convention)
  const shoulderX = r * 0.55;
  const shoulderY = 0;

  // Rotate shoulder position by bodyAngle (fighter.angle) so arm stays attached to the spinning body
  const bodyAngle = (fighterObj && fighterObj.angle) || 0;
  const cosB = Math.cos(bodyAngle);
  const sinB = Math.sin(bodyAngle);
  const rotatedShoulderX = shoulderX * cosB - shoulderY * sinB;
  const rotatedShoulderY = shoulderX * sinB + shoulderY * cosB;

  let verticalLift = 0;
  let liftTilt = 0;
  if (fighterObj && fighterObj.isWallSlamActive && fighterObj.wallSlamPhase === 'grab') {
    // Find the grab target
    const opponentObj = state.fighters?.find(f => f && f !== fighterObj && f.hp > 0);
    if (opponentObj) {
      verticalLift = opponentObj.z || 0;
      const holdFrames = CONFIG.mahoraga?.wallSlamImpaleHoldFrames || 35;
      const liftP = Math.min(1.0, Math.max(0.0, (fighterObj.wallSlamTimer - 12) / (holdFrames - 12)));
      liftTilt = -0.22 * liftP; // Upward tilt of arm (approx -12 degrees)
    }
  }

  ctx.save();
  ctx.translate(rotatedShoulderX, rotatedShoulderY - verticalLift);
  
  // Rotate by gunAngle, swingAngle, and the upward lift tilt
  ctx.rotate(gunAngle + swingAngle + liftTilt);

  // Flip Y when facing left so sword faces target correctly
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  ctx.translate(r * 0.3 + extendDist, 0);

  // 1. White Bandaged Forearm (Extending from body into wrist ring)
  ctx.beginPath();
  ctx.roundRect(-20, -8, 14, 16, 3);
  ctx.fillStyle = '#EBEBE6'; // Off-white bandage color
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Bandage texture lines
  ctx.strokeStyle = '#AFAFA5';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, -8); ctx.lineTo(-14, 8);
  ctx.moveTo(-11, -8); ctx.lineTo(-9, 8);
  ctx.stroke();

  // 2. LARGE CLENCHED FIST (Positioned BEHIND blade, right AT the holder ring; Radius = 14px!)
  const fistRadius = 14.0;
  ctx.beginPath();
  ctx.arc(-2, 3, fistRadius, 0, Math.PI * 2);
  ctx.fillStyle = color; // Skin tone matching body
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  ctx.stroke();



  // 3. Black Gauntlet Wrist Ring Holder (Clamping wrist & top of hand)
  const ringW = 9;
  const ringH = 21;
  ctx.beginPath();
  ctx.roundRect(-7, -ringH / 2, ringW, ringH, 4);
  ctx.fillStyle = '#1A1A1D'; // Dark charcoal gauntlet ring
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Metallic ring highlight
  ctx.beginPath();
  ctx.moveTo(-3, -ringH / 2 + 2);
  ctx.lineTo(-3, ringH / 2 - 2);
  ctx.strokeStyle = '#55555C';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. RETRACTABLE SWORD OF EXTERMINATION BLADE (Slides in & out of the wrist gauntlet ring!)
  const retractScale = isGuarding ? 0.45 : (isParrying ? 1.0 : (bladeRetractProgress !== undefined ? Math.max(0, Math.min(1, bladeRetractProgress)) : (isThrowing ? 0.0 : 1.0)));

  if (retractScale > 0.02) {
    ctx.save();
    ctx.scale(retractScale, retractScale); // Smoothly slides back into forearm gauntlet ring!

    const totalStages = fighterObj ? ((fighterObj.adaptationStage?.melee || 0) + (fighterObj.adaptationStage?.ranged || 0) + (fighterObj.adaptationStage?.skill || 0)) : 0;
    const isLevel8 = fighterObj && (totalStages >= 8 || fighterObj.isInfinityBlitz || fighterObj.isMaxAdapted || (fighterObj.goldStages >= 8));

    if (isLevel8) {
      // Golden Level 8 Sword Outer Aura Glow (concentric golden shapes)
      ctx.beginPath();
      ctx.moveTo(-1, -bladeWidth / 2 - 3);
      ctx.lineTo(bladeLength - 14, -bladeWidth / 2 - 2);
      ctx.lineTo(bladeLength + 5, 0);
      ctx.lineTo(bladeLength - 14, bladeWidth / 2 + 2);
      ctx.lineTo(-1, bladeWidth / 2 + 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.40)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -bladeWidth / 2 - 1.5);
      ctx.lineTo(bladeLength - 15, -bladeWidth / 2 - 1);
      ctx.lineTo(bladeLength + 2.5, 0);
      ctx.lineTo(bladeLength - 15, bladeWidth / 2 + 1);
      ctx.lineTo(0, bladeWidth / 2 + 1.5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 238, 88, 0.70)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(1, -bladeWidth / 2);
    ctx.lineTo(bladeLength - 16, -bladeWidth / 2 + 1);
    ctx.lineTo(bladeLength, 0); // Sharp needle tip
    ctx.lineTo(bladeLength - 16, bladeWidth / 2 - 1);
    ctx.lineTo(1, bladeWidth / 2);
    ctx.closePath();

    const bladeGrad = ctx.createLinearGradient(0, -bladeWidth / 2, 0, bladeWidth / 2);
    if (isLevel8) {
      bladeGrad.addColorStop(0, '#FFFFFF');
      bladeGrad.addColorStop(0.25, '#FFEE58');
      bladeGrad.addColorStop(0.65, '#FFD54F');
      bladeGrad.addColorStop(1, '#FFA000');
    } else {
      bladeGrad.addColorStop(0, '#FFFFFF');
      bladeGrad.addColorStop(0.3, '#E2E8F0');
      bladeGrad.addColorStop(0.7, '#CBD5E1');
      bladeGrad.addColorStop(1, '#94A3B8');
    }
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    ctx.strokeStyle = isLevel8 ? '#B78103' : '#000000';
    ctx.lineWidth = 2.2 / Math.max(0.2, retractScale);
    ctx.stroke();

    // Central Beveled Inset
    ctx.beginPath();
    ctx.moveTo(1, -bladeWidth * 0.28);
    ctx.lineTo(bladeLength * 0.62, 0);
    ctx.lineTo(1, bladeWidth * 0.28);
    ctx.closePath();
    ctx.fillStyle = isLevel8 ? '#4E342E' : '#22252A';
    ctx.fill();
    ctx.strokeStyle = isLevel8 ? '#FF8F00' : '#000000';
    ctx.lineWidth = 1.4 / Math.max(0.2, retractScale);
    ctx.stroke();

    // Central Ridge Spine Line
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(bladeLength - 4, 0);
    ctx.strokeStyle = isLevel8 ? '#FFF8E1' : '#FFFFFF';
    ctx.lineWidth = (isLevel8 ? 2.2 : 1.5) / Math.max(0.2, retractScale);
    ctx.stroke();

    ctx.restore();
   // (Section 5 visual overlays removed; trail handles all attack graphics now);
  }

  // (Attack tip sparkle removed)

  ctx.restore();
  ctx.restore();
}

/**
 * Draws Mahoraga's Left Off-Hand (Always visible on the opposite side of the body, lunging forward when punching!).
 */
export function drawMahoragaLeftPunch(ctx, fighter) {
  if (!fighter) return;

  // Smooth continuous progress tracking with multi-frame recovery easing to eliminate 1-frame snaps
  if (fighter.leftPunchTimer > 0) {
    const maxT = (fighter.leftPunchMaxTimer && fighter.leftPunchMaxTimer > 0) ? fighter.leftPunchMaxTimer : 18.0;
    fighter.currentPunchProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.leftPunchTimer / maxT)));
  } else if (fighter.currentPunchProgress > 0) {
    fighter.currentPunchProgress = Math.max(0.0, fighter.currentPunchProgress - 0.12);
  } else {
    fighter.currentPunchProgress = 0.0;
  }

  let lungeProgress = 0;
  const isThrowing = fighter.isThrowing || false;
  const isGuarding = fighter.defensePoseType === 'guard' && (fighter.defensePoseTimer || 0) > 0;

  if (isThrowing) {
    const shotsLeft = fighter.throwBarrageShotsLeft || 0;
    const isLeftArmTurn = (shotsLeft % 2 === 1);
    if (isLeftArmTurn) {
      const interval = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga?.throwBarrageInterval) || 5;
      const t = (fighter.throwBarrageTimer || 0) / interval;
      lungeProgress = Math.sin(t * Math.PI); // Smooth 0 -> 1 -> 0 lunge
    }
  } else if (isGuarding) {
    lungeProgress = 0;
  } else {
    const rawProgress = fighter.currentPunchProgress || 0.0;
    let easePunch = 0;
    if (rawProgress < 0.28) {
      easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
    } else {
      const retractT = (rawProgress - 0.28) / 0.72;
      easePunch = Math.cos(retractT * (Math.PI / 2));
    }
    lungeProgress = easePunch;
  }

  const progress = isThrowing ? lungeProgress : (isGuarding ? 0 : (fighter.currentPunchProgress || 0.0));
  const r = fighter.r || 30;
  
  const gunAngle = fighter.gunAngle || 0;

  ctx.save();
  ctx.translate(fighter.x, fighter.y); // Center of Mahoraga (statically upright)

  // Calculate dynamic reach distance directly toward enemy target so punch connects cleanly!
  let reachDist = 95;
  if (fighter.target) {
    const targetDist = Math.hypot(fighter.target.x - fighter.x, fighter.target.y - fighter.y);
    reachDist = Math.max(55, Math.min(125, targetDist - r * 0.45));
  }

  // Left shoulder is statically positioned on the left side of his chest (centered for martial arts guard)
  const idleX = 0;
  const idleY = 0;

  // Rotate idle shoulder position by bodyAngle (fighter.angle) so arm starts from the correct position on the spinning body
  const bodyAngle = fighter.angle || 0;
  const cosB = Math.cos(bodyAngle);
  const sinB = Math.sin(bodyAngle);
  const rotatedIdleX = idleX * cosB - idleY * sinB;
  const rotatedIdleY = idleX * sinB + idleY * cosB;

  // Punch lunges out in the gunAngle direction
  const punchX = Math.cos(gunAngle) * (r * 0.6 + reachDist);
  const punchY = Math.sin(gunAngle) * (r * 0.6 + reachDist);

  // Position left arm: when idle, rest on the rotated left side. When punching, lunge toward target!
  const punchLunge = lungeProgress * reachDist;

  let armX = rotatedIdleX + lungeProgress * (punchX - rotatedIdleX);
  let armY = rotatedIdleY + lungeProgress * (punchY - rotatedIdleY);

  if (isGuarding) {
    armX = -r * 0.25;
    armY = -r * 0.45;
  }

  ctx.save();
  ctx.translate(armX, armY);
  
  // Rotate the fist & visual trails by gunAngle toward target
  if (isGuarding) {
    ctx.rotate(gunAngle - Math.PI * 0.3);
  } else {
    ctx.rotate(gunAngle);
  }

  // Flip Y when facing left
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Calculate shoulder attachment point in body space and vector back from fist to shoulder
  const shoulderX = -r * 0.5;
  const shoulderY = r * 0.25;
  const dx = shoulderX - armX;
  const dy = shoulderY - armY;
  const armDist = Math.hypot(dx, dy);
  const armAngle = Math.atan2(dy, dx);

  // 1. (Rubber arm stretching removed completely! Fist flies forward cleanly for punch animation)

  // 2. CLENCHED LEFT FIST (Radius = 14.0px, matching right sword hand size!)
  const fistRadius = 14.0;
  ctx.beginPath();
  ctx.arc(0, 0, fistRadius, 0, Math.PI * 2);
  ctx.fillStyle = fighter.color || '#F5F5DC'; // Skin tone matching body
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.stroke();



  // 3. ANIME HIGH-IMPACT PUNCH VISUAL: Distinguishable Conical Air Pressure Blast & Starburst Impact!
  const isGojoDomainActive = typeof state !== 'undefined' && (
    state.activeDomain === 'unlimited_void' || 
    state.domainActive === 'unlimited_void' || 
    (state.fighters && state.fighters.some(f => f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive))
  );

  if (progress > 0.05 && progress < 0.95 && !isThrowing && !isGojoDomainActive) {
    const shockAlpha = Math.sin(progress * Math.PI);

    // 3a. Heavy Fist Motion Trail
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-punchLunge * 0.9, 0);
    ctx.lineTo(14, 0);
    ctx.strokeStyle = `rgba(240, 240, 245, ${shockAlpha * 0.45})`;
    ctx.lineWidth = fistRadius * 2.2;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-punchLunge * 0.7, 0);
    ctx.lineTo(14, 0);
    ctx.strokeStyle = `rgba(255, 255, 255, ${shockAlpha * 0.85})`;
    ctx.lineWidth = fistRadius * 1.1;
    ctx.stroke();
    ctx.restore();

    // 3b. DISTINCT CONICAL SONIC COMPRESSION BLAST (REMOVED - Web-like visual)
    /*
    ctx.save();
    ctx.translate(14, 0);

    const coneLen = 32 + progress * 38;
    const coneWidth = 14 + progress * 28;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(coneLen, -coneWidth);
    ctx.quadraticCurveTo(coneLen + 10, 0, coneLen, coneWidth);
    ctx.closePath();

    const coneGrad = ctx.createLinearGradient(0, 0, coneLen, 0);
    coneGrad.addColorStop(0, `rgba(255, 255, 255, ${shockAlpha * 0.9})`);
    coneGrad.addColorStop(0.35, `rgba(255, 235, 100, ${shockAlpha * 0.75})`);
    coneGrad.addColorStop(0.75, `rgba(255, 160, 0, ${shockAlpha * 0.4})`);
    coneGrad.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = coneGrad;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${shockAlpha * 0.95})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 3c. 8 Radial Sonic Gust Lines
    const numRays = 8;
    for (let i = 0; i < numRays; i++) {
      const rayAngle = ((i / (numRays - 1)) - 0.5) * (Math.PI * 0.65);
      const rayLen = 25 + progress * 32;
      const startDist = 6 + progress * 12;

      ctx.beginPath();
      ctx.moveTo(Math.cos(rayAngle) * startDist, Math.sin(rayAngle) * startDist);
      ctx.lineTo(Math.cos(rayAngle) * (startDist + rayLen), Math.sin(rayAngle) * (startDist + rayLen));
      ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${shockAlpha * 0.95})` : `rgba(255, 223, 0, ${shockAlpha * 0.85})`;
      ctx.lineWidth = 2.4 - (i % 2) * 1.0;
      ctx.stroke();
    }
    ctx.restore();

    // 3d. DENSE DUAL SHOCKWAVE DISKS
    const ringRadius = 16 + progress * 28;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(18 + progress * 12, 0, ringRadius * 0.5, ringRadius * 1.25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 223, 0, ${shockAlpha * 0.95})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(14 + progress * 10, 0, ringRadius * 0.3, ringRadius * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${shockAlpha * 0.9})`;
    ctx.fill();
    ctx.restore();

    // 3e. RADIANT 8-POINT IMPACT STARBURST FLARE
    if (progress > 0.25 && progress < 0.75) {
      const flareAlpha = Math.sin((progress - 0.25) / 0.5 * Math.PI);
      ctx.save();
      ctx.translate(14, 0);
      ctx.strokeStyle = `rgba(255, 255, 255, ${flareAlpha * 0.95})`;
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, -22); ctx.lineTo(0, 22);
      ctx.moveTo(-22, 0); ctx.lineTo(22, 0);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 235, 100, ${flareAlpha * 0.8})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-14, -14); ctx.lineTo(14, 14);
      ctx.moveTo(-14, 14); ctx.lineTo(14, -14);
      ctx.stroke();
      ctx.restore();
    }
    */
  }

  ctx.restore();
  ctx.restore();
}

export function drawMahoragaThrow(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const moveAngle = Math.atan2(vy, vx);
  const now = Date.now();
  const spinAngle = moveAngle + (p.spinOffset || 0) + (now * 0.009);

  ctx.save();
  ctx.translate(p.x, p.y);

  // Soft Ground Drop Shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 18, 28, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();
  ctx.restore();

  ctx.rotate(spinAngle);

  if (p.visual === 'mahoragaBasaltMonolith') {
    // 1. PALE BONE & SLATE MONOLITH (With Radiant Pale Gold Fissure Cracks!)
    ctx.beginPath();
    ctx.moveTo(25, -4);
    ctx.lineTo(16, 20);
    ctx.lineTo(-8, 24);
    ctx.lineTo(-24, 14);
    ctx.lineTo(-26, -10);
    ctx.lineTo(-10, -26);
    ctx.lineTo(14, -20);
    ctx.closePath();

    const basaltGrad = ctx.createLinearGradient(-25, -25, 25, 25);
    basaltGrad.addColorStop(0, '#F1F5F9');   // Pale bone highlight
    basaltGrad.addColorStop(0.5, '#CBD5E1'); // Pale slate gray
    basaltGrad.addColorStop(1, '#64748B');   // Muted stone shadow
    ctx.fillStyle = basaltGrad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Pale Gold-White Cursed Energy Fissure Veins
    ctx.beginPath();
    ctx.moveTo(14, -20); ctx.lineTo(3, -2); ctx.lineTo(-14, 12);
    ctx.moveTo(-8, 24);  ctx.lineTo(1, 4);  ctx.lineTo(16, -8);
    ctx.strokeStyle = '#FEF08A'; // Pale yellow gold fissure lines
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, -2); ctx.lineTo(16, -8);
    ctx.strokeStyle = '#FFFFFF'; // Pure white-hot core
    ctx.lineWidth = 1.4;
    ctx.stroke();

  } else if (p.visual === 'mahoragaRuinConcrete') {
    // 2. PALE ASH CONCRETE SLAB (Pale Ash Gray with Muted Steel Spikes)
    ctx.beginPath();
    ctx.moveTo(26, -12);
    ctx.lineTo(24, 14);
    ctx.lineTo(-22, 16);
    ctx.lineTo(-26, -14);
    ctx.closePath();

    const concGrad = ctx.createLinearGradient(-26, -14, 26, 16);
    concGrad.addColorStop(0, '#E2E8F0');   // Pale ash white
    concGrad.addColorStop(0.6, '#94A3B8'); // Soft cement gray
    concGrad.addColorStop(1, '#475569');   // Muted slate edge
    ctx.fillStyle = concGrad;
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Muted Steel Rebar Spikes
    ctx.strokeStyle = '#94A3B8'; // Pale steel gray
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(26, -6); ctx.lineTo(36, -8);
    ctx.moveTo(24, 8);  ctx.lineTo(33, 12);
    ctx.moveTo(-26, -4); ctx.lineTo(-35, -2);
    ctx.stroke();

    // Subtle Fracture Fissures
    ctx.beginPath();
    ctx.moveTo(-18, -14); ctx.lineTo(-4, 0); ctx.lineTo(20, 14);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.stroke();

  } else {
    // 3. PALE CHALK LIMESTONE RUBBLE (Pale White Ash Stone + Glowing Pale Core)
    ctx.beginPath();
    ctx.moveTo(22, -8);
    ctx.lineTo(18, 16);
    ctx.lineTo(-12, 20);
    ctx.lineTo(-24, 4);
    ctx.lineTo(-18, -20);
    ctx.lineTo(6, -22);
    ctx.closePath();

    const chalkGrad = ctx.createLinearGradient(-24, -22, 22, 20);
    chalkGrad.addColorStop(0, '#F8FAFC');   // Pale chalk white
    chalkGrad.addColorStop(0.5, '#E2E8F0'); // Soft ash gray
    chalkGrad.addColorStop(1, '#94A3B8');   // Pale stone base
    ctx.fillStyle = chalkGrad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Soft Glowing White-Gold Core
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)'; // Pale yellow aura
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; // Pure white core
    ctx.fill();
  }

  ctx.restore();
}

if (typeof window !== 'undefined') {
  window.drawMahoragaLeftPunch = drawMahoragaLeftPunch;
}
