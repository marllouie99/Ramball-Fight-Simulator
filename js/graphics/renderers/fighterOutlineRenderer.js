import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { Fighter } from '../../entities/fighter.js';
import { FighterRenderer } from './fighterRenderer.js';

// Dedicated persistent offscreen buffers for zero-GC silhouette caching (preserves locked 60 FPS)
// 160x160 buffer reduces pixel composite fill-rate by 61% compared to 256x256
const BUFFER_SIZE = 160;
const HALF_BUFFER = BUFFER_SIZE / 2;

// 4 cardinal offsets (+X, -X, +Y, -Y) for crisp, clean 2.2px manga ink stroke without diagonal overdraw
const NUM_OFFSETS = 4;
const _cachedOffsets = [
  { cos: 1, sin: 0 },
  { cos: -1, sin: 0 },
  { cos: 0, sin: 1 },
  { cos: 0, sin: -1 }
];

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
 * Checks whether an entity is a non-hero entity (minion, plant, turret, building,
 * deployable, illusion, lawnmower, chess piece, or projectile/VFX) that must be
 * strictly excluded from silhouette ink outline and floor contact passes.
 */
function _isExcludedFromSilhouette(fighter) {
  if (!fighter) return true;
  return Boolean(
    fighter.isMinion || fighter.isPlant || fighter.isPlantMinion ||
    fighter.isTurret || fighter.isBuilding || fighter.isDeployable ||
    fighter.isIllusion || fighter.isProjectile || fighter.isVfx || fighter.isVisualEffect ||
    fighter.isChessPiece || fighter.isChessTroop || fighter.isChessMinion ||
    fighter.isTransfiguredHuman || fighter.isServantOfCthulhu || fighter.isLawnmower ||
    fighter.characterId === 'crazydave_plant' || fighter.characterId === 'crazydave_lawnmower' ||
    fighter.characterId === 'crazydave_potato_mine' ||
    fighter.characterId?.startsWith('chess_') ||
    fighter.name === 'Peashooter' || fighter.name === 'Snow Pea' || fighter.name === 'Wall-nut' ||
    fighter.name === 'Torchwood' || fighter.name === 'Potato Mine' || fighter.name === 'Lawnmower' ||
    fighter.name === 'Sun' || fighter.isSunDrop
  );
}

/**
 * Renders the fighter's base visual model (body, skin, hair, cape, arms/hands)
 * into an offscreen buffer for silhouette ink outline generation.
 * Strictly uses drawBody/drawSkin to prevent triggering world effects, sun drops,
 * lawnmowers, particle systems, or in-game overhead HP numbers.
 */
function _drawFighterModel(sourceCtx, fighter) {
  // Use drawBody or drawSkin directly. NEVER call fighter.draw() as it invokes
  // world effects, sun drop arrays, lawnmowers, and particle loops.
  // Weapons (drawGun) are strictly excluded so weapons never receive an unnatural black outline/silhouette.
  if (typeof fighter.drawBody === 'function' && fighter.drawBody !== Fighter.prototype.drawBody) {
    fighter.drawBody(sourceCtx);
  } else if (typeof fighter.drawSkin === 'function') {
    fighter.drawSkin(sourceCtx);
  } else {
    FighterRenderer.drawBody(sourceCtx, fighter);
  }
}

/**
 * Draws a subtle, grounded floor contact shadow ellipse on the arena floor
 * directly beneath live in-game fighters (Rule 29 & Arcade standard).
 * Anchors the entity in 3D space and scales/fades dynamically with vertical height (z).
 *
 * @param {CanvasRenderingContext2D} destCtx - Destination canvas context
 * @param {Object} fighter - Fighter instance to ground
 */
