// ─────────────────────────────────────────────
// FOC MAPS — FOC MAP RENDERER
// High-performance Canvas 2D renderer for FOC boss battle arenas, interactive animated bushes,
// and 6-frame pixel rustle sprite sheet animation when fighters step into foliage.
// ─────────────────────────────────────────────

import { state } from '../js/core/state.js';
import { audioSystem } from '../js/systems/audioSystem.js';

// Pre-computed default frame bounding boxes (420x420) from Bush- Rustling Pixel Bush Sprite Sheet.png
const DEFAULT_BUSH_FRAME_RECTS = [
  { sx: 50, sy: 101, sw: 420, sh: 420 },    // Frame 0: Default compact
  { sx: 551, sy: 103, sw: 420, sh: 420 },   // Frame 1: Rustle left
  { sx: 1060, sy: 104, sw: 420, sh: 420 },  // Frame 2: Rustle right with loose leaves
  { sx: 62, sy: 540, sw: 420, sh: 420 },    // Frame 3: Rustle both sides
  { sx: 561, sy: 549, sw: 420, sh: 420 },   // Frame 4: Rustle top
  { sx: 1062, sy: 554, sw: 420, sh: 420 },  // Frame 5: Intense rustle shake
];

const DEFAULT_RUSTLE_ANIM_SEQUENCE = [1, 2, 5, 3, 4, 2, 1];
const DEFAULT_LEAF_COLORS = ['#3B8226', '#225E16', '#84CC16', '#143D0F', '#4ADE80', '#15803D'];

let _bushSheetImage = null;
let _bushSheetLoading = false;
let _bushSingleImage = null;
let _bushSingleLoading = false;

let _activeLeaves = [];
let _sfxDebounceTimer = 0;

/**
 * Returns or preloads the animated Rustling Pixel Bush Sprite Sheet
 */
export function getBushSpriteSheet(map) {
  const spritePath = map?.sprites?.rustleSheet || 'Assets/model/Sprites/Bush- Rustling Pixel Bush Sprite Sheet.png';
  if (_bushSheetImage && _bushSheetImage.complete && _bushSheetImage.naturalWidth > 0 && _bushSheetImage._srcPath === spritePath) {
    return _bushSheetImage;
  }
  if (!_bushSheetLoading && typeof Image !== 'undefined') {
    _bushSheetLoading = true;
    const img = new Image();
    img.onload = () => {
      _bushSheetImage = img;
      _bushSheetImage._srcPath = spritePath;
      _bushSheetLoading = false;
    };
    img.onerror = () => {
      _bushSheetLoading = false;
    };
    img.src = encodeURI(spritePath);
    _bushSheetImage = img;
    _bushSheetImage._srcPath = spritePath;
  }
  return _bushSheetImage;
}

/**
 * Returns or preloads the fallback single bush sprite
 */
export function getBushSprite(map) {
  const spritePath = map?.sprites?.singleBush || 'Assets/model/Sprites/Bush-sprite.png';
  if (_bushSingleImage && _bushSingleImage.complete && _bushSingleImage.naturalWidth > 0 && _bushSingleImage._srcPath === spritePath) {
    return _bushSingleImage;
  }
  if (!_bushSingleLoading && typeof Image !== 'undefined') {
    _bushSingleLoading = true;
    const img = new Image();
    img.onload = () => {
      _bushSingleImage = img;
      _bushSingleImage._srcPath = spritePath;
      _bushSingleLoading = false;
    };
    img.onerror = () => {
      _bushSingleLoading = false;
    };
    img.src = encodeURI(spritePath);
    _bushSingleImage = img;
    _bushSingleImage._srcPath = spritePath;
  }
  return _bushSingleImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getBushSpriteSheet();
  getBushSprite();
}

/**
 * Resets all active map particles, SFX timers, and cuts off lingering foliage audio
 */
export function resetFocMapState() {
  _activeLeaves = [];
  _sfxDebounceTimer = 0;
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.stopSoundBySrc === 'function') {
    audioSystem.stopSoundBySrc('Assets/Sound Effects/Sprites SFX/walk-on-grass.mp3');
    audioSystem.stopSoundBySrc('Assets/Sound Effects/Skills/dash1.mp3');
  }
}

/**
 * Updates interactive map physics (bush sprite sheet animation, rustling, fighter footsteps, leaf particles)
 */
