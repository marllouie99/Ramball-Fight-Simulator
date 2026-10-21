import { FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { state } from '../../core/state.js';

// --- Fighter Preview Cache ---
const fighterPreviewCache = {};

let _deityPreviewCosmicLightImg = null;
function _getDeityCosmicLightPreviewImage() {
  if (_deityPreviewCosmicLightImg && _deityPreviewCosmicLightImg.complete && (_deityPreviewCosmicLightImg.naturalWidth > 0 || _deityPreviewCosmicLightImg.width > 0)) {
    return _deityPreviewCosmicLightImg;
  }
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = 'Assets/model/NamelessDeity/CosmicLightCircleCenter1.png';
    _deityPreviewCosmicLightImg = img;
  }
  return _deityPreviewCosmicLightImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getDeityCosmicLightPreviewImage();
}

function renderPreviewForDef(def, cacheKey, bodyOnly = false) {
  if (!def) return null;
  const previewSize = 256;
  const canvas = document.createElement('canvas');
  canvas.width = previewSize;
  canvas.height = previewSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  const FighterClass = (typeof FIGHTER_CLASS_MAP !== 'undefined' && FIGHTER_CLASS_MAP && FIGHTER_CLASS_MAP[def.type]) ? FIGHTER_CLASS_MAP[def.type] : Fighter;
  const previewFighter = new FighterClass({
    ...def,
    startX: previewSize / 2,
    startY: previewSize / 2,
  });
  const isUpright = def.type === 'guts' || def.category === 'Anime & Dark Fantasy' || def.type === 'sans' || def.type === 'pekka' || def.type === 'Engineer' || def.type === 'engineer' || def.type === 'crazydave' || def.type === 'crazy_dave' || def.type === 'tanjiro' || def.type === 'nezuko' || def.type === 'zenitsu' || def.type === 'inosuke' || def.type === 'denji' || def.type === 'power' || def.type === 'uryu' || def.type === 'ulquiorra' || def.type === 'reze' || def.type === 'makima' || def.type === 'toji' || def.type === 'maki' || def.type === 'nanami' || def.type === 'yuji' || def.type === 'yuta' || def.type === 'gojo' || def.type === 'sukuna' || def.type === 'saitama' || def.type === 'genos' || def.type === 'ichigo' || def.type === 'mahito' || def.type === 'megumi' || def.type === 'megumin' || def.type === 'nobara' || def.type === 'escanor' || def.type === 'zeus' || def.type === 'cronos' || def.type === 'bomber' || def.type === 'black' || def.type === 'knight' || def.type === 'eye_of_cthulhu' || def.type === 'ender_dragon' || def.type === 'namelessdeity' || def.type === 'nameless_deity' || def.category === 'Anime' || def.category === 'Greek Mythology';
  previewFighter.angle = 0; // Static angle for consistent previews
  previewFighter.gunAngle = (isUpright || bodyOnly) ? 0 : Math.PI / 4; // Upright fighters aim forward
  previewFighter.hideHpText = true;
  previewFighter._isPreview = true;
  previewFighter.suppressInkOutline = true;
  previewFighter._suppressInkOutline = true;
  if (bodyOnly) {
    previewFighter.hideHands = true;
    previewFighter.hideWeapon = true;
    previewFighter.hideFrontHand = true;
    previewFighter.hideBackHand = true;
    previewFighter.showSkinOnly = true;
    previewFighter.hideChainsaws = true;
    previewFighter.hideChainsaw = true;
    previewFighter.hideSwordAura = true;
    if (def.type === 'denji') {
      previewFighter.hideHeadChainsaw = false;
      previewFighter.hideForeheadChainsaw = false;
    }
  }
  if (def.type === 'uryu') {
    previewFighter.smoothDrawProgress = 0.30;
  }
  if (def.type === 'reze') {
    previewFighter.isHybridModeActive = Boolean(state.showRezeTransformation);
  }
  if (def.type === 'denji') {
    previewFighter.isHybridModeActive = true; // Permanently devil form
    previewFighter.hideHeadChainsaw = false;
    previewFighter.hideForeheadChainsaw = false;
  }
  if (def.type === 'eye_of_cthulhu') {
    previewFighter.isPhase2 = Boolean(state.showEyeOfCthulhuPhase2);
    previewFighter._isPhase2 = Boolean(state.showEyeOfCthulhuPhase2);
  }
  
  const prevShowSkinOnly = typeof state !== 'undefined' ? state.showSkinOnly : false;
  try {
    if (bodyOnly && (def.type === 'namelessdeity' || def.type === 'nameless_deity')) {
      const deityImg = _getDeityCosmicLightPreviewImage();
      if (deityImg && (deityImg.complete || deityImg.width > 0)) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        const pSize = 180;
        const destX = previewSize / 2;
        const destY = previewSize / 2;
        ctx.drawImage(deityImg, (previewSize - pSize) / 2, (previewSize - pSize) / 2, pSize, pSize);
        // Soft circular feathering mask to ensure no hard rectangular edge clipping
        const maxR = (pSize / 2) * 0.95;
        const maskGrad = ctx.createRadialGradient(destX, destY, maxR * 0.55, destX, destY, maxR);
        maskGrad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
        maskGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.90)');
        maskGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = maskGrad;
        ctx.fillRect(0, 0, previewSize, previewSize);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
        if (cacheKey !== undefined) {
          fighterPreviewCache[cacheKey] = canvas;
        }
        return canvas;
      }
    }
    if (bodyOnly && typeof state !== 'undefined') {
      state.showSkinOnly = true;
    }
    if (typeof previewFighter.aim === 'function' && !isUpright && !bodyOnly) {
      previewFighter.aim({ x: previewSize, y: previewSize });
    }
    previewFighter.draw(ctx);
    if (cacheKey !== undefined) {
      fighterPreviewCache[cacheKey] = canvas;
    }
    return canvas;
  } catch (e) {
    console.error('Failed to pre-render fighter preview:', def.name, e);
    return null;
  } finally {
    if (bodyOnly && typeof state !== 'undefined') {
      state.showSkinOnly = prevShowSkinOnly;
    }
  }
}

