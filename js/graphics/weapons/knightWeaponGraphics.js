import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';

let _knightShieldImage = null;
let _knightShieldImageLoading = false;

export function _getKnightShieldImage() {
  if (_knightShieldImage && _knightShieldImage.complete && _knightShieldImage.naturalWidth > 0) {
    return _knightShieldImage;
  }
  if (!_knightShieldImageLoading && typeof Image !== 'undefined') {
    _knightShieldImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _knightShieldImage = img;
      _knightShieldImageLoading = false;
    };
    img.onerror = () => {
      if (!img.src.includes('.jpg')) {
        img.src = 'Assets/model/Knight/Knight_shield.jpg?v=1';
      } else {
        _knightShieldImageLoading = false;
      }
    };
    img.src = 'Assets/model/Knight/Knight_shield.png?v=1';
    _knightShieldImage = img;
  }
  return _knightShieldImage;
}

let _knightSwordImage = null;
let _knightSwordImageLoading = false;

export function _getKnightSwordImage() {
  if (_knightSwordImage && _knightSwordImage.complete && _knightSwordImage.naturalWidth > 0) {
    return _knightSwordImage;
  }
  if (!_knightSwordImageLoading && typeof Image !== 'undefined') {
    _knightSwordImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _knightSwordImage = img;
      _knightSwordImageLoading = false;
    };
    img.onerror = () => {
      if (!img.src.includes('.jpg')) {
        img.src = 'Assets/model/Knight/Knight_sword.jpg?v=1';
      } else {
        _knightSwordImageLoading = false;
      }
    };
    img.src = 'Assets/model/Knight/Knight_sword.png?v=1';
    _knightSwordImage = img;
  }
  return _knightSwordImage;
}

let _knightGoldSwordImage = null;
let _knightGoldSwordImageLoading = false;

export function _getKnightGoldSwordImage() {
  if (_knightGoldSwordImage && _knightGoldSwordImage.complete && _knightGoldSwordImage.naturalWidth > 0) {
    return _knightGoldSwordImage;
  }
  if (!_knightGoldSwordImageLoading && typeof Image !== 'undefined') {
    _knightGoldSwordImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _knightGoldSwordImage = img;
      _knightGoldSwordImageLoading = false;
    };
    img.onerror = () => {
      _knightGoldSwordImageLoading = false;
    };
    img.src = 'Assets/model/Knight/Knight_goldsword.png?v=1';
    _knightGoldSwordImage = img;
  }
  return _knightGoldSwordImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getKnightShieldImage();
  _getKnightSwordImage();
  _getKnightGoldSwordImage();
}

