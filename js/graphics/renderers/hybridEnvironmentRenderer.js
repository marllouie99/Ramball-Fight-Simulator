import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { renderGojoDomainBackground } from '../../entities/fighters/gojo/gojoDomainVisuals.js';
import { renderSukunaDomainBackground } from '../../entities/fighters/sukuna/sukunaDomainVisuals.js';
import { renderYutaDomainBackground, renderYutaSukunaDomainClashRift } from '../../entities/fighters/yuta/yutaDomainVisuals.js';
import { renderMahitoDomainBackground } from './environmentalRenderer.js';
import { drawLaylaMaleficSurgeGrid } from '../../entities/fighters/LaylaFighter.js';
import { drawCronosSphereVisual } from '../draw.js';

let furnaceDimSprite = null;
let currentFurnaceDimOpacity = 0;
let domainUpdateTick = 0;

let rikaSummonDimSprite = null;
let currentRikaSummonDimOpacity = 0;

function getRikaSummonDimSprite() {
  if (!rikaSummonDimSprite) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const cx = size / 2;
    const cy = size / 2;
    
    // 1. Pitch black base overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
    ctx.fillRect(0, 0, size, size);
    
    // 2. High-contrast hot pink / deep violet radial gradient centered on Yuta
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
    grad.addColorStop(0, 'rgba(255, 20, 147, 0.95)');   // Bright intense hot pink center
    grad.addColorStop(0.06, 'rgba(230, 0, 160, 0.85)'); // Concentrated magenta/purple aura ring
    grad.addColorStop(0.18, 'rgba(20, 2, 35, 0.92)');   // Falloff to deep dark violet
    grad.addColorStop(0.55, 'rgba(5, 1, 6, 0.97)');     // Deep dark background
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.99)');      // Pitch black outer screen
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const texture = window.PIXI.Texture.from(canvas);
    rikaSummonDimSprite = new window.PIXI.Sprite(texture);
    rikaSummonDimSprite.anchor.set(0.5);
    rikaSummonDimSprite.blendMode = window.PIXI.BLEND_MODES.MULTIPLY;
  }
  return rikaSummonDimSprite;
}

let rikaRingSprite = null;

function getRikaRingSprite() {
  if (!rikaRingSprite && state.pixiApp) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 85, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF1493';
    ctx.lineWidth = 14;
    ctx.stroke();
    
    const texture = window.PIXI.Texture.from(canvas);
    rikaRingSprite = new window.PIXI.Sprite(texture);
    rikaRingSprite.anchor.set(0.5);
    rikaRingSprite.blendMode = window.PIXI.BLEND_MODES.ADD;
  }
  return rikaRingSprite;
}

function getFurnaceDimSprite() {
  if (!furnaceDimSprite) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const cx = size / 2;
    const cy = size / 2;
    
    // 1. Pitch black base overlay
    ctx.fillStyle = `rgba(0, 0, 0, 0.98)`;
    ctx.fillRect(0, 0, size, size);

    // 2. Tight, high-contrast radial flame gradient centered on Sukuna/Arrow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
    grad.addColorStop(0, `rgba(255, 140, 0, 0.95)`);   // Bright intense fiery orange spot at Fuga cast center
    grad.addColorStop(0.06, `rgba(255, 70, 0, 0.85)`);  // Concentrated orange-red flame ring
    grad.addColorStop(0.15, `rgba(160, 25, 0, 0.70)`); // Deep crimson flame aura
    grad.addColorStop(0.30, `rgba(25, 4, 2, 0.92)`);   // Quick falloff to dark void
    grad.addColorStop(0.55, `rgba(5, 1, 1, 0.97)`);    // Deep dark background
    grad.addColorStop(1.0, `rgba(0, 0, 0, 0.99)`);    // Pitch black outer screen
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const texture = window.PIXI.Texture.from(canvas);
    furnaceDimSprite = new window.PIXI.Sprite(texture);
    furnaceDimSprite.anchor.set(0.5);
    furnaceDimSprite.blendMode = window.PIXI.BLEND_MODES.MULTIPLY;
  }
  return furnaceDimSprite;
}

let currentPurpleDimOpacity = 0;
let purpleDimSprite = null;

