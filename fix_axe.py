import re

with open('js/graphics/weapons/berserkerWeaponGraphics.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace BERSERKER_WEAPON_GRAPHICS colors
color_target = '''export const BERSERKER_WEAPON_GRAPHICS = {
  axe: {
    handleBase: '#4a3018',           // Brown wooden handle
    handleRage: '#5a2010',           // Rage mode handle (darkens slightly reddish)
    gripColor: '#1a1105',            // Dark leather grip wrap
    collarColor: '#222222',          // Dark iron metal collar
    bladeCoreA: '#b0b5b9',           // Main blade color (steel)
    bladeCoreARage: '#ff2a2a',       // Rage mode blade (glows red)
    bladeCoreB: '#d0d5d9',           // Blade highlight (light steel)
    bladeCoreBRage: '#ff6a6a',       // Rage mode highlight
    bladeSpine: '#404549',           // Blade shadow (dark iron)
    bladeSpineRage: '#6a1010',       // Rage mode shadow
    bladeEdge: '#f0f5f9',            // Blade edge (sharp bright steel)
    bladeEdgeRage: '#ffd0d0',        // Rage mode edge
    rageGlow: 'rgba(255, 0, 0, 0.35)', // Rage aura
  },'''

color_replacement = '''export const BERSERKER_WEAPON_GRAPHICS = {
  axe: {
    handleBase: '#2b2d31',           // Dark grey metal handle (sci-fi)
    handleRage: '#3a1e1e',           // Rage mode handle
    gripColor: '#0a0b0c',            // Black synthetic grip wrap
    collarColor: '#181a1f',          // Dark armor alloy collar
    bladeCoreA: '#353a40',           // Main blade color (dark sci-fi alloy)
    bladeCoreARage: '#4a2020',       // Rage mode blade
    bladeCoreB: '#4c535c',           // Blade highlight (lighter alloy)
    bladeCoreBRage: '#6a2b2b',       // Rage mode highlight
    bladeSpine: '#000000',           // Black edges
    bladeSpineRage: '#000000',       // Black edges in rage
    bladeEdge: '#00ffff',            // Neon cyan edge
    bladeEdgeRage: '#ff3333',        // Neon red edge in rage
    rageGlow: 'rgba(255, 0, 0, 0.35)', // Rage aura
  },'''

content = content.replace(color_target, color_replacement)


# 2. Replace drawSingleAxe logic perfectly
# Since it's large, we use regex to extract and replace the entire function

import re

new_draw_single_axe = '''function drawSingleAxe(ctx, xOffset, scale, isInRage, isRight, axeSwingActive, glowIntensity = 1.0, isTrail = false) {
  ctx.save();
  ctx.translate(xOffset, 0);

  const axe = BERSERKER_WEAPON_GRAPHICS.axe;
  const bladeDir = isRight ? 1 : -1;

  // Colors
  const handleBase = isInRage ? axe.handleRage : axe.handleBase;
  const bladeCoreA = isInRage ? axe.bladeCoreARage : axe.bladeCoreA;
  const bladeCoreB = isInRage ? axe.bladeCoreBRage : axe.bladeCoreB;
  const bladeSpine = isInRage ? axe.bladeSpineRage : axe.bladeSpine;
  const bladeEdge = isInRage ? axe.bladeEdgeRage : axe.bladeEdge;

  // --- HANDLE ---
  ctx.fillStyle = handleBase;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.rect(-2.5 * scale, -12 * scale, 5 * scale, 36 * scale);
  ctx.fill();
  ctx.stroke();

  // Leather wrap (rugged, horizontal/angled strips on lower grip)
  ctx.strokeStyle = axe.gripColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.lineCap = 'butt';
  for (let i = 0; i < 7; i++) {
    const yy = 6 * scale + i * 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-2.5 * scale, yy);
    ctx.lineTo(2.5 * scale, yy + 1.5 * scale);
    ctx.stroke();
  }

  // Pommel (Crushing mace head / heavy spike)
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-4 * scale, 24 * scale);
  ctx.lineTo(4 * scale, 24 * scale);
  ctx.lineTo(5 * scale, 28 * scale);
  ctx.lineTo(0, 34 * scale);
  ctx.lineTo(-5 * scale, 28 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- COLLAR (Forged Armor Housing) ---
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  // Bulky rectangular clamp with angled corners
  ctx.moveTo(-4 * scale, -18 * scale);
  ctx.lineTo(4 * scale, -18 * scale);
  ctx.lineTo(5 * scale, -14 * scale);
  ctx.lineTo(5 * scale, 2 * scale);
  ctx.lineTo(4 * scale, 6 * scale);
  ctx.lineTo(-4 * scale, 6 * scale);
  ctx.lineTo(-5 * scale, 2 * scale);
  ctx.lineTo(-5 * scale, -14 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing vertical rune in the collar
  ctx.fillStyle = isInRage ? '#fff' : bladeEdge;
  if (!isTrail) {
    ctx.shadowColor = isInRage ? '#ff3333' : '#00ffff';
    ctx.shadowBlur = 6 * scale;
  }
  ctx.beginPath();
  ctx.moveTo(0, -14 * scale);
  ctx.lineTo(1.5 * scale, -10 * scale);
  ctx.lineTo(0, -2 * scale);
  ctx.lineTo(-1.5 * scale, -10 * scale);
  ctx.closePath();
  ctx.fill();
  if (!isTrail) {
    ctx.shadowBlur = 0; // reset
  }

  // --- BLADE ---
  // Rage glow behind the blade (Flickering fiery energy aura)
  if (isInRage) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const t = Date.now() / 70; // Fast flicker

    // Draw fewer layers for trails to optimize FPS
    const numLayers = isTrail ? 1 : 3;

    for (let i = 0; i < numLayers; i++) {
      ctx.beginPath();
      ctx.moveTo(bladeDir * 2 * scale, -16 * scale);

      // Jitter function makes the aura spike out randomly
      const jx = (val) => val + (Math.sin(t * (i + 1) + val) * 2 - 1) * (3 + i) * scale;
      const jy = (val) => val + (Math.cos(t * (i + 2) + val) * 2 - 1) * (3 + i) * scale;

      ctx.lineTo(jx(bladeDir * 18 * scale), jy(-22 * scale));
      ctx.lineTo(jx(bladeDir * 25 * scale), jy(-10 * scale));
      ctx.lineTo(jx(bladeDir * 22 * scale), jy(14 * scale));

      // Wrap around the back hook
      ctx.lineTo(jx(-bladeDir * 20 * scale), jy(5 * scale));
      ctx.lineTo(jx(-bladeDir * 16 * scale), jy(-18 * scale));
      ctx.closePath();

      ctx.fillStyle = i === 0 ? gba(255, 0, 0, ) :
        i === 1 ? gba(220, 0, 0, ) :
          gba(180, 0, 0, );

      // shadowBlur is very expensive, disable it for trails
      if (!isTrail) {
        ctx.shadowColor = '#ff2000';
        ctx.shadowBlur = (10 + i * 10) * glowIntensity;
      }
      ctx.fill();
    }
    ctx.restore();
  }

  if (isTrail) {
    ctx.restore();
    return; // Do not draw the physical axe body if this is just a motion trail layer
  }

  // Main Blade (Brutal Bearded Axe)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bladeDir * 2 * scale, -16 * scale); // Top attachment
  ctx.lineTo(bladeDir * 15 * scale, -18 * scale); // Top outer spike
  ctx.lineTo(bladeDir * 20 * scale, -10 * scale); // Mid outer 1 (chopping face)
  ctx.lineTo(bladeDir * 16 * scale, -7 * scale); // Jagged notch inner
  ctx.lineTo(bladeDir * 21 * scale, -4 * scale); // Jagged notch outer
  ctx.lineTo(bladeDir * 19 * scale, 10 * scale); // Beard outer point
  ctx.lineTo(bladeDir * 16 * scale, 14 * scale); // Bottom beard corner
  ctx.lineTo(bladeDir * 2 * scale, 4 * scale); // Bottom attachment
  ctx.quadraticCurveTo(bladeDir * 10 * scale, -6 * scale, bladeDir * 2 * scale, -16 * scale); // Inner cutout
  ctx.closePath();

  // Metallic gradient across the blade body
  const bodyGrad = ctx.createLinearGradient(0, -18 * scale, bladeDir * 21 * scale, 14 * scale);
  bodyGrad.addColorStop(0, bladeSpine);
  bodyGrad.addColorStop(0.5, bladeCoreA);
  bodyGrad.addColorStop(1, bladeCoreB);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Spine outline (Black stroke to the edges of his weapon)
  ctx.lineWidth = 2.0 * scale;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  const pulse = (0.7 + 0.3 * Math.sin(Date.now() / 150)) * glowIntensity;

  // Sci-fi Neon Inner Groove
  ctx.beginPath();
  ctx.moveTo(bladeDir * 6 * scale, -12 * scale);
  ctx.lineTo(bladeDir * 14 * scale, -12 * scale);
  ctx.lineTo(bladeDir * 12 * scale, -7 * scale);
  ctx.lineTo(bladeDir * 15 * scale, -4 * scale);
  ctx.lineTo(bladeDir * 14 * scale, 4 * scale);
  ctx.lineTo(bladeDir * 11 * scale, 6 * scale);
  ctx.lineTo(bladeDir * 6 * scale, 0 * scale);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // Outer glow
  ctx.lineWidth = 5.0 * scale;
  ctx.globalAlpha = 0.4 * pulse;
  ctx.strokeStyle = isInRage ? '#ff0000' : '#00ffff';
  if (!isTrail) { ctx.shadowColor = isInRage ? '#ff0000' : '#00ffff'; ctx.shadowBlur = 10 * scale; }
  ctx.stroke();

  // Inner bright core
  ctx.globalAlpha = 1.0;
  ctx.lineWidth = 2.0 * scale;
  ctx.strokeStyle = isInRage ? '#ff9999' : '#b3ffff'; 
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();

  // Bright edge rim (Glowing neon on the axe's blade chopping edge)
  ctx.beginPath();
  ctx.moveTo(bladeDir * 15 * scale, -18 * scale);
  ctx.lineTo(bladeDir * 20 * scale, -10 * scale);
  ctx.lineTo(bladeDir * 16 * scale, -7 * scale);
  ctx.lineTo(bladeDir * 21 * scale, -4 * scale);
  ctx.lineTo(bladeDir * 19 * scale, 10 * scale);
  ctx.lineTo(bladeDir * 16 * scale, 14 * scale);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // Outer glow
  ctx.lineWidth = 5.0 * scale;
  ctx.globalAlpha = 0.4 * pulse;
  ctx.strokeStyle = isInRage ? '#ff0000' : '#00ffff';
  if (!isTrail) { ctx.shadowColor = isInRage ? '#ff0000' : '#00ffff'; ctx.shadowBlur = 12 * scale; }
  ctx.stroke();
  
  // Edge rim core
  ctx.globalAlpha = 1.0;
  ctx.lineWidth = 2.0 * scale;
  ctx.strokeStyle = isInRage ? '#ff9999' : '#b3ffff';
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // --- BACK SPIKE (Forged Hook) ---
  ctx.beginPath();
  ctx.moveTo(-bladeDir * 2 * scale, -12 * scale); // Top attachment
  ctx.lineTo(-bladeDir * 14 * scale, -10 * scale); // Top outer
  ctx.lineTo(-bladeDir * 10 * scale, -7 * scale); // Notch inner
  ctx.lineTo(-bladeDir * 18 * scale, 0 * scale); // Bottom outer hook
  ctx.lineTo(-bladeDir * 2 * scale, -4 * scale); // Bottom attachment
  ctx.quadraticCurveTo(-bladeDir * 6 * scale, -8 * scale, -bladeDir * 2 * scale, -12 * scale); // Inner curve
  ctx.closePath();

  const spikeGrad = ctx.createLinearGradient(0, -12 * scale, -bladeDir * 18 * scale, 0);
  spikeGrad.addColorStop(0, bladeCoreA);
  spikeGrad.addColorStop(1, bladeSpine);
  ctx.fillStyle = spikeGrad;
  ctx.fill();

  // Black stroke for back spike
  ctx.lineWidth = 2.0 * scale;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  // Spike Edge highlight (also neon)
  ctx.beginPath();
  ctx.moveTo(-bladeDir * 14 * scale, -10 * scale);
  ctx.lineTo(-bladeDir * 10 * scale, -7 * scale);
  ctx.lineTo(-bladeDir * 18 * scale, 0 * scale);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // Outer glow
  ctx.lineWidth = 4.0 * scale;
  ctx.globalAlpha = 0.4 * pulse;
  ctx.strokeStyle = isInRage ? '#ff0000' : '#00ffff';
  if (!isTrail) { ctx.shadowColor = isInRage ? '#ff0000' : '#00ffff'; ctx.shadowBlur = 8 * scale; }
  ctx.stroke();
  
  // Inner core
  ctx.globalAlpha = 1.0;
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = isInRage ? '#ff9999' : '#b3ffff';
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
'''

pattern = r'function drawSingleAxe\([\s\S]*?^}'

content = re.sub(pattern, new_draw_single_axe, content, flags=re.MULTILINE)

with open('js/graphics/weapons/berserkerWeaponGraphics.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