export function drawGrayShield(ctx, x, y, gunAngle, blockFlashTimer, dashState, r, dashGlowFade = 0, shieldVisualOffset = 0, isBroken = false) {
  // When shield is shattered/broken, shield is completely gone and hand remains bare/empty
  if (isBroken) {
    return;
  }

  const fps = state.fps || 60;
  const qualityLevel = state.qualityLevel || 1.0;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const isFFA = typeof state !== 'undefined' && state.mode === 'FFA';
  const useLOD = isFFA || isMulti && (qualityLevel < 1.0 || fps < 55);
  const useUltraLOD = isFFA || isMulti && (qualityLevel <= 0.5 || fps < 40);

  ctx.save();
  ctx.translate(x, y);
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const shieldAngle = gunAngle + shieldVisualOffset;
  ctx.rotate(shieldAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.translate(r + 12, 0); 

  const shieldScale = 1.8;

  // Modern Sci-Fi Palette
  const armorDark = '#1f2124';
  const armorMid = '#2a2d34';
  const armorLight = '#414652';
  const outline = '#0a0a0c';
  
  let neonCore = '#ffd700'; // Bright gold when active
  let neonGlow = 'rgba(255, 180, 0, 0.7)';

  // ── SHIELD BODY RENDERING ──
  const shieldImg = _getKnightShieldImage();
  const hasShieldImg = shieldImg && shieldImg.complete && shieldImg.naturalWidth > 0;

  if (hasShieldImg) {
    const shieldW = 38.0;
    const shieldH = 66.0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(shieldImg, -shieldW / 2, -shieldH / 2 + 4, shieldW, shieldH);
    ctx.restore();
  } else {
    // BASE SHIELD: Hexagonal/Angular Riot Shield Profile (Procedural Fallback)
    ctx.beginPath();
    ctx.moveTo(0, -16 * shieldScale);
    ctx.lineTo(14 * shieldScale, -8 * shieldScale);
    ctx.lineTo(10 * shieldScale, 16 * shieldScale);
    ctx.lineTo(0, 24 * shieldScale);
    ctx.lineTo(-10 * shieldScale, 16 * shieldScale);
    ctx.lineTo(-14 * shieldScale, -8 * shieldScale);
    ctx.closePath();

    const shieldGradient = ctx.createLinearGradient(-14 * shieldScale, -16 * shieldScale, 14 * shieldScale, 24 * shieldScale);
    shieldGradient.addColorStop(0, armorLight);
    shieldGradient.addColorStop(0.5, armorMid);
    shieldGradient.addColorStop(1, armorDark);
    ctx.fillStyle = shieldGradient;
    ctx.fill();
    
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5 * shieldScale;
    ctx.lineJoin = 'miter';
    ctx.stroke();

    // INNER ARMOR PLATING
    ctx.beginPath();
    ctx.moveTo(0, -12 * shieldScale);
    ctx.lineTo(10 * shieldScale, -6 * shieldScale);
    ctx.lineTo(7 * shieldScale, 13 * shieldScale);
    ctx.lineTo(0, 19 * shieldScale);
    ctx.lineTo(-7 * shieldScale, 13 * shieldScale);
    ctx.lineTo(-10 * shieldScale, -6 * shieldScale);
    ctx.closePath();
    ctx.fillStyle = armorDark;
    ctx.fill();
    ctx.lineWidth = 1 * shieldScale;
    ctx.stroke();

    // Sci-Fi Tech Panel Lines (cutting across the armor)
    ctx.beginPath();
    ctx.moveTo(-9 * shieldScale, -2 * shieldScale);
    ctx.lineTo(9 * shieldScale, -2 * shieldScale);
    
    ctx.moveTo(0, 19 * shieldScale);
    ctx.lineTo(0, 12 * shieldScale);
    
    ctx.moveTo(-7 * shieldScale, 13 * shieldScale);
    ctx.lineTo(-4 * shieldScale, 8 * shieldScale);
    
    ctx.moveTo(7 * shieldScale, 13 * shieldScale);
    ctx.lineTo(4 * shieldScale, 8 * shieldScale);
    
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.5 * shieldScale;
    ctx.stroke();

    // Inner holographic edge wireframe
    ctx.beginPath();
    ctx.moveTo(0, -10 * shieldScale);
    ctx.lineTo(8 * shieldScale, -5 * shieldScale);
    ctx.lineTo(5 * shieldScale, 11 * shieldScale);
    ctx.lineTo(0, 16 * shieldScale);
    ctx.lineTo(-5 * shieldScale, 11 * shieldScale);
    ctx.lineTo(-8 * shieldScale, -5 * shieldScale);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 180, 0, 0.3)';
    ctx.lineWidth = 1 * shieldScale;
    ctx.stroke();

    // GLOWING NEON ENERGY REACTOR CORE
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer emitter ring
    ctx.beginPath();
    ctx.arc(0, 4 * shieldScale, 4.5 * shieldScale, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1 * shieldScale;
    ctx.stroke();
    
    // Neon circuit lines emitting from the reactor
    ctx.beginPath();
    ctx.moveTo(0, -0.5 * shieldScale);
    ctx.lineTo(0, -8 * shieldScale);
    
    ctx.moveTo(4.5 * shieldScale, 4 * shieldScale);
    ctx.lineTo(8 * shieldScale, 4 * shieldScale);
    ctx.lineTo(10 * shieldScale, 0);

    ctx.moveTo(-4.5 * shieldScale, 4 * shieldScale);
    ctx.lineTo(-8 * shieldScale, 4 * shieldScale);
    ctx.lineTo(-10 * shieldScale, 0);

    ctx.moveTo(0, 8.5 * shieldScale);
    ctx.lineTo(0, 15 * shieldScale);
    
    ctx.strokeStyle = neonCore;
    ctx.lineWidth = 2 * shieldScale;
    ctx.stroke();

    // White-hot reactor center
    ctx.beginPath();
    ctx.arc(0, 4 * shieldScale, 2.5 * shieldScale, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    // Tech Decals on the outer rim
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(11 * shieldScale, -8 * shieldScale);
    ctx.lineTo(13 * shieldScale, -7 * shieldScale);
    ctx.lineTo(13 * shieldScale, -5 * shieldScale);
    ctx.lineTo(11 * shieldScale, -6 * shieldScale);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-11 * shieldScale, -8 * shieldScale);
    ctx.lineTo(-13 * shieldScale, -7 * shieldScale);
    ctx.lineTo(-13 * shieldScale, -5 * shieldScale);
    ctx.lineTo(-11 * shieldScale, -6 * shieldScale);
    ctx.fill();

    // Mechanical vent details
    ctx.fillStyle = outline;
    const vents = [
      [0, -14], [8, 14], [0, 21], [-8, 14]
    ];
    for (let pos of vents) {
      ctx.beginPath();
      ctx.rect((pos[0] - 1) * shieldScale, (pos[1] - 0.5) * shieldScale, 2 * shieldScale, 1 * shieldScale);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawSwordBase(ctx, swordScale, isBroken, isTrail = false) {
  const fps = state.fps || 60;
  const qualityLevel = state.qualityLevel || 1.0;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const useLOD = (typeof state !== 'undefined' && state.mode === 'FFA') || isMulti && (qualityLevel < 1.0 || fps < 55);
  const useUltraLOD = isMulti && (qualityLevel <= 0.5 || fps < 40);

  // ── PIXEL ART WEAPON RENDERING (Assets/model/Knight/Knight_sword.png) ──
  const swordImg = _getKnightSwordImage();
  const hasSwordImg = swordImg && swordImg.complete && swordImg.naturalWidth > 0;

  if (hasSwordImg) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (isBroken) {
      // 1. Broken broadsword stump (clipped to hilt and base of blade)
      ctx.save();
      ctx.beginPath();
      ctx.rect(-35 * swordScale, -18 * swordScale, 55 * swordScale, 36 * swordScale);
      ctx.clip();
      ctx.rotate(0.8793); // +50.38 deg alignment
      const s = (75.0 * swordScale) / 1393.62;
      ctx.scale(s, s);
      ctx.drawImage(swordImg, -308.3, -1073.5);
      ctx.restore();

    } else {
      ctx.rotate(0.8793); // +50.38 deg alignment around grip (308.3, 1073.5)
      const s = (75.0 * swordScale) / 1393.62;
      ctx.scale(s, s);
      ctx.drawImage(swordImg, -308.3, -1073.5);
    }
    ctx.restore();
    return;
  }

  // Sci-Fi Palette (Procedural Fallback)
  const armorDark = '#1a1c20';
  const armorMid = '#2a2d34';
  const outline = '#0a0a0c';
  
  const neonCore = '#ffffff'; 
  const neonEdge = '#ffb300'; // Bright amber/gold edge

  // 1. PLASMA BLADE
  if (isBroken) {
    ctx.beginPath();
    ctx.moveTo(0, -3 * swordScale);
    ctx.lineTo(15 * swordScale, -3 * swordScale);
    ctx.lineTo(20 * swordScale, 0); 
    ctx.lineTo(15 * swordScale, 3 * swordScale);
    ctx.lineTo(0, 3 * swordScale);
    ctx.closePath();

    const bladeGradient = ctx.createLinearGradient(0, -3 * swordScale, 20 * swordScale, 3 * swordScale);
    bladeGradient.addColorStop(0, neonEdge);
    bladeGradient.addColorStop(0.5, neonCore); 
    bladeGradient.addColorStop(1, neonEdge);
    ctx.fillStyle = bladeGradient;
    ctx.fill();

    // Broken Dark Metal Spine
    ctx.beginPath();
    ctx.moveTo(0, -4 * swordScale);
    ctx.lineTo(10 * swordScale, -4 * swordScale);
    ctx.lineTo(15 * swordScale, 0); 
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = armorDark;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();

    // Sputtering energy edge with intense multi-layered glow
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(15 * swordScale, 0);
    ctx.lineTo(20 * swordScale, 0);
    ctx.lineTo(15 * swordScale, 4 * swordScale);
    ctx.lineTo(0, 4 * swordScale);
    ctx.closePath();
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!isTrail && !useLOD) {
      // 1. Wide ambient glow
      ctx.strokeStyle = 'rgba(255, 150, 0, 0.2)';
      ctx.lineWidth = 14 * swordScale;
      ctx.stroke();

      // 2. Intense tight glow with bloom
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.lineWidth = 6 * swordScale;
      ctx.stroke();
    } else {
      // Simplified neon core for trails to massively boost FPS
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 4 * swordScale;
      ctx.stroke();
    }

    // 3. Sharp inner edge
    ctx.strokeStyle = neonEdge;
    ctx.lineWidth = 2.5 * swordScale;
    ctx.stroke();
    
    // 4. White-hot searing core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8 * swordScale;
    ctx.stroke();
    
    ctx.restore();
    
    // Sparks
    ctx.beginPath();
    ctx.moveTo(20 * swordScale, 0);
    ctx.lineTo(24 * swordScale, -2 * swordScale);
    ctx.moveTo(15 * swordScale, 4 * swordScale);
    ctx.lineTo(18 * swordScale, 6 * swordScale);
    ctx.strokeStyle = neonCore;
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();

  } else {
    // Full Plasma Blade
    ctx.beginPath();
    ctx.moveTo(0, -3 * swordScale);
    ctx.lineTo(60 * swordScale, -3 * swordScale);
    ctx.lineTo(70 * swordScale, 0); // Angular tip
    ctx.lineTo(60 * swordScale, 3 * swordScale);
    ctx.lineTo(0, 3 * swordScale);
    ctx.closePath();

    const bladeGradient = ctx.createLinearGradient(0, -3 * swordScale, 70 * swordScale, 3 * swordScale);
    bladeGradient.addColorStop(0, neonEdge);
    bladeGradient.addColorStop(0.3, neonCore); 
    bladeGradient.addColorStop(1, neonEdge);
    ctx.fillStyle = bladeGradient;
    ctx.fill();

    // Dark Metal Spine on top
    ctx.beginPath();
    ctx.moveTo(0, -4 * swordScale);
    ctx.lineTo(55 * swordScale, -4 * swordScale);
    ctx.lineTo(65 * swordScale, 0); 
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = armorDark;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();

    // Glowing energy edge outline with intense multi-layered bloom
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(65 * swordScale, 0);
    ctx.lineTo(70 * swordScale, 0);
    ctx.lineTo(60 * swordScale, 4 * swordScale);
    ctx.lineTo(0, 4 * swordScale);
    ctx.closePath();
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!isTrail && !useLOD) {
      // 1. Wide ambient glow
      ctx.strokeStyle = 'rgba(255, 150, 0, 0.2)';
      ctx.lineWidth = 16 * swordScale;
      ctx.stroke();

      // 2. Intense tight glow with bloom
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.lineWidth = 8 * swordScale;
      ctx.stroke();
    } else {
      // Simplified neon core for trails to massively boost FPS
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 5 * swordScale;
      ctx.stroke();
    }

    // 3. Sharp inner edge
    // OPTIMIZED: Removed shadowBlur
    ctx.strokeStyle = neonEdge;
    ctx.lineWidth = 2.5 * swordScale;
    ctx.stroke();
    
    // 4. White-hot searing core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();
    
    ctx.restore();
    
    // High-tech circuit notches on spine
    if (!useLOD) {
      ctx.strokeStyle = neonEdge;
      ctx.lineWidth = 1 * swordScale;
      for(let i = 15; i < 45; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i * swordScale, -3 * swordScale);
          ctx.lineTo((i + 3) * swordScale, 0);
          ctx.stroke();
      }
    }
  }

  // 2. HILT / GRIP (Modern cylindrical)
  ctx.fillStyle = armorDark;
  ctx.fillRect(-22 * swordScale, -2.5 * swordScale, 18 * swordScale, 5 * swordScale);
  ctx.strokeStyle = outline;
  ctx.strokeRect(-22 * swordScale, -2.5 * swordScale, 18 * swordScale, 5 * swordScale);

  // Neon grip rings
  ctx.strokeStyle = neonEdge;
  ctx.lineWidth = 1.5 * swordScale;
  ctx.beginPath();
  for(let i = -19; i <= -7; i += 4) {
    ctx.moveTo(i * swordScale, -2.5 * swordScale);
    ctx.lineTo(i * swordScale, 2.5 * swordScale);
  }
  ctx.stroke();

  // Pommel (Angular counterweight)
  ctx.beginPath();
  ctx.moveTo(-22 * swordScale, -3.5 * swordScale);
  ctx.lineTo(-26 * swordScale, -1.5 * swordScale);
  ctx.lineTo(-26 * swordScale, 1.5 * swordScale);
  ctx.lineTo(-22 * swordScale, 3.5 * swordScale);
  ctx.closePath();
  ctx.fillStyle = armorMid;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5 * swordScale;
  ctx.stroke();

  // 3. SCIFI CROSSGUARD / EMITTER
  ctx.fillStyle = armorMid;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5 * swordScale;

  // Swept-back angular emitter module
  ctx.beginPath();
  ctx.moveTo(-2 * swordScale, -6 * swordScale);
  ctx.lineTo(6 * swordScale, -8 * swordScale);
  ctx.lineTo(10 * swordScale, -5 * swordScale); // Forward swept
  ctx.lineTo(4 * swordScale, -2 * swordScale);
  // Bottom side
  ctx.lineTo(4 * swordScale, 2 * swordScale);
  ctx.lineTo(10 * swordScale, 5 * swordScale);
  ctx.lineTo(6 * swordScale, 8 * swordScale);
  ctx.lineTo(-2 * swordScale, 6 * swordScale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing emitter core window
  ctx.fillStyle = neonCore;
  ctx.beginPath();
  ctx.moveTo(2 * swordScale, -3 * swordScale);
  ctx.lineTo(6 * swordScale, -5 * swordScale);
  ctx.lineTo(4 * swordScale, -2 * swordScale);
  ctx.lineTo(4 * swordScale, 2 * swordScale);
  ctx.lineTo(6 * swordScale, 5 * swordScale);
  ctx.lineTo(2 * swordScale, 3 * swordScale);
  ctx.closePath();
  ctx.fill();
}

// ─────────────────────────────────────────────
// MINECRAFT GOLDEN SWORD RENDERER (OFFSCREEN CACHE)
// ─────────────────────────────────────────────

const MC_GOLD_SWORD_MAP = [
  "...............O", // 0
  "..............OT", // 1
  ".............OGH", // 2
  "............OGHO", // 3
  "...........OGHO.", // 4
  "..........OGHO..", // 5
  ".........OGHO...", // 6
  "........OGHO....", // 7
  ".O.....OGHO.....", // 8
  ".OCc..OSHO......", // 9
  "..OCCcCCO.......", // 10
  "...OWCCO........", // 11
  "..OwWO.O........", // 12
  ".OWwO...........", // 13
  ".OPCO...........", // 14
  "..O............."  // 15
];

const MC_PALETTE = {
  'O': '#2A1806', // Iconic dark outline
  'W': '#5A361A', // Dark oak wood handle
  'w': '#88542A', // Light oak wood handle
  'P': '#E5A016', // Pommel gold
  'C': '#B57407', // Dark crossguard gold
  'c': '#F8D838', // Mid crossguard gold
  'G': '#F8D838', // Bright butter gold blade
  'H': '#FFF9A6', // Specular blade edge highlight
  'S': '#C78508', // Shadow gold blade edge
  'T': '#FFFFFF'  // Diamond-sharp tip glint
};

let _cachedMinecraftGoldSwordCanvas = null;

function _getMinecraftGoldSwordCanvas() {
  if (_cachedMinecraftGoldSwordCanvas) return _cachedMinecraftGoldSwordCanvas;

  if (typeof document === 'undefined') return null;

  const P = 3.8;
  const canvasW = 120;
  const canvasH = 70;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = false;

  const originX = 26;
  const originY = 35;

  c.save();
  c.translate(originX, originY);
  c.rotate(Math.PI / 4);

  const gripCol = 3.5;
  const gripRow = 12.0;

  for (let r = 0; r < 16; r++) {
    const row = MC_GOLD_SWORD_MAP[r];
    for (let col = 0; col < 16; col++) {
      const ch = row[col];
      if (ch === '.' || !MC_PALETTE[ch]) continue;

      const px = Math.round((col - gripCol) * P);
      const py = Math.round((r - gripRow) * P);

      c.fillStyle = MC_PALETTE[ch];
      c.fillRect(px, py, Math.ceil(P), Math.ceil(P));
    }
  }

  c.restore();

  _cachedMinecraftGoldSwordCanvas = canvas;
  return _cachedMinecraftGoldSwordCanvas;
}

export function drawMinecraftGoldSword(ctx, isSwinging = false, isTrail = false, swordScale = 1.0) {
  const goldImg = _getKnightGoldSwordImage();
  const hasGoldImg = goldImg && goldImg.complete && goldImg.naturalWidth > 0;

  if (hasGoldImg) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Subtle enchanted golden aura when swinging
    if (isSwinging && !isTrail) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.22)';
      ctx.beginPath();
      ctx.arc(44 * swordScale, 0, 32 * swordScale, 0, Math.PI * 2);
      ctx.fill();

      // Sharp golden glint stars at the blade tip
      ctx.fillStyle = '#FFF9A6';
      ctx.fillRect(72 * swordScale, -2 * swordScale, 4 * swordScale, 4 * swordScale);
      ctx.fillStyle = '#FFE082';
      ctx.fillRect(66 * swordScale, 2 * swordScale, 3 * swordScale, 3 * swordScale);
      ctx.restore();
    }

    // Align Minecraft Gold Sword along +X axis matching Knight's default broadsword
    // Rotate +52.76 deg (+0.9209 rad) around grip (35, 125) to tip (130, 0)
    ctx.rotate(0.9209);

    // Scale calibrated to 1:1 match default broadsword: 75.0px blade reach, ~99px total length
    const scale = (75.0 * swordScale) / 157.0;
    ctx.scale(scale, scale);
    ctx.drawImage(goldImg, -35, -125);

    ctx.restore();
    return;
  }

  const cachedCanvas = _getMinecraftGoldSwordCanvas();
  if (cachedCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(-13, 0);

    // Subtle enchanted golden aura when swinging
    if (isSwinging && !isTrail) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.20)';
      ctx.beginPath();
      ctx.arc(32, 0, 24, 0, Math.PI * 2);
      ctx.fill();

      // Sharp golden glint stars at the blade tip
      ctx.fillStyle = '#FFF9A6';
      ctx.fillRect(48, -2, 3, 3);
      ctx.fillStyle = '#FFE082';
      ctx.fillRect(44, 2, 2, 2);
      ctx.restore();
    }

    ctx.drawImage(cachedCanvas, -26, -35);
    ctx.restore();
  } else {
    // Fallback: draw regular sword base with gold accent
    drawSwordBase(ctx, 1.0, false, isTrail);
  }
}