function getPurpleDimSprite() {
  if (!purpleDimSprite) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const cx = size / 2;
    const cy = size / 2;
    
    // 1. Pitch black base overlay
    ctx.fillStyle = `rgba(0, 0, 0, 0.98)`;
    ctx.fillRect(0, 0, size, size);
    
    // 2. Tight, high-contrast electric purple radial gradient centered on Gojo's Purple cast/orb position
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
    grad.addColorStop(0, `rgba(195, 80, 255, 0.95)`);   // Intense bright electric purple spot at Purple center
    grad.addColorStop(0.06, `rgba(147, 51, 234, 0.85)`);  // Concentrated violet-purple aura ring
    grad.addColorStop(0.15, `rgba(88, 28, 135, 0.70)`);   // Deep purple void aura
    grad.addColorStop(0.30, `rgba(20, 2, 35, 0.92)`);    // Quick falloff to dark void
    grad.addColorStop(0.55, `rgba(5, 1, 10, 0.97)`);     // Deep dark background
    grad.addColorStop(1.0, `rgba(0, 0, 0, 0.99)`);     // Pitch black outer screen
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const texture = window.PIXI.Texture.from(canvas);
    purpleDimSprite = new window.PIXI.Sprite(texture);
    purpleDimSprite.anchor.set(0.5);
    purpleDimSprite.blendMode = window.PIXI.BLEND_MODES.MULTIPLY;
  }
  return purpleDimSprite;
}

let mahoragaDimSprite = null;

function getMahoragaDimSprite() {
  if (!mahoragaDimSprite) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, size * 0.02, cx, cy, size * 0.5);
    grad.addColorStop(0, `rgba(40, 30, 8, 0.65)`);
    grad.addColorStop(0.25, `rgba(18, 12, 3, 0.88)`);
    grad.addColorStop(0.60, `rgba(8, 4, 1, 0.96)`);
    grad.addColorStop(1.0, `rgba(0, 0, 0, 0.98)`);
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const texture = window.PIXI.Texture.from(canvas);
    mahoragaDimSprite = new window.PIXI.Sprite(texture);
    mahoragaDimSprite.anchor.set(0.5);
    mahoragaDimSprite.blendMode = window.PIXI.BLEND_MODES.MULTIPLY;
  }
  return mahoragaDimSprite;
}

let tojiUltimateContainer = null;
let tojiDimSprite = null;
let tojiFlyHeadContainer = null;
const flyHeadSpritePool = [];
let activeFlyHeads = [];
let currentTojiUltimateOpacity = 0;

function getTojiUltimateContainer() {
  if (!tojiUltimateContainer && state.pixiApp) {
    tojiUltimateContainer = new window.PIXI.Container();
    
    // Background dark dim sprite
    tojiDimSprite = new window.PIXI.Sprite(state.baseCircleTexture);
    tojiDimSprite.tint = 0x050505;
    tojiDimSprite.anchor.set(0.5);
    tojiUltimateContainer.addChild(tojiDimSprite);
    
    // Container for fly head sprites
    tojiFlyHeadContainer = new window.PIXI.Container();
    tojiUltimateContainer.addChild(tojiFlyHeadContainer);
  }
  return tojiUltimateContainer;
}

function getFlyHeadSprite() {
  if (flyHeadSpritePool.length > 0) {
    const s = flyHeadSpritePool.pop();
    s.visible = true;
    return s;
  }
  if (!state.baseCircleTexture || !tojiFlyHeadContainer) return null;
  const s = new window.PIXI.Sprite(state.baseCircleTexture);
  s.anchor.set(0.5);
  s.tint = 0x141414;
  tojiFlyHeadContainer.addChild(s);
  return s;
}

function releaseFlyHeadSprite(s) {
  if (!s) return;
  s.visible = false;
  flyHeadSpritePool.push(s);
}

function syncDomainHybridDataSize(data) {
  if (state.canvas && (data.canvas.width !== state.canvas.width || data.canvas.height !== state.canvas.height)) {
    data.canvas.width = state.canvas.width;
    data.canvas.height = state.canvas.height;
    if (data.texture && data.texture.baseTexture) {
      data.texture.baseTexture.setSize(state.canvas.width, state.canvas.height);
    }
    data.texture.update();
  }
}

let gojoDomainHybridData = null;
function getGojoDomainHybridData() {
  if (!gojoDomainHybridData) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas ? state.canvas.width : 1920;
    canvas.height = state.canvas ? state.canvas.height : 1080;
    const ctx = canvas.getContext('2d');
    const texture = window.PIXI.Texture.from(canvas);
    const sprite = new window.PIXI.Sprite(texture);
    gojoDomainHybridData = { canvas, ctx, texture, sprite };
  }
  syncDomainHybridDataSize(gojoDomainHybridData);
  return gojoDomainHybridData;
}

let sukunaDomainHybridData = null;
function getSukunaDomainHybridData() {
  if (!sukunaDomainHybridData) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas ? state.canvas.width : 1920;
    canvas.height = state.canvas ? state.canvas.height : 1080;
    const ctx = canvas.getContext('2d');
    const texture = window.PIXI.Texture.from(canvas);
    const sprite = new window.PIXI.Sprite(texture);
    sukunaDomainHybridData = { canvas, ctx, texture, sprite };
  }
  syncDomainHybridDataSize(sukunaDomainHybridData);
  return sukunaDomainHybridData;
}

