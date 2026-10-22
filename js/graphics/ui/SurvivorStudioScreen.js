import { state, spawnFloatingText } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { GAME_MODES, MODE_SETTINGS, DEFAULT_SURVIVOR_SETTINGS } from '../../core/modeConfig.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, drawChamferedRect } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { startGame } from '../../core/gameFlow.js';

// ─────────────────────────────────────────────────────────────────────────────
// SURVIVOR STUDIO CONFIGURATION SCREEN
// Visual Studio for Circle Survivor Gamemode:
// • Tab 1: Spawns & Waves (spawn rate, intervals, batch size, max mobs)
// • Tab 2: Enemy Roster (pick horde enemies from full fighter pool)
// • Tab 3: Milestone Bosses (identity, live preview, HP, radius, speed, damage)
// • Tab 4: Rules & Player (match duration, milestones, starting HP, speed, weapon)
// ─────────────────────────────────────────────────────────────────────────────

// Active Studio UI State
if (state.survivorStudioTab === undefined) state.survivorStudioTab = 'spawns';
if (state.survivorStudioRosterCategory === undefined) state.survivorStudioRosterCategory = 'ALL';
if (state.survivorStudioRosterPage === undefined) state.survivorStudioRosterPage = 0;
if (state.survivorStudioSelectedBoss === undefined) state.survivorStudioSelectedBoss = 'miniBoss1';

let _survivorToastText = '';
let _survivorToastTimer = 0;
let _survivorToastColor = '#00FF66';

export function showSurvivorToast(text, color = '#00FF66', duration = 120) {
  _survivorToastText = text;
  _survivorToastTimer = duration;
  _survivorToastColor = color;
}

/**
 * Loads saved Survivor customizations from localStorage on initialization.
 */