function renderStickerPreviewFromBase(baseCanvas, cacheKey) {
  if (!baseCanvas) return null;
  const w = baseCanvas.width || 128;
  const h = baseCanvas.height || 128;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return baseCanvas;

  try {
    const silCanvas = document.createElement('canvas');
    silCanvas.width = w;
    silCanvas.height = h;
    const silCtx = silCanvas.getContext('2d');
    if (silCtx && typeof silCtx.drawImage === 'function') {
      // 1. Subtle drop-shadow silhouette offset (+2.5, +3)
      silCtx.drawImage(baseCanvas, 0, 0);
      silCtx.globalCompositeOperation = 'source-in';
      silCtx.fillStyle = 'rgba(20, 14, 28, 0.20)';
      silCtx.fillRect(0, 0, w, h);
      ctx.drawImage(silCanvas, 2.5, 3);

      // 2. Pure white die-cut sticker outline (8-way 2.4px offset)
      silCtx.globalCompositeOperation = 'source-in';
      silCtx.fillStyle = '#FFFFFF';
      silCtx.fillRect(0, 0, w, h);
      const R = 2.4;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        ctx.drawImage(silCanvas, Math.cos(a) * R, Math.sin(a) * R);
      }
    }
    ctx.drawImage(baseCanvas, 0, 0);
  } catch (e) {
    ctx.drawImage(baseCanvas, 0, 0);
  }

  if (cacheKey !== undefined) {
    fighterPreviewCache[cacheKey] = outCanvas;
  }
  return outCanvas;
}

function preRenderFighterPreviews() {
  FIGHTER_DEFS.forEach((def, index) => {
    renderPreviewForDef(def, `foc_${index}`);
    renderPreviewForDef(def, index);
  });
}

function _getToggleSuffix(def) {
  if (!def) return '';
  if (def.type === 'reze') {
    return state.showRezeTransformation ? '_bomb' : '_human';
  }
  if (def.type === 'denji') {
    return (state.showDenjiTransformation === false) ? '_human' : '_chainsaw';
  }
  if (def.type === 'eye_of_cthulhu') {
    return state.showEyeOfCthulhuPhase2 ? '_phase2' : '_phase1';
  }
  return '';
}

function getFighterPreview(index, category = null) {
  const cat = category || (typeof state !== 'undefined' ? state.gameCategory : 'foc');
  const defs = getActiveFighterDefs(cat);
  const def = defs[index] || FIGHTER_DEFS[index];
  const toggleSuffix = _getToggleSuffix(def);
  const cacheKey = `${cat}_${index}${toggleSuffix}`;
  if (!fighterPreviewCache[cacheKey] || fighterPreviewCache[cacheKey].width !== 256) {
    renderPreviewForDef(def, cacheKey, false);
  }
  return fighterPreviewCache[cacheKey] || fighterPreviewCache[index];
}

function getFighterBodyOnlyPreview(index, category = null) {
  const cat = category || (typeof state !== 'undefined' ? state.gameCategory : 'foc');
  const defs = getActiveFighterDefs(cat);
  const def = defs[index] || FIGHTER_DEFS[index];
  const toggleSuffix = _getToggleSuffix(def);
  const cacheKey = `${cat}_${index}${toggleSuffix}_bodyonly`;
  if (!fighterPreviewCache[cacheKey] || fighterPreviewCache[cacheKey].width !== 256) {
    renderPreviewForDef(def, cacheKey, true);
  }
  return fighterPreviewCache[cacheKey] || getFighterPreview(index, category);
}

function getFighterStickerPreview(index, category = null) {
  const cat = category || (typeof state !== 'undefined' ? state.gameCategory : 'foc');
  const defs = getActiveFighterDefs(cat);
  const def = defs[index] || FIGHTER_DEFS[index];
  const toggleSuffix = _getToggleSuffix(def);
  const cacheKey = `${cat}_${index}${toggleSuffix}_sticker`;
  if (!fighterPreviewCache[cacheKey] || fighterPreviewCache[cacheKey].width !== 256) {
    const baseCanvas = getFighterPreview(index, category);
    renderStickerPreviewFromBase(baseCanvas, cacheKey);
  }
  return fighterPreviewCache[cacheKey] || getFighterPreview(index, category);
}

export function clearFighterPreviewCache() {
  for (const key in fighterPreviewCache) {
    delete fighterPreviewCache[key];
  }
}

if (typeof window !== 'undefined') {
  window.__clearFighterPreviewCache = clearFighterPreviewCache;
}

export { fighterPreviewCache, preRenderFighterPreviews, getFighterPreview, getFighterBodyOnlyPreview, getFighterStickerPreview };