let yutaDomainHybridData = null;
function getYutaDomainHybridData() {
  if (!yutaDomainHybridData) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas ? state.canvas.width : 1920;
    canvas.height = state.canvas ? state.canvas.height : 1080;
    const ctx = canvas.getContext('2d');
    const texture = window.PIXI.Texture.from(canvas);
    const sprite = new window.PIXI.Sprite(texture);
    yutaDomainHybridData = { canvas, ctx, texture, sprite };
  }
  syncDomainHybridDataSize(yutaDomainHybridData);
  return yutaDomainHybridData;
}

let mahitoDomainHybridData = null;
function getMahitoDomainHybridData() {
  if (!mahitoDomainHybridData) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas ? state.canvas.width : 1920;
    canvas.height = state.canvas ? state.canvas.height : 1080;
    const ctx = canvas.getContext('2d');
    const texture = window.PIXI.Texture.from(canvas);
    const sprite = new window.PIXI.Sprite(texture);
    mahitoDomainHybridData = { canvas, ctx, texture, sprite };
  }
  syncDomainHybridDataSize(mahitoDomainHybridData);
  return mahitoDomainHybridData;
}

export function updateHybridEnvironment() {
  if (!state.pixiApp || !state.pixiLayers?.environment || !state.pixiLayers?.effects) return;
  const layer = state.pixiLayers.environment;
  const dimLayer = state.pixiLayers.effects;
  const maxDim = Math.max(state.canvas.width, state.canvas.height);
  const scale = (maxDim * 2.5) / 512;
  
  // 0. Domain Expansions
  const gojo = state.fighters?.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive);
  const sukuna = state.fighters?.find(f => f && (f.characterId === 'sukuna' || f.type === 'sukuna' || f._def?.type === 'sukuna') && f.domainActive);
  const yuta = state.fighters?.find(f => f && (f.characterId === 'yuta' || f.type === 'yuta' || f._def?.type === 'yuta') && f.domainActive);
  const mahito = state.fighters?.find(f => f && (f.characterId === 'mahito' || f.type === 'mahito') && (f.domainActive || f._mahitoDomainActive));
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);

  domainUpdateTick++;
  
  // Performance: Throttle & stagger domain texture updates to eliminate CPU-to-GPU VRAM bandwidth stalls (especially during Multi-Domain clashes)
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const baseInterval = isLowQuality ? 18 : 6;
  const updateInterval = isMultiDomain ? baseInterval * 2 : baseInterval;

  const updateGojo = (domainUpdateTick % updateInterval === 0);
  const updateSukuna = (domainUpdateTick % updateInterval === Math.floor(updateInterval / 3));
  const updateYuta = (domainUpdateTick % updateInterval === Math.floor(updateInterval * 2 / 3));

  if (gojo) {
    const data = getGojoDomainHybridData();
    if (!data.sprite.parent) layer.addChild(data.sprite);
    data.sprite.x = -20;
    data.sprite.y = -20;
    data.sprite.width = state.canvas.width + 40;
    data.sprite.height = state.canvas.height + 40;
    if (updateGojo) {
      data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
      renderGojoDomainBackground(gojo, data.ctx, isMultiDomain && gojo !== state.fighters.find(f => f.domainActive));
      data.texture.update();
    }
  } else if (gojoDomainHybridData && gojoDomainHybridData.sprite.parent) {
    gojoDomainHybridData.sprite.parent.removeChild(gojoDomainHybridData.sprite);
  }

  if (sukuna) {
    const bgData = getSukunaDomainHybridData();
    if (!bgData.sprite.parent) layer.addChild(bgData.sprite);
    bgData.sprite.x = -20;
    bgData.sprite.y = -20;
    bgData.sprite.width = state.canvas.width + 40;
    bgData.sprite.height = state.canvas.height + 40;
    if (updateSukuna) {
      bgData.ctx.clearRect(0, 0, bgData.canvas.width, bgData.canvas.height);
      renderSukunaDomainBackground(sukuna, bgData.ctx, isMultiDomain && sukuna !== state.fighters.find(f => f.domainActive));
      bgData.texture.update();
    }
  } else {
    if (sukunaDomainHybridData && sukunaDomainHybridData.sprite.parent) {
      sukunaDomainHybridData.sprite.parent.removeChild(sukunaDomainHybridData.sprite);
    }
  }

  // Ensure explicit Z-order sorting for Domain Clashes (Gojo vs Sukuna):
  // 1. Sukuna Domain Background (Liquid Floor) -> Back (Index 0)
  // 2. Gojo Unlimited Void Background (Dark starry void overlaying floor) -> Front (Index 1)
  if (gojo && sukuna && layer) {
    const gojoSprite = gojoDomainHybridData?.sprite;
    const sukunaBgSprite = sukunaDomainHybridData?.sprite;

    if (gojoSprite && sukunaBgSprite && gojoSprite.parent === layer && sukunaBgSprite.parent === layer) {
      layer.setChildIndex(sukunaBgSprite, 0);
      layer.setChildIndex(gojoSprite, 1);
    }
  }

  if (yuta) {
    const data = getYutaDomainHybridData();
    if (!data.sprite.parent) layer.addChildAt(data.sprite, 0);
    data.sprite.x = -20;
    data.sprite.y = -20;
    data.sprite.width = state.canvas.width + 40;
    data.sprite.height = state.canvas.height + 40;
    if (updateYuta) {
      data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
      renderYutaDomainBackground(yuta, data.ctx, isMultiDomain && yuta !== state.fighters.find(f => f.domainActive));
      if (sukuna && isMultiDomain) {
        renderYutaSukunaDomainClashRift(data.ctx, yuta, sukuna);
      }
      data.texture.update();
    }
  } else if (yutaDomainHybridData && yutaDomainHybridData.sprite.parent) {
    yutaDomainHybridData.sprite.parent.removeChild(yutaDomainHybridData.sprite);
  }

  if (mahito) {
    const data = getMahitoDomainHybridData();
    if (!data.sprite.parent) layer.addChildAt(data.sprite, 0);
    data.sprite.x = 0;
    data.sprite.y = 0;
    data.sprite.width = state.canvas.width;
    data.sprite.height = state.canvas.height;
    data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
    renderMahitoDomainBackground(mahito, data.ctx, data.canvas);
    data.texture.update();
  } else if (mahitoDomainHybridData && mahitoDomainHybridData.sprite.parent) {
    mahitoDomainHybridData.sprite.parent.removeChild(mahitoDomainHybridData.sprite);
  }

  // Enforce deterministic domain Z-order sorting:
  // Mahito/Gojo (bottom) -> Sukuna Background (middle) -> Yuta Background/Crosses (top) -> Sukuna Shrine Foreground (top-most)
  if (mahitoDomainHybridData && mahitoDomainHybridData.sprite.parent === layer) layer.addChild(mahitoDomainHybridData.sprite);
  if (gojoDomainHybridData && gojoDomainHybridData.sprite.parent === layer) layer.addChild(gojoDomainHybridData.sprite);
  if (sukunaDomainHybridData && sukunaDomainHybridData.sprite.parent === layer) layer.addChild(sukunaDomainHybridData.sprite);
  if (yutaDomainHybridData && yutaDomainHybridData.sprite.parent === layer) layer.addChild(yutaDomainHybridData.sprite);
  
  // 1. Sukuna Furnace
  const sukunaFuga = state.fighters?.find(f => 
    f && (f.characterId === 'sukuna' || f.type === 'sukuna' || f._def?.id === 'sukuna' || f._def?.type === 'sukuna' || f._def?.name === 'Sukuna' || f._def?.name === 'Ryomen Sukuna') && (f.isChannelingDivineFlame || (f.divineFlameRecoveryTimer && f.divineFlameRecoveryTimer > 0))
  );
  const furnaceArrow = getProjectiles().find(p => (p.isSukunaFurnace || p.visual === 'sukunaFurnaceArrow') && p.life > 0);

  let tOpFuga = 0, cxFuga = state.canvas.width / 2, cyFuga = state.canvas.height / 2;
  if (sukunaFuga) {
    cxFuga = sukunaFuga.x; cyFuga = sukunaFuga.y;
    if (sukunaFuga.isChannelingDivineFlame) {
      tOpFuga = 0.25 + Math.min(1.0, (sukunaFuga.divineFlameChargeTimer || 0) / Math.max(1, sukunaFuga.divineFlameChargeMax || 90)) * 0.55;
    } else if (sukunaFuga.divineFlameRecoveryTimer > 0) {
      tOpFuga = 0.55 * (sukunaFuga.divineFlameRecoveryTimer / (CONFIG.sukuna?.divineFlameRecoveryTime || 60));
    }
  } else if (furnaceArrow) {
    tOpFuga = 0.55; cxFuga = furnaceArrow.x; cyFuga = furnaceArrow.y;
  }
  currentFurnaceDimOpacity += (tOpFuga > currentFurnaceDimOpacity) ? (tOpFuga - currentFurnaceDimOpacity) * 0.15 : (tOpFuga - currentFurnaceDimOpacity) * 0.06;
  
  const spriteFuga = getFurnaceDimSprite();
  if (currentFurnaceDimOpacity < 0.01) {
    currentFurnaceDimOpacity = 0; if (spriteFuga.parent) spriteFuga.parent.removeChild(spriteFuga);
  } else {
    if (!spriteFuga.parent) layer.addChild(spriteFuga);
    spriteFuga.alpha = currentFurnaceDimOpacity; spriteFuga.x = cxFuga; spriteFuga.y = cyFuga; spriteFuga.scale.set(scale);
    state.globalDimEdgeColor = `rgba(0, 0, 0, ${currentFurnaceDimOpacity * 0.98})`;
  }

  // 2. Gojo Purple
  const gojoPurple = state.fighters?.find(f => f && (f.isChannelingPurple || (f.purpleRecoveryTimer && f.purpleRecoveryTimer > 0)));
  const purpleOrb = getProjectiles().find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0);

  let tOpPurple = 0, cxPurple = state.canvas.width / 2, cyPurple = state.canvas.height / 2;
  if (gojoPurple && gojoPurple.isChannelingPurple) {
    cxPurple = gojoPurple.x; cyPurple = gojoPurple.y - (gojoPurple.z || 0);
    tOpPurple = 0.15 + Math.min(1.0, (gojoPurple.purpleChargeTimer || 0) / Math.max(1, gojoPurple.purpleChargeMax || 120)) * 0.35;
  } else if (purpleOrb) {
    cxPurple = purpleOrb.x; cyPurple = purpleOrb.y;
    tOpPurple = 0.30 + Math.sin(Math.max(0, Math.min(1, (purpleOrb.life || 0) / (purpleOrb.maxLife || 300))) * Math.PI) * 0.15;
  } else if (gojoPurple && gojoPurple.purpleRecoveryTimer > 0) {
    cxPurple = gojoPurple.x; cyPurple = gojoPurple.y - (gojoPurple.z || 0);
    tOpPurple = 0.25 * (gojoPurple.purpleRecoveryTimer / 30);
  }
  currentPurpleDimOpacity += (tOpPurple > currentPurpleDimOpacity) ? (tOpPurple - currentPurpleDimOpacity) * 0.15 : (tOpPurple - currentPurpleDimOpacity) * 0.18;
  
  const spritePurple = getPurpleDimSprite();
  if (currentPurpleDimOpacity < 0.01) {
    currentPurpleDimOpacity = 0; if (spritePurple.parent) spritePurple.parent.removeChild(spritePurple);
  } else {
    if (!spritePurple.parent) layer.addChild(spritePurple);
    spritePurple.alpha = currentPurpleDimOpacity; spritePurple.x = cxPurple; spritePurple.y = cyPurple; spritePurple.scale.set(scale);
    state.globalDimEdgeColor = `rgba(0, 0, 0, ${currentPurpleDimOpacity * 0.98})`;
  }
  
  // 3. Mahoraga
  const mahoraga = state.fighters?.find(f => f && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')) && (f.wheelClickTimer > 0 || f.adaptationPauseTimer > 0));
  let opacityMaho = 0, cxMaho = state.canvas.width / 2, cyMaho = state.canvas.height / 2;
  if (mahoraga && CONFIG.mahoraga?.enableGoldenScreenDim !== false) {
    const timer = (mahoraga.adaptationPauseTimer && mahoraga.adaptationPauseTimer > 0) ? mahoraga.adaptationPauseTimer : mahoraga.wheelClickTimer;
    const clickMax = mahoraga.adaptationPauseMax || mahoraga.wheelClickMax || CONFIG.mahoraga?.wheelClickDuration || 25;
    const rawProgress = (clickMax - timer) / clickMax;
    opacityMaho = Math.sin(Math.min(1.0, Math.max(0.0, rawProgress)) * Math.PI) * (CONFIG.mahoraga?.goldenDimOpacity ?? 0.85);
    cxMaho = mahoraga.x; cyMaho = mahoraga.y - mahoraga.r - 28;
  }
  
  const spriteMaho = getMahoragaDimSprite();
  if (opacityMaho <= 0.01) {
    if (spriteMaho.parent) spriteMaho.parent.removeChild(spriteMaho);
  } else {
    if (!spriteMaho.parent) dimLayer.addChild(spriteMaho);
    spriteMaho.alpha = 1.0; // embedded in texture colors already? No, the texture has opacity. But we multiply by opacityMaho? Wait, in original, opacity was passed into gradient strings directly. Here we can just set sprite.alpha.
    // Since we used raw alpha in gradient, we'll set alpha to a scale.
    // The gradient has max 0.98 alpha. So we just use sprite.alpha = opacityMaho / 0.85 (normalized)
    spriteMaho.alpha = opacityMaho / 0.85;
    spriteMaho.x = cxMaho; spriteMaho.y = cyMaho; spriteMaho.scale.set(scale);
  }
  
  // 4. Toji Ultimate (100% Pure WebGL Sprites - 0% CPU canvas upload overhead)
  const toji = state.fighters?.find(f => f && f.ultimateActive && (f.ultimatePhase === 'VANISHED' || f.ultimatePhase === 'STRIKING' || f.ultimatePhase === 'CRATER_FADEIN' || f.ultimatePhase === 'CRATER'));
  let tOpToji = 0;

  if (toji) {
    tOpToji = 0.85;
    const maxFlyHeads = isLowQuality ? 0 : 35;
    if (maxFlyHeads > 0 && Math.random() < 0.35 && activeFlyHeads.length < maxFlyHeads) {
      const sprite = getFlyHeadSprite();
      if (sprite) {
        const size = 6 + Math.random() * 12;
        sprite.width = size * 2;
        sprite.height = size * 2;
        sprite.x = state.canvas.width + 50 + Math.random() * 100;
        sprite.y = Math.random() * state.canvas.height;
        sprite.alpha = 0.9;
        activeFlyHeads.push({
          sprite,
          vx: -12 - Math.random() * 18,
          vy: (Math.random() - 0.5) * 4
        });
      }
    }
  }

  currentTojiUltimateOpacity += (tOpToji > currentTojiUltimateOpacity) ? (tOpToji - currentTojiUltimateOpacity) * 0.15 : (tOpToji - currentTojiUltimateOpacity) * 0.18;

  const container = getTojiUltimateContainer();
  if (currentTojiUltimateOpacity < 0.01) {
    currentTojiUltimateOpacity = 0;
    // Release active fly head sprites back to pool
    for (const head of activeFlyHeads) {
      releaseFlyHeadSprite(head.sprite);
    }
    activeFlyHeads.length = 0;
    if (container && container.parent) container.parent.removeChild(container);
  } else if (container) {
    if (!container.parent) layer.addChild(container);

    // Sync dim sprite position & dimensions to cover screen cleanly
    tojiDimSprite.x = state.canvas.width / 2;
    tojiDimSprite.y = state.canvas.height / 2;
    tojiDimSprite.width = state.canvas.width * 2.5; // Circle texture expanded to cover rectangle
    tojiDimSprite.height = state.canvas.height * 2.5;
    tojiDimSprite.alpha = currentTojiUltimateOpacity * 0.92;

    // Update active fly heads in WebGL space
    for (let i = activeFlyHeads.length - 1; i >= 0; i--) {
      const head = activeFlyHeads[i];
      head.sprite.x += head.vx;
      head.sprite.y += head.vy;
      head.sprite.alpha = currentTojiUltimateOpacity * 0.85;

      if (head.sprite.x < -60) {
        releaseFlyHeadSprite(head.sprite);
        // Fast swap-and-pop O(1) removal
        const last = activeFlyHeads.pop();
        if (i < activeFlyHeads.length) {
          activeFlyHeads[i] = last;
        }
      }
    }
  }

  // 5. Rika Summon & Pure Love Beam Dim Screen & Pulsing Ring
  let targetRikaOpacity = 0;
  let rikaCx = state.canvas.width / 2;
  let rikaCy = state.canvas.height / 2;

  const yutaFighter = state.fighters?.find(f => f && (f.characterId === 'yuta' || f.type === 'yuta' || f._def?.type === 'yuta' || f._def?.id === 'yuta'));
  if (yutaFighter) {
    rikaCx = yutaFighter.x;
    rikaCy = yutaFighter.y;
    if (yutaFighter.isChannelingPureLoveBeam || yutaFighter.isFiringPureLoveBeam) {
      targetRikaOpacity = 0.95; // Deep pitch dark black dim during Pure Love Beam
    } else if (yutaFighter.rikaCallTimer > 0) {
      const maxCharge = CONFIG.yuta?.rikaSummonChargeDuration || 40;
      const progress = 1.0 - (yutaFighter.rikaCallTimer / maxCharge);
      targetRikaOpacity = 0.25 + progress * 0.50; // Up to 0.75 opacity
    } else if (yutaFighter.rika && yutaFighter.rika.spawnTimer > 0) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      const progress = yutaFighter.rika.spawnTimer / ariseMax;
      targetRikaOpacity = 0.75 * progress;
    }
  }

  const dimRate = (targetRikaOpacity > currentRikaSummonDimOpacity) ? 0.30 : 0.05; // Fast fade-in, slow smooth fade-out!
  currentRikaSummonDimOpacity += (targetRikaOpacity - currentRikaSummonDimOpacity) * dimRate;
  
  const rikaSummonDim = getRikaSummonDimSprite();
  const rikaRing = getRikaRingSprite();

  if (currentRikaSummonDimOpacity < 0.01) {
    currentRikaSummonDimOpacity = 0;
    if (rikaSummonDim.parent) rikaSummonDim.parent.removeChild(rikaSummonDim);
    if (rikaRing.parent) rikaRing.parent.removeChild(rikaRing);
  } else {
    // Render Summon Dim screen (centered on Yuta/Rika and scaled to cover the screen)
    if (!rikaSummonDim.parent) layer.addChild(rikaSummonDim);
    rikaSummonDim.alpha = currentRikaSummonDimOpacity;
    rikaSummonDim.x = rikaCx;
    rikaSummonDim.y = rikaCy;
    rikaSummonDim.scale.set(scale);
    state.globalDimEdgeColor = `rgba(0, 0, 0, ${currentRikaSummonDimOpacity * 0.98})`;

    // Render Pulsing Ring (100% GPU WebGL Matrix Scaling)
    if (!rikaRing.parent) layer.addChild(rikaRing);
    rikaRing.x = rikaCx;
    rikaRing.y = rikaCy;
    const pulseRadius = 85 + Math.sin(Date.now() * 0.01) * 15;
    const ringScale = pulseRadius / 85.0;
    rikaRing.scale.set(ringScale);
    rikaRing.alpha = currentRikaSummonDimOpacity * 0.45;
  }

  // Calculate and store the maximum dim opacity to allow HTML DOM overlays to dim synchronously
  state.globalDimOpacity = Math.max(
    currentPurpleDimOpacity || 0,
    currentFurnaceDimOpacity || 0,
    opacityMaho || 0,
    currentTojiUltimateOpacity || 0,
    currentRikaSummonDimOpacity || 0
  );
}

