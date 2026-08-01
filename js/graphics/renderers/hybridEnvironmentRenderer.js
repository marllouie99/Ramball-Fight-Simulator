import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { renderGojoDomainBackground } from '../../entities/fighters/gojo/gojoDomainVisuals.js';
import { renderSukunaDomainBackground } from '../../entities/fighters/sukuna/sukunaDomainVisuals.js';
import { renderYutaDomainBackground, renderYutaSukunaDomainClashRift } from '../../entities/fighters/yuta/yutaDomainVisuals.js';
import { drawLaylaMaleficSurgeGrid } from '../../entities/fighters/LaylaFighter.js';
import { drawCronosSphereVisual } from '../draw.js';

let furnaceDimSprite = null;
let currentFurnaceDimOpacity = 0;

let rikaSummonDimSprite = null;
let currentRikaSummonDimOpacity = 0;

function getRikaSummonDimSprite() {
  if (!rikaSummonDimSprite) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(10, 0, 18, 0.82)';
    ctx.fillRect(0, 0, size, size);
    const texture = window.PIXI.Texture.from(canvas);
    rikaSummonDimSprite = new window.PIXI.Sprite(texture);
    rikaSummonDimSprite.anchor.set(0.5);
  }
  return rikaSummonDimSprite;
}

let rikaRingSprite = null;
let rikaRingCanvas = null;
let rikaRingCtx = null;
let rikaRingTexture = null;

function getRikaRingSprite() {
  if (!rikaRingSprite) {
    const size = 256;
    rikaRingCanvas = document.createElement('canvas');
    rikaRingCanvas.width = size;
    rikaRingCanvas.height = size;
    rikaRingCtx = rikaRingCanvas.getContext('2d');
    rikaRingTexture = window.PIXI.Texture.from(rikaRingCanvas);
    rikaRingSprite = new window.PIXI.Sprite(rikaRingTexture);
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
    
    // Create the exact same gradient from environmentalRenderer.js, but normalized to 0-1
    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.5);
    grad.addColorStop(0, `rgba(180, 20, 0, 0)`);
    grad.addColorStop(0.35, `rgba(80, 10, 0, 0.4)`);
    grad.addColorStop(0.65, `rgba(20, 5, 0, 0.75)`);
    grad.addColorStop(1, `rgba(0, 0, 0, 0.95)`);
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const texture = window.PIXI.Texture.from(canvas);
    furnaceDimSprite = new window.PIXI.Sprite(texture);
    furnaceDimSprite.anchor.set(0.5);
    // It will be scaled to cover the screen
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
    const grad = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.5);
    grad.addColorStop(0, `rgba(147, 51, 234, 0.25)`);
    grad.addColorStop(0.35, `rgba(88, 28, 135, 0.60)`);
    grad.addColorStop(0.70, `rgba(30, 0, 50, 0.85)`);
    grad.addColorStop(1.0, `rgba(10, 0, 20, 0.95)`);
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const texture = window.PIXI.Texture.from(canvas);
    purpleDimSprite = new window.PIXI.Sprite(texture);
    purpleDimSprite.anchor.set(0.5);
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
  }
  return mahoragaDimSprite;
}

let tojiFlyHeads = [];
let tojiHybridData = null;
let currentTojiUltimateOpacity = 0;

function getTojiHybridData() {
  if (!tojiHybridData) {
    const canvas = document.createElement('canvas');
    // For Toji we map 1:1 with screen
    canvas.width = 1920; 
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    const texture = window.PIXI.Texture.from(canvas);
    const sprite = new window.PIXI.Sprite(texture);
    
    tojiHybridData = { canvas, ctx, texture, sprite };
  }
  return tojiHybridData;
}