export function drawFighterFloorShadow(destCtx, fighter) {
  if (!destCtx || !fighter) return;
  if (_isExcludedFromSilhouette(fighter)) return;
  if (fighter.hp <= 0 && !fighter.isRevivingFromContract && !fighter.isShatterReviving && !fighter.isDying) return;
  if (fighter.vanishTimer > 0 || fighter._hideInBush) return;
  if (fighter.suppressFloorShadow || fighter._suppressFloorShadow) return;
  if (typeof state !== 'undefined' && state.enableFighterFloorShadow === false) return;
  if (typeof CONFIG !== 'undefined' && CONFIG.enableFighterFloorShadow === false) return;
  if (fighter._isSilhouettePass) return;

  const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  if (fighter._floorShadowDrawnFrame === currentFrame) return;
  fighter._floorShadowDrawnFrame = currentFrame;

  const r = fighter.r || 25;
  const z = Math.max(0, fighter.z || 0);

  // Height scaling: shadow contracts and softens as fighter jumps or floats higher
  const heightFactor = Math.max(0.35, 1.0 - (z / 180));
  const rx = r * 0.94 * heightFactor;
  const ry = r * 0.38 * heightFactor;

  // Contact shadow stays on the ground floor plane (fighter.x, fighter.y)
  const floorX = fighter.x;
  const floorY = fighter.y;

  const baseAlpha = 0.32;
  const alpha = Math.max(0.06, baseAlpha * (1.0 - z / 220)) * (fighter.alpha ?? fighter.opacity ?? 1.0);

  destCtx.save();
  destCtx.beginPath();
  destCtx.ellipse(floorX, floorY, rx, ry, 0, 0, Math.PI * 2);
  destCtx.fillStyle = `rgba(5, 6, 9, ${alpha.toFixed(3)})`;
  destCtx.fill();
  destCtx.restore();
}

/**
 * Draws a clean, solid manga-style dark ink outline stroke around live in-game fighters
 * matching the Top HUD duel profile badge aesthetic (2.2px stroke, #050609).
 * Uses persistent offscreen source-in masking to eliminate GC overhead and preserve 60 FPS.
 * Strictly excludes minions, plants, deployables, and VFX.
 *
 * @param {CanvasRenderingContext2D} destCtx - Destination canvas context
 * @param {Object} fighter - Fighter instance to outline
 */
export function drawFighterInkOutline(destCtx, fighter) {
  if (!destCtx || !fighter) return;
  if (_isExcludedFromSilhouette(fighter)) return;
  if (fighter.hp <= 0 && !fighter.isRevivingFromContract && !fighter.isShatterReviving && !fighter.isDying) return;
  if (fighter.vanishTimer > 0 || fighter._hideInBush) return;
  if (fighter.suppressInkOutline || fighter._suppressInkOutline) return;
  if (fighter._isPreview || fighter._isCardPreview) return; // Prevent combat ink outline on card previews & UI stickers
  if (typeof state !== 'undefined' && state.enableFighterInkOutline === false) return;
  if (typeof CONFIG !== 'undefined' && CONFIG.enableFighterInkOutline === false) return;
  if (fighter._isSilhouettePass) return; // Prevent recursive outline rendering

  const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  if (fighter._inkOutlineDrawnFrame === currentFrame) return;
  fighter._inkOutlineDrawnFrame = currentFrame;

  if (!_ensureBuffers()) return;

  const outlineWidth = (typeof CONFIG !== 'undefined' && CONFIG.fighterInkOutlineWidth) || 2.2;
  const outlineColor = (typeof CONFIG !== 'undefined' && CONFIG.fighterInkOutlineColor) || '#050609';

  const fighterX = fighter.x;
  const drawY = fighter.y - (fighter.z || 0);

  // 1. Clear offscreen source buffer (160x160)
  _sourceCtx.clearRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);

  // 2. Center and render the fighter model inside source buffer
  _sourceCtx.save();
  _sourceCtx.translate(HALF_BUFFER - fighterX, HALF_BUFFER - drawY);

  const prevIsSilhouette = fighter._isSilhouettePass;
  const prevHideHp = fighter.hideHpText;
  const prevSuppressFreeze = fighter._suppressFreezeTimer;
  const prevHideWeapon = fighter.hideWeapon;
  const prevSuppressWeapons = fighter._suppressWeaponsInSilhouettePass;
  const prevShowSkinOnly = state.showSkinOnly;

  fighter._isSilhouettePass = true;
  fighter.hideHpText = true;
  fighter._suppressFreezeTimer = true;
  fighter.hideWeapon = true;
  fighter._suppressWeaponsInSilhouettePass = true;
  state.showSkinOnly = true;

  try {
    _drawFighterModel(_sourceCtx, fighter);
  } catch (err) {
    // Graceful recovery: prevent skin rendering exceptions from interrupting the combat loop
  } finally {
    state.showSkinOnly = prevShowSkinOnly;
    fighter._suppressWeaponsInSilhouettePass = prevSuppressWeapons;
    fighter.hideWeapon = prevHideWeapon;
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

  // 4. Blit the solid ink silhouette onto destination ctx at 4 cardinal offsets
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