export function drawGraySword(ctx, x, y, gunAngle, r, dashState = null, isTrail = false, isSwinging = false, isGoldSword = false) {
  ctx.save();
  ctx.translate(x, y);
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (isSwinging) {
    ctx.rotate(gunAngle);
    if (facingLeft) ctx.scale(1, -1);
    ctx.translate(r + 14, 0);
  } else {
    // Upright ready guard: held along left flank, blade pointing upward
    ctx.rotate(gunAngle);
    if (facingLeft) ctx.scale(1, -1);
    ctx.translate(-(r + 10), 4);
    ctx.rotate(-Math.PI / 2);
  }

  if (isGoldSword) {
    drawMinecraftGoldSword(ctx, isSwinging, isTrail);
  } else {
    drawSwordBase(ctx, 1.0, false, isTrail);
  }
  ctx.restore();
}

export function drawGrayBrokenSword(ctx, x, y, gunAngle, r, dashState = null, isTrail = false, isSwinging = false) {
  ctx.save();
  ctx.translate(x, y);
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (isSwinging) {
    ctx.rotate(gunAngle);
    if (facingLeft) ctx.scale(1, -1);
    ctx.translate(r + 14, 0);
  } else {
    // Upright ready guard: held along left flank, blade pointing upward
    ctx.rotate(gunAngle);
    if (facingLeft) ctx.scale(1, -1);
    ctx.translate(-(r + 10), 4);
    ctx.rotate(-Math.PI / 2);
  }
  drawSwordBase(ctx, 1.0, true, isTrail);
  ctx.restore();
}

export function drawGraySwordProjectile(ctx, x, y, angle, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // Add a glowing aura to the thrown sword (OPTIMIZED: removed shadowBlur)
  
  drawSwordBase(ctx, Math.max(0.4, scale), false);
  ctx.restore();
}
