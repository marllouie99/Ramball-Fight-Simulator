// ─────────────────────────────────────────────
// SPEED LINES RENDERER
// Manga action speed line clusters adhering to Rule 16
// 4-point filled needle polygons, pre-seeded static array caches (Zero GC)
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';

// ──────────────────────────────────────────
// Genos Machine Gun Blows & Dash Speed Lines
// ──────────────────────────────────────────
let _genosSpeedLineSeeds = null;
let _genosSpeedLineTheme = null;

function _initGenosSpeedLineSeeds(theme = 'flurry', isDarkMode = false) {
  _genosSpeedLineSeeds = [];
  _genosSpeedLineTheme = `${theme}_${isDarkMode ? 'dark' : 'light'}`;
  const totalLines = 22;

  for (let i = 0; i < totalLines; i++) {
    const norm = (i / (totalLines - 1)) * 2 - 1; // -1.0 to +1.0
    // Compact perpendicular distribution matching Genos body size (~70px total width)
    const perpOffset = norm * 35 + (Math.random() - 0.5) * 6;
    
    // Dash speed line length (center ~90px, edges ~35px)
    const normDist = 1 - Math.abs(norm);
    const len = 35 + normDist * 55 + Math.random() * 15;
    
    // Sharp needle thickness (1.0px to 2.2px max)
    const maxThick = 1.0 + normDist * 1.2 + Math.random() * 0.4;

    // Movement speed along direction
    const speed = 14 + Math.random() * 10;
    const phase = Math.random() * 120;

    // Skill 1 (flurry) uses fiery orange/gold/white/black theme; Dashes use pure black manga ink
    let color;
    if (theme === 'dash') {
      color = isDarkMode ? '#100500' : 'rgba(10, 10, 15, 0.92)';
    } else {
      if (i % 4 === 0) color = isDarkMode ? '#FF5500' : 'rgba(255, 85, 0, 0.95)';       // Genos fiery orange
      else if (i % 4 === 1) color = isDarkMode ? '#FFCC00' : 'rgba(255, 200, 0, 0.95)'; // Hot golden heat
      else if (i % 4 === 2) color = '#FFFFFF';                                           // White core
      else color = isDarkMode ? '#150500' : 'rgba(15, 15, 22, 0.90)';                   // Crisp obsidian manga ink line
    }

    _genosSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawGenosSpeedLines() {
  if (!state.fighters) return;
  const genosFighter = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'genos' && f.type !== 'genos')) return false;
    const isSuppressed = typeof f.areAttackEffectsSuppressed === 'function' ? f.areAttackEffectsSuppressed() : isSuppressedByGetsuga(f);
    if (isSuppressed) return false;
    const isDashing = (f.speedBoostTimer && f.speedBoostTimer > 0) || f.isDashing;
    return f.isFlurrying || isDashing;
  });
  if (!genosFighter) return;

  const ctx = state.ctx;
  if (!ctx) return;

  const isDarkMode = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  const isDashing = (genosFighter.speedBoostTimer && genosFighter.speedBoostTimer > 0) || genosFighter.isDashing;
  const activeState = genosFighter.isFlurrying ? 'flurry' : (isDashing ? 'dash' : false);
  if (!activeState) return;

  const expectedKey = `${activeState}_${isDarkMode ? 'dark' : 'light'}`;
  if (_genosSpeedLineTheme !== expectedKey || genosFighter._lastSpeedLineState !== activeState) {
    _genosSpeedLineSeeds = null;
  }
  genosFighter._lastSpeedLineState = activeState;

  if (!_genosSpeedLineSeeds) _initGenosSpeedLineSeeds(activeState, isDarkMode);

  // If dashing and moving, align with movement velocity; if flurrying (Skill 1), align with aim angle
  let lineAngle;
  if (!genosFighter.isFlurrying && isDashing && Math.hypot(genosFighter.vx || 0, genosFighter.vy || 0) > 0.5) {
    lineAngle = Math.atan2(genosFighter.vy, genosFighter.vx);
  } else {
    lineAngle = genosFighter.gunAngle !== undefined ? genosFighter.gunAngle : (genosFighter.angle || 0);
  }

  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = genosFighter.x;
  const cy = genosFighter.y;
  const now = Date.now();

  ctx.save();
  if (isDarkMode) {
    ctx.imageSmoothingEnabled = false;
  }

  const snap = (v) => isDarkMode ? Math.round(v / 2) * 2 : v;

  for (let i = 0; i < _genosSpeedLineSeeds.length; i++) {
    const seed = _genosSpeedLineSeeds[i];
    // Travel in the BACKWARD direction (opposite to punch aim) — lines stream behind Genos
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100);
    
    // Cluster centered slightly BEHIND Genos (opposite punch direction)
    const backOffset = 30;
    const lineCenterX = cx - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = cy - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.len / 2;
    const halfThick = seed.maxThick / 2;

    // Needle polygon points: sharp start point, top mid, sharp end point, bot mid
    const midOff = halfLen * 0.15;
    
    const startX = snap(lineCenterX - cosA * halfLen);
    const startY = snap(lineCenterY - sinA * halfLen);

    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;

    const endX = snap(lineCenterX + cosA * halfLen);
    const endY = snap(lineCenterY + sinA * halfLen);

    const topMidX = snap(midX + perpX * halfThick);
    const topMidY = snap(midY + perpY * halfThick);

    const botMidX = snap(midX - perpX * halfThick);
    const botMidY = snap(midY - perpY * halfThick);

    ctx.fillStyle = seed.color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ──────────────────────────────────────────
