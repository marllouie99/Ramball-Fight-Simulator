// mahoragaWeaponGraphics.js
//  - Use this file for Mahoraga-specific weapon graphics (3D Dharma Wheel & Sword of Extermination).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
import { CONFIG } from '../../core/config.js';

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
    ctx.shadowColor = '#FFDF00';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

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
    ctx.shadowColor = '#00E676';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Crisp white outline on the green arrow
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    ctx.restore();
  }

  ctx.save();
  
  // Position wheel floating above Mahoraga's head with subtle floating animation
  const floatOffset = Math.sin(Date.now() * 0.003) * 2;
  const wheelYOffset = -fighter.r - 28 + floatOffset;
  
  ctx.translate(fighter.x, fighter.y + wheelYOffset);

  const scaleX = MAHORAGA_WEAPON_GRAPHICS.wheel.scaleX;
  const scaleY = MAHORAGA_WEAPON_GRAPHICS.wheel.scaleY;
  const wheelRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.wheelRadius;
  const spokeRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.spokeRadius;
  const sphereRadius = MAHORAGA_WEAPON_GRAPHICS.wheel.sphereRadius;
  const depthOffset = MAHORAGA_WEAPON_GRAPHICS.wheel.depthOffset;

  // Glow Effect when adapting or adapted
  const isGlowing = (fighter.wheelGlowTimer > 0) || (fighter.adapted && (fighter.adapted.melee || fighter.adapted.ranged || fighter.adapted.skill));
  if (isGlowing) {
    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.beginPath();
    ctx.arc(0, 0, spokeRadius + 8, 0, Math.PI * 2);
    const glowAlpha = fighter.wheelGlowTimer > 0 ? (fighter.wheelGlowTimer / 60) : 0.35;
    const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, spokeRadius + 10);
    glowGrad.addColorStop(0, `rgba(255, 223, 0, ${glowAlpha * 0.9})`);
    glowGrad.addColorStop(0.6, `rgba(218, 165, 32, ${glowAlpha * 0.45})`);
    glowGrad.addColorStop(1, 'rgba(218, 165, 32, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fill();
    ctx.restore();
  }

  // ----------------------------------------------------
  // RECOGNIZABLE ROTATION VISUAL EFFECT (DIVINE SHOCKWAVE HALO & SUNBURST RAYS)
  // ----------------------------------------------------
  if (fighter.wheelClickTimer > 0) {
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

  // Calculate total adaptation levels reached across all damage types
  let activeStages = 0;
  if (fighter.adaptationStage) {
    const totalClicks = (fighter.adaptationStage.melee || 0) + (fighter.adaptationStage.ranged || 0) + (fighter.adaptationStage.skill || 0);
    activeStages = Math.min(8, totalClicks);
  } else if (fighter.adapted && (fighter.adapted.melee || fighter.adapted.ranged || fighter.adapted.skill)) {
    activeStages = 1;
  }

  // 5. 8 Golden Handle Spheres (Glow supercharged cyan/white based on adaptation level!)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sx = Math.cos(angle) * spokeRadius;
    const sy = Math.sin(angle) * spokeRadius;
    const isLeveled = i < activeStages;

    // Draw steady outer energy halo around leveled spheres (No spinning/pulsing!)
    if (isLeveled) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, sphereRadius * 3.0, 0, Math.PI * 2);
      const ballGlow = ctx.createRadialGradient(sx, sy, sphereRadius * 0.2, sx, sy, sphereRadius * 3.0);
      ballGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      ballGlow.addColorStop(0.35, 'rgba(255, 235, 100, 0.85)');
      ballGlow.addColorStop(0.7, 'rgba(255, 180, 0, 0.45)');
      ballGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
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
      // Blazing divine white-hot golden energy for adapted spheres
      sphereGrad.addColorStop(0, '#FFFFFF');
      sphereGrad.addColorStop(0.25, '#FFF9C4');
      sphereGrad.addColorStop(0.6, '#FFD700');
      sphereGrad.addColorStop(1, '#FF8C00');
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

  // ----------------------------------------------------
  // LAYER 4: SIMPLE FLOATING NUMBER BESIDE THE WHEEL
  // ----------------------------------------------------
  ctx.save();
  ctx.font = '900 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  const numText = `${activeStages}`;
  const numX = 38;

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(numText, numX, 0);

  ctx.fillStyle = activeStages > 0 ? '#FFD700' : '#E6B800';
  ctx.fillText(numText, numX, 0);
  ctx.restore();

  ctx.restore(); // Restore from wheel translation
}