export function loadSurvivorConfig() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem('survivor_mode_custom_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const target = MODE_SETTINGS[GAME_MODES.SURVIVOR];
        if (target) {
          Object.assign(target, parsed);
          if (parsed.bosses) {
            target.bosses = {
              ...target.bosses,
              ...parsed.bosses
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not load survivor config from localStorage:', e);
  }
}

/**
 * Persists current Survivor customizations to localStorage.
 */
export function saveSurvivorConfig() {
  if (typeof localStorage === 'undefined') return;
  try {
    const cfg = MODE_SETTINGS[GAME_MODES.SURVIVOR];
    if (cfg) {
      localStorage.setItem('survivor_mode_custom_config', JSON.stringify(cfg));
      showSurvivorToast('CONFIG SAVED & APPLIED!', '#00FF66', 120);
    }
  } catch (e) {
    console.warn('Could not save survivor config to localStorage:', e);
  }
}

/**
 * Resets all Survivor mode settings back to canonical defaults.
 */
export function resetSurvivorConfigToDefaults() {
  if (!DEFAULT_SURVIVOR_SETTINGS) return;
  const clone = JSON.parse(JSON.stringify(DEFAULT_SURVIVOR_SETTINGS));
  Object.assign(MODE_SETTINGS[GAME_MODES.SURVIVOR], clone);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('survivor_mode_custom_config');
  }
  showSurvivorToast('RESTORED CANONICAL DEFAULTS!', '#FFE145', 120);
}

// Auto-hydrate on script load
if (typeof window !== 'undefined') {
  loadSurvivorConfig();
}

/**
 * Main draw loop for Survivor Studio Screen.
 */
export function drawSurvivorStudioScreen() {
  const { ctx, canvas } = state;

  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Dark Tactical Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#060B08');
  bgGrad.addColorStop(0.5, '#0B130E');
  bgGrad.addColorStop(1, '#050906');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hex grid or scanline ambient texture
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 255, 102, 0.035)';
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let gx = 0; gx < canvas.width; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, canvas.height);
    ctx.stroke();
  }
  for (let gy = 0; gy < canvas.height; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(canvas.width, gy);
    ctx.stroke();
  }
  ctx.restore();

  const cfg = MODE_SETTINGS[GAME_MODES.SURVIVOR] || {};

  // 2. Top Header Bar
  _drawStudioHeader(ctx, canvas);

  // 3. Navigation Tabs Row
  _drawStudioTabs(ctx, canvas);

  // 4. Content Panel based on active tab
  const activeTab = state.survivorStudioTab || 'spawns';
  if (activeTab === 'spawns') {
    _drawSpawnsTab(ctx, canvas, cfg);
  } else if (activeTab === 'enemies') {
    _drawEnemiesTab(ctx, canvas, cfg);
  } else if (activeTab === 'bosses') {
    _drawBossesTab(ctx, canvas, cfg);
  } else if (activeTab === 'rules') {
    _drawRulesTab(ctx, canvas, cfg);
  }

  // 5. Bottom Global Command Deck
  _drawBottomDeck(ctx, canvas);

  // 6. Floating Toast Notifications
  if (_survivorToastTimer > 0) {
    _survivorToastTimer--;
    _drawToast(ctx, canvas);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP HEADER
// ─────────────────────────────────────────────────────────────────────────────
function _drawStudioHeader(ctx, canvas) {
  const topY = 22;
  ctx.save();

  // Subtitle breadcrumb
  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 9.5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CIRCLE MINI-BATTLE // GAMEMODE STUDIO // SURVIVOR CONFIG', canvas.width / 2, topY);

  // Main Banner Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 20px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText('⚡ CIRCLE SURVIVOR STUDIO ⚡', canvas.width / 2, topY + 22);

  // Accent pinstripe line
  const lineW = 320;
  const lineX = (canvas.width - lineW) / 2;
  const lineY = topY + 28;
  const lineGrad = ctx.createLinearGradient(lineX, lineY, lineX + lineW, lineY);
  lineGrad.addColorStop(0, 'rgba(0, 255, 102, 0)');
  lineGrad.addColorStop(0.5, '#00FF66');
  lineGrad.addColorStop(1, 'rgba(0, 255, 102, 0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lineX, lineY);
  ctx.lineTo(lineX + lineW, lineY);
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS ROW
// ─────────────────────────────────────────────────────────────────────────────
function _drawStudioTabs(ctx, canvas) {
  const tabs = [
    { id: 'spawns', label: '⚡ SPAWNS' },
    { id: 'enemies', label: '👥 ROSTER' },
    { id: 'bosses', label: '👑 BOSSES' },
    { id: 'rules', label: '⚙️ RULES' }
  ];

  const tabY = 58;
  const tabH = 30;
  const pad = 16;
  const availableW = canvas.width - pad * 2;
  const gap = 8;
  const tabW = Math.floor((availableW - gap * (tabs.length - 1)) / tabs.length);

  tabs.forEach((tab, i) => {
    const tx = pad + i * (tabW + gap);
    const isSelected = (state.survivorStudioTab === tab.id);

    ctx.save();
    if (isSelected) {
      ctx.fillStyle = '#064E3B';
      ctx.strokeStyle = '#00FF66';
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = '#101614';
      ctx.strokeStyle = '#22382D';
      ctx.lineWidth = 1.2;
    }

    drawChamferedRect(ctx, tx, tabY, tabW, tabH, 4);
    ctx.fill();
    ctx.stroke();

    // Top active indicator pip
    if (isSelected) {
      ctx.fillStyle = '#00FF66';
      ctx.fillRect(tx + 4, tabY + 2, tabW - 8, 2.5);
    }

    ctx.fillStyle = isSelected ? '#FFFFFF' : '#94A3B8';
    ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tab.label, tx + tabW / 2, tabY + tabH / 2 + 1);

    ctx.restore();

    _registerButton(tx, tabY, tabW, tabH, () => {
      state.survivorStudioTab = tab.id;
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: SPAWNS & WAVES
// ─────────────────────────────────────────────────────────────────────────────
function _drawSpawnsTab(ctx, canvas, cfg) {
  const panelX = 16;
  const panelY = 96;
  const panelW = canvas.width - 32;
  const panelH = canvas.height - 180;

  _drawDarkPanel(ctx, panelX, panelY, panelW, panelH, 'SPAWN RATE & SWARM CONTROLS');

  let curY = panelY + 44;

  // Presets Row
  ctx.fillStyle = '#A7F3D0';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('QUICK PACING PRESETS:', panelX + 16, curY);
  curY += 12;

  const presets = [
    { label: 'CASUAL', int: 90, minInt: 30, mult: 1.0, count: 1, max: 25 },
    { label: 'STANDARD', int: 60, minInt: 20, mult: 1.0, count: 2, max: 40 },
    { label: 'HORDE', int: 45, minInt: 15, mult: 1.5, count: 3, max: 50 },
    { label: 'APOCALYPSE', int: 25, minInt: 10, mult: 2.0, count: 4, max: 70 },
  ];
  const pGap = 6;
  const pW = Math.floor((panelW - 32 - pGap * (presets.length - 1)) / presets.length);
  presets.forEach((p, idx) => {
    const px = panelX + 16 + idx * (pW + pGap);
    const isCur = (cfg.spawnInterval === p.int && cfg.maxConcurrentMobs === p.max);
    drawButton(p.label, px + pW / 2, curY + 12, () => {
      cfg.spawnInterval = p.int;
      cfg.minSpawnInterval = p.minInt;
      cfg.spawnRateMultiplier = p.mult;
      cfg.spawnCountPerWave = p.count;
      cfg.maxConcurrentMobs = p.max;
      saveSurvivorConfig();
    }, pW, 24, isCur ? '#059669' : '#1F2937', 3);
  });

  curY += 36;

  // 1. Base Spawn Interval
  const intervalSec = ((cfg.spawnInterval || 60) / 60).toFixed(2);
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'BASE SPAWN INTERVAL',
    valStr: `${cfg.spawnInterval || 60} frames (${intervalSec}s)`,
    desc: 'Delay between horde waves at beginning of match',
    onMinusBig: () => { cfg.spawnInterval = Math.max(15, (cfg.spawnInterval || 60) - 10); saveSurvivorConfig(); },
    onMinus: () => { cfg.spawnInterval = Math.max(15, (cfg.spawnInterval || 60) - 1); saveSurvivorConfig(); },
    onPlus: () => { cfg.spawnInterval = Math.min(180, (cfg.spawnInterval || 60) + 1); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.spawnInterval = Math.min(180, (cfg.spawnInterval || 60) + 10); saveSurvivorConfig(); },
  });
  curY += 56;

  // 2. Minimum Spawn Interval (Late Game Cap)
  const minIntervalSec = ((cfg.minSpawnInterval || 20) / 60).toFixed(2);
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'FASTEST SPAWN CAP (LATE GAME)',
    valStr: `${cfg.minSpawnInterval || 20} frames (${minIntervalSec}s)`,
    desc: 'Fastest allowable wave spawn frequency after escalation',
    onMinusBig: () => { cfg.minSpawnInterval = Math.max(5, (cfg.minSpawnInterval || 20) - 5); saveSurvivorConfig(); },
    onMinus: () => { cfg.minSpawnInterval = Math.max(5, (cfg.minSpawnInterval || 20) - 1); saveSurvivorConfig(); },
    onPlus: () => { cfg.minSpawnInterval = Math.min(60, (cfg.minSpawnInterval || 20) + 1); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.minSpawnInterval = Math.min(60, (cfg.minSpawnInterval || 20) + 5); saveSurvivorConfig(); },
  });
  curY += 56;

  // 3. Spawn Rate Multiplier
  const mult = cfg.spawnRateMultiplier ?? 1.0;
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'SPAWN FREQUENCY MULTIPLIER',
    valStr: `${mult.toFixed(1)}x SPEED`,
    desc: 'Global speed scalar for wave triggers (higher = faster)',
    onMinusBig: () => { cfg.spawnRateMultiplier = Math.max(0.5, Number((mult - 0.5).toFixed(1))); saveSurvivorConfig(); },
    onMinus: () => { cfg.spawnRateMultiplier = Math.max(0.5, Number((mult - 0.1).toFixed(1))); saveSurvivorConfig(); },
    onPlus: () => { cfg.spawnRateMultiplier = Math.min(4.0, Number((mult + 0.1).toFixed(1))); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.spawnRateMultiplier = Math.min(4.0, Number((mult + 0.5).toFixed(1))); saveSurvivorConfig(); },
  });
  curY += 56;

  // 4. Mobs Per Wave
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'ENEMIES PER WAVE BATCH',
    valStr: `${cfg.spawnCountPerWave || 2} mobs`,
    desc: 'Base count of enemies spawned per perimeter wave',
    onMinusBig: () => { cfg.spawnCountPerWave = Math.max(1, (cfg.spawnCountPerWave || 2) - 2); saveSurvivorConfig(); },
    onMinus: () => { cfg.spawnCountPerWave = Math.max(1, (cfg.spawnCountPerWave || 2) - 1); saveSurvivorConfig(); },
    onPlus: () => { cfg.spawnCountPerWave = Math.min(10, (cfg.spawnCountPerWave || 2) + 1); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.spawnCountPerWave = Math.min(10, (cfg.spawnCountPerWave || 2) + 2); saveSurvivorConfig(); },
  });
  curY += 56;

  // 5. Max Concurrent Mobs
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'MAX CONCURRENT MOBS ON SCREEN',
    valStr: `${cfg.maxConcurrentMobs || 40} alive`,
    desc: 'Maximum limit of simultaneous active enemies in the arena',
    onMinusBig: () => { cfg.maxConcurrentMobs = Math.max(10, (cfg.maxConcurrentMobs || 40) - 10); saveSurvivorConfig(); },
    onMinus: () => { cfg.maxConcurrentMobs = Math.max(10, (cfg.maxConcurrentMobs || 40) - 1); saveSurvivorConfig(); },
    onPlus: () => { cfg.maxConcurrentMobs = Math.min(100, (cfg.maxConcurrentMobs || 40) + 1); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.maxConcurrentMobs = Math.min(100, (cfg.maxConcurrentMobs || 40) + 10); saveSurvivorConfig(); },
  });
  curY += 66;

  // Live Swarm Density Assessment Card
  _drawDensityGauge(ctx, panelX + 16, curY, panelW - 32, cfg);
}