// ──────────────────────────────────────────────
// CRONOSPHERE HYBRID RENDERER
// ──────────────────────────────────────────────
let cronosphereTexture = null;
const activeCronospheres = new Map();

function getCronosphereTexture() {
  if (!cronosphereTexture) {
    const size = 512; // Master texture size
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Draw the honeycomb grid once at max resolution
    drawCronosSphereVisual({
      ctx,
      cx: size / 2,
      cy: size / 2,
      radius: size / 2.05, // Slight padding
      alpha: 1.0,
      deployProgress: 1.0,
      now: 0
    });
    
    cronosphereTexture = window.PIXI.Texture.from(canvas);
  }
  return cronosphereTexture;
}

export function updateHybridCronospheres() {
  if (!state.pixiApp || !state.pixiLayers?.effects) return;
  
  const layer = state.pixiLayers.effects;
  const currentIds = new Set();
  const allEntities = [...(state.fighters || []), ...(state.illusions || [])];
  
  for (const fighter of allEntities) {
    if (!fighter || !fighter.sphereActive) continue;
    
    const id = fighter.id;
    currentIds.add(id);
    
    let sprite = activeCronospheres.get(id);
    if (!sprite) {
      sprite = new window.PIXI.Sprite(getCronosphereTexture());
      sprite.anchor.set(0.5);
      layer.addChild(sprite);
      activeCronospheres.set(id, sprite);
    }
    
    // Update Cronosphere state
    const elapsed = CONFIG.cronos.sphereDuration - (fighter.sphereTimer || 0);
    const deployProgress = Math.min(1, Math.max(0, elapsed / Math.max(1, CONFIG.cronos.sphereDuration)));
    
    sprite.x = fighter.sphereX;
    sprite.y = fighter.sphereY;
    
    // Scale based on deploy progress and configured radius vs texture size (512/2.05 ~ 250px radius)
    const baseRadius = CONFIG.cronos.sphereRadius || 180;
    const currentRadius = baseRadius * deployProgress;
    const scale = currentRadius / 250.0;
    sprite.scale.set(scale);
    
    // Pulse alpha slightly
    sprite.alpha = 0.9 + 0.1 * Math.sin(Date.now() / 150);
  }
  
  // Cleanup inactive spheres
  for (const [id, sprite] of activeCronospheres.entries()) {
    if (!currentIds.has(id)) {
      if (sprite.parent) sprite.parent.removeChild(sprite);
      activeCronospheres.delete(id);
    }
  }
}

