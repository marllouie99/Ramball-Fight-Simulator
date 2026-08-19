import { FIGHTER_DEFS } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';

// --- Fighter Preview Cache ---
const fighterPreviewCache = {};

function renderPreviewForIndex(index) {
  const def = FIGHTER_DEFS[index];
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
    fighterPreviewCache[index] = canvas;
    return canvas;
  } catch (e) {
    console.error('Failed to pre-render fighter preview:', def.name, e);
    return null;
  }
}

function preRenderFighterPreviews() {
  FIGHTER_DEFS.forEach((def, index) => {
    renderPreviewForIndex(index);
  });
}

function getFighterPreview(index) {
  if (!fighterPreviewCache[index]) {
    renderPreviewForIndex(index);
  }
  return fighterPreviewCache[index];
}

export { fighterPreviewCache, preRenderFighterPreviews, getFighterPreview };