function _drawDensityGauge(ctx, x, y, w, cfg) {
  const h = 76;
  ctx.save();
  ctx.fillStyle = '#0F1612';
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  const int = cfg.spawnInterval || 60;
  const mult = cfg.spawnRateMultiplier || 1.0;
  const batch = cfg.spawnCountPerWave || 2;
  const maxM = cfg.maxConcurrentMobs || 40;
  const effectiveSec = (int / mult / 60).toFixed(2);
  const dpsEstimated = (batch / Number(effectiveSec)).toFixed(1);

  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 11px "Outfit", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('📊 CURRENT SWARM PRESSURE ANALYSIS', x + 14, y + 20);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '10.5px "Outfit", sans-serif';
  ctx.fillText(`• Wave Cadence: Spawning ${batch} mobs every ${effectiveSec}s (${dpsEstimated} mobs/sec)`, x + 14, y + 40);
  ctx.fillText(`• Arena Ceiling: Up to ${maxM} simultaneous foes swarming the survivor`, x + 14, y + 58);

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: ENEMY ROSTER
// ─────────────────────────────────────────────────────────────────────────────
function _drawEnemiesTab(ctx, canvas, cfg) {
  const panelX = 16;
  const panelY = 96;
  const panelW = canvas.width - 32;
  const panelH = canvas.height - 180;

  _drawDarkPanel(ctx, panelX, panelY, panelW, panelH, 'HORDE ENEMY POOL (PICK WHO SPAWNS)');

  const pool = Array.isArray(cfg.enemyPool) && cfg.enemyPool.length > 0 ? cfg.enemyPool : ['knight'];

  // Top Preset Action Row
  let curY = panelY + 40;
  const pBtns = [
    { label: 'KNIGHT (DEFAULT)', action: () => { cfg.enemyPool = ['knight']; saveSurvivorConfig(); } },
    { label: 'SELECT ALL', action: () => {
      const all = getActiveFighterDefs().filter(d => d.type !== 'dummy' && !d.isTurret).map(d => d.type || d.characterId);
      cfg.enemyPool = Array.from(new Set(all));
      saveSurvivorConfig();
    }},
    { label: 'MELEE ONLY', action: () => {
      cfg.enemyPool = ['knight', 'spartan', 'berserker', 'musashi', 'toji', 'maki', 'pekka', 'escanor'];
      saveSurvivorConfig();
    }},
    { label: 'JUJUTSU', action: () => {
      cfg.enemyPool = ['gojo', 'sukuna', 'toji', 'yuji', 'yuta', 'todo', 'mahito', 'nanami', 'megumi', 'choso'];
      saveSurvivorConfig();
    }},
  ];

  const gap = 6;
  const bW = Math.floor((panelW - 32 - gap * (pBtns.length - 1)) / pBtns.length);
  pBtns.forEach((b, idx) => {
    const bx = panelX + 16 + idx * (bW + gap);
    drawButton(b.label, bx + bW / 2, curY + 12, b.action, bW, 24, '#1E293B', 3);
  });

  curY += 32;

  // Active pool count & status banner
  ctx.save();
  ctx.fillStyle = '#0F1A15';
  ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, panelX + 16, curY, panelW - 32, 26, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`✓ ACTIVE POOL: ${pool.length} FIGHTER${pool.length === 1 ? '' : 'S'} WILL SPAWN AS HORDE`, panelX + 26, curY + 13);

  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'right';
  ctx.font = '10px monospace';
  ctx.fillText('CLICK ANY FIGHTER TO TOGGLE ON/OFF', panelX + panelW - 26, curY + 13);
  ctx.restore();

  curY += 36;

  // Fighter Grid (4 columns in portrait, 6 in landscape)
  const isLandscape = canvas.width > 600;
  const cols = isLandscape ? 6 : 4;
  const cellGap = 8;
  const gridW = panelW - 32;
  const cellW = Math.floor((gridW - cellGap * (cols - 1)) / cols);
  const cellH = 68;

  const allDefs = getActiveFighterDefs().filter(d => d.type !== 'dummy' && !d.isTurret && !d.isDeployable);
  const perPage = cols * 5; // 20 or 30 per page
  const totalPages = Math.ceil(allDefs.length / perPage);
  state.survivorStudioRosterPage = Math.min(Math.max(0, state.survivorStudioRosterPage || 0), totalPages - 1);
  const page = state.survivorStudioRosterPage;
  const pagedDefs = allDefs.slice(page * perPage, (page + 1) * perPage);

  pagedDefs.forEach((def, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = panelX + 16 + col * (cellW + cellGap);
    const cy = curY + row * (cellH + cellGap);

    const charId = def.type || def.characterId;
    const isActive = pool.some(p => p.toLowerCase() === charId.toLowerCase());

    ctx.save();
    // Card background
    if (isActive) {
      ctx.fillStyle = '#0A2518';
      ctx.strokeStyle = '#00FF66';
      ctx.lineWidth = 1.8;
    } else {
      ctx.fillStyle = '#11141A';
      ctx.strokeStyle = '#272F3D';
      ctx.lineWidth = 1.2;
    }
    drawChamferedRect(ctx, cx, cy, cellW, cellH, 4);
    ctx.fill();
    ctx.stroke();

    // Corner active marker
    if (isActive) {
      ctx.fillStyle = '#00FF66';
      ctx.beginPath();
      ctx.arc(cx + cellW - 8, cy + 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Avatar preview image or circle
    const previewImg = getFighterPreview(def.fighterIndex !== undefined ? def.fighterIndex : idx);
    const avatarSize = 34;
    const avX = cx + cellW / 2 - avatarSize / 2;
    const avY = cy + 6;
    if (previewImg) {
      ctx.drawImage(previewImg, avX, avY, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = def.color || '#9e9e9e';
      ctx.beginPath();
      ctx.arc(cx + cellW / 2, cy + 22, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label name
    ctx.fillStyle = isActive ? '#FFFFFF' : '#64748B';
    ctx.font = 'bold 9px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    let nameStr = def.name.includes(' - ') ? def.name.split(' - ')[0] : def.name;
    if (nameStr.length > 11) nameStr = nameStr.slice(0, 10) + '..';
    ctx.fillText(nameStr.toUpperCase(), cx + cellW / 2, cy + cellH - 12);

    // Active status text
    ctx.fillStyle = isActive ? '#00FF66' : '#EF4444';
    ctx.font = 'bold 7.5px monospace';
    ctx.fillText(isActive ? '✓ ACTIVE' : '✕ OFF', cx + cellW / 2, cy + cellH - 2);

    ctx.restore();

    // Toggle button registration
    _registerButton(cx, cy, cellW, cellH, () => {
      const exists = pool.some(p => p.toLowerCase() === charId.toLowerCase());
      if (exists) {
        if (pool.length <= 1) {
          showSurvivorToast('AT LEAST 1 ENEMY MUST REMAIN!', '#EF4444', 100);
          return;
        }
        cfg.enemyPool = pool.filter(p => p.toLowerCase() !== charId.toLowerCase());
      } else {
        cfg.enemyPool = [...pool, charId];
      }
      saveSurvivorConfig();
    });
  });

  // Bottom Pagination row
  const pageY = panelY + panelH - 38;
  const navW = 100;
  drawButton('◀ PREV', panelX + 24 + navW / 2, pageY + 14, () => {
    if (state.survivorStudioRosterPage > 0) state.survivorStudioRosterPage--;
  }, navW, 26, '#1E293B', 3);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${page + 1} / ${totalPages} (${allDefs.length} TOTAL)`, panelX + panelW / 2, pageY + 14);

  drawButton('NEXT ▶', panelX + panelW - 24 - navW / 2, pageY + 14, () => {
    if (state.survivorStudioRosterPage < totalPages - 1) state.survivorStudioRosterPage++;
  }, navW, 26, '#1E293B', 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: MILESTONE BOSSES
// ─────────────────────────────────────────────────────────────────────────────
function _drawBossesTab(ctx, canvas, cfg) {
  const panelX = 16;
  const panelY = 96;
  const panelW = canvas.width - 32;
  const panelH = canvas.height - 180;

  _drawDarkPanel(ctx, panelX, panelY, panelW, panelH, 'MILESTONE BOSSES & FINAL OVERLORD');

  if (!cfg.bosses) {
    cfg.bosses = {
      miniBoss1: { characterId: 'knight', name: 'Elite Knight Commander', hp: 450, radius: 32, speed: 1.9, damage: 18 },
      miniBoss2: { characterId: 'knight', name: 'Paladin Champion', hp: 600, radius: 32, speed: 2.1, damage: 22 },
      finalBoss: { characterId: 'knight', name: 'The Dark Overlord', hp: 1800, radius: 42, speed: 2.2, damage: 30 }
    };
  }

  const curBossKey = state.survivorStudioSelectedBoss || 'miniBoss1';

  // Sub-tabs for the 3 milestone boss encounters
  let curY = panelY + 40;
  const bTabs = [
    { key: 'miniBoss1', label: '1:00 MINI-BOSS' },
    { key: 'miniBoss2', label: '2:00 TWIN PALADINS' },
    { key: 'finalBoss', label: '3:00 FINAL OVERLORD' }
  ];
  const bGap = 6;
  const bW = Math.floor((panelW - 32 - bGap * (bTabs.length - 1)) / bTabs.length);
  bTabs.forEach((tab, idx) => {
    const tx = panelX + 16 + idx * (bW + bGap);
    const isSel = (curBossKey === tab.key);
    drawButton(tab.label, tx + bW / 2, curY + 12, () => {
      state.survivorStudioSelectedBoss = tab.key;
    }, bW, 26, isSel ? '#B45309' : '#1F2937', 3);
  });

  curY += 34;

  // Extract selected boss data (normalizing object vs array)
  let bossData = cfg.bosses[curBossKey];
  if (Array.isArray(bossData)) {
    bossData = bossData[0] || {};
  } else if (typeof bossData === 'string') {
    bossData = { characterId: bossData, name: `Elite ${bossData}`, hp: 500, radius: 32, speed: 2.0, damage: 20 };
    cfg.bosses[curBossKey] = bossData;
  }
  if (!bossData) {
    bossData = { characterId: 'knight', name: 'Elite Boss', hp: 500, radius: 32, speed: 2.0, damage: 20 };
    cfg.bosses[curBossKey] = bossData;
  }

  // Live Hologram Boss Stage (Top Half)
  const stageH = 150;
  const stageW = panelW - 32;
  const stageX = panelX + 16;
  _drawBossHologramStage(ctx, stageX, curY, stageW, stageH, bossData, curBossKey === 'finalBoss');
  curY += stageH + 12;

  // Character Identity Selector Row
  const allDefs = getActiveFighterDefs().filter(d => d.type !== 'dummy');
  const currentCharId = (bossData.characterId || 'knight').toLowerCase();
  const curFighterIdx = allDefs.findIndex(d => (d.type || d.characterId).toLowerCase() === currentCharId);
  const activeDef = allDefs[curFighterIdx >= 0 ? curFighterIdx : 0] || allDefs[0];

  ctx.save();
  ctx.fillStyle = '#0F1612';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, stageX, curY, stageW, 36, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`FIGHTER: ${activeDef.name.toUpperCase()}`, stageX + 12, curY + 18);

  // Prev / Next Fighter Buttons
  const navBtnW = 60;
  drawButton('◀ PREV', stageX + stageW - navBtnW * 2 - 16, curY + 18, () => {
    const nextIdx = (curFighterIdx - 1 + allDefs.length) % allDefs.length;
    const picked = allDefs[nextIdx];
    bossData.characterId = picked.type || picked.characterId;
    bossData.name = curBossKey === 'finalBoss' ? `The Dark ${picked.name}` : `Elite ${picked.name}`;
    saveSurvivorConfig();
  }, navBtnW, 24, '#374151', 3);

  drawButton('NEXT ▶', stageX + stageW - navBtnW / 2 - 6, curY + 18, () => {
    const nextIdx = (curFighterIdx + 1) % allDefs.length;
    const picked = allDefs[nextIdx];
    bossData.characterId = picked.type || picked.characterId;
    bossData.name = curBossKey === 'finalBoss' ? `The Dark ${picked.name}` : `Elite ${picked.name}`;
    saveSurvivorConfig();
  }, navBtnW, 24, '#374151', 3);
  ctx.restore();

  curY += 46;

  // Boss Stats Steppers (HP, Radius, MoveSpeed, Damage)
  _drawStepperRow(ctx, stageX, curY, stageW, {
    title: 'BOSS MAXIMUM HP',
    valStr: `${bossData.hp || 500} HP`,
    desc: 'Hit points required to slay this milestone encounter',
    onMinusBig: () => { bossData.hp = Math.max(100, (bossData.hp || 500) - 100); saveSurvivorConfig(); },
    onMinus: () => { bossData.hp = Math.max(100, (bossData.hp || 500) - 25); saveSurvivorConfig(); },
    onPlus: () => { bossData.hp = Math.min(10000, (bossData.hp || 500) + 25); saveSurvivorConfig(); },
    onPlusBig: () => { bossData.hp = Math.min(10000, (bossData.hp || 500) + 100); saveSurvivorConfig(); },
  });
  curY += 56;

  _drawStepperRow(ctx, stageX, curY, stageW, {
    title: 'BOSS BODY RADIUS (SCALE)',
    valStr: `${bossData.radius || 32}px`,
    desc: 'Physical collision & visual diameter of the boss',
    onMinusBig: () => { bossData.radius = Math.max(20, (bossData.radius || 32) - 4); saveSurvivorConfig(); },
    onMinus: () => { bossData.radius = Math.max(20, (bossData.radius || 32) - 1); saveSurvivorConfig(); },
    onPlus: () => { bossData.radius = Math.min(60, (bossData.radius || 32) + 1); saveSurvivorConfig(); },
    onPlusBig: () => { bossData.radius = Math.min(60, (bossData.radius || 32) + 4); saveSurvivorConfig(); },
  });
  curY += 56;

  _drawStepperRow(ctx, stageX, curY, stageW, {
    title: 'BOSS MOVEMENT SPEED',
    valStr: `${(bossData.speed || 2.0).toFixed(1)} px/f`,
    desc: 'Advance velocity while charging down the player',
    onMinusBig: () => { bossData.speed = Math.max(0.8, Number(((bossData.speed || 2.0) - 0.4).toFixed(1))); saveSurvivorConfig(); },
    onMinus: () => { bossData.speed = Math.max(0.8, Number(((bossData.speed || 2.0) - 0.1).toFixed(1))); saveSurvivorConfig(); },
    onPlus: () => { bossData.speed = Math.min(4.5, Number(((bossData.speed || 2.0) + 0.1).toFixed(1))); saveSurvivorConfig(); },
    onPlusBig: () => { bossData.speed = Math.min(4.5, Number(((bossData.speed || 2.0) + 0.4).toFixed(1))); saveSurvivorConfig(); },
  });
  curY += 56;

  _drawStepperRow(ctx, stageX, curY, stageW, {
    title: 'CONTACT TOUCH DAMAGE',
    valStr: `${bossData.damage || 20} DMG`,
    desc: 'Damage inflicted on player contact every 45 frames',
    onMinusBig: () => { bossData.damage = Math.max(5, (bossData.damage || 20) - 5); saveSurvivorConfig(); },
    onMinus: () => { bossData.damage = Math.max(5, (bossData.damage || 20) - 1); saveSurvivorConfig(); },
    onPlus: () => { bossData.damage = Math.min(80, (bossData.damage || 20) + 1); saveSurvivorConfig(); },
    onPlusBig: () => { bossData.damage = Math.min(80, (bossData.damage || 20) + 5); saveSurvivorConfig(); },
  });
}

function _drawBossHologramStage(ctx, x, y, w, h, bossData, isFinalBoss) {
  ctx.save();
  // Hologram Backdrop
  const stageGrad = ctx.createLinearGradient(x, y, x, y + h);
  stageGrad.addColorStop(0, '#0B130E');
  stageGrad.addColorStop(1, '#040705');
  ctx.fillStyle = stageGrad;
  ctx.strokeStyle = isFinalBoss ? '#EF4444' : '#F59E0B';
  ctx.lineWidth = 1.8;
  drawChamferedRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Stage Spotlight Floor Ellipse
  const centerX = x + w / 2;
  const centerY = y + h / 2 + 15;
  ctx.fillStyle = isFinalBoss ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 30, 75, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stage Header Text
  ctx.fillStyle = isFinalBoss ? '#EF4444' : '#F59E0B';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`👑 ${bossData.name ? bossData.name.toUpperCase() : 'BOSS ENCOUNTER'}`, centerX, y + 20);

  // Live Boss Skin Hologram Rendering
  const charId = (bossData.characterId || 'knight').toLowerCase();
  const FighterClass = FIGHTER_CLASS_MAP[charId] || FIGHTER_CLASS_MAP['knight'];

  if (FighterClass) {
    try {
      const dummyBoss = new FighterClass({
        id: 99991,
        name: bossData.name,
        startX: centerX,
        startY: centerY,
        radius: bossData.radius || 32,
        type: charId,
        characterId: charId,
      });
      dummyBoss.x = centerX;
      dummyBoss.y = centerY;
      dummyBoss.r = bossData.radius || 32;

      ctx.save();
      // Draw Authentic Fighter Body / Skin
      if (typeof dummyBoss.drawBody === 'function') {
        ctx.translate(centerX, centerY);
        dummyBoss.drawBody(ctx);
      } else if (typeof dummyBoss.draw === 'function') {
        dummyBoss.draw(ctx, null);
      }
      ctx.restore();
    } catch (e) {
      // Fallback circle if custom skin error
      ctx.fillStyle = isFinalBoss ? '#EF4444' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(centerX, centerY, bossData.radius || 32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Overhead boss stats tag
  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${bossData.hp || 500} HP  •  ${bossData.damage || 20} DMG  •  ${(bossData.speed || 2.0).toFixed(1)} SPD`, centerX, y + h - 10);

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: RULES & PLAYER
// ─────────────────────────────────────────────────────────────────────────────
function _drawRulesTab(ctx, canvas, cfg) {
  const panelX = 16;
  const panelY = 96;
  const panelW = canvas.width - 32;
  const panelH = canvas.height - 180;

  _drawDarkPanel(ctx, panelX, panelY, panelW, panelH, 'SURVIVOR MATCH RULES & PLAYER SETTINGS');

  let curY = panelY + 44;

  // 1. Total Match Duration
  const matchDuration = cfg.matchDurationSec || 180;
  const mins = Math.floor(matchDuration / 60);
  const secs = (matchDuration % 60).toString().padStart(2, '0');
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'TOTAL MATCH DURATION',
    valStr: `${matchDuration}s (${mins}:${secs})`,
    desc: 'Length of the run before final climax boss triggers',
    onMinusBig: () => { cfg.matchDurationSec = Math.max(60, matchDuration - 30); saveSurvivorConfig(); },
    onMinus: () => { cfg.matchDurationSec = Math.max(60, matchDuration - 10); saveSurvivorConfig(); },
    onPlus: () => { cfg.matchDurationSec = Math.min(600, matchDuration + 10); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.matchDurationSec = Math.min(600, matchDuration + 30); saveSurvivorConfig(); },
  });
  curY += 56;

  // 2. Mini-Boss 1 Spawn Time
  const mb1Time = cfg.miniBoss1TimeSec || 60;
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'MINI-BOSS 1 SPAWN TIME',
    valStr: `${mb1Time}s (${Math.floor(mb1Time / 60)}:${(mb1Time % 60).toString().padStart(2, '0')})`,
    desc: 'Timestamp when first elite commander spawns with chest',
    onMinusBig: () => { cfg.miniBoss1TimeSec = Math.max(20, mb1Time - 15); saveSurvivorConfig(); },
    onMinus: () => { cfg.miniBoss1TimeSec = Math.max(20, mb1Time - 5); saveSurvivorConfig(); },
    onPlus: () => { cfg.miniBoss1TimeSec = Math.min(matchDuration - 30, mb1Time + 5); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.miniBoss1TimeSec = Math.min(matchDuration - 30, mb1Time + 15); saveSurvivorConfig(); },
  });
  curY += 56;

  // 3. Mini-Boss 2 Spawn Time
  const mb2Time = cfg.miniBoss2TimeSec || 120;
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'MINI-BOSS 2 SPAWN TIME',
    valStr: `${mb2Time}s (${Math.floor(mb2Time / 60)}:${(mb2Time % 60).toString().padStart(2, '0')})`,
    desc: 'Timestamp when twin paladin champions spawn',
    onMinusBig: () => { cfg.miniBoss2TimeSec = Math.max(mb1Time + 15, mb2Time - 15); saveSurvivorConfig(); },
    onMinus: () => { cfg.miniBoss2TimeSec = Math.max(mb1Time + 15, mb2Time - 5); saveSurvivorConfig(); },
    onPlus: () => { cfg.miniBoss2TimeSec = Math.min(matchDuration - 15, mb2Time + 5); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.miniBoss2TimeSec = Math.min(matchDuration - 15, mb2Time + 15); saveSurvivorConfig(); },
  });
  curY += 56;

  // 4. Player Starting HP
  const playerHp = cfg.playerFixedHp || 500;
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'PLAYER STARTING HP',
    valStr: `${playerHp} HP`,
    desc: 'Base health pool allocated to Player 1 at run start',
    onMinusBig: () => { cfg.playerFixedHp = Math.max(100, playerHp - 100); saveSurvivorConfig(); },
    onMinus: () => { cfg.playerFixedHp = Math.max(100, playerHp - 25); saveSurvivorConfig(); },
    onPlus: () => { cfg.playerFixedHp = Math.min(3000, playerHp + 25); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.playerFixedHp = Math.min(3000, playerHp + 100); saveSurvivorConfig(); },
  });
  curY += 56;

  // 5. Player Speed Multiplier
  const playerSpd = cfg.speedMultiplier ?? 1.0;
  _drawStepperRow(ctx, panelX + 16, curY, panelW - 32, {
    title: 'PLAYER SPEED MULTIPLIER',
    valStr: `${playerSpd.toFixed(1)}x SPEED`,
    desc: 'Hero run velocity scaling factor',
    onMinusBig: () => { cfg.speedMultiplier = Math.max(0.6, Number((playerSpd - 0.2).toFixed(1))); saveSurvivorConfig(); },
    onMinus: () => { cfg.speedMultiplier = Math.max(0.6, Number((playerSpd - 0.1).toFixed(1))); saveSurvivorConfig(); },
    onPlus: () => { cfg.speedMultiplier = Math.min(2.5, Number((playerSpd + 0.1).toFixed(1))); saveSurvivorConfig(); },
    onPlusBig: () => { cfg.speedMultiplier = Math.min(2.5, Number((playerSpd + 0.2).toFixed(1))); saveSurvivorConfig(); },
  });
  curY += 62;

  // 6. Starting Modular Weapon Selector
  _drawStartingWeaponSelector(ctx, panelX + 16, curY, panelW - 32, cfg);
}

