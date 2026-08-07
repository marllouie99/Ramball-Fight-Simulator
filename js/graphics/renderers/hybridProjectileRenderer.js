import { CONFIG } from '../../core/config.js';
import { state, getProjectiles } from '../../core/state.js';
import { updateEntityVisualScale } from './EntityRenderer.js';
import { drawSukunaFurnaceArrow, drawSukunaSlash, drawSukunaCleave, drawGhostBlade } from '../weapons/sukunaWeaponGraphics.js';
import { drawGojoPurpleOrb, drawLaylaBomb, drawLaylaCosmicBlast, drawLaylaBasicBullet, drawLaylaUltimateBullet, drawLaylaVoidProjectile } from './projectileRenderer.js';

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

    updateEntityVisualScale(p);
    
    const isFuga = (p.visual === 'sukunaFurnaceArrow' || p.isSukunaFurnace);
    const isGojoProj = (p.visual === 'gojoBlue' || p.isGojoPurple || p.isGojoPurpleOrb || p.behaviorType === 'gojo_purple');
    const isSukunaSlashProj = (p.visual === 'sukunaSlash' || p.visual === 'sukunaCleave' || p.visual === 'ghostBlade');
    const isLaylaProj = (p.visual === 'layla_bomb' || p.visual === 'layla_cosmic_blast' || p.visual === 'layla_basic_bullet' || p.visual === 'layla_ultimate_bullet' || p.visual === 'layla_void_projectile');
    
    // OPTIMIZATION: Sukuna's slashes are high-frequency transient effects.
    // Routing them through WebGL requires updating their textures every frame, stalling the GPU.
    // We bypass WebGL and render them directly in Canvas 2D.
    if (!isFuga && !isGojoProj && !isLaylaProj) continue;
    currentIds.add(p.id);
    
    let hybridData = activeSprites.get(p.id);
    
    if (!hybridData) {
      // Optimize sizes to prevent VRAM thrashing (previously 1200x1200 = 5.76MB per projectile)
      // We render to a smaller canvas (e.g. 384x384) and scale it up via PixiJS.
      // Glowing/chaotic effects look fine slightly upscaled and save ~90% VRAM.
      let size = 384;
      let drawScale = 1.0;
      
      if (isFuga) { size = 800; drawScale = 1.0; }
      else if (isGojoProj) {
        if (p.isGojoPurple || p.isGojoPurpleOrb || p.behaviorType === 'gojo_purple') {
          size = 800;
        } else {
          size = 256;
        }
        drawScale = 1.0;        // 1:1 native resolution for Gojo's projectiles (Lapse Blue & Hollow Purple)
      }
      else if (isSukunaSlashProj) { size = 128; drawScale = 1.0; }
      else if (isLaylaProj) {
        if (p.visual === 'layla_cosmic_blast') { size = 256; drawScale = 256 / 400; }
        else if (p.visual === 'layla_ultimate_bullet') { size = 256; drawScale = 256 / 384; }
        else { size = 128; drawScale = 128 / 256; }
      }
      
      hybridData = getLocalCanvas(size);
      hybridData.drawScale = drawScale;
      layer.addChild(hybridData.sprite);
      activeSprites.set(p.id, hybridData);
    }
    
    const { canvas, ctx, sprite, texture, size, drawScale = 1.0 } = hybridData;
    
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    
    // Most draw functions handle their own p.x/p.y translation internally (canceling out the -p.x offset),
    // but Layla's draw functions expect the caller to place them at (0,0) directly.
    if (isLaylaProj) {
      ctx.translate(size / 2, size / 2);
    } else {
      ctx.translate(size / 2 - (p.x * drawScale), size / 2 - (p.y * drawScale));
    }
    
    if (drawScale !== 1.0) {
      ctx.scale(drawScale, drawScale);
    }
    
    if (isFuga) {
      sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
      drawSukunaFurnaceArrow(ctx, p);
    } else if (isGojoProj) {
      sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
      drawGojoPurpleOrb(ctx, p);
    } else if (isLaylaProj) {
      sprite.blendMode = window.PIXI.BLEND_MODES.ADD; // Glowing intense plasma
      if (p.visual === 'layla_bomb') drawLaylaBomb(ctx, p);
      else if (p.visual === 'layla_cosmic_blast') drawLaylaCosmicBlast(ctx, p);
      else if (p.visual === 'layla_basic_bullet') drawLaylaBasicBullet(ctx, p);
      else if (p.visual === 'layla_ultimate_bullet') drawLaylaUltimateBullet(ctx, p);
      else if (p.visual === 'layla_void_projectile') drawLaylaVoidProjectile(ctx, p);
    }
    
    ctx.restore();
    
    texture.update();
    sprite.x = p.x;
    sprite.y = p.y;
    
    const visualScale = (p.visualScale !== undefined) ? p.visualScale : 1.0;
    sprite.scale.set((1.0 / drawScale) * visualScale);
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
let rikaUpdateTick = 0;

export function updateHybridRika() {
  if (!state.pixiApp || !state.pixiLayers?.fighters) return;
  const layer = state.pixiLayers.fighters;

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
    layer.addChildAt(rikaSprite, 0);
  }

  // Update position and alpha every frame for buttery-smooth movement tracking
  rikaSprite.x = rk.x;
  rikaSprite.y = rk.y;
  rikaSprite.alpha = yuta.rikaAlpha;

  // OPTIMIZATION: Throttle expensive texture updates to prevent CPU-to-GPU bandwidth bottlenecks.
  // Rika's internal cursed energy animations are stepped to 30fps anyway.
  rikaUpdateTick++;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const updateInterval = isLowQuality ? 3 : 2; // 20fps or 30fps upload rate

  const forceUpdate = (rk.spawnTimer && rk.spawnTimer >= (CONFIG.yuta?.rikaAriseDuration || 180) - 2) || (rikaUpdateTick === 1);

  if (forceUpdate || (rikaUpdateTick % updateInterval === 0)) {
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
  }

  // Enforce Z-order: Rika (bottom) -> Legacy 2D Canvas (top, containing Yuta's body circle and HP value)
  if (state.legacyCanvasSprite && state.legacyCanvasSprite.parent === layer) {
    layer.addChildAt(rikaSprite, 0);
    layer.addChildAt(state.legacyCanvasSprite, 1);
  }
}