// ──────────────────────────────────────────────
// BERSERKER RAGE HYBRID RENDERER
// ──────────────────────────────────────────────
let berserkerShockwaveTexture = null;
let berserkerFlashTexture = null;
const berserkerSpritesPool = [];

function getBerserkerTextures() {
  if (!berserkerShockwaveTexture) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 4, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    berserkerShockwaveTexture = window.PIXI.Texture.from(canvas);
    
    const canvas2 = document.createElement('canvas');
    canvas2.width = size;
    canvas2.height = size;
    const ctx2 = canvas2.getContext('2d');
    ctx2.beginPath();
    ctx2.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
    ctx2.fillStyle = '#ffffff';
    ctx2.fill();
    berserkerFlashTexture = window.PIXI.Texture.from(canvas2);
  }
  return { shockwave: berserkerShockwaveTexture, flash: berserkerFlashTexture };
}

function string2hex(stringColor) {
  if (stringColor.startsWith('#')) {
    return parseInt(stringColor.slice(1), 16);
  }
  return 0xFFFFFF;
}

export function updateHybridBerserkerRage() {
  if (!state.pixiApp || !state.pixiLayers?.particles) return;
  if (!state.berserkerRageEffects) return;
  
  const layer = state.pixiLayers.particles;
  const effects = state.berserkerRageEffects;
  const textures = getBerserkerTextures();
  
  // Ensure we have enough sprites in the pool
  while (berserkerSpritesPool.length < effects.length) {
    const sprite = new window.PIXI.Sprite(textures.flash);
    sprite.anchor.set(0.5);
    sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
    berserkerSpritesPool.push(sprite);
  }
  
  // Update active sprites
  for (let i = 0; i < effects.length; i++) {
    const effect = effects[i];
    const sprite = berserkerSpritesPool[i];
    
    if (effect.type === 'shockwave') {
      sprite.texture = textures.shockwave;
      sprite.alpha = effect.life * 0.6;
    } else if (effect.type === 'flash') {
      sprite.texture = textures.flash;
      sprite.alpha = effect.life * 0.8;
    } else {
      sprite.texture = textures.flash;
      sprite.alpha = effect.life;
    }
    
    sprite.tint = string2hex(effect.color);
    sprite.x = effect.x;
    sprite.y = effect.y;
    // Base size is 128
    sprite.scale.set((effect.size * 2) / 128);
    
    if (!sprite.parent) layer.addChild(sprite);
  }
  
  // Remove unused sprites from layer
  for (let i = effects.length; i < berserkerSpritesPool.length; i++) {
    const sprite = berserkerSpritesPool[i];
    if (sprite.parent) sprite.parent.removeChild(sprite);
  }

  // Update Layla Malefic Surge Auras
  updateLaylaHybridAuras(layer);
}