function _drawStartingWeaponSelector(ctx, x, y, w, cfg) {
  const h = 78;
  ctx.save();
  ctx.fillStyle = '#0F1612';
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 1.4;
  drawChamferedRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  const activeWep = cfg.startingWeapon || 'orbiters';

  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 11px "Outfit", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('⚔️ STARTING SURVIVOR WEAPON (RANK 1 ON DEPLOY)', x + 14, y + 20);

  const weapons = [
    { id: 'orbiters', label: 'ORBITERS' },
    { id: 'garlic', label: 'GARLIC AURA' },
    { id: 'kunai', label: 'KUNAI' },
    { id: 'thunder', label: 'THUNDER' },
    { id: 'scythe', label: 'SCYTHE' }
  ];

  const wGap = 6;
  const btnW = Math.floor((w - 24 - wGap * (weapons.length - 1)) / weapons.length);
  const btnH = 26;
  const btnY = y + 36;

  weapons.forEach((wep, idx) => {
    const bx = x + 12 + idx * (btnW + wGap);
    const isSel = (activeWep === wep.id);
    drawButton(wep.label, bx + btnW / 2, btnY + btnH / 2, () => {
      cfg.startingWeapon = wep.id;
      saveSurvivorConfig();
    }, btnW, btnH, isSel ? '#059669' : '#1F2937', 3);
  });

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE STEPPER ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function _drawStepperRow(ctx, x, y, w, options) {
  const h = 48;
  ctx.save();

  // Row background box
  ctx.fillStyle = '#101614';
  ctx.strokeStyle = '#1D2A24';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Label Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px "Outfit", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(options.title, x + 12, y + 8);

  // Description / Subtitle
  ctx.fillStyle = '#64748B';
  ctx.font = '9px "Outfit", sans-serif';
  ctx.fillText(options.desc, x + 12, y + 24);

  // Value Display Box
  const valBoxW = 120;
  const valBoxX = x + w - 190;
  ctx.fillStyle = '#064E3B';
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, valBoxX, y + 10, valBoxW, 28, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(options.valStr, valBoxX + valBoxW / 2, y + 24);

  // Stepper Buttons [-] [+]
  const btnSize = 26;
  const btnY = y + 24;

  drawButton('−', valBoxX - 20, btnY, options.onMinus, 24, btnSize, '#1F2937', 3);
  drawButton('+', valBoxX + valBoxW + 20, btnY, options.onPlus, 24, btnSize, '#1F2937', 3);

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM CONTROL DECK
// ─────────────────────────────────────────────────────────────────────────────
function _drawBottomDeck(ctx, canvas) {
  const deckY = canvas.height - 70;
  const deckH = 60;
  const pad = 16;
  const w = canvas.width - pad * 2;

  ctx.save();
  ctx.fillStyle = '#0B130E';
  ctx.strokeStyle = '#1D2A24';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, pad, deckY, w, deckH, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const btnH = 38;
  const btnY = deckY + deckH / 2;
  const gap = 8;

  // 4 Action Buttons
  const resetW = 90;
  const saveW = 90;
  const backW = 85;
  const playW = w - (resetW + saveW + backW + gap * 5);

  let curX = pad + gap;

  // 1. Reset
  drawButton('↺ RESET', curX + resetW / 2, btnY, () => {
    resetSurvivorConfigToDefaults();
  }, resetW, btnH, '#B91C1C', 4);
  curX += resetW + gap;

  // 2. Save
  drawButton('💾 SAVE', curX + saveW / 2, btnY, () => {
    saveSurvivorConfig();
  }, saveW, btnH, '#059669', 4);
  curX += saveW + gap;

  // 3. Play Survivor Immediately
  drawButton('⚔️ START SURVIVOR', curX + playW / 2, btnY, () => {
    saveSurvivorConfig();
    state.mode = GAME_MODES.SURVIVOR;
    state.gameState = 'playing';
    startGame();
  }, playW, btnH, '#10B981', 4);
  curX += playW + gap;

  // 4. Back
  drawButton('◀ BACK', curX + backW / 2, btnY, () => {
    state.gameState = 'select';
  }, backW, btnH, '#374151', 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE DARK PANEL CONTAINER
// ─────────────────────────────────────────────────────────────────────────────
function _drawDarkPanel(ctx, x, y, w, h, title) {
  ctx.save();
  // Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  drawChamferedRect(ctx, x + 3, y + 4, w, h, 8);
  ctx.fill();

  // Dark gunmetal body
  ctx.fillStyle = '#0B100D';
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 2.0;
  drawChamferedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Header strip
  const headH = 30;
  ctx.fillStyle = '#064E3B';
  drawChamferedRect(ctx, x + 2, y + 2, w - 4, headH, 6);
  ctx.fill();

  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⚡ ${title}`, x + 14, y + headH / 2 + 1);

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────
function _drawToast(ctx, canvas) {
  ctx.save();
  const toastW = 320;
  const toastH = 36;
  const toastX = (canvas.width - toastW) / 2;
  const toastY = 56;

  ctx.fillStyle = '#0A1C12';
  ctx.strokeStyle = _survivorToastColor;
  ctx.lineWidth = 2;
  drawChamferedRect(ctx, toastX, toastY, toastW, toastH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = _survivorToastColor;
  ctx.font = 'bold 12px "Outfit", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(_survivorToastText, toastX + toastW / 2, toastY + toastH / 2);

  ctx.restore();
}