export function updateFocMap(dt = 1, map) {
  if (!map || !map.bushes || !Array.isArray(map.bushes)) return;

  // Strict Lifecycle Guard: Only update map physics & play SFX during active battle states!
  const isMatchActive = Boolean(
    typeof state !== 'undefined' &&
    (state.gameState === 'playing' || state.gameState === 'countdown' || state.gameState === 'roundEnd' || state.gameState === 'matchEnd') &&
    state.fighters &&
    state.fighters.length > 0
  );
  if (!isMatchActive) {
    if (_activeLeaves.length > 0) _activeLeaves = [];
    _sfxDebounceTimer = 0;
    return;
  }

  const fighters = state.fighters;
  if (_sfxDebounceTimer > 0) {
    _sfxDebounceTimer -= dt;
  }

  const foliage = map.foliage || {};
  const sounds = map.sounds || {};
  const soundVolumes = map.soundVolumes || {};
  const soundSpeeds = map.soundSpeeds || {};
  const soundChances = map.soundChances || {};
  const soundDelays = map.soundDelays || {};

  const maxRustle = foliage.maxRustleTimer ?? 24;
  const rustleInc = foliage.rustleIncrement ?? 3;
  const swayDamp = foliage.swayDamping ?? 0.86;
  const swayMaxX = foliage.swayMaxX ?? 4.0;
  const swayMaxY = foliage.swayMaxY ?? 2.5;
  const swayMultX = foliage.swaySpeedMultX ?? 0.7;
  const swayMultY = foliage.swaySpeedMultY ?? 0.4;
  const leafChance = soundChances.leafFlutter ?? foliage.leafSpawnChance ?? 0.22;
  const maxLeaves = foliage.maxActiveLeaves ?? 32;
  const leafPalette = foliage.leafColors || DEFAULT_LEAF_COLORS;

  const rustleSFX = sounds.bushRustle || 'Assets/Sound Effects/Sprites SFX/walk-on-grass.mp3';
  const rustleVol = soundVolumes.bushRustle ?? 0.48;
  const rustleSpd = soundSpeeds.bushRustle ?? 1.0;
  const debounceFrames = soundDelays.debounceFrames ?? 24;
  const strideDistance = soundDelays.strideDistance ?? 38;
  const pitchVariation = soundDelays.pitchVariation ?? 0.12;

  for (let i = 0; i < map.bushes.length; i++) {
    const b = map.bushes[i];
    b.animTick = b.animTick || 0;

    // Check overlaps with living fighters (Boss or Challengers stepping into the foliage)
    let isTouching = false;
    let isAnyFighterMoving = false;
    let maxSpdInBush = 0;

    for (let fIdx = 0; fIdx < fighters.length; fIdx++) {
      const f = fighters[fIdx];
      if (!f || f.hp <= 0) continue;

      const dist = Math.hypot(f.x - b.x, f.y - b.y);
      const touchDist = (b.radius || foliage.defaultRadius || 48) + (f.r || 25);

      if (dist < touchDist) {
        isTouching = true;
        const velSpd = Math.hypot(f.vx || 0, f.vy || 0);
        const posSpd = (f._lastBushX !== undefined && f._lastBushY !== undefined)
          ? Math.hypot(f.x - f._lastBushX, f.y - f._lastBushY)
          : velSpd;
        const spd = Math.max(velSpd, posSpd);

        if (spd > 0.4) {
          isAnyFighterMoving = true;
          if (spd > maxSpdInBush) maxSpdInBush = spd;

          // Accumulate distance moved inside foliage for cadence-based footstep pacing
          f._bushWalkDist = (f._bushWalkDist || 0) + spd;

          // Trigger soft rustling audio SFX only upon completing natural stride distance & debounce
          if (f._bushWalkDist >= strideDistance && _sfxDebounceTimer <= 0) {
            f._bushWalkDist = 0;
            _sfxDebounceTimer = debounceFrames;

            if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
              const pitchOffset = (Math.random() - 0.5) * pitchVariation;
              const currentPitch = Math.max(0.7, Math.min(1.4, rustleSpd + pitchOffset));
              audioSystem.playSFX(rustleSFX, rustleVol, currentPitch);
            }
          }
        }
      }
    }

    b.isSteppedOn = isTouching;

    if (isAnyFighterMoving) {
      // Advance animation tick and rustle timer ONLY while moving!
      b.animTick = (b.animTick || 0) + 1;
      b.rustleTimer = Math.min(maxRustle, (b.rustleTimer || 0) + rustleInc);

      // Foliage sway impulse proportional to movement velocity
      b.swayX = Math.sin(Date.now() * 0.025 + i) * Math.min(swayMaxX, maxSpdInBush * swayMultX);
      b.swayY = Math.cos(Date.now() * 0.03 + i) * Math.min(swayMaxY, maxSpdInBush * swayMultY);

      // Subtle leaf flutter particles flying off the foliage
      if (Math.random() < leafChance && _activeLeaves.length < maxLeaves) {
        _activeLeaves.push({
          x: b.x + (Math.random() - 0.5) * (b.radius || foliage.defaultRadius || 48) * 1.3,
          y: b.y + (Math.random() - 0.5) * (b.radius || foliage.defaultRadius || 48) * 1.3,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -1.2 - Math.random() * 1.8,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.25,
          size: 2.5 + Math.random() * 2.5,
          color: leafPalette[Math.floor(Math.random() * leafPalette.length)],
          alpha: 1.0,
          life: 25 + Math.floor(Math.random() * 20),
          maxLife: 45
        });
      }
    } else {
      // If standing still or not touching, decay rustle timer smoothly back to resting frame 0
      if (b.rustleTimer > 0) {
        b.rustleTimer = Math.max(0, b.rustleTimer - dt * 2);
        b.animTick = (b.animTick || 0) + 1;
      } else {
        b.animTick = 0;
      }
    }

    // Dampen sway back to rest
    if (b.swayX) b.swayX *= swayDamp;
    if (b.swayY) b.swayY *= swayDamp;
    if (Math.abs(b.swayX) < 0.05) b.swayX = 0;
    if (Math.abs(b.swayY) < 0.05) b.swayY = 0;
  }

  // Update fighter position cache for next frame movement delta check
  for (let fIdx = 0; fIdx < fighters.length; fIdx++) {
    const f = fighters[fIdx];
    if (f) {
      f._lastBushX = f.x;
      f._lastBushY = f.y;
    }
  }

  // ── Special Interaction: Boss Yuta Bush Camouflage, Evade Buff & Foliage Drag Slowdown ──
  const bossInteractions = map.bossInteractions || {};
  const stealthAlpha = bossInteractions.stealthAlpha ?? 0.40;
  const evadeChance = bossInteractions.evadeChance ?? 0.75;
  const defaultSpeedMult = bossInteractions.speedMultiplier ?? 0.65;
  const camoFadeSpeed = bossInteractions.camoFadeSpeed ?? 0.08;

  for (let fIdx = 0; fIdx < fighters.length; fIdx++) {
    const f = fighters[fIdx];
    if (!f || f.hp <= 0) continue;

    const isBossYuta = Boolean(
      (f.isBoss || f._isBoss) &&
      (f.characterId === 'yuta' || f.type === 'yuta' || f.bossConfig?.bossId === 'yuta' || f._def?.id === 'yuta')
    );

    if (isBossYuta) {
      const speedMult = f.bossConfig?.bushSpeedMultiplier ?? defaultSpeedMult;
      let isInsideAnyBush = false;
      for (let bIdx = 0; bIdx < map.bushes.length; bIdx++) {
        const b = map.bushes[bIdx];
        const dist = Math.hypot(f.x - b.x, f.y - b.y);
        const touchDist = (b.radius || foliage.defaultRadius || 48) + (f.r || 25);
        if (dist < touchDist) {
          isInsideAnyBush = true;
          break;
        }
      }

      const isUndetected = (bossInteractions.undetectedInBush !== false && f.bossConfig?.bushUndetected !== false);
      f.isHidingInBush = isInsideAnyBush;
      f.isUndetectedInBush = isInsideAnyBush && isUndetected;

      if (isInsideAnyBush) {
        // 1. Evade Buff (Active as long as Boss Yuta is in the bush)
        f.evadeBuffTimer = 2;
        f.evadeChance = evadeChance;
        f.isBushEvadeActive = true;

        // 2. Movement Speed Drag (Dense foliage slows movement down while in bush)
        f.bushSpeedMultiplier = speedMult;

        // 3. Smooth stealth transparency (Hiding in the bush)
        const currentAlpha = f._bushStealthAlpha !== undefined ? f._bushStealthAlpha : 1.0;
        f._bushStealthAlpha = Math.max(stealthAlpha, currentAlpha - camoFadeSpeed);

        // Visual floating status text on initial entrance
        if (!f._wasInBushPrev) {
          f._wasInBushPrev = true;
          if (typeof state !== 'undefined' && typeof state.spawnFloatingText === 'function') {
            state.spawnFloatingText(f.x, f.y - (f.r || 25) - 12, 'BUSH CAMOUFLAGE!', '#4ADE80');
          }
        }
      } else {
        // Instant exit: clear undetected status, clear evade buff, reset speed multiplier, restore opacity
        f.isUndetectedInBush = false;
        f.isBushEvadeActive = false;
        f.evadeBuffTimer = 0;
        f.evadeChance = 0;
        f.bushSpeedMultiplier = 1.0;
        const currentAlpha = f._bushStealthAlpha !== undefined ? f._bushStealthAlpha : 1.0;
        f._bushStealthAlpha = Math.min(1.0, currentAlpha + camoFadeSpeed);
        f._wasInBushPrev = false;
      }
    }
  }

  // Update floating leaves
  for (let lIdx = _activeLeaves.length - 1; lIdx >= 0; lIdx--) {
    const leaf = _activeLeaves[lIdx];
    leaf.x += leaf.vx;
    leaf.y += leaf.vy;
    leaf.vy += 0.08;
    leaf.vx *= 0.96;
    leaf.rot += leaf.rotSpeed;
    leaf.life -= dt;
    leaf.alpha = Math.max(0, leaf.life / leaf.maxLife);
    if (leaf.life <= 0) {
      _activeLeaves.splice(lIdx, 1);
    }
  }
}

