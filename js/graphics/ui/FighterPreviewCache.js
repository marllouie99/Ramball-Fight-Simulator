import { FIGHTER_DEFS, TACTICAL_FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { state } from '../../core/state.js';

// --- Fighter Preview Cache ---
const fighterPreviewCache = {};

function renderPreviewForDef(def, cacheKey) {
  if (!def) return null;
  const previewSize = 128;
  const canvas = document.createElement('canvas');
  canvas.width = previewSize;
  canvas.height = previewSize;
  const ctx = canvas.getContext('2d');
  
  const FighterClass = (typeof FIGHTER_CLASS_MAP !== 'undefined' && FIGHTER_CLASS_MAP && FIGHTER_CLASS_MAP[def.type]) ? FIGHTER_CLASS_MAP[def.type] : Fighter;
  const previewFighter = new FighterClass({
    ...def,
    startX: previewSize / 2,
    startY: previewSize / 2,
  });
  const isUpright = def.type === 'denji' || def.type === 'power' || def.type === 'uryu' || def.type === 'ulquiorra' || def.type === 'reze' || def.type === 'makima' || def.type === 'toji' || def.type === 'nanami' || def.type === 'yuji' || def.type === 'yuta' || def.type === 'gojo' || def.type === 'sukuna' || def.type === 'saitama' || def.type === 'genos' || def.type === 'ichigo' || def.type === 'mahito' || def.type === 'megumi' || def.type === 'nobara' || def.category === 'Anime';
  previewFighter.angle = 0; // Static angle for consistent previews
  previewFighter.gunAngle = isUpright ? 0 : Math.PI / 4; // Upright fighters aim forward
  if (def.type === 'uryu') {
    previewFighter.smoothDrawProgress = 0.30;
  }
  if (def.type === 'reze') {
    previewFighter.isHybridModeActive = Boolean(state.showRezeTransformation);
  }
  if (def.type === 'denji') {
    previewFighter.isHybridModeActive = true; // Permanently devil form
  }
  
  try {
    if (typeof previewFighter.aim === 'function' && !isUpright) {
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
  }
}

function preRenderFighterPreviews() {
  FIGHTER_DEFS.forEach((def, index) => {
    renderPreviewForDef(def, `foc_${index}`);
    renderPreviewForDef(def, index);
  });
  if (typeof TACTICAL_FIGHTER_DEFS !== 'undefined' && Array.isArray(TACTICAL_FIGHTER_DEFS)) {
    TACTICAL_FIGHTER_DEFS.forEach((def, index) => {
      renderPreviewForDef(def, `tactical_${index}`);
    });
  }
}

function getFighterPreview(index, category = null) {
  const cat = category || (typeof state !== 'undefined' ? state.gameCategory : 'foc');
  const defs = getActiveFighterDefs(cat);
  const def = defs[index] || FIGHTER_DEFS[index];
  let toggleSuffix = '';
  if (def && def.type === 'reze') {
    toggleSuffix = state.showRezeTransformation ? '_bomb' : '_human';
  } else if (def && def.type === 'denji') {
    toggleSuffix = (state.showDenjiTransformation === false) ? '_human' : '_chainsaw';
  }
  const cacheKey = `${cat}_${index}${toggleSuffix}`;
  if (!fighterPreviewCache[cacheKey]) {
    renderPreviewForDef(def, cacheKey);
  }
  return fighterPreviewCache[cacheKey] || fighterPreviewCache[index];
}

export { fighterPreviewCache, preRenderFighterPreviews, getFighterPreview };