// Saitama Consecutive Normal Punches Speed Lines
// ──────────────────────────────────────────
let _saitamaSpeedLineSeeds = null;

function _initSaitamaSpeedLineSeeds() {
  _saitamaSpeedLineSeeds = [];
  const totalLines = 24;

  for (let i = 0; i < totalLines; i++) {
    const norm = (i / (totalLines - 1)) * 2 - 1; // -1.0 to +1.0
    // Compact perpendicular distribution matching Saitama's body size (~70px total width)
    const perpOffset = norm * 36 + (Math.random() - 0.5) * 6;
    
    // Manga speed line length (center ~100px, edges ~40px)
    const normDist = 1 - Math.abs(norm);
    const len = 40 + normDist * 60 + Math.random() * 15;
    
    // Sharp needle thickness (1.0px to 2.3px max)
    const maxThick = 1.0 + normDist * 1.3 + Math.random() * 0.4;

    // Movement speed along direction
    const speed = 16 + Math.random() * 10;
    const phase = Math.random() * 120;

    // 4-slot character theme palette (Rule #16)
    let color;
    if (i % 4 === 0) color = 'rgba(245, 196, 0, 0.95)';       // Saitama Bright Yellow
    else if (i % 4 === 1) color = 'rgba(255, 235, 148, 0.95)'; // Hero Suit Cream Gold
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White-hot core
    else color = 'rgba(200, 0, 0, 0.90)';                     // Crimson Glove Accent

    _saitamaSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawSaitamaSpeedLines() {
  if (!state.fighters) return;
  const saitamaFighter = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'saitama' && f.type !== 'saitama')) return false;
    const isSuppressed = typeof f.areAttackEffectsSuppressed === 'function' ? f.areAttackEffectsSuppressed() : isSuppressedByGetsuga(f);
    if (isSuppressed) return false;
    return f.isFlurrying;
  });
  if (!saitamaFighter) return;

  const ctx = state.ctx;
  if (!ctx) return;

  const activeState = saitamaFighter.isFlurrying ? 'flurry' : false;
  if (!activeState) return;

  if (saitamaFighter._lastSpeedLineState !== activeState) {
    _saitamaSpeedLineSeeds = null;
  }
  saitamaFighter._lastSpeedLineState = activeState;

  if (!_saitamaSpeedLineSeeds) _initSaitamaSpeedLineSeeds();

  const lineAngle = saitamaFighter.gunAngle !== undefined ? saitamaFighter.gunAngle : (saitamaFighter.angle || 0);

  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = saitamaFighter.x;
  const cy = saitamaFighter.y;
  const now = Date.now();

  ctx.save();

  for (let i = 0; i < _saitamaSpeedLineSeeds.length; i++) {
    const seed = _saitamaSpeedLineSeeds[i];
    // Travel in the BACKWARD direction (opposite to punch aim) — lines stream behind Saitama
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100);
    
    // Cluster centered slightly BEHIND Saitama (opposite punch direction)
    const backOffset = 30;
    const lineCenterX = cx - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = cy - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.len / 2;
    const halfThick = seed.maxThick / 2;

    // Needle polygon points: sharp start point, top mid, sharp end point, bot mid
    const midOff = halfLen * 0.15;
    
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;

    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;

    const endX = lineCenterX + cosA * halfLen;
    const endY = lineCenterY + sinA * halfLen;

    const topMidX = midX + perpX * halfThick;
    const topMidY = midY + perpY * halfThick;

    const botMidX = midX - perpX * halfThick;
    const botMidY = midY - perpY * halfThick;

    ctx.fillStyle = seed.color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ──────────────────────────────────────────