function syncDomainHybridDataSize(data) {
  if (state.canvas && (data.canvas.width !== state.canvas.width || data.canvas.height !== state.canvas.height)) {
    data.canvas.width = state.canvas.width;
    data.canvas.height = state.canvas.height;
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

export function updateHybridEnvironment() {
  if (!state.pixiApp || !state.pixiLayers?.environment) return;
  const layer = state.pixiLayers.environment;
  const maxDim = Math.max(state.canvas.width, state.canvas.height);
  const scale = (maxDim * 2.5) / 512;
  
  // 0. Domain Expansions
  const gojo = state.fighters?.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive);
  const sukuna = state.fighters?.find(f => f && (f.characterId === 'sukuna' || f.type === 'sukuna' || f._def?.type === 'sukuna') && f.domainActive);
  const yuta = state.fighters?.find(f => f && (f.characterId === 'yuta' || f.type === 'yuta' || f._def?.type === 'yuta') && f.domainActive);
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);

  if (gojo) {
    const data = getGojoDomainHybridData();
    if (!data.sprite.parent) layer.addChildAt(data.sprite, 0);
    // 1:1 rendering, no scaling of the sprite
    data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
    renderGojoDomainBackground(gojo, data.ctx, isMultiDomain && gojo !== state.fighters.find(f => f.domainActive));
    data.texture.update();
  } else if (gojoDomainHybridData && gojoDomainHybridData.sprite.parent) {
    gojoDomainHybridData.sprite.parent.removeChild(gojoDomainHybridData.sprite);
  }

  if (sukuna) {
    const data = getSukunaDomainHybridData();
    if (!data.sprite.parent) layer.addChildAt(data.sprite, 0);
    // 1:1 rendering, no scaling of the sprite
    data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
    renderSukunaDomainBackground(sukuna, data.ctx, isMultiDomain && sukuna !== state.fighters.find(f => f.domainActive));
    data.texture.update();
  } else if (sukunaDomainHybridData && sukunaDomainHybridData.sprite.parent) {
    sukunaDomainHybridData.sprite.parent.removeChild(sukunaDomainHybridData.sprite);
  }

  if (yuta) {
    const data = getYutaDomainHybridData();
    if (!data.sprite.parent) layer.addChildAt(data.sprite, 0);
    // 1:1 rendering, no scaling of the sprite
    data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
    renderYutaDomainBackground(yuta, data.ctx, isMultiDomain && yuta !== state.fighters.find(f => f.domainActive));
    if (sukuna && isMultiDomain) {
      renderYutaSukunaDomainClashRift(data.ctx, yuta, sukuna);
    }
    data.texture.update();
  } else if (yutaDomainHybridData && yutaDomainHybridData.sprite.parent) {
    yutaDomainHybridData.sprite.parent.removeChild(yutaDomainHybridData.sprite);
  }
  
  // 1. Sukuna Furnace
  const sukunaFuga = state.fighters?.find(f => 
    f && (f._def?.type === 'sukuna' || f._def?.name === 'Sukuna') && (f.isChannelingDivineFlame || (f.divineFlameRecoveryTimer && f.divineFlameRecoveryTimer > 0))
  );
  const furnaceArrow = getProjectiles().find(p => (p.isSukunaFurnace || p.visual === 'sukunaFurnaceArrow') && p.life > 0);

  let tOpFuga = 0, cxFuga = state.canvas.width / 2, cyFuga = state.canvas.height / 2;
  if (sukunaFuga) {
    cxFuga = sukunaFuga.x; cyFuga = sukunaFuga.y;
    if (sukunaFuga.isChannelingDivineFlame) {
      tOpFuga = 0.25 + Math.min(1.0, sukunaFuga.divineFlameChargeTimer / Math.max(1, sukunaFuga.divineFlameChargeMax)) * 0.55;
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
  }

  // 2. Gojo Purple
  const gojoPurple = state.fighters?.find(f => f && (f.isChannelingPurple || (f.purpleRecoveryTimer && f.purpleRecoveryTimer > 0)));
  const purpleOrb = getProjectiles().find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0);

  let tOpPurple = 0, cxPurple = state.canvas.width / 2, cyPurple = state.canvas.height / 2;
  if (gojoPurple && gojoPurple.isChannelingPurple) {
    cxPurple = gojoPurple.x; cyPurple = gojoPurple.y - (gojoPurple.z || 0);
    tOpPurple = 0.25 + Math.min(1.0, (gojoPurple.purpleChargeTimer || 0) / Math.max(1, gojoPurple.purpleChargeMax || 120)) * 0.55;
  } else if (purpleOrb) {
    cxPurple = purpleOrb.x; cyPurple = purpleOrb.y;
    tOpPurple = 0.50 + Math.sin(Math.max(0, Math.min(1, (purpleOrb.life || 0) / (purpleOrb.maxLife || 300))) * Math.PI) * 0.20;
  } else if (gojoPurple && gojoPurple.purpleRecoveryTimer > 0) {
    cxPurple = gojoPurple.x; cyPurple = gojoPurple.y - (gojoPurple.z || 0);
    tOpPurple = 0.45 * (gojoPurple.purpleRecoveryTimer / 30);
  }
  currentPurpleDimOpacity += (tOpPurple > currentPurpleDimOpacity) ? (tOpPurple - currentPurpleDimOpacity) * 0.15 : (tOpPurple - currentPurpleDimOpacity) * 0.18;
  
  const spritePurple = getPurpleDimSprite();
  if (currentPurpleDimOpacity < 0.01) {
    currentPurpleDimOpacity = 0; if (spritePurple.parent) spritePurple.parent.removeChild(spritePurple);
  } else {
    if (!spritePurple.parent) layer.addChild(spritePurple);
    spritePurple.alpha = currentPurpleDimOpacity; spritePurple.x = cxPurple; spritePurple.y = cyPurple; spritePurple.scale.set(scale);
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
    if (!spriteMaho.parent) layer.addChild(spriteMaho);
    spriteMaho.alpha = 1.0; // embedded in texture colors already? No, the texture has opacity. But we multiply by opacityMaho? Wait, in original, opacity was passed into gradient strings directly. Here we can just set sprite.alpha.
    // Since we used raw alpha in gradient, we'll set alpha to a scale.
    // The gradient has max 0.98 alpha. So we just use sprite.alpha = opacityMaho / 0.85 (normalized)
    spriteMaho.alpha = opacityMaho / 0.85;
    spriteMaho.x = cxMaho; spriteMaho.y = cyMaho; spriteMaho.scale.set(scale);
  }
  
  // 4. Toji Ultimate
  const toji = state.fighters?.find(f => f && f.ultimateActive && (f.ultimatePhase === 'VANISHED' || f.ultimatePhase === 'STRIKING' || f.ultimatePhase === 'CRATER_FADEIN' || f.ultimatePhase === 'CRATER'));
  let tOpToji = 0;
  if (toji) {
    tOpToji = 0.85;
    if (Math.random() < 0.4 && tojiFlyHeads.length < 40) {
      tojiFlyHeads.push({
        x: 1920 + Math.random() * 100,
        y: Math.random() * 1080,
        vx: -15 - Math.random() * 20,
        vy: (Math.random() - 0.5) * 5,
        size: 5 + Math.random() * 10
      });
    }
  }
  currentTojiUltimateOpacity += (tOpToji > currentTojiUltimateOpacity) ? (tOpToji - currentTojiUltimateOpacity) * 0.15 : (tOpToji - currentTojiUltimateOpacity) * 0.18;
  
  const tojiData = getTojiHybridData();
  if (currentTojiUltimateOpacity < 0.01) {
    currentTojiUltimateOpacity = 0; tojiFlyHeads = []; if (tojiData.sprite.parent) tojiData.sprite.parent.removeChild(tojiData.sprite);
  } else {
    if (!tojiData.sprite.parent) layer.addChild(tojiData.sprite);
    
    // Scale sprite to fit the current screen size instead of resizing canvas
    tojiData.sprite.width = state.canvas.width;
    tojiData.sprite.height = state.canvas.height;
    
    tojiData.ctx.clearRect(0, 0, 1920, 1080);
    tojiData.ctx.fillStyle = `rgba(5, 5, 5, ${currentTojiUltimateOpacity})`;
    tojiData.ctx.fillRect(0, 0, 1920, 1080);
    
    tojiData.ctx.fillStyle = `rgba(20, 20, 20, ${0.9 * currentTojiUltimateOpacity})`;
    for (let i = tojiFlyHeads.length - 1; i >= 0; i--) {
      const head = tojiFlyHeads[i];
      tojiData.ctx.beginPath();
      tojiData.ctx.arc(head.x, head.y, head.size, 0, Math.PI * 2);
      tojiData.ctx.fill();
      tojiData.ctx.fillStyle = `rgba(255, 0, 0, ${currentTojiUltimateOpacity})`;
      tojiData.ctx.beginPath();
      tojiData.ctx.arc(head.x - head.size * 0.3, head.y - head.size * 0.1, 2, 0, Math.PI * 2);
      tojiData.ctx.arc(head.x + head.size * 0.1, head.y - head.size * 0.1, 2, 0, Math.PI * 2);
      tojiData.ctx.fill();
      tojiData.ctx.fillStyle = `rgba(20, 20, 20, ${0.9 * currentTojiUltimateOpacity})`;
      
      head.x += head.vx; head.y += head.vy;
      if (head.x < -100) tojiFlyHeads.splice(i, 1);
    }
    
    tojiData.texture.update();
  }

  // 5. Rika Summon Dim Screen & Pulsing Ring
  const yutaSummoning = state.fighters?.find(f =>
    f && (f._def?.type === 'yuta' || f._def?.id === 'yuta' || f._def?.id === 23 || f._def?.name === 'Yuta') &&
    (f.rikaCallTimer > 0 || (f.rika && f.rika.active && f.rika.spawnTimer > 0))
  );

  let targetRikaOpacity = 0;
  let rikaCx = state.canvas.width / 2;
  let rikaCy = state.canvas.height / 2;

  if (yutaSummoning) {
    rikaCx = yutaSummoning.x;
    rikaCy = yutaSummoning.y;
    if (yutaSummoning.rikaCallTimer > 0) {
      const maxCharge = CONFIG.yuta?.rikaSummonChargeDuration || 40;
      const progress = 1.0 - (yutaSummoning.rikaCallTimer / maxCharge);
      targetRikaOpacity = 0.25 + progress * 0.50; // Up to 0.75 opacity
    } else if (yutaSummoning.rika && yutaSummoning.rika.spawnTimer > 0) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 180;
      const progress = yutaSummoning.rika.spawnTimer / ariseMax;
      targetRikaOpacity = 0.75 * progress;
    }
  }

  currentRikaSummonDimOpacity += (targetRikaOpacity - currentRikaSummonDimOpacity) * 0.15;
  
  const rikaSummonDim = getRikaSummonDimSprite();
  const rikaRing = getRikaRingSprite();

  if (currentRikaSummonDimOpacity < 0.01) {
    currentRikaSummonDimOpacity = 0;
    if (rikaSummonDim.parent) rikaSummonDim.parent.removeChild(rikaSummonDim);
    if (rikaRing.parent) rikaRing.parent.removeChild(rikaRing);
  } else {
    // Render Summon Dim screen
    if (!rikaSummonDim.parent) layer.addChild(rikaSummonDim);
    rikaSummonDim.x = state.canvas.width / 2;
    rikaSummonDim.y = state.canvas.height / 2;
    rikaSummonDim.width = state.canvas.width;
    rikaSummonDim.height = state.canvas.height;
    rikaSummonDim.alpha = currentRikaSummonDimOpacity;

    // Render Pulsing Ring
    if (!rikaRing.parent) layer.addChild(rikaRing);
    
    // Draw the pulsing cursed energy ring on the 256x256 canvas
    const rSize = 256;
    rikaRingCtx.clearRect(0, 0, rSize, rSize);
    rikaRingCtx.beginPath();
    const ringR = 85 + Math.sin(Date.now() * 0.01) * 15;
    rikaRingCtx.arc(rSize / 2, rSize / 2, ringR, 0, Math.PI * 2);
    rikaRingCtx.strokeStyle = `rgba(255, 20, 147, ${currentRikaSummonDimOpacity * 0.45})`;
    rikaRingCtx.lineWidth = 14;
    rikaRingCtx.stroke();
    
    rikaRingTexture.update();
    
    rikaRing.x = rikaCx;
    rikaRing.y = rikaCy;
    rikaRing.alpha = 1.0;
  }
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

function updateLaylaHybridAuras(layer) {
  const currentIds = new Set();
  
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
      
      ctx.clearRect(0, 0, size, size);
      
      drawLaylaMaleficSurgeGrid(ctx, size / 2, size / 2, f.r, f.maleficBuffTimer);
      
      texture.update();
      sprite.x = f.x;
      sprite.y = f.y;
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

