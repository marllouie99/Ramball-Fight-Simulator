import { state, getProjectiles } from '../../core/state.js';
import { drawSukunaFurnaceArrow, drawSukunaSlash, drawSukunaCleave, drawGhostBlade } from '../weapons/sukunaWeaponGraphics.js';
import { drawGojoPurpleOrb } from './projectileRenderer.js';

const activeSprites = new Map();
const canvasPool = [];

function getLocalCanvas(size) {
  let item = canvasPool.find(c => c.size === size && !c.inUse);
  if (!item) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // For PixiJS WebGL
    const texture = window.PIXI.Texture.from(canvas);
    const sprite = new window.PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
    
    item = { canvas, ctx, texture, sprite, size, inUse: true };
    canvasPool.push(item);
  }
  item.inUse = true;
  return item;
}

export function updateHybridProjectiles() {
  if (!state.pixiApp || !state.pixiLayers?.projectiles) return;
  
  const layer = state.pixiLayers.projectiles;
  const projectiles = getProjectiles();
  
  const currentIds = new Set();
  
  for (const p of projectiles) {
    if (p.life <= 0) continue;
    
    const isFuga = (p.visual === 'sukunaFurnaceArrow' || p.isSukunaFurnace);
    const isGojoProj = (p.visual === 'gojoBlue' || p.isGojoPurple || p.isGojoPurpleOrb || p.behaviorType === 'gojo_purple');
    const isSukunaSlashProj = (p.visual === 'sukunaSlash' || p.visual === 'sukunaCleave' || p.visual === 'ghostBlade');
    
    if (!isFuga && !isGojoProj && !isSukunaSlashProj) continue;
    
    // Slashes shouldn't render inside Gojo's domain visually
    if (isSukunaSlashProj) {
      const isGojoDomainActive = state.fighters?.some(f => f && f.domainActive && f._def?.id === 'gojo' && f.domainChargeTimer >= f.domainChargeMax);
      if (isGojoDomainActive) continue;
    }
    
    currentIds.add(p.id);
    
    let hybridData = activeSprites.get(p.id);
    
    if (!hybridData) {
      // Fuga gets a huge canvas for trail, Purple gets smaller, slashes get smallest.
      let size = 1200;
      if (isGojoProj) size = 800;
      else if (isSukunaSlashProj) size = 128;
      
      hybridData = getLocalCanvas(size);
      layer.addChild(hybridData.sprite);
      activeSprites.set(p.id, hybridData);
    }
    
    const { canvas, ctx, sprite, texture, size } = hybridData;
    
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    
    ctx.translate(size / 2 - p.x, size / 2 - p.y);
    
    if (isFuga) {
      sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
      drawSukunaFurnaceArrow(ctx, p);
    } else if (isGojoProj) {
      sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
      drawGojoPurpleOrb(ctx, p);
    } else if (isSukunaSlashProj) {
      sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
      if (p.visual === 'sukunaSlash') drawSukunaSlash(ctx, p);
      else if (p.visual === 'sukunaCleave') drawSukunaCleave(ctx, p);
      else if (p.visual === 'ghostBlade') drawGhostBlade(ctx, p);
    }
    
    ctx.restore();
    
    texture.update();
    sprite.x = p.x;
    sprite.y = p.y;
  }
  
  for (const [id, data] of activeSprites.entries()) {
    if (!currentIds.has(id)) {
      data.sprite.parent?.removeChild(data.sprite);
      data.inUse = false;
      activeSprites.delete(id);
    }
  }
}

let rikaSprite = null;
let rikaCanvas = null;
let rikaCtx = null;
let rikaTexture = null;

export function updateHybridRika() {
  if (!state.pixiApp || !state.pixiLayers?.projectiles) return;
  const layer = state.pixiLayers.projectiles;

  // Find Yuta fighter
  const yuta = state.fighters?.find(f => f && (f.type === 'yuta' || f._def?.type === 'yuta') && f.rika);
  if (!yuta || !yuta.rika || !yuta.rika.active || yuta.rikaAlpha <= 0 || state.gameState === 'matchEnd') {
    if (rikaSprite && rikaSprite.parent) {
      rikaSprite.parent.removeChild(rikaSprite);
    }
    return;
  }

  const rk = yuta.rika;
  const size = 600;

  if (!rikaSprite) {
    rikaCanvas = document.createElement('canvas');
    rikaCanvas.width = size;
    rikaCanvas.height = size;
    rikaCtx = rikaCanvas.getContext('2d');
    rikaTexture = window.PIXI.Texture.from(rikaCanvas);
    rikaSprite = new window.PIXI.Sprite(rikaTexture);
    rikaSprite.anchor.set(0.5);
  }

  if (!rikaSprite.parent) {
    layer.addChild(rikaSprite);
  }

  rikaCtx.clearRect(0, 0, size, size);
  rikaCtx.save();
  // Translate local context so Rika is drawn centered
  rikaCtx.translate(size / 2 - rk.x, size / 2 - rk.y);

  const opponent = state.fighters?.find(f => f && f !== yuta && f.hp > 0);
  const spawnScale = rk.spawnScale ?? 1.0;
  
  // Custom renderState to bypass the WebGL check inside draw methods
  const renderState = {
    drawX: rk.x,
    drawY: rk.y,
    targetAngle: rk.angle || 0,
    spawnScale: spawnScale,
    isHybrid: true
  };

  rikaCtx.globalAlpha = yuta.rikaAlpha;
  yuta._drawRikaCursedEnergyAura(rikaCtx, opponent, renderState);
  yuta._drawRika(rikaCtx, opponent, renderState);

  rikaCtx.restore();
  rikaTexture.update();

  rikaSprite.x = rk.x;
  rikaSprite.y = rk.y;
  rikaSprite.alpha = yuta.rikaAlpha;
}