// Mahoraga Wall Slam Dash / Blitz Speed Lines
// ──────────────────────────────────────────
let _mahoragaSpeedLineSeeds = null;

function _initMahoragaSpeedLineSeeds() {
  _mahoragaSpeedLineSeeds = [];
  const totalLines = 25;

  for (let i = 0; i < totalLines; i++) {
    const norm = (i / (totalLines - 1)) * 2 - 1; // -1.0 to +1.0
    // Perpendicular offset matching Mahoraga body size (~35px radius)
    const perpOffset = norm * 45 + (Math.random() - 0.5) * 8;
    
    // Parabolic length distribution (center longest ~100px, edges ~40px)
    const normDist = 1 - Math.abs(norm);
    const len = 40 + normDist * 60 + Math.random() * 20;
    
    // Sharp needle thickness (1.2px to 2.5px max)
    const maxThick = 1.0 + normDist * 1.5 + Math.random() * 0.4;

    const speed = 16 + Math.random() * 12;
    const phase = Math.random() * 120;

    // 4-slot theme palette: [Golden-Yellow, Light Silver, White Core, Dark Ink Line]
    let color;
    if (i % 4 === 0) color = 'rgba(255, 215, 0, 0.95)';       // Mahoraga Gold Theme
    else if (i % 4 === 1) color = 'rgba(212, 175, 55, 0.85)';  // Golden metallic
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White core
    else color = 'rgba(15, 15, 22, 0.92)';                    // Crisp black ink line

    _mahoragaSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawMahoragaSpeedLines() {
  if (!state.fighters) return;
  const mahoraga = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'mahoraga' && f.type !== 'mahoraga')) return false;
    const isSuppressed = typeof f.areAttackEffectsSuppressed === 'function' ? f.areAttackEffectsSuppressed() : isSuppressedByGetsuga(f);
    if (isSuppressed) return false;
    // Draw speed lines during: Wall Slam Dash, Strike, AND the Wall Slam Execution Blitz Flurry only
    const isDashOrStrike = f.isWallSlamActive && (f.wallSlamPhase === 'dash' || f.wallSlamPhase === 'strike');
    return isDashOrStrike || (f.isBlitzActive && f.isWallSlamBlitz);
  });
  if (!mahoraga) return;

  const ctx = state.ctx;
  if (!ctx) return;

  if (!_mahoragaSpeedLineSeeds) _initMahoragaSpeedLineSeeds();

  // Direction: points towards the target
  const lineAngle = mahoraga.gunAngle !== undefined ? mahoraga.gunAngle : (mahoraga.angle || 0);

  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = mahoraga.x;
  const cy = mahoraga.y;
  const now = Date.now();

  ctx.save();

  for (let i = 0; i < _mahoragaSpeedLineSeeds.length; i++) {
    const seed = _mahoragaSpeedLineSeeds[i];
    // Stream behind Mahoraga
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100);
    const backOffset = mahoraga.r * 1.2;
    const lineCenterX = cx - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = cy - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.len / 2;
    const halfThick = seed.maxThick / 2;
    const midOff = halfLen * 0.15;
    
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;

    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;

    const endX = lineCenterX + cosA * halfLen;
    const endY = lineCenterY + sinA * halfLen;

    const topMidX = midX + perpX * halfThick;
    const topMidY = midY + perpY * halfThick;

    const botMidX = midX - perpX * halfThick;
    const botMidY = midY - perpY * halfThick;

    ctx.fillStyle = seed.color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawNanamiSpeedLines() {
  // Speedlines disabled for Nanami dashes
  return;
}

export function drawIchigoBankaiSpeedLines() {
  // Disabled per user request: no speed lines during Ichigo's Bankai form
  return;
}

