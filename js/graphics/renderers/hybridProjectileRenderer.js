import { CONFIG } from '../../core/config.js';
import { state, getProjectiles } from '../../core/state.js';
import { updateEntityVisualScale } from './EntityRenderer.js';
import { drawSukunaFurnaceArrow, drawSukunaSlash, drawSukunaCleave, drawGhostBlade, drawDivineFlameArrowConstruct } from '../weapons/sukunaWeaponGraphics.js';
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

  // Find Yuta fighter (robust lookup across type, characterId, _def.type, _def.id)
  const yuta = state.fighters?.find(f => f && (f.type === 'yuta' || f.characterId === 'yuta' || f._def?.type === 'yuta' || f._def?.id === 'yuta' || f._def?.id === 18) && f.rika);
  
  const isRikaActive = yuta && yuta.rika && (
    yuta.rika.active || 
    (yuta.rikaEmergingForBeamTimer && yuta.rikaEmergingForBeamTimer > 0) || 
    yuta.isChannelingPureLoveBeam || 
    yuta.isFiringPureLoveBeam || 
    (yuta.rikaAlpha !== undefined && yuta.rikaAlpha > 0)
  );

  if (!yuta || !yuta.rika || !isRikaActive || state.gameState === 'matchEnd') {
    if (rikaSprite && rikaSprite.parent) {
      rikaSprite.parent.removeChild(rikaSprite);
    }
    return;
  }

  const rk = yuta.rika;
  const size = 700;

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
  const currentAlpha = (yuta.rikaAlpha !== undefined) ? yuta.rikaAlpha : 1.0;
  rikaSprite.x = rk.x;
  rikaSprite.y = rk.y;
  rikaSprite.alpha = Math.max(0, Math.min(1.0, currentAlpha));

  // Force texture updates on every frame while spawning, emerging, or fading in/out
  rikaUpdateTick++;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const updateInterval = isLowQuality ? 3 : 2;

  const isEmergingOrSpawning = (rk.spawnTimer && rk.spawnTimer > 0) || 
                                (yuta.rikaEmergingForBeamTimer && yuta.rikaEmergingForBeamTimer > 0) || 
                                (currentAlpha < 1.0) || 
                                (rk.rightArmTimer && rk.rightArmTimer > 0) || 
                                (rk.leftArmTimer && rk.leftArmTimer > 0);
  const forceUpdate = isEmergingOrSpawning || (rikaUpdateTick === 1);

  if (forceUpdate || (rikaUpdateTick % updateInterval === 0)) {
    rikaCtx.clearRect(0, 0, size, size);
    rikaCtx.save();
    rikaCtx.translate(size / 2 - rk.x, size / 2 - rk.y);

    const opponent = state.fighters?.find(f => f && f !== yuta && f.hp > 0);
    const spawnScale = rk.spawnScale ?? 1.0;
    
    const renderState = {
      drawX: rk.x,
      drawY: rk.y,
      targetAngle: rk.angle || 0,
      spawnScale: spawnScale,
      isHybrid: true
    };

    rikaCtx.globalAlpha = Math.max(0, Math.min(1.0, currentAlpha));
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

let fugaSprite = null;
let fugaCanvas = null;
let fugaCtx = null;
let fugaTexture = null;
let fugaUpdateTick = 0;

export function updateHybridSukunaFuga() {
  if (!state.pixiApp || !state.pixiLayers?.projectiles) return;
  const layer = state.pixiLayers.projectiles;

  const sukuna = state.fighters?.find(f => f && (f.type === 'sukuna' || f.characterId === 'sukuna') && f.isChannelingDivineFlame);
  if (!sukuna || sukuna.hp <= 0 || state.gameState === 'matchEnd') {
    if (fugaSprite && fugaSprite.parent) {
      fugaSprite.parent.removeChild(fugaSprite);
    }
    return;
  }

  const size = 600;

  if (!fugaSprite) {
    fugaCanvas = document.createElement('canvas');
    fugaCanvas.width = size;
    fugaCanvas.height = size;
    fugaCtx = fugaCanvas.getContext('2d');
    fugaTexture = window.PIXI.Texture.from(fugaCanvas);
    fugaSprite = new window.PIXI.Sprite(fugaTexture);
    fugaSprite.anchor.set(0.5);
    fugaSprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
  }

  if (!fugaSprite.parent) {
    layer.addChild(fugaSprite);
  }

  // Update position every frame for buttery-smooth movement tracking
  fugaSprite.x = sukuna.x;
  fugaSprite.y = sukuna.y;

  // OPTIMIZATION: Throttle expensive texture updates to prevent CPU-to-GPU bandwidth bottlenecks.
  fugaUpdateTick++;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const updateInterval = isLowQuality ? 3 : 2;

  if (fugaUpdateTick % updateInterval === 0) {
    fugaCtx.clearRect(0, 0, size, size);
    fugaCtx.save();
    
    // Center the drawing context
    fugaCtx.translate(size / 2, size / 2);

    const progress = sukuna.divineFlameChargeTimer / sukuna.divineFlameChargeMax;
    const time = Date.now() * 0.012;

    // ── 1. CHIAROSCURO: Blinding front-light vs deep back-shadow ──
    fugaCtx.save();
    fugaCtx.rotate(sukuna.gunAngle);
    const shadowGrad = fugaCtx.createLinearGradient(sukuna.r * 1.4, 0, -sukuna.r * 1.2, 0);
    shadowGrad.addColorStop(0, `rgba(255, 240, 170, ${0.6 * progress})`);
    shadowGrad.addColorStop(0.35, 'rgba(255, 100, 0, 0)');
    shadowGrad.addColorStop(0.65, `rgba(15, 5, 5, ${0.70 * progress})`);
    shadowGrad.addColorStop(1, `rgba(5, 2, 2, ${0.92 * progress})`);
    fugaCtx.fillStyle = shadowGrad;
    fugaCtx.beginPath();
    fugaCtx.arc(0, 0, sukuna.r + 1, 0, Math.PI * 2);
    fugaCtx.fill();
    fugaCtx.restore();

    // ── 2. VOLCANIC MAGMA FLAME ARROW CONSTRUCT ──
    drawDivineFlameArrowConstruct(fugaCtx, {
      x: 0,
      y: 0,
      angle: sukuna.gunAngle,
      scale: 1.0,
      progress,
      isFlying: false,
      time
    });

    // Cursed Flame Origin Glow (Sukuna's channeling hands)
    fugaCtx.save();
    fugaCtx.rotate(sukuna.gunAngle);
    const notchX = -32 * progress;
    fugaCtx.beginPath();
    fugaCtx.arc(notchX, 0, 18 * progress, 0, Math.PI * 2);
    fugaCtx.fillStyle = `rgba(255, 50, 0, ${0.3 * progress})`;
    fugaCtx.fill();

    fugaCtx.beginPath();
    fugaCtx.arc(notchX, 0, 10 * progress, 0, Math.PI * 2);
    fugaCtx.fillStyle = `rgba(255, 140, 20, ${0.7 * progress})`;
    fugaCtx.fill();

    fugaCtx.beginPath();
    fugaCtx.arc(notchX, 0, 5 * progress, 0, Math.PI * 2);
    fugaCtx.fillStyle = `rgba(255, 255, 220, ${0.95 * progress})`;
    fugaCtx.fill();
    fugaCtx.restore();

    fugaCtx.restore();
    fugaTexture.update();
  }
}
