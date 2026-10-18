import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { Fighter } from '../../entities/fighter.js';
import { FighterRenderer } from './fighterRenderer.js';

// Dedicated persistent offscreen buffers for zero-GC silhouette caching (preserves locked 60 FPS)
const BUFFER_SIZE = 256;
const HALF_BUFFER = BUFFER_SIZE / 2;

// 8-directional normalized offsets around circle for smooth, gap-free manga ink stroke
const NUM_OFFSETS = 8;
const _cachedOffsets = [];
for (let i = 0; i < NUM_OFFSETS; i++) {
  const angle = (i * Math.PI * 2) / NUM_OFFSETS;
  _cachedOffsets.push({ cos: Math.cos(angle), sin: Math.sin(angle) });
}

let _sourceCanvas = null;
let _sourceCtx = null;
let _silCanvas = null;
let _silCtx = null;

function _ensureBuffers() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  // Node.js test environment guard (e.g. testAllFighters / testInteractions mock canvases)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) return false;

  if (!_sourceCanvas) {
    _sourceCanvas = document.createElement('canvas');
    _sourceCanvas.width = BUFFER_SIZE;
    _sourceCanvas.height = BUFFER_SIZE;
    _sourceCtx = _sourceCanvas.getContext('2d', { willReadFrequently: false });
    if (_sourceCtx) _sourceCtx.imageSmoothingEnabled = false;

    _silCanvas = document.createElement('canvas');
    _silCanvas.width = BUFFER_SIZE;
    _silCanvas.height = BUFFER_SIZE;
    _silCtx = _silCanvas.getContext('2d', { willReadFrequently: false });
    if (_silCtx) _silCtx.imageSmoothingEnabled = false;
  }
  return Boolean(_sourceCtx && _silCtx);
}

/**
 * Renders the fighter's base visual model (body, skin, hair, cape, arms/hands)
 * into an offscreen buffer for silhouette ink outline generation.
 * Suppresses in-game overhead HP numbers, freeze bars, wide beams, and ground auras.
 */
function _drawFighterModel(sourceCtx, fighter) {
  if (typeof fighter.drawBody === 'function') {
    fighter.drawBody(sourceCtx);
  } else if (typeof fighter.drawSkin === 'function') {
    fighter.drawSkin(sourceCtx);
  } else {
    FighterRenderer.drawBody(sourceCtx, fighter);
  }

  // Only render weapons via drawGun if:
  // 1. The fighter has a dedicated, custom drawGun (e.g. GunSlinger, John Wick, Aimbot, Laser), OR
  // 2. The fighter is a vanilla generic fighter without a custom skin/body
  // This strictly suppresses the base Fighter.prototype.drawGun from drawing generic pistol barrels on brawlers/swordsmen (Saitama, Yuji, Toji, etc.)
  const hasCustomSkin = Boolean(fighter.drawSkin) || (typeof fighter.drawBody === 'function' && fighter.drawBody !== Fighter.prototype.drawBody);
  const isGenericGun = !fighter.drawGun || fighter.drawGun === Fighter.prototype.drawGun;

  if (!hasCustomSkin || !isGenericGun) {
    if (typeof fighter.drawGun === 'function' && !fighter.hideWeapon && !fighter.hideGun && !fighter.isTargetOfAmbush) {
      fighter.drawGun(sourceCtx);
    }
  }
}

/**
 * Draws a clean, solid manga-style dark ink outline stroke around live in-game fighters
 * matching the Top HUD duel profile badge aesthetic (1.5px stroke, #050609).
 * Uses persistent offscreen source-in masking to eliminate GC overhead and preserve 60 FPS.
 *
 * @param {CanvasRenderingContext2D} destCtx - Destination canvas context
 * @param {Object} fighter - Fighter instance to outline
 */
export function drawFighterInkOutline(destCtx, fighter) {
  if (!destCtx || !fighter) return;
  if (fighter.hp <= 0 && !fighter.isRevivingFromContract && !fighter.isShatterReviving) return;
  if (fighter.vanishTimer > 0 || fighter._hideInBush) return;
  if (fighter.isTurret || fighter.isBuilding || fighter.isDeployable || fighter.isPlant || fighter.isEndCrystal) return;
  if (fighter.suppressInkOutline || fighter._suppressInkOutline) return;
  if (typeof state !== 'undefined' && state.enableFighterInkOutline === false) return;
  if (typeof CONFIG !== 'undefined' && CONFIG.enableFighterInkOutline === false) return;
  if (fighter._isSilhouettePass) return; // Prevent recursive outline rendering

  const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  if (fighter._inkOutlineDrawnFrame === currentFrame) return;
  fighter._inkOutlineDrawnFrame = currentFrame;

  if (!_ensureBuffers()) return;

  const outlineWidth = (typeof CONFIG !== 'undefined' && CONFIG.fighterInkOutlineWidth) || 1.5;
  const outlineColor = (typeof CONFIG !== 'undefined' && CONFIG.fighterInkOutlineColor) || '#050609';

  const fighterX = fighter.x;
  const drawY = fighter.y - (fighter.z || 0);

  // 1. Clear offscreen source buffer
  _sourceCtx.clearRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);

  // 2. Center and render the fighter model inside source buffer
  _sourceCtx.save();
  _sourceCtx.translate(HALF_BUFFER - fighterX, HALF_BUFFER - drawY);

  const prevIsSilhouette = fighter._isSilhouettePass;
  const prevHideHp = fighter.hideHpText;
  const prevSuppressFreeze = fighter._suppressFreezeTimer;

  fighter._isSilhouettePass = true;
  fighter.hideHpText = true;
  fighter._suppressFreezeTimer = true;

  try {
    _drawFighterModel(_sourceCtx, fighter);
  } catch (err) {
    // Graceful recovery: prevent skin rendering exceptions from interrupting the combat loop
  } finally {
    fighter._isSilhouettePass = prevIsSilhouette;
    fighter.hideHpText = prevHideHp;
    fighter._suppressFreezeTimer = prevSuppressFreeze;
    _sourceCtx.restore();
  }

  // 3. Convert model to solid ink silhouette via source-in composite
  _silCtx.clearRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);
  _silCtx.drawImage(_sourceCanvas, 0, 0);
  _silCtx.globalCompositeOperation = 'source-in';
  _silCtx.fillStyle = outlineColor;
  _silCtx.fillRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);
  _silCtx.globalCompositeOperation = 'source-over';

  // 4. Blit the solid ink silhouette onto destination ctx at 8 cardinal and diagonal offsets
  const destX = fighterX - HALF_BUFFER;
  const destY = drawY - HALF_BUFFER;

  destCtx.save();
  destCtx.imageSmoothingEnabled = false;

  const alpha = (fighter.alpha !== undefined) ? fighter.alpha : ((fighter.opacity !== undefined) ? fighter.opacity : 1.0);
  if (alpha < 1.0) {
    destCtx.globalAlpha = (destCtx.globalAlpha || 1.0) * alpha;
  }

  for (let i = 0; i < NUM_OFFSETS; i++) {
    const off = _cachedOffsets[i];
    destCtx.drawImage(_silCanvas, destX + off.cos * outlineWidth, destY + off.sin * outlineWidth);
  }

  destCtx.restore();
}

