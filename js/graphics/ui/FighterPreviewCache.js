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
  previewFighter.angle = 0; // Static angle for consistent previews
  previewFighter.gunAngle = Math.PI / 4; // Consistent gun angle
  
  try {
    if (typeof previewFighter.aim === 'function') {
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
  const cacheKey = `${cat}_${index}`;
  if (!fighterPreviewCache[cacheKey]) {
    const defs = getActiveFighterDefs(cat);
    const def = defs[index] || FIGHTER_DEFS[index];
    renderPreviewForDef(def, cacheKey);
  }
  return fighterPreviewCache[cacheKey] || fighterPreviewCache[index];
}

export { fighterPreviewCache, preRenderFighterPreviews, getFighterPreview };