const laylaAuraSprites = new Map();
const laylaAuraCanvasPool = [];

function getLaylaAuraCanvas() {
  let item = laylaAuraCanvasPool.find(c => !c.inUse);
  if (!item) {
    const size = 300;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const texture = window.PIXI.Texture.from(canvas);
    const sprite = new window.PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
    
    item = { canvas, ctx, texture, sprite, size, inUse: true };
    laylaAuraCanvasPool.push(item);
  }
  item.inUse = true;
  return item;
}

let laylaUpdateTick = 0;

function updateLaylaHybridAuras(layer) {
  const currentIds = new Set();
  laylaUpdateTick++;
  
  if (state.fighters) {
    for (const f of state.fighters) {
      if (!f || (f.characterId !== 'layla' && f.type !== 'layla')) continue;
      if (!f.maleficBuffTimer || f.maleficBuffTimer <= 0) continue;
      
      currentIds.add(f.id);
      
      let hybridData = laylaAuraSprites.get(f.id);
      if (!hybridData) {
        hybridData = getLaylaAuraCanvas();
        layer.addChild(hybridData.sprite);
        laylaAuraSprites.set(f.id, hybridData);
      }
      
      const { canvas, ctx, sprite, texture, size } = hybridData;
      
      sprite.x = f.x;
      sprite.y = f.y;

      // Throttle texture updates to 30 FPS to eliminate VRAM bandwidth overhead
      if (laylaUpdateTick % 2 === 0) {
        ctx.clearRect(0, 0, size, size);
        drawLaylaMaleficSurgeGrid(ctx, size / 2, size / 2, f.r, f.maleficBuffTimer);
        texture.update();
      }
    }
  }
  
  for (const [id, data] of laylaAuraSprites.entries()) {
    if (!currentIds.has(id)) {
      data.sprite.parent?.removeChild(data.sprite);
      data.inUse = false;
      laylaAuraSprites.delete(id);
    }
  }
}