/**
 * Draws all tactical bushes (with 6-frame animated sprite sheet) and foliage particles for the active FOC Map
 */
export function drawFocMap(ctx, map) {
  if (!map) return;

  const sheetImg = getBushSpriteSheet(map);
  const singleImg = getBushSprite(map);
  const hasSheet = Boolean(sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0);
  const hasSingle = Boolean(singleImg && singleImg.complete && singleImg.naturalWidth > 0);

  const sprites = map.sprites || {};
  const foliage = map.foliage || {};
  const frameRects = sprites.frameBoundingBoxes || DEFAULT_BUSH_FRAME_RECTS;
  const animSeq = sprites.rustleAnimSequence || DEFAULT_RUSTLE_ANIM_SEQUENCE;
  const frameRateDiv = sprites.animFrameRateDivider || 4;
  const defaultSizeMult = sprites.drawSizeMultiplier || foliage.drawSizeMultiplier || 2.45;

  ctx.save();

  if (map.bushes && Array.isArray(map.bushes)) {
    for (let i = 0; i < map.bushes.length; i++) {
      const b = map.bushes[i];
      const bx = b.x + (b.swayX || 0);
      const by = b.y + (b.swayY || 0);
      const rad = b.radius || foliage.defaultRadius || 48;
      const drawSize = rad * (b.drawSizeMultiplier || defaultSizeMult);

      // 1. Ground Shadow underneath bush
      ctx.beginPath();
      ctx.ellipse(bx, by + rad * 0.32, rad * 0.95, rad * 0.36, 0, 0, Math.PI * 2);
      ctx.fillStyle = map.theme?.bushShadowColor || 'rgba(15, 23, 42, 0.42)';
      ctx.fill();

      // 2. Determine Animation Frame (Rustle Sequence vs Resting Frame 0)
      let frameIdx = 0;
      if (b.rustleTimer > 0) {
        const animStep = Math.floor((b.animTick || 0) / frameRateDiv) % animSeq.length;
        frameIdx = animSeq[animStep];
      }

      // 3. Render Bush Sprite
      if (hasSheet) {
        const frame = frameRects[frameIdx] || frameRects[0];
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          sheetImg,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          bx - drawSize / 2,
          by - drawSize / 2,
          drawSize,
          drawSize
        );
        ctx.restore();
      } else if (hasSingle) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          singleImg,
          bx - drawSize / 2,
          by - drawSize / 2,
          drawSize,
          drawSize
        );
        ctx.restore();
      } else {
        // Authentic procedural pixel-art foliage fallback
        _drawProceduralBush(ctx, bx, by, rad, map);
      }
    }
  }

  // 4. Floating interactive leaf flutter particles
  if (_activeLeaves.length > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < _activeLeaves.length; i++) {
      const p = _activeLeaves[i];
      if (p.alpha <= 0.01) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Procedural pixel foliage fallback while sprite sheet is loading
 */
function _drawProceduralBush(ctx, bx, by, r, map) {
  const lobes = [
    { ox: 0, oy: -r * 0.15, rad: r * 0.68, col: '#3B8226', notch: '#15803D' },
    { ox: -r * 0.36, oy: r * 0.05, rad: r * 0.56, col: '#2E6E1E', notch: '#143D0F' },
    { ox: r * 0.36, oy: r * 0.05, rad: r * 0.56, col: '#2E6E1E', notch: '#143D0F' },
    { ox: -r * 0.18, oy: r * 0.25, rad: r * 0.52, col: '#225E16', notch: '#0E280A' },
    { ox: r * 0.18, oy: r * 0.25, rad: r * 0.52, col: '#225E16', notch: '#0E280A' },
    { ox: 0, oy: -r * 0.38, rad: r * 0.42, col: '#84CC16', notch: '#3B8226' }
  ];

  const outlineColor = map?.theme?.bushOutlineColor || '#0E230A';

  for (let i = 0; i < lobes.length; i++) {
    const lobe = lobes[i];
    const lx = bx + lobe.ox;
    const ly = by + lobe.oy;

    ctx.beginPath();
    ctx.arc(lx, ly, lobe.rad, 0, Math.PI * 2);
    ctx.fillStyle = lobe.col;
    ctx.fill();

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.fillStyle = lobe.notch;
    ctx.fillRect(lx - 4, ly - 4, 8, 4);
    ctx.fillRect(lx - 2, ly + 2, 4, 4);
  }
}
