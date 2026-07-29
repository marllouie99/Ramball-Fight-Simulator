import { getHandSize } from '../../core/config.js';

/**
 * Visual Skin Renderer for Aoi Todo (Boogie Woogie Brawler)
 */
export function drawTodoSkin(ctx, fighter) {
  const r = fighter.r;
  const skinColor = (fighter.color && fighter.color !== '#1A1A2E' && fighter.color !== '#8D5524') ? fighter.color : '#D89B77'; // Natural human skin brown

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(fighter.gunAngle + Math.PI / 2);

  // 1. Natural Human Skin Brown Body Base
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 2. Spiky Hair & Topknot (Man-Bun) - Large and prominent on top edge
  ctx.fillStyle = '#181820'; // Dark hair base
  // Spiky hair tufts along top curve of head
  ctx.beginPath();
  ctx.arc(-r * 0.70, 0, r * 0.55, Math.PI * 0.45, Math.PI * 1.55);
  ctx.fill();

  // Larger Topknot Bun centered on the top edge of the body (-r)
  ctx.beginPath();
  ctx.arc(-r * 0.95, 0, r * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Topknot Gold/Yellow hair tie band (larger)
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(-r * 0.85, -r * 0.20, 5, r * 0.40);

  // 3. Authentic Anime Facial Burn Scar (Multi-stepped patch matching reference image)
  ctx.save();
  ctx.fillStyle = '#83472C'; // Burned skin tissue brown-red
  ctx.beginPath();
  // Wide top edge along hair line
  ctx.moveTo(-r * 0.48, -r * 0.52);
  ctx.lineTo(-r * 0.48, -r * 0.22);

  // Inner edge (near nose/center line)
  ctx.lineTo(-r * 0.15, -r * 0.20);
  ctx.lineTo(r * 0.20, -r * 0.18);
  ctx.lineTo(r * 0.50, -r * 0.18);
  ctx.lineTo(r * 0.72, -r * 0.22);

  // Bottom edge (flat/rounded taper)
  ctx.lineTo(r * 0.72, -r * 0.32);

  // Outer edge (wavy stepped temple/cheekbone contour)
  ctx.lineTo(r * 0.55, -r * 0.42);
  ctx.lineTo(r * 0.40, -r * 0.55);
  ctx.lineTo(r * 0.18, -r * 0.62);
  ctx.lineTo(-r * 0.18, -r * 0.60);
  ctx.closePath();
  ctx.fill();

  // Dark border outline around burn scar
  ctx.strokeStyle = '#4D2413';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Horizontal skin crease lines across burn scar (matching reference image)
  ctx.strokeStyle = 'rgba(60, 25, 10, 0.55)';
  ctx.lineWidth = 1.0;
  const creasePositions = [-0.40, -0.25, -0.10, 0.05, 0.20, 0.35, 0.50, 0.62];
  for (let posX of creasePositions) {
    const x = r * posX;
    ctx.beginPath();
    ctx.moveTo(x, -r * 0.48);
    ctx.lineTo(x, -r * 0.24);
    ctx.stroke();
  }

  ctx.restore();

  // 4. Martial Artist Eyebrows & Eyes
  ctx.fillStyle = '#0F0F14';
  // Right Eyebrow & Eye
  ctx.beginPath();
  ctx.moveTo(r * 0.3, r * 0.25);
  ctx.lineTo(r * 0.55, r * 0.2);
  ctx.lineTo(r * 0.35, r * 0.35);
  ctx.fill();

  // Left Eyebrow & Eye
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.25);
  ctx.lineTo(r * 0.55, -r * 0.2);
  ctx.lineTo(r * 0.35, -r * 0.35);
  ctx.fill();

  // 5. "Black Flash Window" / Just Swapped Aura
  if (fighter.justSwappedTimer > 0) {
    const alpha = fighter.justSwappedTimer / 45;
    ctx.strokeStyle = `rgba(180, 0, 0, ${alpha})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Red/Black electrical arcs
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, Math.PI * 0.2, Math.PI * 0.8);
    ctx.arc(0, 0, r + 7, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }

  ctx.restore();

  // 7. Draw Hands (Recolored plain brown hands matching skin tone)
  drawTodoHands(ctx, fighter, skinColor);

  // 8. Draw Cursed Rocks
  drawCursedRocks(ctx, fighter);
}

function drawTodoHands(ctx, fighter, skinColor) {
  const isPunching = fighter.punchAnimTimer > 0;
  const isClapping = fighter.boogieWoogieCooldown > fighter.boogieWoogieCooldownMax - 10;

  const handRadius = getHandSize(7.5);
  const r = fighter.r;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(fighter.gunAngle + Math.PI / 2); // Side-profile rotation (same as body)

  // Smooth progress calculation matching Mahoraga's cubic ease-in-out curve
  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchMaxTime || 16;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }
  
  const smoothProgress = rawProgress < 0.5 
    ? 4 * rawProgress * rawProgress * rawProgress 
    : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
    
  const lungeExtension = Math.sin(smoothProgress * Math.PI) * 32; // Dynamic punch lunge forward

  // In this rotated space: +X = forward (toward enemy), Y = left/right sides
  // Side-profile stance: hands on opposite sides of body, aligned
  let frontHandX = r * 0.35;     // Slightly forward
  let frontHandY = r * 0.85;     // Right side of body

  let backHandX = r * 0.35;      // Slightly forward
  let backHandY = -r * 0.85;     // Left side of body

  // Handle punch animations (lunge toward enemy = extend along +X axis)
  if (isPunching) {
    if (fighter.isRightPunch) {
      frontHandX += lungeExtension;   // Front hand lunges forward toward enemy
      frontHandY *= 0.4;              // Move toward center as fist extends
    } else {
      backHandX += lungeExtension;    // Back hand cross-punches forward
      backHandY *= 0.4;               // Move toward center as fist extends
    }
  }

  // Clapping animation override (Boogie Woogie swap trigger)
  if (isClapping) {
    frontHandX = 4;
    frontHandY = -(r + 6);
    backHandX = -4;
    backHandY = -(r + 6);
  }

  // Draw both hands (ALWAYS visible in side-profile guard stance)
  drawHandFist(ctx, backHandX, backHandY, handRadius, skinColor);
  drawHandFist(ctx, frontHandX, frontHandY, handRadius, skinColor);

  // Clap shockwave visual
  if (isClapping) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -(r + 8), 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#4DA3FF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -(r + 8), 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Draws a brawler fist matching skin color */
function drawHandFist(ctx, x, y, radius, skinColor) {
  ctx.save();

  // Fist base - matching human skin brown color
  ctx.fillStyle = (skinColor && skinColor !== '#1A1A2E' && skinColor !== '#8D5524') ? skinColor : '#D89B77';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Solid black fist outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawCursedRocks(ctx, fighter) {
  if (!fighter.cursedRocks || fighter.cursedRocks.length === 0) return;

  for (let rock of fighter.cursedRocks) {
    ctx.fillStyle = '#555'; // Grey rock
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
    ctx.fill();

    // Cursed energy glow around rock
    ctx.strokeStyle = 'rgba(77, 163, 255, 0.8)'; // Blue Cursed Energy
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