// ──────────────────────────────────────────
// Toji Fushiguro Stealth Ambush & Slash Speed Lines (Rule 16 Compliant)
// ──────────────────────────────────────────
let _tojiSpeedLineSeeds = null;
let _tojiSpeedLineTheme = null;

function _initTojiSpeedLineSeeds(isDarkMode = false) {
  _tojiSpeedLineSeeds = [];
  _tojiSpeedLineTheme = isDarkMode ? 'dark' : 'light';
  const totalLines = 22;

  for (let i = 0; i < totalLines; i++) {
    const norm = (i / (totalLines - 1)) * 2 - 1; // -1.0 to +1.0
    const perpOffset = norm * 36 + (Math.random() - 0.5) * 6;
    const normDist = 1 - Math.abs(norm);
    const len = 38 + normDist * 58 + Math.random() * 16;
    const maxThick = 1.0 + normDist * 1.3 + Math.random() * 0.4;
    const speed = 16 + Math.random() * 10;
    const phase = Math.random() * 120;

    let color;
    if (i % 4 === 0) color = isDarkMode ? '#FF2060' : 'rgba(255, 30, 86, 0.95)';       // Soul-split Crimson
    else if (i % 4 === 1) color = isDarkMode ? '#B040FF' : 'rgba(155, 31, 232, 0.95)'; // Cursed Violet
    else if (i % 4 === 2) color = '#FFFFFF';                                           // White-hot core
    else color = isDarkMode ? '#0A0014' : 'rgba(10, 4, 18, 0.92)';                    // Crisp dark manga ink line

    _tojiSpeedLineSeeds.push({
      perpOffset,
      len,
      maxThick,
      speed,
      phase,
      color
    });
  }
}

export function drawTojiSpeedLines() {
  if (!state.fighters) return;
  const tojiFighter = state.fighters.find(f => {
    if (!f || f.hp <= 0 || (f.characterId !== 'toji' && f.type !== 'toji')) return false;
    const isSuppressed = typeof f.areAttackEffectsSuppressed === 'function' ? f.areAttackEffectsSuppressed() : isSuppressedByGetsuga(f);
    if (isSuppressed) return false;
    const isAmbushSlashing = f.isAmbushing && (f.ambushPhase === 'KATANA_SLASH' || f.ambushPhase === 'PHANTOM_FLURRY');
    const isUltSlashing = f.ultimateActive && (f.ultimatePhase === 'CRATER' || f.ultimatePhase === 'STRIKING');
    return isAmbushSlashing || isUltSlashing;
  });
  if (!tojiFighter) return;

  const ctx = state.ctx;
  if (!ctx) return;

  const isDarkMode = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  const activeKey = `${tojiFighter.ambushPhase || tojiFighter.ultimatePhase}_${isDarkMode ? 'dark' : 'light'}`;
  if (_tojiSpeedLineTheme !== activeKey || tojiFighter._lastSpeedLinePhase !== tojiFighter.ambushPhase) {
    _tojiSpeedLineSeeds = null;
  }
  tojiFighter._lastSpeedLinePhase = tojiFighter.ambushPhase;

  if (!_tojiSpeedLineSeeds) _initTojiSpeedLineSeeds(isDarkMode);

  const lineAngle = tojiFighter.gunAngle !== undefined ? tojiFighter.gunAngle : (tojiFighter.angle || 0);
  const cosA = Math.cos(lineAngle);
  const sinA = Math.sin(lineAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const cx = tojiFighter.x;
  const cy = tojiFighter.y;
  const now = Date.now();

  ctx.save();

  for (let i = 0; i < _tojiSpeedLineSeeds.length; i++) {
    const seed = _tojiSpeedLineSeeds[i];
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 100);
    const backOffset = tojiFighter.r * 1.2;
    const lineCenterX = cx - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = cy - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.len / 2;
    const halfThick = seed.maxThick / 2;
    const midOff = halfLen * 0.15;

    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;

    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;

    const endX = lineCenterX + cosA * halfLen;
    const endY = lineCenterY + sinA * halfLen;

    const topMidX = midX + perpX * halfThick;
    const topMidY = midY + perpY * halfThick;

    const botMidX = midX - perpX * halfThick;
    const botMidY = midY - perpY * halfThick;

    ctx.fillStyle = seed.color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