/**
 * Draws Mahoraga's Sword of Extermination Wrist Blade (Matching Reference Image 2 & 3).
 */
export function drawMahoragaSword(ctx, x = 0, y = 0, gunAngle = 0, r = 30, punchAnimTimer = 0, isCleaving = false, color = '#F5F5DC', swordCombo = 0, isThrowing = false, bladeRetractProgress = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  const bladeLength = 58;
  const bladeWidth = 12;

  let swingAngle = 0;
  let extendDist = 0;

  if (punchAnimTimer > 0) {
    const maxTimer = ((typeof CONFIG !== 'undefined' && CONFIG.mahoraga) ? CONFIG.mahoraga.blitzAttackAnimDuration : 10.0) || 10.0;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (punchAnimTimer / maxTimer))); // 0.0 to 1.0 smooth progression
    const comboIndex = (swordCombo || 0) % 3;

    if (comboIndex === 1) {
      // 1. WIDE HORIZONTAL CLEAVE SWEEP: Sweeps across in a wide 110-degree arc!
      swingAngle = -Math.PI * 0.45 + progress * (Math.PI * 0.90);
      extendDist = Math.sin(progress * Math.PI) * 20;
    } else if (comboIndex === 2) {
      // 2. DOWNWARD DIAGONAL OVERHEAD CHOP: Winds up high and chops down with heavy momentum!
      swingAngle = Math.PI * 0.50 - progress * (Math.PI * 0.95);
      extendDist = Math.sin(progress * Math.PI) * 24;
    } else {
      // 3. DIVINE PIERCING THRUST & FLICK: Forward thrust lunging out with a sharp wrist twist
      swingAngle = Math.sin(progress * Math.PI * 2) * 0.20;
      extendDist = Math.sin(progress * Math.PI) * 32;
    }
  } else if (isThrowing) {
    // Bare-handed stance (blade smoothly retracted into forearm gauntlet)
    swingAngle = -Math.PI * 0.25;
    extendDist = 10;
  }

  // Position right arm extending cleanly out from body
  const armX = r * 0.8 + extendDist;
  const armY = r * 0.25;

  ctx.save();
  ctx.translate(armX, armY);
  ctx.rotate(swingAngle);

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

  // Knuckle / finger details on large fist
  ctx.beginPath();
  ctx.arc(-1, 7, 5.0, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(4, 3, 4.0, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
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
  const retractScale = bladeRetractProgress !== undefined ? Math.max(0, Math.min(1, bladeRetractProgress)) : (isThrowing ? 0.0 : 1.0);

  if (retractScale > 0.02) {
    ctx.save();
    ctx.scale(retractScale, retractScale); // Smoothly slides back into forearm gauntlet ring!

    ctx.beginPath();
    ctx.moveTo(1, -bladeWidth / 2);
    ctx.lineTo(bladeLength - 16, -bladeWidth / 2 + 1);
    ctx.lineTo(bladeLength, 0); // Sharp needle tip
    ctx.lineTo(bladeLength - 16, bladeWidth / 2 - 1);
    ctx.lineTo(1, bladeWidth / 2);
    ctx.closePath();

    const bladeGrad = ctx.createLinearGradient(0, -bladeWidth / 2, 0, bladeWidth / 2);
    bladeGrad.addColorStop(0, '#FFFFFF');
    bladeGrad.addColorStop(0.3, '#E2E8F0');
    bladeGrad.addColorStop(0.7, '#CBD5E1');
    bladeGrad.addColorStop(1, '#94A3B8');
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2 / Math.max(0.2, retractScale);
    ctx.stroke();

    // Central Beveled Inset
    ctx.beginPath();
    ctx.moveTo(1, -bladeWidth * 0.28);
    ctx.lineTo(bladeLength * 0.62, 0);
    ctx.lineTo(1, bladeWidth * 0.28);
    ctx.closePath();
    ctx.fillStyle = '#22252A';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4 / Math.max(0.2, retractScale);
    ctx.stroke();

    // Central Ridge Spine Line
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(bladeLength - 4, 0);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5 / Math.max(0.2, retractScale);
    ctx.stroke();

    ctx.restore();
  }

  // 5. ATTACK VISUAL EFFECTS (Differentiated for Thrust vs Slash!)
  if (punchAnimTimer > 0 || isCleaving) {
    const maxT = ((typeof CONFIG !== 'undefined' && CONFIG.mahoraga) ? CONFIG.mahoraga.blitzAttackAnimDuration : 10.0) || 10.0;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (punchAnimTimer / maxT)));
    const comboIndex = swordCombo % 3;

    ctx.save();
    const alpha = Math.sin(progress * Math.PI);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 1.25));

    if (comboIndex === 0) {
      // ----------------------------------------------------
      // THRUST ATTACK VISUAL: SMOOTH TRAILING V-SPEED LINES (Following blade motion!)
      // ----------------------------------------------------
      const currentBladeTipX = bladeLength + extendDist;

      // 1. Center White-Hot Needle Laser Spike (Smoothly follows thrust)
      const centerTailX = bladeLength - 14;
      const centerHeadX = currentBladeTipX + 12;
      
      ctx.beginPath();
      ctx.moveTo(centerTailX, 0);
      ctx.lineTo(centerHeadX, 0);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2. Dynamic Trailing V-Speed Lines (Stretching & trailing smoothly behind blade tip!)
      const lineTrailLength = 20 + progress * 26; // Stretches out dynamically as thrust accelerates!
      
      const vLines = [
        // Top V-branch (slanting back close to upper blade edge)
        { headOffsetX: 4,   headOffsetY: -3, tailOffsetY: -8,  width: 1.8, color: '#FFFFFF' },
        { headOffsetX: -2,  headOffsetY: -4, tailOffsetY: -12, width: 1.5, color: '#FFF59D' },
        { headOffsetX: -8,  headOffsetY: -5, tailOffsetY: -15, width: 1.2, color: '#FFD700' },
        { headOffsetX: -15, headOffsetY: -6, tailOffsetY: -18, width: 1.0, color: '#FF9100' },
        
        // Bottom V-branch (slanting back close to lower blade edge)
        { headOffsetX: 4,   headOffsetY: 3,  tailOffsetY: 8,   width: 1.8, color: '#FFFFFF' },
        { headOffsetX: -2,  headOffsetY: 4,  tailOffsetY: 12,  width: 1.5, color: '#FFF59D' },
        { headOffsetX: -8,  headOffsetY: 5,  tailOffsetY: 15,  width: 1.2, color: '#FFD700' },
        { headOffsetX: -15, headOffsetY: 6,  tailOffsetY: 18,  width: 1.0, color: '#FF9100' },
      ];

      for (let i = 0; i < vLines.length; i++) {
        const line = vLines[i];
        const lineHeadX = currentBladeTipX + line.headOffsetX;
        const lineTailX = lineHeadX - lineTrailLength;

        ctx.beginPath();
        ctx.moveTo(lineHeadX, line.headOffsetY);
        ctx.lineTo(lineTailX, line.tailOffsetY);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

    } else {
      // ----------------------------------------------------
      // SLASH ATTACK VISUAL: RAZOR-SHARP NEEDLE-TAPERED CRESCENT WAVE
      // ----------------------------------------------------
      let arcStart = -Math.PI * 0.45;
      let arcEnd = Math.PI * 0.45;
      let sweepRadius = bladeLength + 28;

      if (comboIndex === 1) {
        // Horizontal sweep: wide left-to-right arc
        arcStart = -Math.PI * 0.72;
        arcEnd = Math.PI * 0.38;
      } else {
        // Vertical chop: top-to-bottom steep arc
        arcStart = Math.PI * 0.65;
        arcEnd = -Math.PI * 0.48;
      }

      const tailProgress = Math.max(0, progress - 0.48);
      const currentArcEnd = arcStart + (arcEnd - arcStart) * progress;
      const tailArcStart = arcStart + (arcEnd - arcStart) * tailProgress;

      const numSteps = 28;
      const maxBladeThickness = 14.0;

      // A. MAIN RAZOR-SHARP CRESCENT BODY
      ctx.beginPath();
      for (let i = 0; i <= numSteps; i++) {
        const tArc = i / numSteps;
        const angle = tailArcStart + (currentArcEnd - tailArcStart) * tArc;
        const thickness = maxBladeThickness * Math.sin(tArc * Math.PI);
        const r = sweepRadius + thickness * 0.5;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let i = numSteps; i >= 0; i--) {
        const tArc = i / numSteps;
        const angle = tailArcStart + (currentArcEnd - tailArcStart) * tArc;
        const thickness = maxBladeThickness * Math.sin(tArc * Math.PI);
        const r = sweepRadius - thickness * 0.5;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        ctx.lineTo(px, py);
      }
      ctx.closePath();

      const razorGrad = ctx.createLinearGradient(
        Math.cos(currentArcEnd) * sweepRadius, Math.sin(currentArcEnd) * sweepRadius,
        Math.cos(tailArcStart) * sweepRadius, Math.sin(tailArcStart) * sweepRadius
      );
      razorGrad.addColorStop(0, '#FFFFFF');               // Blazing white-hot razor head
      razorGrad.addColorStop(0.2, '#FFF9C4');            // Diamond white-gold
      razorGrad.addColorStop(0.55, '#FFD700');           // Radiant gold body
      razorGrad.addColorStop(0.85, '#FF9100');           // Razor orange trailing edge
      razorGrad.addColorStop(1, 'rgba(255, 235, 50, 0)'); // Fading needle tail

      ctx.fillStyle = razorGrad;
      ctx.shadowColor = '#FFEA00';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // B. WHITE-HOT CORE NEEDLE LINE
      ctx.beginPath();
      for (let i = 0; i <= numSteps; i++) {
        const tArc = i / numSteps;
        const angle = tailArcStart + (currentArcEnd - tailArcStart) * tArc;
        const px = Math.cos(angle) * sweepRadius;
        const py = Math.sin(angle) * sweepRadius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // C. PARALLEL SECONDARY RAZOR WISPS
      for (let w = 0; w < 2; w++) {
        const offsetRad = sweepRadius - 7 - w * 7;
        const wispMaxThick = 5.0 - w * 1.5;

        ctx.beginPath();
        for (let i = 0; i <= numSteps; i++) {
          const tArc = i / numSteps;
          const angle = tailArcStart + (currentArcEnd - tailArcStart) * (0.15 + tArc * 0.75);
          const thickness = wispMaxThick * Math.sin(tArc * Math.PI);
          const r = offsetRad + thickness * 0.5;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        for (let i = numSteps; i >= 0; i--) {
          const tArc = i / numSteps;
          const angle = tailArcStart + (currentArcEnd - tailArcStart) * (0.15 + tArc * 0.75);
          const thickness = wispMaxThick * Math.sin(tArc * Math.PI);
          const r = offsetRad - thickness * 0.5;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 - w * 0.25})`;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Attack tip sparkle
  if (punchAnimTimer > 0 || isCleaving) {
    ctx.beginPath();
    ctx.arc(bladeLength - 2, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws Mahoraga's Left Off-Hand Punch (Layered BEHIND body, hidden when idle!).
 */
export function drawMahoragaLeftPunch(ctx, fighter) {
  if (!fighter || !fighter.leftPunchTimer || fighter.leftPunchTimer <= 0) return;

  const maxT = fighter.leftPunchMaxTimer || ((typeof CONFIG !== 'undefined' && CONFIG.mahoraga) ? CONFIG.mahoraga.blitzAttackAnimDuration : 10.0) || 10.0;
  const progress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.leftPunchTimer / maxT)));
  
  // Forward lunging punch extension out past body (+48px lunge distance!)
  const punchLunge = Math.sin(progress * Math.PI) * 48;
  const r = fighter.r || 30;
  
  const gunAngle = fighter.gunAngle || 0;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Position left arm offset laterally out to the side (-r * 0.65) with floating forward extension
  const armX = r * 0.6 + punchLunge;
  const armY = -r * 0.65;

  ctx.save();
  ctx.translate(armX, armY);

  // 1. White Bandaged Left Forearm (Extended outward into fist)
  ctx.beginPath();
  ctx.roundRect(-28, -9, 22, 18, 4);
  ctx.fillStyle = '#EBEBE6'; // Off-white bandage color
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Bandage texture lines
  ctx.strokeStyle = '#AFAFA5';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-22, -9); ctx.lineTo(-19, 9);
  ctx.moveTo(-14, -9); ctx.lineTo(-11, 9);
  ctx.stroke();

  // 2. MASSIVE PROMINENT CLENCHED LEFT FIST (Radius = 16px!)
  const fistRadius = 16.0;
  ctx.beginPath();
  ctx.arc(0, 0, fistRadius, 0, Math.PI * 2);
  ctx.fillStyle = fighter.color || '#F5F5DC'; // Skin tone matching body
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Knuckle & finger lines on clenched fist
  ctx.beginPath();
  ctx.arc(3, 4, 6.0, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-3, 3, 5.0, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 3. ANIME HIGH-IMPACT PUNCH VISUAL: Motion Trail, Air Gust Speed Lines & Golden Shockwave Disks!
  if (progress > 0.05 && progress < 0.95) {
    const shockAlpha = Math.sin(progress * Math.PI);

    // 3a. Fist Motion Streak / Trail behind punching arm
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-punchLunge * 0.8, 0);
    ctx.lineTo(12, 0);
    ctx.strokeStyle = `rgba(255, 215, 0, ${shockAlpha * 0.45})`;
    ctx.lineWidth = fistRadius * 1.8;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-punchLunge * 0.6, 0);
    ctx.lineTo(12, 0);
    ctx.strokeStyle = `rgba(255, 255, 255, ${shockAlpha * 0.75})`;
    ctx.lineWidth = fistRadius * 0.9;
    ctx.stroke();
    ctx.restore();

    // 3b. Forward Impact Speed Lines (Radiating Air Gust Blast)
    ctx.save();
    ctx.translate(16, 0);
    const numLines = 6;
    for (let i = 0; i < numLines; i++) {
      const lineAngle = ((i / (numLines - 1)) - 0.5) * (Math.PI * 0.5);
      const lineLen = 22 + progress * 26;
      const startDist = 8 + progress * 10;
      
      ctx.beginPath();
      ctx.moveTo(Math.cos(lineAngle) * startDist, Math.sin(lineAngle) * startDist);
      ctx.lineTo(Math.cos(lineAngle) * (startDist + lineLen), Math.sin(lineAngle) * (startDist + lineLen));
      ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${shockAlpha * 0.9})` : `rgba(254, 240, 138, ${shockAlpha * 0.85})`;
      ctx.lineWidth = 2.2 - (i % 2) * 0.8;
      ctx.stroke();
    }
    ctx.restore();

    // 3c. Expanding Air-Pressure Shockwave Rings (Golden + White Core)
    const ringRadius = 14 + progress * 24;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(18 + progress * 10, 0, ringRadius * 0.6, ringRadius * 1.2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${shockAlpha * 0.95})`;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(14 + progress * 8, 0, ringRadius * 0.35, ringRadius * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${shockAlpha * 0.85})`;
    ctx.fill();
    ctx.restore();

    // 3d. Cross Flare at Peak Impact (progress ~ 0.5)
    if (progress > 0.35 && progress < 0.65) {
      const flareAlpha = Math.sin((progress - 0.35) / 0.3 * Math.PI);
      ctx.save();
      ctx.translate(14, 0);
      ctx.strokeStyle = `rgba(255, 255, 255, ${flareAlpha})`;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(0, 18);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.lineTo(18, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
  ctx.restore();
}

if (typeof window !== 'undefined') {
  window.drawMahoragaLeftPunch = drawMahoragaLeftPunch;
}
